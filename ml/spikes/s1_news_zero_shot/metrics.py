"""Pre-registered S1 metrics: macro-F1 with a support floor, bootstrap CI, confusion matrix."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.metrics import confusion_matrix, f1_score

SUPPORT_FLOOR = 10
BOOTSTRAP_RESAMPLES = 1000
BOOTSTRAP_SEED = 20261015


@dataclass(frozen=True)
class HeadResult:
    labels: tuple[str, ...]
    scored_labels: tuple[str, ...]   # labels with support >= floor; macro-F1 averages over these
    support: dict[str, int]
    macro_f1: float
    ci_low: float
    ci_high: float
    confusion: list[list[int]]        # rows = true label, columns = predicted label, order = labels


def head_result(y_true: list[str], y_pred: list[str], labels: tuple[str, ...], support_floor: int = SUPPORT_FLOOR) -> HeadResult:
    true = np.asarray(y_true)
    pred = np.asarray(y_pred)
    support = {label: int((true == label).sum()) for label in labels}
    scored = tuple(label for label in labels if support[label] >= support_floor)
    if not scored:
        raise ValueError("no label reaches the support floor")
    macro = float(f1_score(true, pred, labels=list(scored), average="macro", zero_division=0))
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    samples = []
    for _ in range(BOOTSTRAP_RESAMPLES):
        pick = rng.integers(0, len(true), len(true))
        samples.append(f1_score(true[pick], pred[pick], labels=list(scored), average="macro", zero_division=0))
    low, high = np.percentile(samples, [2.5, 97.5])
    matrix = confusion_matrix(true, pred, labels=list(labels)).tolist()
    return HeadResult(labels, scored, support, macro, float(low), float(high), matrix)
