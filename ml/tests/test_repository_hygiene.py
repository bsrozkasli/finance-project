"""Data, snapshots, reports, venvs, and model artifacts never enter git (ADR-0007 D9)."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]

MUST_BE_IGNORED = [
    "ml/.venv/pyvenv.cfg",
    "ml/.venv-s1/pyvenv.cfg",
    "ml/artifacts/c3/1/model_card.json",
    "ml/datasets/s1/headlines.csv",
    "ml/snapshots/price_history-0123456789abcdef/manifest.json",
    "ml/reports/dq/price_history-0123456789abcdef/dq-report.json",
    "ml/lifecycle/stray.parquet",
    "data-service/app/model.onnx",
    "backend/weights.gguf",
    "anywhere/model.joblib",
]

MUST_STAY_TRACKABLE = [
    "ml/README.md",
    "ml/requirements.lock.txt",
    "ml/lifecycle/snapshot.py",
    "ml/dq/thresholds.json",
]

FORBIDDEN_TRACKED_SUFFIXES = (".parquet", ".onnx", ".gguf", ".joblib", ".csv", ".jsonl")
FORBIDDEN_TRACKED_PREFIXES = ("ml/datasets/", "ml/snapshots/", "ml/reports/", "ml/artifacts/", "ml/.venv")


def _is_ignored(path: str) -> bool:
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "--quiet", path],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert result.returncode in (0, 1), result.stderr
    return result.returncode == 0


@pytest.mark.parametrize("path", MUST_BE_IGNORED)
def test_data_and_artifact_paths_are_ignored(path):
    assert _is_ignored(path)


@pytest.mark.parametrize("path", MUST_STAY_TRACKABLE)
def test_code_and_config_paths_are_not_ignored(path):
    assert not _is_ignored(path)


def test_no_tracked_file_is_data_or_artifact():
    tracked = subprocess.run(
        ["git", "ls-files", "--", "ml"], cwd=REPO_ROOT, capture_output=True, text=True, check=True,
    ).stdout.splitlines()

    offenders = [p for p in tracked if p.endswith(FORBIDDEN_TRACKED_SUFFIXES) or p.startswith(FORBIDDEN_TRACKED_PREFIXES)]

    assert offenders == []
