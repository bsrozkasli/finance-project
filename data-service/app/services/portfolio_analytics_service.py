"""Portfolio Analytics Service â€“ Phase 8.

Extended portfolio analytics: risk decomposition, diversification metrics,
and deterministic stress testing against hardcoded macro scenarios.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

from app.models.portfolio_analytics import (
    PortfolioAnalyticsResponse,
    PortfolioRiskDecomposition,
    ScenarioResult,
)

_MARKET_BENCHMARK = "SPY"


class PortfolioAnalyticsService:
    """Stateless service for extended portfolio risk analytics."""

    MIN_ASSETS = 2
    MIN_DAYS = 30
    MAX_MISSING_RATIO = 0.2
    TRADING_DAYS = 252

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def analyze(
        cls,
        symbols: list[str],
        weights: dict[str, float],
        lookback_days: int = 252,
    ) -> PortfolioAnalyticsResponse:
        """Produce an extended analytics report for a weighted portfolio.

        Parameters
        ----------
        symbols:
            Ticker symbols understood by Yahoo Finance (minimum 2).
        weights:
            Mapping of symbol â†’ portfolio weight.  Values should sum
            to approximately 1.0.
        lookback_days:
            Number of calendar days of history to fetch (default 252).

        Raises
        ------
        ValueError
            If fewer than 2 symbols are provided or insufficient price
            data is available.
        """
        tickers = [s.strip().upper() for s in symbols if s and s.strip()]
        if len(tickers) < cls.MIN_ASSETS:
            raise ValueError(
                f"At least {cls.MIN_ASSETS} assets are required for portfolio analytics"
            )

        # Normalise weights to match cleaned tickers
        w_map: dict[str, float] = {}
        for t in tickers:
            w_map[t] = weights.get(t, weights.get(t.lower(), 0.0))

        # Fetch price data (include SPY for beta computation)
        all_tickers = list(dict.fromkeys(tickers + [_MARKET_BENCHMARK]))
        prices = cls._fetch_price_matrix(all_tickers, lookback_days)

        # Separate benchmark column
        if _MARKET_BENCHMARK not in prices.columns:
            raise ValueError(
                f"Could not retrieve benchmark data for {_MARKET_BENCHMARK}"
            )

        benchmark_prices = prices[_MARKET_BENCHMARK]
        asset_prices = prices[[t for t in tickers if t in prices.columns]]

        if asset_prices.shape[1] < cls.MIN_ASSETS:
            raise ValueError(
                f"Only {asset_prices.shape[1]} asset(s) returned usable data; "
                f"need at least {cls.MIN_ASSETS}"
            )
        if asset_prices.shape[0] < cls.MIN_DAYS:
            raise ValueError(
                f"Only {asset_prices.shape[0]} trading days available; "
                f"need at least {cls.MIN_DAYS}"
            )

        # Align symbols with what survived cleaning
        valid_symbols = list(asset_prices.columns)

        # Daily returns
        asset_returns = asset_prices.pct_change().dropna(how="all")
        benchmark_returns = benchmark_prices.pct_change().dropna()

        # Covariance & correlation matrices (asset-only)
        cov_matrix = asset_returns.cov()
        corr_matrix = asset_returns.corr()

        # Weight vector aligned with valid symbols
        w = np.array([w_map.get(s, 0.0) for s in valid_symbols], dtype=np.float64)
        w_sum = w.sum()
        if w_sum > 0:
            w = w / w_sum  # renormalise after possible symbol drops

        sigma = cov_matrix.values

        # --- Risk decomposition -----------------------------------------------
        risk_decomp = cls._compute_risk_decomposition(
            valid_symbols, w, sigma, corr_matrix, w_map,
        )

        # --- Stress tests -----------------------------------------------------
        betas = cls._compute_betas(asset_returns, benchmark_returns, valid_symbols)
        individual_vols = np.sqrt(np.diag(sigma)) * np.sqrt(cls.TRADING_DAYS)

        stress_tests = cls._run_stress_tests(valid_symbols, w, betas, individual_vols)

        return PortfolioAnalyticsResponse(
            risk_decomposition=risk_decomp,
            stress_tests=stress_tests,
            calculated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Data fetching
    # ------------------------------------------------------------------

    @classmethod
    def _fetch_price_matrix(cls, tickers: list[str], lookback_days: int) -> pd.DataFrame:
        """Download close prices for *tickers* over *lookback_days* calendar days."""
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
            raise ValueError("No historical price data returned for the requested symbols")

        if isinstance(data.columns, pd.MultiIndex):
            if "Close" not in data.columns.get_level_values(0):
                raise ValueError("No close prices returned for the requested symbols")
            prices = data["Close"].copy()
        else:
            # Single-ticker fallback
            if "Close" not in data.columns:
                raise ValueError("No close prices returned for the requested symbols")
            prices = data["Close"].to_frame(name=tickers[0])

        prices = prices.dropna(how="all")
        if prices.empty:
            raise ValueError("Price data is empty after removing all-NaN rows")

        # Drop columns with excessive missing data, then forward-fill gaps
        missing_ratio = prices.isna().mean()
        prices = prices.loc[:, missing_ratio <= cls.MAX_MISSING_RATIO]
        prices = prices.ffill().dropna(how="any")

        if prices.empty:
            raise ValueError("Price data is empty after cleaning missing values")

        return prices

    # ------------------------------------------------------------------
    # Risk decomposition
    # ------------------------------------------------------------------

    @classmethod
    def _compute_risk_decomposition(
        cls,
        symbols: list[str],
        w: np.ndarray,
        sigma: np.ndarray,
        corr_matrix: pd.DataFrame,
        raw_weights: dict[str, float],
    ) -> PortfolioRiskDecomposition:
        """Compute risk contributions, HHI, diversification ratio, and correlation matrix."""

        port_var = float(w.T @ sigma @ w)
        port_vol = math.sqrt(port_var) if port_var > 0 else 0.0

        # Marginal and total risk contributions
        if port_vol > 0:
            marginal_rc = (sigma @ w) / port_vol
            rc = w * marginal_rc
            rc_pct = rc / port_vol
        else:
            marginal_rc = np.zeros_like(w)
            rc_pct = np.zeros_like(w)

        risk_contribution: dict[str, float] = {}
        marginal_risk_contribution: dict[str, float] = {}
        for i, sym in enumerate(symbols):
            risk_contribution[sym] = round(float(rc_pct[i]), 6)
            marginal_risk_contribution[sym] = round(float(marginal_rc[i]), 6)

        # HHI â€“ computed on the *input* weights (before renormalisation)
        hhi = sum(v ** 2 for v in w)
        hhi = float(min(max(hhi, 0.0), 1.0))

        # Diversification ratio
        individual_vols = np.sqrt(np.diag(sigma)) * np.sqrt(cls.TRADING_DAYS)
        weighted_avg_vol = float(np.dot(w, individual_vols))
        port_vol_ann = port_vol * math.sqrt(cls.TRADING_DAYS)
        if port_vol_ann > 0:
            diversification_ratio = weighted_avg_vol / port_vol_ann
        else:
            diversification_ratio = 1.0
        diversification_ratio = max(diversification_ratio, 1.0)

        # Correlation matrix â†’ nested dict
        corr_dict: dict[str, dict[str, float]] = {}
        for sym_row in symbols:
            if sym_row not in corr_matrix.index:
                continue
            corr_dict[sym_row] = {}
            for sym_col in symbols:
                if sym_col not in corr_matrix.columns:
                    continue
                val = corr_matrix.loc[sym_row, sym_col]
                corr_dict[sym_row][sym_col] = round(float(val), 6) if not np.isnan(val) else 0.0

        return PortfolioRiskDecomposition(
            risk_contribution=risk_contribution,
            marginal_risk_contribution=marginal_risk_contribution,
            hhi=round(hhi, 6),
            diversification_ratio=round(diversification_ratio, 6),
            correlation_matrix=corr_dict,
        )

    # ------------------------------------------------------------------
    # Beta computation
    # ------------------------------------------------------------------

    @classmethod
    def _compute_betas(
        cls,
        asset_returns: pd.DataFrame,
        benchmark_returns: pd.Series,
        symbols: list[str],
    ) -> dict[str, float]:
        """Compute beta of each asset vs the market benchmark."""
        betas: dict[str, float] = {}
        bench = benchmark_returns.reindex(asset_returns.index).dropna()
        bench_var = float(bench.var(ddof=1)) if len(bench) > 1 else 0.0

        for sym in symbols:
            if sym not in asset_returns.columns:
                betas[sym] = 1.0
                continue
            asset_ret = asset_returns[sym].reindex(bench.index).dropna()
            common_idx = asset_ret.index.intersection(bench.index)
            if len(common_idx) < 2 or bench_var <= 0:
                betas[sym] = 1.0
                continue
            cov_val = float(np.cov(asset_ret.loc[common_idx].values,
                                   bench.loc[common_idx].values, ddof=1)[0, 1])
            betas[sym] = round(cov_val / bench_var, 6)

        return betas

    # ------------------------------------------------------------------
    # Stress testing
    # ------------------------------------------------------------------

    @classmethod
    def _run_stress_tests(
        cls,
        symbols: list[str],
        w: np.ndarray,
        betas: dict[str, float],
        individual_vols: np.ndarray,
    ) -> list[ScenarioResult]:
        """Execute four hardcoded macro-stress scenarios."""

        scenarios: list[ScenarioResult] = []

        # 1. Market Crash (-20%) â€“ beta-adjusted
        shocks_crash: dict[str, float] = {}
        for sym in symbols:
            shocks_crash[sym] = -0.20 * betas.get(sym, 1.0)
        scenarios.append(cls._build_scenario("Market Crash (-20%)", symbols, w, shocks_crash))

        # 2. Recession â€“ beta-bucket dependent
        shocks_recession: dict[str, float] = {}
        for sym in symbols:
            b = betas.get(sym, 1.0)
            if b > 1.2:
                shocks_recession[sym] = -0.15
            elif b >= 0.8:
                shocks_recession[sym] = -0.08
            else:
                shocks_recession[sym] = -0.03
        scenarios.append(cls._build_scenario("Recession", symbols, w, shocks_recession))

        # 3. Inflation Shock â€“ volatility-dependent
        vol_median = float(np.median(individual_vols)) if len(individual_vols) > 0 else 0.0
        shocks_inflation: dict[str, float] = {}
        for i, sym in enumerate(symbols):
            if i < len(individual_vols) and individual_vols[i] >= vol_median:
                shocks_inflation[sym] = -0.10
            else:
                shocks_inflation[sym] = -0.05
        scenarios.append(cls._build_scenario("Inflation Shock", symbols, w, shocks_inflation))

        # 4. Interest Rate Shock â€“ beta-dependent
        shocks_rate: dict[str, float] = {}
        for sym in symbols:
            b = betas.get(sym, 1.0)
            if b > 1.0:
                shocks_rate[sym] = -0.12
            else:
                shocks_rate[sym] = 0.02
        scenarios.append(cls._build_scenario("Interest Rate Shock", symbols, w, shocks_rate))

        return scenarios

    @classmethod
    def _build_scenario(
        cls,
        name: str,
        symbols: list[str],
        w: np.ndarray,
        shocks: dict[str, float],
    ) -> ScenarioResult:
        """Aggregate individual asset shocks into a portfolio-level scenario result."""
        shock_arr = np.array([shocks.get(s, 0.0) for s in symbols], dtype=np.float64)
        estimated_return = float(np.dot(w, shock_arr))
        estimated_drawdown = abs(estimated_return) if estimated_return < 0 else 0.0

        # Most affected: top-2 by absolute weighted impact (negative)
        weighted_impact = w * shock_arr
        impact_order = np.argsort(weighted_impact)  # ascending â†’ worst first
        most_affected: list[str] = []
        for idx in impact_order[:2]:
            if weighted_impact[idx] < 0:
                most_affected.append(symbols[idx])

        return ScenarioResult(
            scenario_name=name,
            estimated_return=round(estimated_return, 6),
            estimated_drawdown=round(estimated_drawdown, 6),
            most_affected=most_affected,
        )

