"""Typed contracts shared by the offline ML pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DatasetSpecification:
    """A pinned external dataset and its expected provenance."""

    name: str
    handle: str
    version: int
    license: str
    role: str


@dataclass(frozen=True)
class TrainingConfig:
    """Temporal-validation and strategy settings for the baseline."""

    horizon_sessions: int = 5
    warmup_sessions: int = 200
    holdout_sessions: int = 252
    fold_count: int = 5
    validation_sessions: int = 126
    embargo_sessions: int = 5
    calibration_sessions: int = 126
    rebalance_sessions: int = 5
    probability_threshold: float = 0.55
    max_positions: int = 10
    transaction_cost_bps: float = 10.0


@dataclass(frozen=True)
class WorkspacePaths:
    """All generated ML outputs; the directory is intentionally gitignored."""

    root: Path

    @property
    def raw_dir(self) -> Path:
        return self.root / "raw"

    @property
    def prepared_dir(self) -> Path:
        return self.root / "prepared"

    @property
    def feature_dir(self) -> Path:
        return self.root / "features"

    @property
    def model_dir(self) -> Path:
        return self.root / "models"

    @property
    def report_dir(self) -> Path:
        return self.root / "reports"

    @property
    def mlflow_db(self) -> Path:
        return self.root / "mlflow.db"


@dataclass(frozen=True)
class TemporalFold:
    """A date-based split with an explicit embargo before validation."""

    fold_number: int
    train_start: str
    train_end: str
    validation_start: str
    validation_end: str
