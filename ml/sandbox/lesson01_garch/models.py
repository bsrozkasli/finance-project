"""GARCH(1,1) and EWMA conditional-variance models (sandbox lesson 1).

Units: returns in percent, so a 1% daily move is ``1.0`` and variances are in %².
``variance_path[t]`` is the variance forecast for ``returns[t]`` made with
``returns[:t]`` only; the last element is the forecast for the next, unseen day.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize

_LOG_2PI = float(np.log(2.0 * np.pi))
_MAX_PERSISTENCE = 0.9999


@dataclass(frozen=True)
class GarchParams:
    omega: float
    alpha: float
    beta: float

    @property
    def persistence(self) -> float:
        return self.alpha + self.beta

    @property
    def unconditional_variance(self) -> float:
        return self.omega / (1.0 - self.persistence)


@dataclass(frozen=True)
class GarchFit:
    params: GarchParams
    negative_log_likelihood: float
    converged: bool


def garch_variance_path(returns: np.ndarray, params: GarchParams, initial_variance: float) -> np.ndarray:
    variance = np.empty(len(returns) + 1)
    variance[0] = initial_variance
    for t, value in enumerate(returns):
        variance[t + 1] = params.omega + params.alpha * value * value + params.beta * variance[t]
    return variance


def ewma_variance_path(returns: np.ndarray, decay: float, initial_variance: float) -> np.ndarray:
    variance = np.empty(len(returns) + 1)
    variance[0] = initial_variance
    for t, value in enumerate(returns):
        variance[t + 1] = decay * variance[t] + (1.0 - decay) * value * value
    return variance


def garch_negative_log_likelihood(returns: np.ndarray, params: GarchParams, initial_variance: float) -> float:
    variance = garch_variance_path(returns, params, initial_variance)[:-1]
    return float(0.5 * np.sum(_LOG_2PI + np.log(variance) + returns * returns / variance))


def fit_garch(returns: np.ndarray) -> GarchFit:
    """Gaussian maximum likelihood with L-BFGS-B; alpha + beta < 1 enforced by a penalty."""
    sample_variance = float(np.var(returns))

    def objective(vector: np.ndarray) -> float:
        params = GarchParams(*vector)
        if params.persistence >= _MAX_PERSISTENCE:
            return 1e12
        return garch_negative_log_likelihood(returns, params, sample_variance)

    start = np.array([0.1 * sample_variance, 0.05, 0.85])
    bounds = [(1e-8, 10.0 * sample_variance), (0.0, 0.5), (0.0, _MAX_PERSISTENCE)]
    result = minimize(objective, start, method="L-BFGS-B", bounds=bounds)
    return GarchFit(GarchParams(*map(float, result.x)), float(result.fun), bool(result.success))
