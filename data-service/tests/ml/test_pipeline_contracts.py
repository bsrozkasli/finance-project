"""Tests for orchestration contracts that do not require external data or MLflow."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from finance_ml.core.contracts import TrainingConfig
from finance_ml.core.features import FEATURE_COLUMNS
from finance_ml.core.splits import build_temporal_plan
from finance_ml.models.factories import ModelCandidate
from finance_ml.pipeline import (
    evaluate_candidate,
    load_dataset_specifications,
    load_training_config,
)


def _features() -> pd.DataFrame:
    dates = pd.bdate_range("2023-01-02", periods=32)
    rows = []
    for date_index, signal_date in enumerate(dates):
        for symbol_index, symbol in enumerate(("AAA", "BBB")):
            row = {column: float(date_index + symbol_index + 1) for column in FEATURE_COLUMNS}
            row.update(
                {
                    "signal_date": signal_date,
                    "symbol": symbol,
                    "sector": "TECH" if symbol_index == 0 else "FINANCE",
                    "target": (date_index + symbol_index) % 2,
                    "asset_forward_return": 0.01,
                    "spy_forward_return": 0.005,
                }
            )
            rows.append(row)
    return pd.DataFrame(rows)


def _config() -> TrainingConfig:
    return TrainingConfig(
        holdout_sessions=4,
        calibration_sessions=4,
        fold_count=2,
        validation_sessions=4,
        embargo_sessions=2,
    )


def test_logistic_candidate_produces_only_out_of_fold_predictions() -> None:
    features = _features()
    score = evaluate_candidate(
        features,
        build_temporal_plan(features["signal_date"], _config()),
        ModelCandidate("logistic", {}),
    )

    assert len(score.predictions) == 16
    assert score.predictions["probability"].between(0, 1).all()
    assert "roc_auc" in score.metrics


def test_committed_configs_have_expected_pinned_dataset_roles() -> None:
    package_root = Path(__file__).resolve().parents[2] / "finance_ml" / "config"
    datasets = load_dataset_specifications(package_root / "datasets.lock.json")
    config = load_training_config(package_root / "baseline.toml")

    assert {dataset.role for dataset in datasets} == {"asset_ohlcv", "benchmark_ohlcv"}
    assert config.horizon_sessions == 5
    assert config.embargo_sessions == 5
