"""Shared utility functions for the data-service."""
from __future__ import annotations

from datetime import timezone
from typing import Optional

import pandas as pd


def to_utc_z(value: object) -> str:
    """Convert a datetime-like value to a UTC ISO-8601 string ending with 'Z'."""
    if value is None:
        return ""
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        ts = ts.tz_localize(timezone.utc)
    else:
        ts = ts.tz_convert(timezone.utc)
    return ts.isoformat().replace("+00:00", "Z")


def safe_div(
    numerator: Optional[float],
    denominator: Optional[float],
    default: Optional[float] = None,
) -> Optional[float]:
    """Safely divide two numbers, returning *default* when the denominator is
    zero, None, or when either operand is None."""
    if numerator is None or denominator is None:
        return default
    if denominator == 0:
        return default
    return float(numerator) / float(denominator)


def safe_pct_change(
    current: Optional[float],
    previous: Optional[float],
    default: Optional[float] = None,
) -> Optional[float]:
    """Return percentage change ``(current - previous) / abs(previous)``
    with safety checks."""
    if current is None or previous is None:
        return default
    if previous == 0:
        return default
    return (float(current) - float(previous)) / abs(float(previous))


def normalize_score(
    value: Optional[float],
    min_val: float,
    max_val: float,
) -> int:
    """Min-max normalize *value* to a 0-100 integer scale.

    Values outside [min_val, max_val] are clamped.
    Returns 0 when *value* is None or when min_val == max_val.
    """
    if value is None or min_val == max_val:
        return 0
    clamped = max(min_val, min(max_val, float(value)))
    return int(round((clamped - min_val) / (max_val - min_val) * 100))
