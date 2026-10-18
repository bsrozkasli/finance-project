"""Provider-neutral price-history helpers for analytics services (ADR-0006).

Analytics read price history only through ``MarketDataResolver.get_ohlcv`` and
these helpers, which turn bars into the DataFrame shapes the services consume.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Protocol

import pandas as pd

from app.providers.base import OHLCVBar

OHLCV_COLUMNS = ["Open", "High", "Low", "Close", "Volume"]
DAILY_OR_LONGER_INTERVALS = frozenset({"1d", "5d", "1wk", "1mo", "3mo"})

# Smallest provider period guaranteed to span N calendar days ("1mo" can be 28).
_PERIOD_MIN_DAYS: tuple[tuple[str, int], ...] = (
    ("5d", 5),
    ("1mo", 28),
    ("3mo", 89),
    ("6mo", 181),
    ("1y", 365),
    ("2y", 730),
    ("5y", 1826),
    ("10y", 3652),
)


class OhlcvSource(Protocol):
    def get_ohlcv(
        self, symbol: str, interval: str = "1d", period: str = "1y", adjusted: bool = False
    ) -> list[OHLCVBar]: ...


def bars_to_frame(bars: Iterable[OHLCVBar]) -> pd.DataFrame:
    """OHLCV bars as a float DataFrame indexed by ascending UTC timestamp."""
    rows = list(bars)
    frame = pd.DataFrame(
        {
            "Open": [bar.open for bar in rows],
            "High": [bar.high for bar in rows],
            "Low": [bar.low for bar in rows],
            "Close": [bar.close for bar in rows],
            "Volume": [float("nan") if bar.volume is None else bar.volume for bar in rows],
        },
        index=pd.to_datetime([bar.timestamp for bar in rows], utc=True),
        dtype=float,
    )
    return frame.sort_index()


def to_trading_dates(frame: pd.DataFrame) -> pd.DataFrame:
    """Index daily bars by tz-naive session date, like ``yfinance.download``.

    Daily bars carry exchange-local midnight converted to UTC; rounding to the
    nearest UTC day recovers the session date for exchanges in UTC-11..UTC+11.
    """
    dated = frame.copy()
    dated.index = frame.index.tz_convert("UTC").tz_localize(None).round("D")
    dated.index.name = "Date"
    return dated[~dated.index.duplicated(keep="last")]


def covering_period(lookback_days: int) -> str:
    """Smallest provider period that spans ``lookback_days`` calendar days."""
    if lookback_days < 1:
        raise ValueError("lookback_days must be at least 1")
    for period, min_days in _PERIOD_MIN_DAYS:
        if lookback_days <= min_days:
            return period
    return "max"


def fetch_daily_frame(
    source: OhlcvSource,
    symbol: str,
    *,
    lookback_days: int,
    adjusted: bool,
    include_today: bool,
    today: date | None = None,
) -> pd.DataFrame:
    """Daily OHLCV by session date within ``today - lookback_days`` .. ``today``.

    ``include_today=False`` drops today's session, matching the end-exclusive
    ``yfinance.download(start, end)`` window the portfolio optimizer used.
    """
    session_today = today or datetime.now(UTC).date()
    bars = source.get_ohlcv(symbol, "1d", covering_period(lookback_days), adjusted=adjusted)
    frame = to_trading_dates(bars_to_frame(bars))
    start = pd.Timestamp(session_today - timedelta(days=lookback_days))
    end = pd.Timestamp(session_today)
    upper = frame.index <= end if include_today else frame.index < end
    return frame.loc[(frame.index >= start) & upper]


def fetch_close_matrix(
    source: OhlcvSource,
    symbols: Sequence[str],
    *,
    lookback_days: int,
    adjusted: bool,
    today: date | None = None,
) -> pd.DataFrame:
    """Close prices by session date (rows) and symbol (columns, input order)."""
    closes = {
        symbol: fetch_daily_frame(
            source, symbol, lookback_days=lookback_days, adjusted=adjusted, include_today=False, today=today
        )["Close"]
        for symbol in symbols
    }
    matrix = pd.concat(closes, axis=1).sort_index()
    matrix.index.name = "Date"
    return matrix
