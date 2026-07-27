"""Tests for date-first, embargoed market-data validation."""

from __future__ import annotations

import pandas as pd
import pytest

from finance_ml.core.contracts import TrainingConfig
from finance_ml.core.splits import TemporalSplitError, build_temporal_plan, fold_masks


def _config() -> TrainingConfig:
    return TrainingConfig(
        holdout_sessions=4,
        calibration_sessions=4,
        fold_count=2,
        validation_sessions=4,
        embargo_sessions=2,
    )


def test_plan_keeps_calibration_and_holdout_after_all_cv_data() -> None:
    dates = pd.bdate_range("2023-01-02", periods=32)

    plan = build_temporal_plan(dates, _config())

    assert len(plan.folds) == 2
    assert len(plan.calibration_dates) == 4
    assert len(plan.holdout_dates) == 4
    assert pd.Timestamp(plan.folds[-1].validation_end) < plan.calibration_dates.min()
    assert plan.calibration_dates.max() < plan.holdout_dates.min()


def test_each_fold_has_an_embargo_and_no_train_validation_overlap() -> None:
    dates = pd.bdate_range("2023-01-02", periods=32)
    frame = pd.DataFrame({"signal_date": dates})

    for fold in build_temporal_plan(dates, _config()).folds:
        train_mask, validation_mask = fold_masks(frame, fold)
        train_end = pd.Timestamp(fold.train_end)
        validation_start = pd.Timestamp(fold.validation_start)
        assert not (train_mask & validation_mask).any()
        assert validation_start - train_end >= pd.Timedelta(days=2)
        assert train_mask.sum() > 0
        assert validation_mask.sum() == 4


def test_plan_rejects_insufficient_history() -> None:
    with pytest.raises(TemporalSplitError, match="Need at least"):
        build_temporal_plan(pd.bdate_range("2023-01-02", periods=10), _config())
