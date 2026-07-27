"""MLflow adapter tests with an in-process fake; no tracking server is contacted."""

from __future__ import annotations

import sys
from contextlib import nullcontext
from types import SimpleNamespace

from finance_ml.adapters.mlflow_tracking import log_experiment_run, sqlite_tracking_uri


def test_tracking_uri_uses_local_sqlite_path(tmp_path) -> None:
    assert sqlite_tracking_uri(tmp_path / "mlflow.db").startswith("sqlite:///")


def test_log_run_delegates_to_mlflow_without_network(monkeypatch, tmp_path) -> None:
    calls: list[tuple[str, object]] = []
    fake_mlflow = SimpleNamespace(
        set_tracking_uri=lambda value: calls.append(("uri", value)),
        set_experiment=lambda value: calls.append(("experiment", value)),
        start_run=lambda **kwargs: nullcontext(calls.append(("start", kwargs))),
        log_params=lambda value: calls.append(("params", value)),
        log_metrics=lambda value: calls.append(("metrics", value)),
        log_artifact=lambda value: calls.append(("artifact", value)),
    )
    monkeypatch.setitem(sys.modules, "mlflow", fake_mlflow)
    artifact = tmp_path / "report.json"
    artifact.write_text("{}", encoding="utf-8")

    log_experiment_run(
        tracking_database=tmp_path / "mlflow.db",
        experiment_name="offline-ml",
        run_name="logistic-fold-1",
        parameters={"seed": 42},
        metrics={"roc_auc": 0.61},
        artifact_paths=[artifact],
    )

    assert ("params", {"seed": "42"}) in calls
    assert ("metrics", {"roc_auc": 0.61}) in calls
    assert ("artifact", str(artifact)) in calls
