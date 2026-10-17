"""Phase 1 success criterion for C1 on synthetic data (spec §5 P1.3, §8)."""

from __future__ import annotations

from pandas.testing import assert_frame_equal

from dq.checks import FAULT_CLASSES
from dq.fixtures import clean_universe, fault_universe


def test_fixtures_are_deterministic_and_labelled():
    assert_frame_equal(clean_universe(3, "2024-01-01", "2024-12-31", seed=5), clean_universe(3, "2024-01-01", "2024-12-31", seed=5))
    frame, labels = fault_universe(1, "2024-01-01", "2025-12-31", seed=5)

    assert [label.fault_class for label in labels] == list(FAULT_CLASSES)
    assert {label.symbol for label in labels} == set(frame["symbol"])
