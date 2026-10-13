"""Price-history helpers: bars to DataFrames, session dates, and windows."""

from __future__ import annotations

import math
from datetime import date, datetime, timezone

import pandas as pd
import pytest

from app.providers.base import OHLCVBar
from app.services.price_history import (
    OHLCV_COLUMNS,
    bars_to_frame,
    covering_period,
    fetch_close_matrix,
    fetch_daily_frame,
    to_trading_dates,
)

UTC = timezone.utc


def _bar(timestamp: datetime, close: float, volume: int | None = 1) -> OHLCVBar:
    return OHLCVBar(timestamp=timestamp, open=close, high=close, low=close, close=close, volume=volume)


def test_bars_to_frame_builds_sorted_utc_ohlcv_columns():
    frame = bars_to_frame([
        _bar(datetime(2026, 1, 3, 5, tzinfo=UTC), 2.0, volume=None),
        _bar(datetime(2026, 1, 2, 5, tzinfo=UTC), 1.0, volume=500),
    ])

    assert list(frame.columns) == OHLCV_COLUMNS
    assert str(frame.index.tz) == "UTC"
    assert list(frame["Close"]) == [1.0, 2.0]
    assert frame["Volume"].iloc[0] == 500.0
    assert math.isnan(frame["Volume"].iloc[1])


def test_bars_to_frame_empty_keeps_columns():
    frame = bars_to_frame([])

    assert frame.empty
    assert list(frame.columns) == OHLCV_COLUMNS


@pytest.mark.parametrize(
    "utc_timestamp, session_date",
    [
        (datetime(2026, 1, 2, 5, tzinfo=UTC), date(2026, 1, 2)),   # New York midnight, EST
        (datetime(2026, 7, 2, 4, tzinfo=UTC), date(2026, 7, 2)),   # New York midnight, EDT
        (datetime(2026, 1, 1, 15, tzinfo=UTC), date(2026, 1, 2)),  # Tokyo midnight, JST
        (datetime(2026, 1, 1, 23, tzinfo=UTC), date(2026, 1, 2)),  # Frankfurt midnight, CET
        (datetime(2026, 1, 2, 0, tzinfo=UTC), date(2026, 1, 2)),   # Tiingo UTC date
    ],
)
def test_to_trading_dates_recovers_exchange_session_date(utc_timestamp, session_date):
    frame = to_trading_dates(bars_to_frame([_bar(utc_timestamp, 1.0)]))

    assert frame.index[0] == pd.Timestamp(session_date)
    assert frame.index.tz is None
    assert frame.index.name == "Date"


@pytest.mark.parametrize(
    "days, period",
    [(1, "5d"), (5, "5d"), (6, "1mo"), (28, "1mo"), (29, "3mo"), (252, "1y"),
     (365, "1y"), (366, "2y"), (3650, "10y"), (3653, "max")],
)
def test_covering_period(days, period):
    assert covering_period(days) == period


def test_covering_period_rejects_non_positive():
    with pytest.raises(ValueError):
        covering_period(0)


def test_fetch_daily_frame_trims_window_and_requests_covering_period(scripted_provider):
    closes = {date(2026, 3, 4): 4.0, date(2026, 3, 5): 5.0, date(2026, 3, 9): 9.0, date(2026, 3, 10): 10.0}
    provider = scripted_provider(
        "fx-window",
        ohlcv=[_bar(datetime(d.year, d.month, d.day, 5, tzinfo=UTC), c) for d, c in closes.items()],
    )
    today = date(2026, 3, 10)

    inclusive = fetch_daily_frame(provider, "AAPL", lookback_days=5, adjusted=True, include_today=True, today=today)
    exclusive = fetch_daily_frame(provider, "AAPL", lookback_days=5, adjusted=True, include_today=False, today=today)

    assert list(inclusive["Close"]) == [5.0, 9.0, 10.0]
    assert list(exclusive["Close"]) == [5.0, 9.0]
    assert provider.calls_for("ohlcv")[0] == ("ohlcv", ("AAPL", "1d", "5d"), {"adjusted": True})


def test_fetch_close_matrix_aligns_symbols_and_keeps_missing_as_nan(scripted_provider):
    def day(d: int, close: float) -> OHLCVBar:
        return _bar(datetime(2026, 3, d, 5, tzinfo=UTC), close)

    provider = scripted_provider(
        "fx-matrix",
        ohlcv={"AAPL": [day(6, 100.0), day(9, 103.0)], "MSFT": [day(9, 203.0)], "NODATA": []},
    )

    matrix = fetch_close_matrix(
        provider, ["AAPL", "MSFT", "NODATA"], lookback_days=5, adjusted=True, today=date(2026, 3, 10)
    )

    expected = pd.DataFrame(
        {"AAPL": [100.0, 103.0], "MSFT": [float("nan"), 203.0], "NODATA": [float("nan"), float("nan")]},
        index=pd.DatetimeIndex(["2026-03-06", "2026-03-09"], name="Date"),
    )
    pd.testing.assert_frame_equal(matrix, expected, check_index_type=False, check_freq=False)
