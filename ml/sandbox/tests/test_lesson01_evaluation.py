"""Lesson 1 evaluation: QLIKE and the rolling-origin walk-forward."""

from __future__ import annotations

import math

import numpy as np
import pytest

from sandbox.lesson01_garch.evaluation import qlike, walk_forward
from sandbox.lesson01_garch.simulate import TRUE_PARAMS, simulate_garch

SEED = 20261015

@pytest.fixture(scope="module")
def path():
    return simulate_garch(5000, TRUE_PARAMS, SEED)


@pytest.mark.parametrize(
    ("proxy", "forecast", "expected"),
    [([1.0, 4.0], [1.0, 4.0], 0.0), ([2.0], [1.0], 2.0 - math.log(2.0) - 1.0)],
)
def test_qlike_matches_hand_calculation(proxy, forecast, expected):
    assert qlike(np.array(proxy), np.array(forecast)) == pytest.approx(expected)


def test_qlike_rejects_non_positive_inputs():
    with pytest.raises(ValueError):
        qlike(np.array([0.0]), np.array([1.0]))
    with pytest.raises(ValueError):
        qlike(np.array([1.0]), np.array([-1.0]))


def test_walk_forward_uses_only_past_returns(path):
    cut = 2250  # a refit boundary
    changed = path.returns.copy()
    changed[cut:] *= 3.0

    original = walk_forward(path.returns[:2600])
    perturbed = walk_forward(changed[:2600])

    before = original.index <= cut
    assert np.array_equal(original.garch_forecast[before], perturbed.garch_forecast[before])
    assert np.array_equal(original.ewma_forecast[before], perturbed.ewma_forecast[before])
    assert not np.array_equal(original.garch_forecast[~before], perturbed.garch_forecast[~before])


def test_garch_beats_ewma_on_garch_data(path):
    result = walk_forward(path.returns)
    truth = path.variances[result.index]

    assert len(result.index) == 3000 and len(result.refits) == 12
    assert qlike(truth, result.garch_forecast) < qlike(truth, result.ewma_forecast)
