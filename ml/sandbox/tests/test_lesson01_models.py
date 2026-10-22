"""Lesson 1 models: GARCH(1,1) and EWMA recursions, likelihood, simulation, recovery.

Expected values come from hand-worked recursions or from the known simulation
parameters, never from the fitted output itself.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from sandbox.lesson01_garch.models import (
    GarchParams,
    ewma_variance_path,
    fit_garch,
    garch_negative_log_likelihood,
    garch_variance_path,
)
from sandbox.lesson01_garch.simulate import TRUE_PARAMS, simulate_garch

SEED = 20261015

@pytest.fixture(scope="module")
def path():
    return simulate_garch(5000, TRUE_PARAMS, SEED)


def test_true_parameters_describe_one_percent_daily_volatility():
    assert TRUE_PARAMS.persistence == pytest.approx(0.98)
    assert TRUE_PARAMS.unconditional_variance == pytest.approx(1.0)


def test_garch_recursion_matches_hand_calculation():
    # h1 = 0.1 + 0.2*1^2 + 0.7*1 = 1.0 ; h2 = 0.1 + 0.2*(-2)^2 + 0.7*1.0 = 1.6
    variance = garch_variance_path(np.array([1.0, -2.0]), GarchParams(0.1, 0.2, 0.7), initial_variance=1.0)
    assert variance.tolist() == pytest.approx([1.0, 1.0, 1.6])


def test_ewma_recursion_matches_hand_calculation():
    # h1 = 0.94*1 + 0.06*1 = 1.0 ; h2 = 0.94*1.0 + 0.06*4 = 1.18
    variance = ewma_variance_path(np.array([1.0, -2.0]), decay=0.94, initial_variance=1.0)
    assert variance.tolist() == pytest.approx([1.0, 1.0, 1.18])


def test_negative_log_likelihood_matches_hand_calculation():
    # one return r=1 with variance 1: 0.5 * (ln(2*pi) + ln(1) + 1)
    value = garch_negative_log_likelihood(np.array([1.0]), GarchParams(0.1, 0.2, 0.7), initial_variance=1.0)
    assert value == pytest.approx(0.5 * (math.log(2 * math.pi) + 1.0))


def test_simulation_is_deterministic_and_matches_its_parameters(path):
    again = simulate_garch(5000, TRUE_PARAMS, SEED)

    assert np.array_equal(path.returns, again.returns)
    assert np.var(path.returns) == pytest.approx(TRUE_PARAMS.unconditional_variance, rel=0.25)


def test_fit_recovers_simulated_parameters(path):
    fit = fit_garch(path.returns)

    assert fit.converged
    assert fit.params.alpha == pytest.approx(TRUE_PARAMS.alpha, abs=0.03)
    assert fit.params.beta == pytest.approx(TRUE_PARAMS.beta, abs=0.05)
    assert fit.params.persistence == pytest.approx(TRUE_PARAMS.persistence, abs=0.02)
    assert fit.params.unconditional_variance == pytest.approx(TRUE_PARAMS.unconditional_variance, rel=0.25)
