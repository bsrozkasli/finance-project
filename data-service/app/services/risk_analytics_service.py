"""Risk Analytics Service â€“ Phase 3.

Computes comprehensive risk metrics (volatility, VaR, drawdown, beta, â€¦)
across daily, weekly, and monthly timeframes using yfinance price data.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import yfinance as yf

from app.models.risk import (
    RiskAnalyticsResponse,
    RiskMetrics,
    RiskTimeframe,
    VaRResult,
)

_MARKET_BENCHMARK = "SPY"

_ANNUALIZATION = {
    RiskTimeframe.DAILY: 252,
    RiskTimeframe.WEEKLY: 52,
    RiskTimeframe.MONTHLY: 12,
}


class RiskAnalyticsService:
    """Stateless service that produces risk analytics for a single symbol."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def analyze(
        cls,
        symbol: str,
        risk_free_rate: float = 0.02,
    ) -> RiskAnalyticsResponse:
        """Return a full risk-analytics report for *symbol*.

        Parameters
        ----------
        symbol:
            Ticker symbol understood by Yahoo Finance.
        risk_free_rate:
            Annualised risk-free rate used in Sortino / excess-return
            calculations.  Defaults to 2 %.

        Raises
        ------
        ValueError
            If price data is missing or insufficient for meaningful
            calculations.
        """

        end = datetime.now()
        start = end - timedelta(days=365)

        # Fetch price history for asset and market benchmark
        asset_df = yf.download(symbol, start=start, end=end, progress=False)
        market_df = yf.download(_MARKET_BENCHMARK, start=start, end=end, progress=False)

        if asset_df.empty or len(asset_df) < 30:
            raise ValueError(
                f"Insufficient price data for '{symbol}': "
                f"got {len(asset_df)} rows, need â‰¥ 30."
            )
        if market_df.empty or len(market_df) < 30:
            raise ValueError(
                f"Insufficient market data for '{_MARKET_BENCHMARK}': "
                f"got {len(market_df)} rows, need â‰¥ 30."
            )

        # --- Handle multi-level columns produced by yfinance ----
        if isinstance(asset_df.columns, __import__("pandas").MultiIndex):
            asset_close = asset_df["Close"].iloc[:, 0]
        else:
            asset_close = asset_df["Close"]

        if isinstance(market_df.columns, __import__("pandas").MultiIndex):
            market_close = market_df["Close"].iloc[:, 0]
        else:
            market_close = market_df["Close"]

        # Daily returns
        daily_asset = asset_close.pct_change().dropna()
        daily_market = market_close.pct_change().dropna()

        # Weekly returns (resample to week-end)
        weekly_asset = asset_close.resample("W").last().pct_change().dropna()
        weekly_market = market_close.resample("W").last().pct_change().dropna()

        # Monthly returns
        monthly_asset = asset_close.resample("ME").last().pct_change().dropna()
        monthly_market = market_close.resample("ME").last().pct_change().dropna()

        # Max drawdown (computed from daily returns)
        max_dd = cls._max_drawdown(daily_asset)

        daily_metrics = cls._compute_metrics(
            daily_asset, daily_market,
            _ANNUALIZATION[RiskTimeframe.DAILY],
            risk_free_rate, max_dd, RiskTimeframe.DAILY,
        )
        weekly_metrics = cls._compute_metrics(
            weekly_asset, weekly_market,
            _ANNUALIZATION[RiskTimeframe.WEEKLY],
            risk_free_rate, max_dd, RiskTimeframe.WEEKLY,
        )
        monthly_metrics = cls._compute_metrics(
            monthly_asset, monthly_market,
            _ANNUALIZATION[RiskTimeframe.MONTHLY],
            risk_free_rate, max_dd, RiskTimeframe.MONTHLY,
        )

        return RiskAnalyticsResponse(
            symbol=symbol.upper(),
            daily=daily_metrics,
            weekly=weekly_metrics,
            monthly=monthly_metrics,
            max_drawdown=round(max_dd, 6),
            calculated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @classmethod
    def _compute_metrics(
        cls,
        returns: "pd.Series",
        market_returns: "pd.Series",
        ann_factor: int,
        risk_free_rate: float,
        max_drawdown: float,
        timeframe: RiskTimeframe,
    ) -> RiskMetrics:
        """Build a :class:`RiskMetrics` for one timeframe."""

        ret = np.asarray(returns, dtype=np.float64)
        mkt = np.asarray(market_returns, dtype=np.float64)

        # Align lengths (use the shorter series)
        min_len = min(len(ret), len(mkt))
        ret_aligned = ret[-min_len:]
        mkt_aligned = mkt[-min_len:]

        mean_ret = float(np.mean(ret))
        std_ret = float(np.std(ret, ddof=1)) if len(ret) > 1 else 0.0

        # Volatility
        volatility = std_ret * np.sqrt(ann_factor)

        # Downside volatility
        downside = ret[ret < 0]
        downside_vol = (
            float(np.std(downside, ddof=1)) * np.sqrt(ann_factor)
            if len(downside) > 1
            else 0.0
        )

        # Annualised return (geometric approximation)
        annualized_return = mean_ret * ann_factor

        # Sortino ratio
        sortino: float | None = None
        if downside_vol > 0:
            sortino = round((annualized_return - risk_free_rate) / downside_vol, 6)

        # Calmar ratio
        calmar: float | None = None
        if abs(max_drawdown) > 0:
            calmar = round(annualized_return / abs(max_drawdown), 6)

        # Beta
        beta: float | None = None
        mkt_var = float(np.var(mkt_aligned, ddof=1)) if len(mkt_aligned) > 1 else 0.0
        if mkt_var > 0:
            cov_val = float(np.cov(ret_aligned, mkt_aligned, ddof=1)[0, 1])
            beta = round(cov_val / mkt_var, 6)

        # Tracking error & information ratio
        tracking_error: float | None = None
        information_ratio: float | None = None
        if min_len > 1:
            excess = ret_aligned - mkt_aligned
            te = float(np.std(excess, ddof=1)) * np.sqrt(ann_factor)
            tracking_error = round(te, 6)
            if te > 0:
                information_ratio = round(
                    float(np.mean(excess)) * ann_factor / te, 6
                )

        # VaR
        var_result = cls._compute_var(ret, mean_ret, std_ret)

        return RiskMetrics(
            volatility=round(volatility, 6),
            downside_volatility=round(downside_vol, 6),
            sortino_ratio=sortino,
            calmar_ratio=calmar,
            beta=beta,
            tracking_error=tracking_error,
            information_ratio=information_ratio,
            var=var_result,
            timeframe=timeframe,
        )

    @classmethod
    def _compute_var(
        cls,
        returns: np.ndarray,
        mean_ret: float,
        std_ret: float,
    ) -> VaRResult:
        """Compute Value-at-Risk suite for a return series."""

        # Parametric VaR (positive loss convention)
        var_95 = -(mean_ret - 1.645 * std_ret)
        var_99 = -(mean_ret - 2.326 * std_ret)

        # Conditional VaR (Expected Shortfall) at 95 %
        threshold = -var_95  # actual return threshold (negative number)
        tail = returns[returns < threshold]
        cvar_95 = -float(np.mean(tail)) if len(tail) > 0 else var_95

        # Historical VaR 95 %
        historical_var_95 = -float(np.percentile(returns, 5))

        # Monte Carlo VaR 95 % (10 000 simulated returns)
        rng = np.random.default_rng(seed=42)
        simulated = rng.normal(loc=mean_ret, scale=std_ret, size=10_000)
        monte_carlo_var_95 = -float(np.percentile(simulated, 5))

        return VaRResult(
            var_95=round(var_95, 6),
            var_99=round(var_99, 6),
            cvar_95=round(cvar_95, 6),
            historical_var_95=round(historical_var_95, 6),
            monte_carlo_var_95=round(monte_carlo_var_95, 6),
        )

    @classmethod
    def _max_drawdown(cls, daily_returns: "pd.Series") -> float:
        """Compute maximum drawdown from a daily return series.

        Returns a positive number representing the largest peak-to-trough
        decline.
        """

        cumulative = (1 + daily_returns).cumprod()
        running_max = cumulative.cummax()
        drawdowns = (cumulative - running_max) / running_max
        max_dd = float(drawdowns.min())
        return abs(max_dd)

