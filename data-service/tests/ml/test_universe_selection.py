"""Tests for the deterministic, bounded stock-universe selection rule."""

from __future__ import annotations

import pandas as pd
import pytest

from finance_ml.core.universe import UniverseSelectionError, select_longest_history_universe


def _market_frame(symbols: list[str]) -> pd.DataFrame:
    rows = []
    for index, symbol in enumerate(symbols):
        for date in pd.bdate_range("2024-01-02", periods=index + 1):
            rows.append(
                {
                    "signal_date": date,
                    "symbol": symbol,
                    "open": 10.0,
                    "high": 11.0,
                    "low": 9.0,
                    "close": 10.0,
                    "adjusted_close": 10.0,
                    "volume": 100,
                }
            )
    return pd.DataFrame(rows)


def test_selects_longest_histories_and_breaks_ties_alphabetically() -> None:
    selected = select_longest_history_universe(_market_frame(["AAA", "BBB", "CCC", "DDD"]), 2)

    assert set(selected["symbol"]) == {"CCC", "DDD"}


def test_rejects_request_larger_than_available_universe() -> None:
    with pytest.raises(UniverseSelectionError, match="contains only"):
        select_longest_history_universe(_market_frame(["AAA"]), 2)
