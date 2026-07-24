"""Independent Platt/sigmoid calibration for already fitted classifiers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class SigmoidCalibrator:
    """Map raw probabilities to calibrated probabilities using held-out dates."""

    _estimator: Any = field(init=False, repr=False)

    def fit(self, raw_probabilities: np.ndarray, targets: np.ndarray) -> "SigmoidCalibrator":
        try:
            from sklearn.linear_model import LogisticRegression
        except ImportError as error:  # pragma: no cover - environment configuration
            raise RuntimeError("scikit-learn is required; install requirements-ml.txt") from error
        probabilities = np.clip(np.asarray(raw_probabilities, dtype=float), 1e-6, 1 - 1e-6)
        log_odds = np.log(probabilities / (1 - probabilities)).reshape(-1, 1)
        self._estimator = LogisticRegression(max_iter=1_000, random_state=42).fit(log_odds, targets)
        return self

    def predict(self, raw_probabilities: np.ndarray) -> np.ndarray:
        if not hasattr(self, "_estimator"):
            raise RuntimeError("SigmoidCalibrator must be fitted before prediction")
        probabilities = np.clip(np.asarray(raw_probabilities, dtype=float), 1e-6, 1 - 1e-6)
        log_odds = np.log(probabilities / (1 - probabilities)).reshape(-1, 1)
        return self._estimator.predict_proba(log_odds)[:, 1]
