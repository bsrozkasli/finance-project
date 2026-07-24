"""Classification metrics implemented independently of model libraries."""

from __future__ import annotations

import math

import numpy as np


def _as_binary_targets(values: np.ndarray) -> np.ndarray:
    target = np.asarray(values, dtype=int)
    if target.ndim != 1 or not np.isin(target, [0, 1]).all():
        raise ValueError("targets must be a one-dimensional binary array")
    return target


def roc_auc_score(targets: np.ndarray, probabilities: np.ndarray) -> float:
    """Compute AUC using average ranks; return NaN for a one-class sample."""

    target = _as_binary_targets(targets)
    scores = np.asarray(probabilities, dtype=float)
    if len(target) != len(scores):
        raise ValueError("targets and probabilities must have equal length")
    positives = int(target.sum())
    negatives = len(target) - positives
    if positives == 0 or negatives == 0:
        return math.nan
    ranks = np.empty(len(scores), dtype=float)
    sorted_indices = np.argsort(scores, kind="mergesort")
    position = 0
    while position < len(scores):
        end = position + 1
        while end < len(scores) and scores[sorted_indices[end]] == scores[sorted_indices[position]]:
            end += 1
        ranks[sorted_indices[position:end]] = (position + 1 + end) / 2
        position = end
    positive_rank_sum = ranks[target == 1].sum()
    return float((positive_rank_sum - positives * (positives + 1) / 2) / (positives * negatives))


def expected_calibration_error(
    targets: np.ndarray, probabilities: np.ndarray, bins: int = 10
) -> float:
    """Return equal-width expected calibration error."""

    if bins <= 0:
        raise ValueError("bins must be positive")
    target = _as_binary_targets(targets)
    scores = np.clip(np.asarray(probabilities, dtype=float), 0.0, 1.0)
    if len(target) != len(scores):
        raise ValueError("targets and probabilities must have equal length")
    error = 0.0
    for index in range(bins):
        lower, upper = index / bins, (index + 1) / bins
        mask = (scores >= lower) & ((scores < upper) if index < bins - 1 else (scores <= upper))
        if mask.any():
            error += mask.mean() * abs(target[mask].mean() - scores[mask].mean())
    return float(error)


def classification_metrics(targets: np.ndarray, probabilities: np.ndarray) -> dict[str, float]:
    """Return threshold-free and calibration-focused metrics for an experiment."""

    target = _as_binary_targets(targets)
    scores = np.clip(np.asarray(probabilities, dtype=float), 1e-15, 1 - 1e-15)
    if len(target) != len(scores):
        raise ValueError("targets and probabilities must have equal length")
    log_loss = -np.mean(target * np.log(scores) + (1 - target) * np.log(1 - scores))
    return {
        "roc_auc": roc_auc_score(target, scores),
        "brier_score": float(np.mean((scores - target) ** 2)),
        "log_loss": float(log_loss),
        "expected_calibration_error": expected_calibration_error(target, scores),
    }
