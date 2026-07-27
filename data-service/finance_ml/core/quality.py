"""Data-quality gates for external OHLCV data."""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd


REQUIRED_MARKET_COLUMNS = frozenset(
    {
        "signal_date",
        "symbol",
        "open",
        "high",
        "low",
        "close",
        "adjusted_close",
        "volume",
    }
)


class DataQualityError(ValueError):
    """Raised when a source cannot safely produce ML observations."""


def assert_required_columns(
    frame: pd.DataFrame, required: Iterable[str] = REQUIRED_MARKET_COLUMNS
) -> None:
    """Ensure a canonical market-data frame has all mandatory columns."""

    missing = sorted(set(required).difference(frame.columns))
    if missing:
        raise DataQualityError(f"Missing required market columns: {', '.join(missing)}")


def assert_market_data_quality(frame: pd.DataFrame) -> None:
    """Validate dates, keys, OHLC relationships, and non-negative volume."""

    assert_required_columns(frame)
    if frame.empty:
        raise DataQualityError("Market data is empty")
    if frame["signal_date"].isna().any():
        raise DataQualityError("signal_date contains missing or invalid values")
    if frame["symbol"].isna().any() or (frame["symbol"].astype(str).str.strip() == "").any():
        raise DataQualityError("symbol contains missing values")
    if frame.duplicated(["symbol", "signal_date"]).any():
        raise DataQualityError("Duplicate symbol/signal_date observations are not allowed")

    numeric_columns = ["open", "high", "low", "close", "adjusted_close", "volume"]
    numeric = frame[numeric_columns].apply(pd.to_numeric, errors="coerce")
    if numeric.isna().any().any() or not np.isfinite(numeric.to_numpy(dtype=float)).all():
        raise DataQualityError("OHLCV columns contain missing or non-finite values")
    if (numeric[["open", "high", "low", "close", "adjusted_close"]] <= 0).any().any():
        raise DataQualityError("Prices and adjusted_close must be positive")
    if (numeric["volume"] < 0).any():
        raise DataQualityError("volume must be non-negative")
    if (numeric["high"] < numeric[["open", "close", "low"]].max(axis=1)).any():
        raise DataQualityError("high must be at least open, close, and low")
    if (numeric["low"] > numeric[["open", "close", "high"]].min(axis=1)).any():
        raise DataQualityError("low must be no greater than open, close, and high")


def sort_market_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Return a stable, canonical ordering after quality validation."""

    assert_market_data_quality(frame)
    return frame.sort_values(["symbol", "signal_date"], kind="stable").reset_index(drop=True)
