"""Hand-built series pin every fault class and the insufficient-history state (C1)."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from dq.checks import Thresholds, robust_z, scan_symbol
from dq.scan import DEFAULT_THRESHOLDS
from lifecycle.snapshot import normalize_price_frame


@pytest.fixture(scope="module")
def thresholds() -> Thresholds:
    return Thresholds.load(DEFAULT_THRESHOLDS)


def _series(closes, *, volumes=None, dates=None, symbol="TST") -> pd.DataFrame:
    closes = np.asarray(closes, dtype=float)
    if dates is None:
        dates = pd.bdate_range("2025-01-06", periods=len(closes))
    volumes = np.full(len(closes), 1_000_000.0) if volumes is None else np.asarray(volumes, dtype=float)
    frame = pd.DataFrame({
        "symbol": symbol,
        "timestamp": pd.DatetimeIndex(dates).tz_localize("UTC") + pd.Timedelta(hours=5),
        "open": closes, "high": closes, "low": closes, "close": closes, "volume": volumes,
    })
    return normalize_price_frame(frame)


def _walk(n: int, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.round(100.0 * np.exp(np.cumsum(rng.normal(0.0, 0.01, n))), 4)


def _volumes(n: int, seed: int = 11) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.round(np.exp(rng.normal(14.0, 0.3, n)))


def _classes(result) -> list[tuple[str, str]]:
    return [(finding.fault_class, finding.session_date) for finding in result.findings]


def test_robust_z_matches_hand_calculation():
    z = robust_z(np.array([1.0, 2.0, 3.0, 4.0, 100.0, 2.0]), window=5, min_periods=3)

    assert all(math.isnan(value) for value in z[:3])
    # t=3: median(1,2,3)=2, MAD=1 -> 2/1.4826; t=4: median 2.5, MAD 1 -> 97.5/1.4826;
    # t=5: window (1,2,3,4,100): median 3, MAD 1 -> 1/1.4826
    assert z[3:] == pytest.approx([2 / 1.4826, 97.5 / 1.4826, 1 / 1.4826])


def test_clean_walk_has_no_findings(thresholds):
    result = scan_symbol("TST", _series(_walk(120), volumes=_volumes(120)), thresholds)

    assert result.findings == []
    assert result.insufficient_history is False


def test_short_history_is_insufficient_but_rules_still_run(thresholds):
    closes = _walk(10)
    closes[4] = 0.0
    result = scan_symbol("TST", _series(closes, volumes=_volumes(10)), thresholds)

    assert result.insufficient_history is True
    assert [finding.fault_class for finding in result.findings] == ["non_positive_price"]


def test_non_positive_close_is_reported_and_excluded_from_returns(thresholds):
    closes = _walk(120)
    closes[60] = 0.0
    frame = _series(closes, volumes=_volumes(120))

    result = scan_symbol("TST", frame, thresholds)

    assert _classes(result) == [("non_positive_price", frame["session_date"].iloc[60])]


def test_ohlc_inconsistency_names_the_broken_rule(thresholds):
    frame = _series(_walk(120), volumes=_volumes(120))
    frame.loc[50, "low"] = frame.loc[50, "high"] + 1.5

    result = scan_symbol("TST", frame, thresholds)

    finding = next(f for f in result.findings if f.fault_class == "ohlc_inconsistency")
    assert finding.detail == "close_below_low,low_above_high,open_below_low"
    assert finding.measured_value == pytest.approx(1.5)


def test_duplicate_session_counts_rows(thresholds):
    frame = _series(_walk(120), volumes=_volumes(120))
    extra = frame.iloc[[70]].copy()
    extra["timestamp"] = extra["timestamp"] + pd.Timedelta(hours=6)
    frame = normalize_price_frame(pd.concat([frame.drop(columns="session_date"), extra.drop(columns="session_date")]))

    result = scan_symbol("TST", frame, thresholds)

    finding = next(f for f in result.findings if f.fault_class == "duplicate_session")
    assert (finding.session_date, finding.measured_value) == (frame["session_date"].iloc[70], 2.0)


@pytest.mark.parametrize(("copies", "expected"), [(3, []), (5, [6.0])])
def test_stale_run_reported_from_five_identical_bars(thresholds, copies, expected):
    frame = _series(_walk(120), volumes=_volumes(120))
    columns = ["open", "high", "low", "close", "volume"]
    frame.loc[41 : 40 + copies, columns] = frame.loc[40, columns].to_numpy()

    result = scan_symbol("TST", frame, thresholds)

    assert [f.measured_value for f in result.findings if f.fault_class == "stale_bars"] == expected


@pytest.mark.parametrize(("removed", "expected"), [(2, []), (3, [3.0])])
def test_missing_sessions_from_three_business_days(thresholds, removed, expected):
    dates = pd.bdate_range("2025-01-06", periods=120 + removed).delete(range(60, 60 + removed))

    result = scan_symbol("TST", _series(_walk(120), volumes=_volumes(120), dates=dates), thresholds)

    found = [f for f in result.findings if f.fault_class == "missing_sessions"]
    assert [f.measured_value for f in found] == expected


@pytest.mark.parametrize(("factor", "fault_class"), [(2.0, "unadjusted_split"), (0.1, "unadjusted_reverse_split")])
def test_persistent_price_ratio_is_reported_as_split(thresholds, factor, fault_class):
    closes = _walk(120)
    closes[80:] = np.round(closes[80:] / factor, 4)
    frame = _series(closes, volumes=_volumes(120))

    result = scan_symbol("TST", frame, thresholds)

    assert _classes(result) == [(fault_class, frame["session_date"].iloc[80])]


def test_reverting_spike_is_reported_once(thresholds):
    closes = _walk(120)
    closes[90] = round(closes[90] * 1.6, 4)
    frame = _series(closes, volumes=_volumes(120))

    result = scan_symbol("TST", frame, thresholds)

    assert _classes(result) == [("return_outlier", frame["session_date"].iloc[90])]


def test_persistent_jump_is_not_a_return_outlier(thresholds):
    closes = _walk(120)
    closes[90:] = np.round(closes[90:] * 1.6, 4)

    result = scan_symbol("TST", _series(closes, volumes=_volumes(120)), thresholds)

    assert [f for f in result.findings if f.fault_class == "return_outlier"] == []


def test_volume_burst_and_negative_volume(thresholds):
    volumes = _volumes(120)
    volumes[100] *= 300
    volumes[110] = -5.0
    frame = _series(_walk(120), volumes=volumes)

    result = scan_symbol("TST", frame, thresholds)

    found = [(f.session_date, f.detail) for f in result.findings if f.fault_class == "volume_anomaly"]
    assert found == [
        (frame["session_date"].iloc[100], "log_volume_robust_z"),
        (frame["session_date"].iloc[110], "negative_volume"),
    ]
