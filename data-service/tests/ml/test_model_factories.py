"""Model contract tests; skipped only when the optional ML overlay is absent."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

pytest.importorskip("sklearn")

from finance_ml.core.features import FEATURE_COLUMNS
from finance_ml.models.calibration import SigmoidCalibrator
from finance_ml.models.factories import make_logistic_pipeline


def _training_frame() -> pd.DataFrame:
    values = np.arange(8, dtype=float)
    frame = pd.DataFrame({column: values for column in FEATURE_COLUMNS})
    frame["sector"] = ["TECH", "FINANCE"] * 4
    return frame


def test_logistic_pipeline_handles_unseen_sector_without_symbol_identity() -> None:
    model = make_logistic_pipeline().fit(_training_frame(), np.array([0, 1] * 4))
    inference = _training_frame().iloc[:2].copy()
    inference["sector"] = "UNKNOWN"

    probabilities = model.predict_proba(inference)[:, 1]

    assert probabilities.shape == (2,)
    assert np.isfinite(probabilities).all()


def test_sigmoid_calibrator_returns_probabilities_in_unit_interval() -> None:
    calibrator = SigmoidCalibrator().fit(np.array([0.1, 0.2, 0.8, 0.9]), np.array([0, 0, 1, 1]))

    calibrated = calibrator.predict(np.array([0.25, 0.75]))

    assert (calibrated >= 0).all()
    assert (calibrated <= 1).all()
