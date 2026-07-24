"""Orchestrate the offline, reproducible ML baseline without web-service coupling."""

from __future__ import annotations

import json
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from finance_ml.adapters.mlflow_tracking import log_experiment_run
from finance_ml.adapters.parquet import (
    normalize_market_frame,
    read_prepared_snapshot,
    write_prepared_snapshot,
)
from finance_ml.core.backtest import BacktestResult, run_ranked_backtest
from finance_ml.core.contracts import DatasetSpecification, TrainingConfig, WorkspacePaths
from finance_ml.core.evaluation import classification_metrics
from finance_ml.core.features import FEATURE_COLUMNS, build_feature_frame
from finance_ml.core.splits import TemporalPlan, build_temporal_plan, fold_masks
from finance_ml.models.calibration import SigmoidCalibrator
from finance_ml.models.factories import (
    ModelCandidate,
    fit_xgboost,
    make_dummy_classifier,
    make_logistic_pipeline,
    xgboost_candidates,
)
from finance_ml.models.persistence import save_model


EXPERIMENT_NAME = "offline-us-stocks-direction-baseline"
MODEL_INPUT_COLUMNS = [*FEATURE_COLUMNS, "sector"]


@dataclass(frozen=True)
class CandidateScore:
    """Aggregate out-of-fold result for one candidate."""

    candidate: ModelCandidate
    metrics: dict[str, float]
    predictions: pd.DataFrame


@dataclass(frozen=True)
class ExperimentResult:
    """Selected model and final untouched-holdout evidence."""

    selected_candidate: ModelCandidate
    cross_validation_metrics: dict[str, float]
    holdout_metrics: dict[str, float]
    backtest: BacktestResult
    report_path: Path
    model_path: Path


def load_dataset_specifications(lock_path: Path) -> tuple[DatasetSpecification, ...]:
    """Load immutable Kaggle coordinates from the committed lock file."""

    payload = json.loads(lock_path.read_text(encoding="utf-8"))
    return tuple(DatasetSpecification(**entry) for entry in payload["datasets"])


def load_training_config(config_path: Path) -> TrainingConfig:
    """Load only the temporal and strategy parameters needed by pure core code."""

    payload = tomllib.loads(config_path.read_text(encoding="utf-8"))
    training = payload["training"]
    strategy = payload["strategy"]
    return TrainingConfig(
        horizon_sessions=training["horizon_sessions"],
        warmup_sessions=training["warmup_sessions"],
        holdout_sessions=training["holdout_sessions"],
        fold_count=training["fold_count"],
        validation_sessions=training["validation_sessions"],
        embargo_sessions=training["embargo_sessions"],
        calibration_sessions=training["calibration_sessions"],
        rebalance_sessions=strategy["rebalance_sessions"],
        probability_threshold=strategy["probability_threshold"],
        max_positions=strategy["max_positions"],
        transaction_cost_bps=strategy["transaction_cost_bps"],
    )


def initialise_workspace(root: Path) -> WorkspacePaths:
    """Create generated-output directories under the ignored ML workspace."""

    paths = WorkspacePaths(root=root)
    for directory in (
        paths.raw_dir,
        paths.prepared_dir,
        paths.feature_dir,
        paths.model_dir,
        paths.report_dir,
    ):
        directory.mkdir(parents=True, exist_ok=True)
    return paths


def prepare_csv_snapshot(csv_path: Path, source_dataset: str, destination: Path) -> dict[str, object]:
    """Validate, adjust, and persist one raw Kaggle CSV file."""

    raw_frame = pd.read_csv(csv_path)
    return write_prepared_snapshot(normalize_market_frame(raw_frame, source_dataset), destination)


def build_and_store_features(
    stocks_path: Path,
    benchmark_path: Path,
    destination: Path,
    config: TrainingConfig,
) -> pd.DataFrame:
    """Build immutable feature observations from two prepared local snapshots."""

    features = build_feature_frame(
        read_prepared_snapshot(stocks_path), read_prepared_snapshot(benchmark_path), config
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    features.to_parquet(destination, index=False, engine="pyarrow")
    return features


def _fit_candidate(
    candidate: ModelCandidate,
    train_frame: pd.DataFrame,
    train_target: pd.Series,
    validation_frame: pd.DataFrame,
    validation_target: pd.Series,
) -> Any:
    if candidate.name == "dummy":
        model = make_dummy_classifier()
        return model.fit(train_frame, train_target)
    if candidate.name == "logistic":
        model = make_logistic_pipeline()
        return model.fit(train_frame, train_target)
    if candidate.name == "xgboost":
        return fit_xgboost(
            train_frame,
            train_target,
            validation_frame,
            validation_target,
            candidate.parameters,
        )
    raise ValueError(f"Unsupported candidate: {candidate.name}")


def _probabilities(model: Any, frame: pd.DataFrame) -> np.ndarray:
    return np.asarray(model.predict_proba(frame)[:, 1], dtype=float)


def evaluate_candidate(features: pd.DataFrame, plan: TemporalPlan, candidate: ModelCandidate) -> CandidateScore:
    """Fit a candidate in each chronological fold and concatenate OOF predictions."""

    prediction_frames: list[pd.DataFrame] = []
    for fold in plan.folds:
        train_mask, validation_mask = fold_masks(features, fold)
        train = features.loc[train_mask]
        validation = features.loc[validation_mask]
        model = _fit_candidate(
            candidate,
            train[MODEL_INPUT_COLUMNS],
            train["target"],
            validation[MODEL_INPUT_COLUMNS],
            validation["target"],
        )
        predictions = validation[
            ["signal_date", "symbol", "target", "asset_forward_return", "spy_forward_return"]
        ].copy()
        predictions["probability"] = _probabilities(model, validation[MODEL_INPUT_COLUMNS])
        prediction_frames.append(predictions)
    oof_predictions = pd.concat(prediction_frames, ignore_index=True)
    return CandidateScore(
        candidate=candidate,
        metrics=classification_metrics(oof_predictions["target"].to_numpy(), oof_predictions["probability"].to_numpy()),
        predictions=oof_predictions,
    )


def _select_candidate(scores: list[CandidateScore]) -> CandidateScore:
    """Prefer AUC, then Brier score; missing AUC is never considered competitive."""

    if not scores:
        raise ValueError("No candidate scores were produced")
    return max(
        scores,
        key=lambda score: (
            -np.inf if np.isnan(score.metrics["roc_auc"]) else score.metrics["roc_auc"],
            -score.metrics["brier_score"],
        ),
    )


def run_experiment(
    feature_path: Path,
    workspace: WorkspacePaths,
    config: TrainingConfig,
    include_xgboost: bool = False,
) -> ExperimentResult:
    """Select, calibrate, score, and persist an offline model on local features."""

    features = pd.read_parquet(feature_path, engine="pyarrow")
    plan = build_temporal_plan(features["signal_date"], config)
    candidates = [ModelCandidate("dummy", {}), ModelCandidate("logistic", {})]
    if include_xgboost:
        candidates.extend(xgboost_candidates())
    scores = [evaluate_candidate(features, plan, candidate) for candidate in candidates]
    selected = _select_candidate(scores)

    final_training = features.loc[features["signal_date"].isin(plan.final_training_dates)]
    calibration = features.loc[features["signal_date"].isin(plan.calibration_dates)]
    holdout = features.loc[features["signal_date"].isin(plan.holdout_dates)]
    if selected.candidate.name == "xgboost":
        early_stop_dates = pd.DatetimeIndex(sorted(final_training["signal_date"].unique()))[-config.validation_sessions :]
        xgb_train = final_training.loc[~final_training["signal_date"].isin(early_stop_dates)]
        xgb_validation = final_training.loc[final_training["signal_date"].isin(early_stop_dates)]
        final_model = _fit_candidate(
            selected.candidate,
            xgb_train[MODEL_INPUT_COLUMNS],
            xgb_train["target"],
            xgb_validation[MODEL_INPUT_COLUMNS],
            xgb_validation["target"],
        )
    else:
        final_model = _fit_candidate(
            selected.candidate,
            final_training[MODEL_INPUT_COLUMNS],
            final_training["target"],
            calibration[MODEL_INPUT_COLUMNS],
            calibration["target"],
        )
    calibrator = SigmoidCalibrator().fit(
        _probabilities(final_model, calibration[MODEL_INPUT_COLUMNS]), calibration["target"].to_numpy()
    )
    holdout_predictions = holdout[
        ["signal_date", "symbol", "target", "asset_forward_return", "spy_forward_return"]
    ].copy()
    holdout_predictions["probability"] = calibrator.predict(
        _probabilities(final_model, holdout[MODEL_INPUT_COLUMNS])
    )
    holdout_metrics = classification_metrics(
        holdout_predictions["target"].to_numpy(), holdout_predictions["probability"].to_numpy()
    )
    backtest = run_ranked_backtest(holdout_predictions, config)
    model_path = workspace.model_dir / "selected-model.joblib"
    save_model((final_model, calibrator), model_path)
    report_path = workspace.report_dir / "latest-experiment.json"
    report = {
        "selected_candidate": selected.candidate.name,
        "selected_parameters": selected.candidate.parameters,
        "cross_validation_metrics": selected.metrics,
        "holdout_metrics": holdout_metrics,
        "strategy_total_return": backtest.strategy_total_return,
        "benchmark_total_return": backtest.benchmark_total_return,
    }
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    log_experiment_run(
        tracking_database=workspace.mlflow_db,
        experiment_name=EXPERIMENT_NAME,
        run_name=selected.candidate.name,
        parameters={**selected.candidate.parameters, "candidate": selected.candidate.name},
        metrics={**holdout_metrics, "strategy_total_return": backtest.strategy_total_return},
        artifact_paths=[report_path, model_path],
    )
    return ExperimentResult(
        selected_candidate=selected.candidate,
        cross_validation_metrics=selected.metrics,
        holdout_metrics=holdout_metrics,
        backtest=backtest,
        report_path=report_path,
        model_path=model_path,
    )
