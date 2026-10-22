"""Rolling-origin walk-forward evaluation with the QLIKE loss (sandbox lesson 1)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sandbox.lesson01_garch.models import GarchParams, ewma_variance_path, fit_garch, garch_variance_path

EWMA_DECAY = 0.94  # RiskMetrics daily decay


def qlike(proxy: np.ndarray, forecast: np.ndarray) -> float:
    """Mean of proxy/forecast - ln(proxy/forecast) - 1 (Patton 2011); 0 for a perfect forecast."""
    proxy, forecast = np.asarray(proxy, dtype=float), np.asarray(forecast, dtype=float)
    if np.any(proxy <= 0) or np.any(forecast <= 0):
        raise ValueError("QLIKE needs strictly positive proxies and forecasts")
    ratio = proxy / forecast
    return float(np.mean(ratio - np.log(ratio) - 1.0))


@dataclass(frozen=True)
class WalkForward:
    index: np.ndarray            # positions of the forecast days
    garch_forecast: np.ndarray
    ewma_forecast: np.ndarray
    refits: tuple[GarchParams, ...]


def walk_forward(returns: np.ndarray, initial_train: int = 2000, refit_every: int = 250) -> WalkForward:
    """Expanding-window GARCH refit every ``refit_every`` days; each forecast uses only earlier returns."""
    index_blocks, garch_blocks, refits = [], [], []
    for start in range(initial_train, len(returns), refit_every):
        stop = min(start + refit_every, len(returns))
        train = returns[:start]
        params = fit_garch(train).params
        path = garch_variance_path(returns[:stop], params, float(np.var(train)))
        index_blocks.append(np.arange(start, stop))
        garch_blocks.append(path[start:stop])
        refits.append(params)
    index = np.concatenate(index_blocks)
    ewma_path = ewma_variance_path(returns, EWMA_DECAY, float(np.var(returns[:initial_train])))
    return WalkForward(index, np.concatenate(garch_blocks), ewma_path[index], tuple(refits))
