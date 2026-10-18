"""Small adapter around local MLflow tracking; core code never imports MLflow."""

from __future__ import annotations

from pathlib import Path
from typing import Mapping, Sequence


def sqlite_tracking_uri(database_path: Path) -> str:
    """Build a platform-safe SQLite URI for a local MLflow database."""

    return f"sqlite:///{database_path.resolve().as_posix()}"


def log_experiment_run(
    *,
    tracking_database: Path,
    experiment_name: str,
    run_name: str,
    parameters: Mapping[str, object],
    metrics: Mapping[str, float],
    artifact_paths: Sequence[Path] = (),
) -> None:
    """Record a local run without exposing the MLflow package to domain code."""

    try:
        import mlflow
    except ImportError as error:  # pragma: no cover - environment configuration
        raise RuntimeError("mlflow is required; install requirements-ml.txt") from error
    tracking_database.parent.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(sqlite_tracking_uri(tracking_database))
    mlflow.set_experiment(experiment_name)
    with mlflow.start_run(run_name=run_name):
        mlflow.log_params({key: str(value) for key, value in parameters.items()})
        mlflow.log_metrics({key: float(value) for key, value in metrics.items()})
        for artifact_path in artifact_paths:
            if artifact_path.is_file():
                mlflow.log_artifact(str(artifact_path))
