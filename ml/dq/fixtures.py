"""Deterministic synthetic price universes for evaluating the scanner (C1).

Clean series follow GARCH(1,1) with Student-t(5) innovations so they have the
volatility clustering and fat tails real prices have. Fault series are clean
series with exactly one injected fault and a ground-truth label. Nothing here
reads provider data.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from dq.checks import FAULT_CLASSES

_HOLIDAYS_PER_YEAR = 9
_HOLIDAY_SPACING = 5
_SPLIT_FACTORS = (1.5, 2.0, 3.0, 4.0, 5.0, 10.0)
_REVERSE_SPLIT_FACTORS = (2.0, 5.0, 10.0, 20.0)


@dataclass(frozen=True)
class InjectedFault:
    symbol: str
    fault_class: str
    start: str  # first session date at which a finding counts as a detection
    end: str    # last session date at which a finding counts as a detection


def trading_calendar(start: str, end: str, rng: np.random.Generator) -> pd.DatetimeIndex:
    """Business days minus nine isolated holidays per year, shared by every symbol.

    Like exchange holidays, no two closures fall within five business days of each other.
    """
    days = pd.bdate_range(start, end)
    closed: list[int] = []
    for year in sorted(set(days.year)):
        positions = np.flatnonzero(days.year == year)
        chosen = 0
        for position in rng.permutation(positions):
            if chosen == _HOLIDAYS_PER_YEAR:
                break
            if all(abs(int(position) - other) > _HOLIDAY_SPACING for other in closed):
                closed.append(int(position))
                chosen += 1
    return days.delete(sorted(closed))


def clean_series(symbol: str, calendar: pd.DatetimeIndex, rng: np.random.Generator) -> pd.DataFrame:
    n = len(calendar)
    omega, alpha, beta, dof = 0.02, 0.08, 0.90, 5
    burn_in = 250
    shocks = rng.standard_t(dof, n + burn_in) / np.sqrt(dof / (dof - 2))
    variance = omega / (1 - alpha - beta)
    returns_pct = np.empty(n + burn_in)
    for t in range(n + burn_in):
        returns_pct[t] = np.sqrt(variance) * shocks[t]
        variance = omega + alpha * returns_pct[t] ** 2 + beta * variance
    returns = returns_pct[burn_in:] * rng.uniform(0.6, 2.0) / 100.0
    close = rng.uniform(20.0, 500.0) * np.exp(np.cumsum(returns))
    sigma = np.abs(returns).mean()
    open_ = np.concatenate([[close[0]], close[:-1]]) * np.exp(rng.normal(0.0, 0.2 * sigma, n))
    high = np.maximum(open_, close) * np.exp(np.abs(rng.normal(0.0, 0.3 * sigma, n)))
    low = np.minimum(open_, close) * np.exp(-np.abs(rng.normal(0.0, 0.3 * sigma, n)))
    mean_log_volume = rng.uniform(11.0, 16.0)
    log_volume = np.empty(n)
    log_volume[0] = mean_log_volume
    noise = rng.normal(0.0, 0.35, n)
    for t in range(1, n):
        log_volume[t] = mean_log_volume + 0.6 * (log_volume[t - 1] - mean_log_volume) + noise[t] + 8.0 * abs(returns[t])
    return pd.DataFrame({
        "symbol": symbol,
        "timestamp": calendar + pd.Timedelta(hours=5),
        "open": np.round(open_, 4),
        "high": np.round(high, 4),
        "low": np.round(low, 4),
        "close": np.round(close, 4),
        "volume": np.round(np.exp(log_volume)),
    })


def clean_universe(n_symbols: int, start: str, end: str, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    calendar = trading_calendar(start, end, rng)
    frames = [clean_series(f"CLN{index:04d}", calendar, rng) for index in range(n_symbols)]
    return _with_utc(pd.concat(frames, ignore_index=True))


def fault_universe(per_class: int, start: str, end: str, seed: int) -> tuple[pd.DataFrame, list[InjectedFault]]:
    rng = np.random.default_rng(seed)
    calendar = trading_calendar(start, end, rng)
    frames: list[pd.DataFrame] = []
    labels: list[InjectedFault] = []
    for fault_class in FAULT_CLASSES:
        for index in range(per_class):
            symbol = f"F{FAULT_CLASSES.index(fault_class)}{index:03d}"
            series = clean_series(symbol, calendar, rng)
            position = int(rng.integers(100, len(series) - 20))
            series, label = _INJECTORS[fault_class](series, position, rng)
            frames.append(series)
            labels.append(InjectedFault(symbol, fault_class, *label))
    return _with_utc(pd.concat(frames, ignore_index=True)), labels


def _with_utc(frame: pd.DataFrame) -> pd.DataFrame:
    frame["timestamp"] = pd.to_datetime(frame["timestamp"]).dt.tz_localize("UTC")
    return frame


def _day(series: pd.DataFrame, position: int) -> str:
    return series["timestamp"].iloc[position].strftime("%Y-%m-%d")


def _non_positive(series, p, rng):
    value = 0.0 if rng.random() < 0.5 else -float(series.at[p, "close"])
    series.at[p, "close"] = value
    series.at[p, "low"] = value
    return series, (_day(series, p), _day(series, p))


def _ohlc(series, p, rng):
    variant = int(rng.integers(0, 3))
    if variant == 0:
        series.at[p, "low"] = round(series.at[p, "high"] * 1.02, 4)
    elif variant == 1:
        series.at[p, "close"] = round(series.at[p, "high"] * 1.02, 4)
    else:
        series.at[p, "close"] = round(series.at[p, "low"] * 0.98, 4)
    return series, (_day(series, p), _day(series, p))


def _duplicate(series, p, rng):
    extra = series.iloc[[p]].copy()
    extra["timestamp"] = extra["timestamp"] + pd.Timedelta(hours=6)
    extra["close"] = round(float(extra["close"].iloc[0]) * 1.001, 4)
    extra["high"] = max(float(extra["high"].iloc[0]), float(extra["close"].iloc[0]))
    series = pd.concat([series, extra], ignore_index=True).sort_values("timestamp", kind="mergesort").reset_index(drop=True)
    return series, (_day(series, p), _day(series, p))


def _stale(series, p, rng):
    copies = int(rng.integers(5, 10))
    columns = ["open", "high", "low", "close", "volume"]
    series.loc[p + 1 : p + copies, columns] = series.loc[p, columns].to_numpy()
    return series, (_day(series, p), _day(series, p + copies))


def _missing(series, p, rng):
    removed = int(rng.integers(3, 11))
    after = _day(series, p + removed)
    series = series.drop(index=range(p, p + removed)).reset_index(drop=True)
    return series, (after, after)


def _split(series, p, rng):
    factor = float(rng.choice(_SPLIT_FACTORS))
    for column in ("open", "high", "low", "close"):
        series.loc[p:, column] = (series.loc[p:, column] / factor).round(4)
    series.loc[p:, "volume"] = (series.loc[p:, "volume"] * factor).round()
    return series, (_day(series, p), _day(series, p))


def _reverse_split(series, p, rng):
    factor = float(rng.choice(_REVERSE_SPLIT_FACTORS))
    for column in ("open", "high", "low", "close"):
        series.loc[p:, column] = (series.loc[p:, column] * factor).round(4)
    series.loc[p:, "volume"] = (series.loc[p:, "volume"] / factor).round()
    return series, (_day(series, p), _day(series, p))


def _spike(series, p, rng):
    multiplier = rng.uniform(1.3, 2.0) if rng.random() < 0.5 else rng.uniform(0.5, 0.77)
    close = round(float(series.at[p, "close"]) * multiplier, 4)
    series.at[p, "close"] = close
    series.at[p, "high"] = max(float(series.at[p, "high"]), close)
    series.at[p, "low"] = min(float(series.at[p, "low"]), close)
    return series, (_day(series, p), _day(series, p))


def _volume(series, p, rng):
    series.at[p, "volume"] = round(float(series.at[p, "volume"]) * rng.uniform(100.0, 500.0))
    return series, (_day(series, p), _day(series, p))


_INJECTORS = {
    "non_positive_price": _non_positive,
    "ohlc_inconsistency": _ohlc,
    "duplicate_session": _duplicate,
    "stale_bars": _stale,
    "missing_sessions": _missing,
    "unadjusted_split": _split,
    "unadjusted_reverse_split": _reverse_split,
    "return_outlier": _spike,
    "volume_anomaly": _volume,
}
