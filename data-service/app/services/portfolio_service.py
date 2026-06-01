from __future__ import annotations

import math
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import yfinance as yf
from scipy.optimize import minimize

from app.models.portfolio import (
    AssetMetrics,
    EfficientFrontierPoint,
    OptimizationObjective,
    OptimizationRequest,
    OptimizationResponse,
    PortfolioMetrics,
)


class PortfolioService:
    REBALANCE_THRESHOLD = 0.05
    FRONTIER_POINTS = 20
    TRADING_DAYS = 252

    @classmethod
    async def optimize(cls, request: OptimizationRequest) -> OptimizationResponse:
        cls._validate_bounds(request)

        prices = await cls._fetch_price_matrix(request.symbols, request.lookback_period)
        returns = prices.pct_change().dropna(how="any")

        if returns.empty:
            raise ValueError("Not enough return observations to optimize portfolio")

        mean_returns = returns.mean() * cls.TRADING_DAYS
        covariance = returns.cov() * cls.TRADING_DAYS

        weights = cls._optimize_weights(
            objective=request.objective,
            mean_returns=mean_returns.values,
            covariance=covariance.values,
            risk_free_rate=request.risk_free_rate,
            min_weight=request.min_weight,
            max_weight=request.max_weight,
        )

        weight_map = {symbol: float(weight) for symbol, weight in zip(request.symbols, weights)}

        portfolio_return = float(np.dot(weights, mean_returns.values))
        portfolio_volatility = cls._portfolio_volatility(weights, covariance.values)
        sharpe = cls._safe_sharpe(portfolio_return, portfolio_volatility, request.risk_free_rate)
        portfolio_series = (returns @ weights).fillna(0.0)

        portfolio_metrics = PortfolioMetrics(
            returns=portfolio_return,
            volatility=portfolio_volatility,
            sharpe=sharpe,
            drawdown=cls._max_drawdown(portfolio_series),
            weights=weight_map,
        )

        asset_metrics = []
        for i, symbol in enumerate(request.symbols):
            annual_return = float(mean_returns.iloc[i])
            annual_volatility = float(math.sqrt(max(covariance.iloc[i, i], 0.0)))
            asset_metrics.append(
                AssetMetrics(
                    symbol=symbol,
                    returns=annual_return,
                    volatility=annual_volatility,
                    sharpe=cls._safe_sharpe(annual_return, annual_volatility, request.risk_free_rate),
                    drawdown=cls._max_drawdown(returns[symbol]),
                    weight=weight_map[symbol],
                )
            )

        frontier = cls._build_efficient_frontier(
            mean_returns.values,
            covariance.values,
            request.risk_free_rate,
            request.min_weight,
            request.max_weight,
        )

        return OptimizationResponse(
            asset_metrics=asset_metrics,
            portfolio_metrics=portfolio_metrics,
            efficient_frontier=frontier,
            stress_test_result=None,
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
        request = OptimizationRequest(
            symbols=symbols,
            objective=OptimizationObjective.MAX_SHARPE,
            risk_free_rate=risk_free_rate,
            lookback_period=lookback_period,
            min_weight=min_weight,
            max_weight=max_weight,
        )
        cls._validate_bounds(request)

        prices = await cls._fetch_price_matrix(request.symbols, request.lookback_period)
        returns = prices.pct_change().dropna(how="any")

        if returns.empty:
            raise ValueError("Not enough return observations to build efficient frontier")

        mean_returns = returns.mean() * cls.TRADING_DAYS
        covariance = returns.cov() * cls.TRADING_DAYS

        return cls._build_efficient_frontier(
            mean_returns.values,
            covariance.values,
            risk_free_rate,
            min_weight,
            max_weight,
        )

    @classmethod
    async def _fetch_price_matrix(cls, symbols: list[str], lookback_period: int) -> pd.DataFrame:
        end = pd.Timestamp.utcnow()
        start = end - pd.Timedelta(days=lookback_period)
        closes: dict[str, pd.Series] = {}

        for symbol in symbols:
            history = yf.Ticker(symbol).history(
                start=start.strftime("%Y-%m-%d"),
                end=end.strftime("%Y-%m-%d"),
                interval="1d",
                auto_adjust=True,
                actions=False,
            )
            if history is None or history.empty:
                raise ValueError(f"No historical data for symbol '{symbol}'")
            closes[symbol] = history["Close"].rename(symbol)

        matrix = pd.concat(closes.values(), axis=1, join="inner").dropna(how="any")
        if matrix.empty:
            raise ValueError("No overlapping price history for requested symbols")
        return matrix

    @classmethod
    def _build_efficient_frontier(
        cls,
        mean_returns: np.ndarray,
        covariance: np.ndarray,
        risk_free_rate: float,
        min_weight: float,
        max_weight: float,
    ) -> list[EfficientFrontierPoint]:
        n_assets = len(mean_returns)
        min_ret = float(np.min(mean_returns))
        max_ret = float(np.max(mean_returns))
        targets = np.linspace(min_ret, max_ret, cls.FRONTIER_POINTS)

        points: list[EfficientFrontierPoint] = []
        bounds = tuple((min_weight, max_weight) for _ in range(n_assets))
        base_constraints = [{"type": "eq", "fun": lambda w: float(np.sum(w) - 1.0)}]
        x0 = np.full(n_assets, 1.0 / n_assets)

        for target in targets:
            constraints = base_constraints + [
                {"type": "eq", "fun": lambda w, tgt=target: float(np.dot(w, mean_returns) - tgt)}
            ]
            result = minimize(
                lambda w: cls._portfolio_volatility(w, covariance),
                x0,
                method="SLSQP",
                bounds=bounds,
                constraints=constraints,
            )
            if not result.success:
                continue
            vol = cls._portfolio_volatility(result.x, covariance)
            points.append(
                EfficientFrontierPoint(
                    expected_return=float(np.dot(result.x, mean_returns)),
                    volatility=vol,
                    sharpe=cls._safe_sharpe(float(np.dot(result.x, mean_returns)), vol, risk_free_rate),
                )
            )

        return points

    @classmethod
    def _optimize_weights(
        cls,
        objective: OptimizationObjective,
        mean_returns: np.ndarray,
        covariance: np.ndarray,
        risk_free_rate: float,
        min_weight: float,
        max_weight: float,
    ) -> np.ndarray:
        n_assets = len(mean_returns)
        bounds = tuple((min_weight, max_weight) for _ in range(n_assets))
        constraints = [{"type": "eq", "fun": lambda w: float(np.sum(w) - 1.0)}]
        x0 = np.full(n_assets, 1.0 / n_assets)

        if objective == OptimizationObjective.MAX_SHARPE:
            objective_fn = lambda w: -cls._safe_sharpe(
                float(np.dot(w, mean_returns)),
                cls._portfolio_volatility(w, covariance),
                risk_free_rate,
            )
        elif objective == OptimizationObjective.MIN_VOLATILITY:
            objective_fn = lambda w: cls._portfolio_volatility(w, covariance)
        elif objective == OptimizationObjective.MAX_RETURN:
            objective_fn = lambda w: -float(np.dot(w, mean_returns))
        else:
            objective_fn = lambda w: cls._risk_parity_loss(w, covariance)

        result = minimize(
            objective_fn,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
        )
        if not result.success:
            raise ValueError(f"Optimization failed: {result.message}")

        weights = np.clip(result.x, min_weight, max_weight)
        weights_sum = float(np.sum(weights))
        if weights_sum <= 0:
            raise ValueError("Optimization produced invalid weights")
        return weights / weights_sum

    @staticmethod
    def _portfolio_volatility(weights: np.ndarray, covariance: np.ndarray) -> float:
        variance = float(np.dot(weights.T, np.dot(covariance, weights)))
        return float(math.sqrt(max(variance, 0.0)))

    @staticmethod
    def _risk_parity_loss(weights: np.ndarray, covariance: np.ndarray) -> float:
        portfolio_var = float(np.dot(weights.T, np.dot(covariance, weights)))
        if portfolio_var <= 0:
            return 1.0
        marginal = np.dot(covariance, weights)
        contributions = weights * marginal / portfolio_var
        target = np.full_like(contributions, 1.0 / len(weights))
        return float(np.sum((contributions - target) ** 2))

    @staticmethod
    def _safe_sharpe(portfolio_return: float, portfolio_volatility: float, risk_free_rate: float) -> float:
        if portfolio_volatility <= 0:
            return 0.0
        return float((portfolio_return - risk_free_rate) / portfolio_volatility)

    @staticmethod
    def _max_drawdown(returns: pd.Series) -> float:
        if returns is None or returns.empty:
            return 0.0
        cumulative = (1.0 + returns.fillna(0.0)).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative / running_max) - 1.0
        return float(abs(drawdown.min())) if not drawdown.empty else 0.0

    @staticmethod
    def _validate_bounds(request: OptimizationRequest) -> None:
        n_assets = len(request.symbols)
        if request.min_weight > request.max_weight:
            raise ValueError("min_weight must be <= max_weight")
        if request.min_weight * n_assets > 1.0:
            raise ValueError("min_weight is too high for the number of assets")
        if request.max_weight * n_assets < 1.0:
            raise ValueError("max_weight is too low for the number of assets")
