"""Chronological evaluation partitions with an explicit embargo."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd

from finance_ml.core.contracts import TemporalFold, TrainingConfig


class TemporalSplitError(ValueError):
    """Raised when there is insufficient ordered history for the configured split."""


@dataclass(frozen=True)
class TemporalPlan:
    """All data partitions used during selection, calibration, and final scoring."""

    folds: tuple[TemporalFold, ...]
    final_training_dates: pd.DatetimeIndex
    calibration_dates: pd.DatetimeIndex
    holdout_dates: pd.DatetimeIndex


def unique_trading_dates(values: Iterable[object]) -> pd.DatetimeIndex:
    """Canonicalise a date sequence and reject invalid entries."""

    dates = pd.DatetimeIndex(pd.to_datetime(list(values), errors="coerce")).normalize()
    if dates.isna().any():
        raise TemporalSplitError("signal_date contains invalid values")
    return pd.DatetimeIndex(sorted(dates.unique()))


def build_temporal_plan(dates: Iterable[object], config: TrainingConfig) -> TemporalPlan:
    """Reserve calibration and holdout periods before building expanding folds.

    Validation blocks are contiguous and entirely later than their respective
    training blocks. The intervening ``embargo_sessions`` dates are intentionally
    unused by that fold, preventing overlapping five-session labels from leaking.
    """

    all_dates = unique_trading_dates(dates)
    required = (
        config.holdout_sessions
        + config.calibration_sessions
        + config.fold_count * config.validation_sessions
        + config.embargo_sessions
        + 1
    )
    if len(all_dates) < required:
        raise TemporalSplitError(
            f"Need at least {required} dates for configured temporal evaluation; got {len(all_dates)}"
        )

    development_end = len(all_dates) - config.holdout_sessions
    calibration_start = development_end - config.calibration_sessions
    final_training_dates = all_dates[:calibration_start]
    calibration_dates = all_dates[calibration_start:development_end]
    holdout_dates = all_dates[development_end:]
    first_validation_start = len(final_training_dates) - config.fold_count * config.validation_sessions
    if first_validation_start <= config.embargo_sessions:
        raise TemporalSplitError("Insufficient pre-validation history after applying embargo")

    folds: list[TemporalFold] = []
    for fold_index in range(config.fold_count):
        validation_start_index = first_validation_start + fold_index * config.validation_sessions
        validation_end_index = validation_start_index + config.validation_sessions - 1
        train_end_index = validation_start_index - config.embargo_sessions - 1
        folds.append(
            TemporalFold(
                fold_number=fold_index + 1,
                train_start=final_training_dates[0].date().isoformat(),
                train_end=final_training_dates[train_end_index].date().isoformat(),
                validation_start=final_training_dates[validation_start_index].date().isoformat(),
                validation_end=final_training_dates[validation_end_index].date().isoformat(),
            )
        )
    return TemporalPlan(
        folds=tuple(folds),
        final_training_dates=final_training_dates,
        calibration_dates=calibration_dates,
        holdout_dates=holdout_dates,
    )


def fold_masks(frame: pd.DataFrame, fold: TemporalFold) -> tuple[pd.Series, pd.Series]:
    """Return train and validation masks for a date-indexed feature frame."""

    dates = pd.to_datetime(frame["signal_date"], errors="coerce").dt.normalize()
    if dates.isna().any():
        raise TemporalSplitError("feature frame contains invalid signal_date values")
    train_end = pd.Timestamp(fold.train_end)
    validation_start = pd.Timestamp(fold.validation_start)
    validation_end = pd.Timestamp(fold.validation_end)
    return dates <= train_end, dates.between(validation_start, validation_end, inclusive="both")
