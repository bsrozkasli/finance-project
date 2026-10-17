"""Simulate GARCH(1,1) returns with known parameters (sandbox lesson 1)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sandbox.lesson01_garch.models import GarchParams

TRUE_PARAMS = GarchParams(omega=0.02, alpha=0.08, beta=0.90)  # 1% daily volatility, persistence 0.98


@dataclass(frozen=True)
class GarchPath:
    returns: np.ndarray    # percent returns
    variances: np.ndarray  # true conditional variance of each return


def simulate_garch(n: int, params: GarchParams, seed: int, burn_in: int = 500) -> GarchPath:
    rng = np.random.default_rng(seed)
    shocks = rng.standard_normal(n + burn_in)
    returns = np.empty(n + burn_in)
    variances = np.empty(n + burn_in)
    variance = params.unconditional_variance
    for t in range(n + burn_in):
        variances[t] = variance
        returns[t] = np.sqrt(variance) * shocks[t]
        variance = params.omega + params.alpha * returns[t] ** 2 + params.beta * variance
    return GarchPath(returns[burn_in:], variances[burn_in:])
