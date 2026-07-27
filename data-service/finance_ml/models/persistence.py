"""Safe local artifact persistence for selected offline models."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def save_model(model: Any, destination: Path) -> None:
    """Persist a fitted model atomically enough for a local single-user workflow."""

    try:
        import joblib
    except ImportError as error:  # pragma: no cover - environment configuration
        raise RuntimeError("joblib is required; install requirements-ml.txt") from error
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    joblib.dump(model, temporary)
    temporary.replace(destination)


def load_model(source: Path) -> Any:
    """Load a local model artifact created by :func:`save_model`."""

    try:
        import joblib
    except ImportError as error:  # pragma: no cover - environment configuration
        raise RuntimeError("joblib is required; install requirements-ml.txt") from error
    return joblib.load(source)
