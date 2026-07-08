from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Iterable, Any

import numpy as np
import pandas as pd
import yfinance as yf
from pypfopt import EfficientFrontier, expected_returns
from pypfopt.risk_models import CovarianceShrinkage

from app.models.portfolio import (
    AssetMetrics,
    EfficientFrontierPoint,
    OptimizationObjective,
    OptimizationRequest,
    OptimizationResponse,
    PortfolioMetrics,
)


class PortfolioService:
    MIN_DAYS = 60
    MIN_ASSETS = 2
    MAX_MISSING_RATIO = 0.2
    CLEAN_WEIGHT_CUTOFF = 1e-4
    TRADING_DAYS = 252
    REBALANCE_THRESHOLD = 0.05

    @classmethod
    def _fetch_price_matrix(cls, symbols: Iterable[str], lookback_days: int) -> pd.DataFrame:
        tickers = [symbol.strip().upper() for symbol in symbols if symbol and symbol.strip()]
        if len(tickers) < cls.MIN_ASSETS:
            raise ValueError(f"At least {cls.MIN_ASSETS} assets are required for portfolio optimization")

        end_date = pd.Timestamp.now(tz="UTC")
        start_date = end_date - pd.Timedelta(days=lookback_days)

        data = yf.download(
            tickers=" ".join(tickers),
            start=start_date.strftime("%Y-%m-%d"),
            end=end_date.strftime("%Y-%m-%d"),
            auto_adjust=False,
            actions=False,
            progress=False,
        )

        if data is None or data.empty:
            raise ValueError("No historical price data was returned for the requested symbols")

        if isinstance(data.columns, pd.MultiIndex):
            if "Close" not in data.columns.get_level_values(0):
                raise ValueError("No close prices were returned for the requested symbols")
            prices = data["Close"].copy()
        else:
            if "Close" not in data.columns:
                raise ValueError("No close prices were returned for the requested symbols")
            prices = data["Close"].to_frame(name=tickers[0])

        prices = prices.dropna(how="all")
        if prices.empty:
            raise ValueError("No usable close prices were returned for the requested symbols")

        missing_ratio = prices.isna().mean()
        prices = prices.loc[:, missing_ratio <= cls.MAX_MISSING_RATIO]
        prices = prices.ffill()
        prices = prices.dropna(how="any")

        if prices.empty:
            raise ValueError("Price data is empty after cleaning missing values")

        return prices

    @classmethod
    def _validate_price_matrix(cls, prices: pd.DataFrame) -> None:
        if prices.shape[0] < cls.MIN_DAYS:
            raise ValueError(
                f"At least {cls.MIN_DAYS} trading days are required for portfolio optimization"
            )
        if prices.shape[1] < cls.MIN_ASSETS:
            raise ValueError(
                f"At least {cls.MIN_ASSETS} assets are required for portfolio optimization"
            )

    @classmethod
    async def optimize(cls, request: OptimizationRequest) -> OptimizationResponse:
        prices = cls._fetch_price_matrix(request.symbols, request.lookback_period)
        cls._validate_price_matrix(prices)

        mu = expected_returns.mean_historical_return(prices)
        cov = CovarianceShrinkage(prices).ledoit_wolf()

        weight_bounds = (request.min_weight, request.max_weight)
        objective = request.objective

        weights, performance = cls._run_optimization(
            objective,
            mu,
            cov,
            weight_bounds,
            request.risk_free_rate,
            None
        )

        daily_returns = prices.pct_change().dropna(how="any")
        weights_series = pd.Series(weights)
        portfolio_daily_returns = (daily_returns @ weights_series).fillna(0.0)
        portfolio_drawdown = cls._max_drawdown_series(portfolio_daily_returns)

        portfolio_metrics = PortfolioMetrics(
            returns=performance[0],
            volatility=performance[1],
            sharpe=performance[2],
            drawdown=portfolio_drawdown,
            weights=weights,
        )

        asset_metrics = cls._compute_asset_metrics(
            mu,
            cov,
            request.risk_free_rate,
            prices,
            weights,
        )

        efficient_frontier = cls._build_efficient_frontier(
            mu,
            cov,
            weight_bounds,
            request.risk_free_rate,
            frontier_points=20,
        )

        stress_test = None
        if request.stress_scenario:
            stress_test_result = await cls._generate_stress_test(
                list(mu.index),
                weights,
                request.stress_scenario,
                portfolio_metrics,
            )
            stress_test = stress_test_result

        return OptimizationResponse(
            asset_metrics=asset_metrics,
            portfolio_metrics=portfolio_metrics,
            efficient_frontier=efficient_frontier,
            stress_test_result=stress_test,
            rebalance_threshold=cls.REBALANCE_THRESHOLD,
            optimized_at=datetime.now(timezone.utc),
        )

    @classmethod
    async def efficient_frontier(
        cls,
        symbols: list[str],
        lookback_period: int,
        risk_free_rate: float,
        min_weight: float,
        max_weight: float,
    ) -> list[EfficientFrontierPoint]:
        prices = cls._fetch_price_matrix(symbols, lookback_period)
        cls._validate_price_matrix(prices)

        mu = expected_returns.mean_historical_return(prices)
        cov = CovarianceShrinkage(prices).ledoit_wolf()

        weight_bounds = (min_weight, max_weight)

        return cls._build_efficient_frontier(
            mu,
            cov,
            weight_bounds,
            risk_free_rate,
            frontier_points=20,
        )

    @classmethod
    def _run_optimization(
        cls,
        objective: OptimizationObjective,
        mu: pd.Series,
        cov: pd.DataFrame,
        weight_bounds: tuple[float, float],
        risk_free_rate: float,
        target_risk: float | None = None,
    ) -> tuple[dict[str, float], tuple[float, float, float]]:
        if objective == OptimizationObjective.RISK_PARITY:
            weights = cls._inverse_volatility_weights(cov, weight_bounds)
            performance = cls._portfolio_performance(mu, cov, weights, risk_free_rate)
            return weights, performance

        ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)

        if objective == OptimizationObjective.MAX_SHARPE:
            ef.max_sharpe(risk_free_rate=risk_free_rate)
        elif objective == OptimizationObjective.MIN_VOLATILITY:
            ef.min_volatility()
        elif objective == OptimizationObjective.TARGET_RISK:
            if target_risk is None:
                target_risk = 0.15
            ef.efficient_risk(target_risk)
        elif objective == OptimizationObjective.MAX_RETURN:
            import cvxpy as cp
            ef.convex_objective(lambda w: -cp.sum(cp.multiply(w, mu.values)))
        else:
            raise ValueError(f"Unsupported optimization objective: {objective}")

        weights = ef.clean_weights()
        performance = ef.portfolio_performance(risk_free_rate=risk_free_rate)
        return weights, performance

    @classmethod
    def _inverse_volatility_weights(
        cls,
        cov: pd.DataFrame,
        weight_bounds: tuple[float, float],
    ) -> dict[str, float]:
        """Compute inverse-volatility (risk parity) weights.

        Each asset receives a weight proportional to the inverse of its
        volatility (diagonal of the covariance matrix).  The result is then
        clipped to *weight_bounds* and re-normalised to sum to 1.
        """
        variances = np.diag(cov.values)
        inv_vol = 1.0 / np.sqrt(variances)
        raw_weights = inv_vol / inv_vol.sum()

        weight_series = pd.Series(raw_weights, index=cov.index)
        bounded = cls._apply_weight_bounds(weight_series, weight_bounds)
        return cls._clean_weights(bounded)

    @classmethod
    def _compute_asset_metrics(
        cls,
        mu: pd.Series,
        cov: pd.DataFrame,
        risk_free_rate: float,
        prices: pd.DataFrame,
        weights: dict[str, float],
    ) -> list[AssetMetrics]:
        volatilities = np.sqrt(np.diag(cov.values))
        metrics: list[AssetMetrics] = []
        for idx, symbol in enumerate(mu.index):
            expected_return = float(mu.iloc[idx])
            volatility = float(volatilities[idx])
            sharpe_ratio = 0.0
            if volatility > 0:
                sharpe_ratio = (expected_return - risk_free_rate) / volatility
            drawdown = cls._max_drawdown(prices, symbol)
            weight = float(weights.get(str(symbol), 0.0))
            metrics.append(
                AssetMetrics(
                    symbol=str(symbol),
                    returns=expected_return,
                    expected_return=expected_return,
                    volatility=volatility,
                    sharpe=sharpe_ratio,
                    sharpe_ratio=sharpe_ratio,
                    drawdown=drawdown,
                    weight=weight,
                )
            )
        return metrics

    @staticmethod
    def _max_drawdown(prices: pd.DataFrame, symbol: object) -> float:
        column = symbol if symbol in prices.columns else str(symbol)
        if column not in prices.columns:
            return 0.0
        series = prices[column].dropna()
        if series.empty:
            return 0.0
        running_max = series.cummax()
        drawdowns = 1 - (series / running_max)
        max_drawdown = float(drawdowns.max())
        if np.isnan(max_drawdown) or max_drawdown < 0:
            return 0.0
        return min(max_drawdown, 1.0)

    @staticmethod
    def _max_drawdown_series(returns: pd.Series) -> float:
        if returns is None or returns.empty:
            return 0.0
        cumulative = (1.0 + returns.fillna(0.0)).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative / running_max) - 1.0
        return float(abs(drawdown.min())) if not drawdown.empty else 0.0

    @classmethod
    def _build_efficient_frontier(
        cls,
        mu: pd.Series,
        cov: pd.DataFrame,
        weight_bounds: tuple[float, float],
        risk_free_rate: float,
        frontier_points: int,
    ) -> list[EfficientFrontierPoint]:
        if frontier_points <= 0:
            return []

        min_return = float(mu.min())
        max_return = float(mu.max())
        if min_return == max_return:
            targets = [min_return]
        else:
            targets = list(np.linspace(min_return, max_return, num=frontier_points))

        frontier: list[EfficientFrontierPoint] = []
        for target in targets:
            try:
                ef = EfficientFrontier(mu, cov, weight_bounds=weight_bounds)
                ef.efficient_return(target)
                weights = ef.clean_weights()
                performance = ef.portfolio_performance(risk_free_rate=risk_free_rate)
                frontier.append(
                    EfficientFrontierPoint(
                        target_return=float(target),
                        expected_return=performance[0],
                        volatility=performance[1],
                        sharpe=performance[2],
                        sharpe_ratio=performance[2],
                        weights=weights,
                    )
                )
            except Exception:
                continue

        return frontier

    @classmethod
    async def _generate_stress_test(
        cls,
        symbols: list[str],
        weights: dict[str, float],
        scenario: str,
        metrics: PortfolioMetrics,
    ) -> Any | None:
        try:
            from app.services.llm_insight_service import LlmInsightService
        except Exception:
            return None

        try:
            result = await LlmInsightService.generate_portfolio_stress_test(
                symbols=symbols,
                weights=weights,
                scenario=scenario,
                returns=metrics.returns,
                volatility=metrics.volatility,
                sharpe=metrics.sharpe,
                drawdown=metrics.drawdown,
            )
        except Exception:
            return None

        if isinstance(result, dict):
            from app.models.portfolio import StressTestResult
            try:
                return StressTestResult(**result)
            except Exception:
                return None
        return None

    @classmethod
    def _normalize_objective(cls, objective: OptimizationObjective) -> OptimizationObjective:
        if isinstance(objective, OptimizationObjective):
            return objective
        return OptimizationObjective(str(objective))

    @classmethod
    def _apply_weight_bounds(
        cls,
        weights: pd.Series,
        weight_bounds: tuple[float, float],
    ) -> pd.Series:
        lower, upper = weight_bounds
        bounded = weights.clip(lower=lower, upper=upper)
        total = bounded.sum()
        if total <= 0:
            raise ValueError("Weight bounds leave no feasible allocation")
        bounded = bounded / total

        for _ in range(10):
            below = bounded < lower - 1e-12
            above = bounded > upper + 1e-12
            if not (below.any() or above.any()):
                break
            bounded[below] = lower
            bounded[above] = upper
            free = ~(below | above)
            remaining = 1.0 - bounded[below | above].sum()
            if remaining < 0:
                remaining = 0.0
            if free.any():
                free_total = bounded[free].sum()
                if free_total > 0:
                    bounded[free] = bounded[free] / free_total * remaining
                else:
                    bounded[free] = 0.0
            else:
                break

        return bounded

    @classmethod
    def _clean_weights(cls, weights: pd.Series) -> dict[str, float]:
        cleaned = {}
        for symbol, weight in weights.items():
            value = 0.0 if abs(weight) < cls.CLEAN_WEIGHT_CUTOFF else float(weight)
            cleaned[str(symbol)] = value

        total = sum(cleaned.values())
        if total > 0:
            cleaned = {symbol: value / total for symbol, value in cleaned.items()}
        return {symbol: round(value, 4) for symbol, value in cleaned.items()}

    @staticmethod
    def _portfolio_performance(
        mu: pd.Series,
        cov: pd.DataFrame,
        weights: dict[str, float],
        risk_free_rate: float,
    ) -> tuple[float, float, float]:
        weight_series = pd.Series(weights, index=mu.index).fillna(0.0)
        expected_return = float(np.dot(weight_series.values, mu.values))
        volatility = float(np.sqrt(weight_series.values.T @ cov.values @ weight_series.values))
        if volatility == 0:
            sharpe = 0.0
        else:
            sharpe = (expected_return - risk_free_rate) / volatility
        return expected_return, volatility, float(sharpe)

