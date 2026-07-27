"""Independent timing checks for ML features and labels."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from finance_ml.core.contracts import TrainingConfig
from finance_ml.core.features import FEATURE_COLUMNS, build_feature_frame


def _market_frame(symbol: str, base_price: float, periods: int = 230) -> pd.DataFrame:
    dates = pd.bdate_range("2020-01-02", periods=periods)
    position = np.arange(periods, dtype=float)
    close = base_price + position * 0.15 + np.sin(position / 3.0)
    return pd.DataFrame(
        {
            "signal_date": dates,
            "symbol": symbol,
            "open": close - 0.25,
            "high": close + 0.5,
            "low": close - 0.5,
            "close": close,
            "adjusted_open": close - 0.25,
            "adjusted_high": close + 0.5,
            "adjusted_low": close - 0.5,
            "adjusted_close": close,
            "volume": 1_000_000 + position * 1_000,
        }
    )


def test_label_uses_next_open_and_horizon_close_relative_to_spy() -> None:
    stocks = _market_frame("AAA", 100.0)
    spy = _market_frame("SPY", 400.0)
    config = TrainingConfig(warmup_sessions=200)

    features = build_feature_frame(stocks, spy, config)
    signal_date = stocks.loc[200, "signal_date"]
    row = features.loc[features["signal_date"] == signal_date].iloc[0]
    expected_asset = stocks.loc[205, "adjusted_close"] / stocks.loc[201, "adjusted_open"] - 1
    expected_spy = spy.loc[205, "adjusted_close"] / spy.loc[201, "adjusted_open"] - 1

    assert row["asset_forward_return"] == pytest.approx(expected_asset)
    assert row["spy_forward_return"] == pytest.approx(expected_spy)
    assert row["target"] == int(expected_asset - expected_spy > 0)


def test_future_price_changes_do_not_change_features_known_at_signal_time() -> None:
    stocks = _market_frame("AAA", 100.0)
    spy = _market_frame("SPY", 400.0)
    signal_date = stocks.loc[200, "signal_date"]
    baseline = build_feature_frame(stocks, spy, TrainingConfig(warmup_sessions=200))

    changed = stocks.copy()
    changed.loc[205, ["close", "adjusted_close", "high", "adjusted_high"]] *= 1.5
    modified = build_feature_frame(changed, spy, TrainingConfig(warmup_sessions=200))
    baseline_row = baseline.loc[baseline["signal_date"] == signal_date].iloc[0]
    modified_row = modified.loc[modified["signal_date"] == signal_date].iloc[0]

    for feature in FEATURE_COLUMNS:
        assert modified_row[feature] == pytest.approx(baseline_row[feature])
    assert modified_row["asset_forward_return"] != pytest.approx(baseline_row["asset_forward_return"])
