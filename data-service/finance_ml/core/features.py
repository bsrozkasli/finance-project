"""Leakage-safe, date-aligned feature and label construction."""

from __future__ import annotations

import numpy as np
import pandas as pd

from finance_ml.core.contracts import TrainingConfig
from finance_ml.core.quality import DataQualityError, sort_market_frame


FEATURE_COLUMNS = (
    "return_1",
    "return_5",
    "return_10",
    "return_20",
    "excess_return_1",
    "excess_return_5",
    "volatility_5",
    "volatility_10",
    "volatility_20",
    "downside_volatility_20",
    "sma_ratio_5",
    "sma_ratio_10",
    "sma_ratio_20",
    "sma_ratio_50",
    "sma_ratio_200",
    "macd",
    "macd_signal",
    "macd_histogram",
    "rsi_14",
    "bollinger_z_20",
    "atr_ratio_14",
    "volume_change_1",
    "volume_z_20",
    "log_dollar_volume",
    "beta_60",
    "correlation_60",
    "spy_return_1",
    "spy_volatility_20",
    "spy_sma_ratio_50",
)
_ADJUSTED_COLUMNS = ("adjusted_open", "adjusted_high", "adjusted_low")


def _require_adjusted_ohlc(frame: pd.DataFrame, name: str) -> None:
    missing = sorted(set(_ADJUSTED_COLUMNS).difference(frame.columns))
    if missing:
        raise DataQualityError(f"{name} is missing adjusted OHLC columns: {', '.join(missing)}")


def _rsi(price: pd.Series, period: int = 14) -> pd.Series:
    delta = price.diff()
    average_gain = delta.clip(lower=0).rolling(period, min_periods=period).mean()
    average_loss = (-delta.clip(upper=0)).rolling(period, min_periods=period).mean()
    relative_strength = average_gain / average_loss.replace(0, np.nan)
    value = 100 - (100 / (1 + relative_strength))
    return value.where(average_loss != 0, 100.0).where(average_gain != 0, 0.0)


def _stock_features(group: pd.DataFrame, horizon_sessions: int) -> pd.DataFrame:
    group = group.sort_values("signal_date", kind="stable").copy()
    price = group["adjusted_close"]
    returns = price.pct_change()
    group["return_1"] = returns
    for period in (5, 10, 20):
        group[f"return_{period}"] = price.pct_change(period)
    for period in (5, 10, 20):
        group[f"volatility_{period}"] = returns.rolling(period, min_periods=period).std(ddof=0)
    group["downside_volatility_20"] = returns.clip(upper=0).rolling(20, min_periods=20).std(ddof=0)
    for period in (5, 10, 20, 50, 200):
        group[f"sma_ratio_{period}"] = price / price.rolling(period, min_periods=period).mean() - 1

    ema_fast = price.ewm(span=12, adjust=False, min_periods=12).mean()
    ema_slow = price.ewm(span=26, adjust=False, min_periods=26).mean()
    group["macd"] = ema_fast - ema_slow
    group["macd_signal"] = group["macd"].ewm(span=9, adjust=False, min_periods=9).mean()
    group["macd_histogram"] = group["macd"] - group["macd_signal"]
    group["rsi_14"] = _rsi(price)
    rolling_mean = price.rolling(20, min_periods=20).mean()
    rolling_std = price.rolling(20, min_periods=20).std(ddof=0)
    group["bollinger_z_20"] = (price - rolling_mean) / rolling_std.replace(0, np.nan)

    previous_close = price.shift(1)
    true_range = pd.concat(
        [
            group["adjusted_high"] - group["adjusted_low"],
            (group["adjusted_high"] - previous_close).abs(),
            (group["adjusted_low"] - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    group["atr_ratio_14"] = true_range.rolling(14, min_periods=14).mean() / price
    group["volume_change_1"] = group["volume"].pct_change()
    volume_mean = group["volume"].rolling(20, min_periods=20).mean()
    volume_std = group["volume"].rolling(20, min_periods=20).std(ddof=0)
    group["volume_z_20"] = (group["volume"] - volume_mean) / volume_std.replace(0, np.nan)
    group["log_dollar_volume"] = np.log1p(price * group["volume"])
    group["asset_forward_return"] = (
        price.shift(-horizon_sessions) / group["adjusted_open"].shift(-1) - 1
    )
    return group


def _benchmark_features(benchmark: pd.DataFrame, horizon_sessions: int) -> pd.DataFrame:
    benchmark = benchmark.sort_values("signal_date", kind="stable").copy()
    price = benchmark["adjusted_close"]
    returns = price.pct_change()
    benchmark["spy_return_1"] = returns
    benchmark["spy_return_5"] = price.pct_change(5)
    benchmark["spy_volatility_20"] = returns.rolling(20, min_periods=20).std(ddof=0)
    benchmark["spy_sma_ratio_50"] = price / price.rolling(50, min_periods=50).mean() - 1
    benchmark["spy_forward_return"] = (
        price.shift(-horizon_sessions) / benchmark["adjusted_open"].shift(-1) - 1
    )
    return benchmark[
        [
            "signal_date",
            "spy_return_1",
            "spy_return_5",
            "spy_volatility_20",
            "spy_sma_ratio_50",
            "spy_forward_return",
        ]
    ]


def build_feature_frame(
    stocks: pd.DataFrame,
    benchmark: pd.DataFrame,
    config: TrainingConfig = TrainingConfig(),
) -> pd.DataFrame:
    """Create features observable at close ``t`` and a five-session target.

    The executable forward return begins at next-session adjusted open and ends
    at adjusted close ``t + horizon``. Feature calculations only use data at or
    before ``t``; no missing values are forward-filled.
    """

    _require_adjusted_ohlc(stocks, "stocks")
    _require_adjusted_ohlc(benchmark, "benchmark")
    stock_data = sort_market_frame(stocks)
    benchmark_data = sort_market_frame(benchmark)
    if benchmark_data["signal_date"].duplicated().any():
        raise DataQualityError("benchmark must have at most one row per signal_date")

    stock_feature_groups = [
        _stock_features(group, config.horizon_sessions)
        for _, group in stock_data.groupby("symbol", sort=False)
    ]
    stock_features = pd.concat(stock_feature_groups, ignore_index=True)
    benchmark_features = _benchmark_features(benchmark_data, config.horizon_sessions)
    frame = stock_features.merge(benchmark_features, on="signal_date", how="inner", validate="many_to_one")
    frame["excess_return_1"] = frame["return_1"] - frame["spy_return_1"]
    frame["excess_return_5"] = frame["return_5"] - frame["spy_return_5"]

    def add_market_relationships(group: pd.DataFrame) -> pd.DataFrame:
        group = group.sort_values("signal_date", kind="stable").copy()
        covariance = group["return_1"].rolling(60, min_periods=60).cov(group["spy_return_1"])
        benchmark_variance = group["spy_return_1"].rolling(60, min_periods=60).var(ddof=0)
        group["beta_60"] = covariance / benchmark_variance.replace(0, np.nan)
        group["correlation_60"] = group["return_1"].rolling(60, min_periods=60).corr(group["spy_return_1"])
        return group

    relationship_groups = [
        add_market_relationships(group) for _, group in frame.groupby("symbol", sort=False)
    ]
    frame = pd.concat(relationship_groups, ignore_index=True)
    frame["sector"] = frame.get("sector", pd.Series("UNKNOWN", index=frame.index)).fillna("UNKNOWN").astype(str)
    frame["excess_forward_return"] = frame["asset_forward_return"] - frame["spy_forward_return"]
    frame["target"] = (frame["excess_forward_return"] > 0).astype("int8")
    frame["observation_number"] = frame.groupby("symbol", sort=False).cumcount()

    required = list(FEATURE_COLUMNS) + ["asset_forward_return", "spy_forward_return", "excess_forward_return"]
    eligible = frame["observation_number"] >= config.warmup_sessions
    result = frame.loc[eligible].dropna(subset=required).copy()
    return result.sort_values(["signal_date", "symbol"], kind="stable").reset_index(drop=True)
