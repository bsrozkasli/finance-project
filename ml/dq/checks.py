"""Deterministic single-series integrity checks for price snapshots (C1).

Rule checks run on every row. Statistical checks run on one bar per session with
a positive close, and only when the symbol has enough history; otherwise the
symbol is reported as insufficient instead of being judged.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from numpy.lib.stride_tricks import sliding_window_view

from lifecycle.hashing import sha256_file

SCAN_VERSION = "dq-scan-1.0.0"
FAULT_CLASSES: tuple[str, ...] = (
    "non_positive_price",
    "ohlc_inconsistency",
    "duplicate_session",
    "stale_bars",
    "missing_sessions",
    "unadjusted_split",
    "unadjusted_reverse_split",
    "return_outlier",
    "volume_anomaly",
)
_MAD_TO_SIGMA = 1.4826


@dataclass(frozen=True, order=True)
class Finding:
    symbol: str
    session_date: str
    fault_class: str
    detail: str
    measured_value: float
    threshold: float


@dataclass(frozen=True)
class Thresholds:
    thresholds_version: str
    min_history_sessions: int
    robust_window_sessions: int
    robust_min_periods: int
    return_spike_robust_z: float
    return_spike_max_net_fraction: float
    volume_robust_z: float
    stale_run_min_bars: int
    missing_sessions_min_business_days: int
    split_factors: tuple[float, ...]
    split_ratio_tolerance: float
    split_persistence_sessions: int
    split_persistence_tolerance: float
    sha256: str

    @classmethod
    def load(cls, path: Path) -> "Thresholds":
        raw = json.loads(path.read_text(encoding="utf-8"))
        raw["split_factors"] = tuple(float(factor) for factor in raw["split_factors"])
        return cls(**raw, sha256=sha256_file(path))


@dataclass(frozen=True)
class SymbolScan:
    findings: list[Finding]
    insufficient_history: bool


def robust_z(values: np.ndarray, window: int, min_periods: int) -> np.ndarray:
    """|x_t - median| / (1.4826 * MAD) over the trailing window that excludes x_t.

    NaN where fewer than ``min_periods`` prior values exist or the MAD is zero.
    """
    n = len(values)
    out = np.full(n, np.nan)
    for t in range(min_periods, min(window, n)):
        out[t] = _z(values[t], values[:t])
    if n > window:
        windows = sliding_window_view(values[:-1], window)  # windows[i] = values[i : i + window]
        medians = np.median(windows, axis=1)
        mads = np.median(np.abs(windows - medians[:, None]), axis=1)
        current = values[window:]
        with np.errstate(divide="ignore", invalid="ignore"):
            z = np.abs(current - medians) / (_MAD_TO_SIGMA * mads)
        out[window:] = np.where(mads > 0, z, np.nan)
    return out


def _z(value: float, history: np.ndarray) -> float:
    median = np.median(history)
    mad = np.median(np.abs(history - median))
    return float(abs(value - median) / (_MAD_TO_SIGMA * mad)) if mad > 0 else float("nan")


def scan_symbol(symbol: str, rows: pd.DataFrame, thresholds: Thresholds) -> SymbolScan:
    """Scan one symbol's rows (snapshot columns, sorted by timestamp)."""
    findings: list[Finding] = []
    findings += _rule_checks(symbol, rows)
    daily = rows.drop_duplicates(subset="session_date", keep="first").reset_index(drop=True)
    findings += _stale_bars(symbol, daily, thresholds)
    findings += _missing_sessions(symbol, daily, thresholds)
    valid = daily[daily["close"] > 0].reset_index(drop=True)
    if len(valid) < thresholds.min_history_sessions:
        return SymbolScan(sorted(findings), insufficient_history=True)
    split_bars, split_findings = _splits(symbol, valid, thresholds)
    findings += split_findings
    findings += _return_spikes(symbol, valid, thresholds, split_bars)
    findings += _volume_anomalies(symbol, valid, thresholds)
    return SymbolScan(sorted(findings), insufficient_history=False)


def _rule_checks(symbol: str, rows: pd.DataFrame) -> list[Finding]:
    out: list[Finding] = []
    for row in rows.itertuples(index=False):
        lowest = min(row.open, row.high, row.low, row.close)
        if lowest <= 0:
            out.append(Finding(symbol, row.session_date, "non_positive_price", "min_ohlc", float(lowest), 0.0))
        violations = {
            "low_above_high": row.low - row.high,
            "open_above_high": row.open - row.high,
            "open_below_low": row.low - row.open,
            "close_above_high": row.close - row.high,
            "close_below_low": row.low - row.close,
        }
        broken = {rule: gap for rule, gap in violations.items() if gap > 0}
        if broken:
            out.append(Finding(
                symbol, row.session_date, "ohlc_inconsistency", ",".join(sorted(broken)), float(max(broken.values())), 0.0,
            ))
        if row.volume < 0:
            out.append(Finding(symbol, row.session_date, "volume_anomaly", "negative_volume", float(row.volume), 0.0))
    counts = rows.groupby("session_date", sort=True).size()
    for session_date, count in counts[counts > 1].items():
        out.append(Finding(symbol, session_date, "duplicate_session", "rows_per_session", float(count), 1.0))
    return out


def _stale_bars(symbol: str, daily: pd.DataFrame, thresholds: Thresholds) -> list[Finding]:
    values = daily[["open", "high", "low", "close", "volume"]].to_numpy()
    out: list[Finding] = []
    start = 0
    for index in range(1, len(values) + 1):
        if index < len(values) and np.array_equal(values[index], values[start]):
            continue
        run = index - start
        if run >= thresholds.stale_run_min_bars:
            out.append(Finding(
                symbol, daily["session_date"].iloc[start], "stale_bars", "identical_ohlcv_run",
                float(run), float(thresholds.stale_run_min_bars),
            ))
        start = index
    return out


def _missing_sessions(symbol: str, daily: pd.DataFrame, thresholds: Thresholds) -> list[Finding]:
    dates = daily["session_date"].to_numpy(dtype="datetime64[D]")
    if len(dates) < 2:
        return []
    missing = np.busday_count(dates[:-1] + np.timedelta64(1, "D"), dates[1:])
    out: list[Finding] = []
    for index in np.flatnonzero(missing >= thresholds.missing_sessions_min_business_days):
        out.append(Finding(
            symbol, str(dates[index + 1]), "missing_sessions", f"after={dates[index]}",
            float(missing[index]), float(thresholds.missing_sessions_min_business_days),
        ))
    return out


def _splits(symbol: str, valid: pd.DataFrame, thresholds: Thresholds) -> tuple[set[int], list[Finding]]:
    closes = valid["close"].to_numpy()
    w = thresholds.split_persistence_sessions
    n = len(closes)
    if n < 2 * w:
        return set(), []
    bars = np.arange(w, n - w + 1)  # bar t needs w bars before it and w bars starting at it
    windows = sliding_window_view(closes, w)
    ratio = closes[bars] / closes[bars - 1]
    persistence = np.median(windows[bars], axis=1) / np.median(windows[bars - w], axis=1)
    split_bars: set[int] = set()
    out: list[Finding] = []
    for position, bar in enumerate(bars):
        for factor in thresholds.split_factors:
            for fault_class, target in (("unadjusted_split", 1.0 / factor), ("unadjusted_reverse_split", factor)):
                if (
                    abs(ratio[position] / target - 1.0) <= thresholds.split_ratio_tolerance
                    and abs(persistence[position] / target - 1.0) <= thresholds.split_persistence_tolerance
                ):
                    split_bars.add(int(bar))
                    out.append(Finding(
                        symbol, valid["session_date"].iloc[bar], fault_class, f"factor={factor:g}",
                        float(ratio[position]), thresholds.split_ratio_tolerance,
                    ))
    return split_bars, out


def _return_spikes(symbol: str, valid: pd.DataFrame, thresholds: Thresholds, split_bars: set[int]) -> list[Finding]:
    log_returns = np.diff(np.log(valid["close"].to_numpy()))  # log_returns[j] moves bar j -> bar j + 1
    z = robust_z(log_returns, thresholds.robust_window_sessions, thresholds.robust_min_periods)
    out: list[Finding] = []
    for j in range(len(log_returns) - 1):
        spike_bar = j + 1
        into, out_of = log_returns[j], log_returns[j + 1]
        if spike_bar in split_bars or spike_bar + 1 in split_bars or np.isnan(z[j]) or np.isnan(z[j + 1]):
            continue
        if (
            z[j] >= thresholds.return_spike_robust_z
            and z[j + 1] >= thresholds.return_spike_robust_z
            and np.sign(into) != np.sign(out_of)
            and abs(into + out_of) <= thresholds.return_spike_max_net_fraction * min(abs(into), abs(out_of))
        ):
            out.append(Finding(
                symbol, valid["session_date"].iloc[spike_bar], "return_outlier", "reverting_spike",
                float(min(z[j], z[j + 1])), thresholds.return_spike_robust_z,
            ))
    return out


def _volume_anomalies(symbol: str, valid: pd.DataFrame, thresholds: Thresholds) -> list[Finding]:
    usable = valid[valid["volume"] >= 0].reset_index(drop=True)
    z = robust_z(np.log1p(usable["volume"].to_numpy()), thresholds.robust_window_sessions, thresholds.robust_min_periods)
    out: list[Finding] = []
    for index in np.flatnonzero(np.nan_to_num(z) >= thresholds.volume_robust_z):
        out.append(Finding(
            symbol, usable["session_date"].iloc[index], "volume_anomaly", "log_volume_robust_z",
            float(z[index]), thresholds.volume_robust_z,
        ))
    return out
