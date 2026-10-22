"""Phase 1 success criterion for C1 on synthetic data (spec §5 P1.3, §8)."""

from __future__ import annotations

from pandas.testing import assert_frame_equal

from dq.checks import FAULT_CLASSES, Thresholds
from dq.evaluate import CLASS_RECALL_FLOOR, FALSE_FLAG_TARGET, RECALL_TARGET, evaluate
from dq.fixtures import clean_universe, fault_universe
from dq.scan import DEFAULT_THRESHOLDS


def test_fixtures_are_deterministic_and_labelled():
    assert_frame_equal(clean_universe(3, "2024-01-01", "2024-12-31", seed=5), clean_universe(3, "2024-01-01", "2024-12-31", seed=5))
    frame, labels = fault_universe(1, "2024-01-01", "2025-12-31", seed=5)

    assert [label.fault_class for label in labels] == list(FAULT_CLASSES)
    assert {label.symbol for label in labels} == set(frame["symbol"])


def test_recall_and_false_flag_targets():
    result = evaluate(Thresholds.load(DEFAULT_THRESHOLDS))

    assert result.overall_recall >= RECALL_TARGET, result.recall_by_class
    assert min(result.recall_by_class.values()) >= CLASS_RECALL_FLOOR, result.recall_by_class
    assert result.false_flag_rate < FALSE_FLAG_TARGET, result.clean_flagged_symbol_years
