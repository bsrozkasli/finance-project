r"""Recall and false-flag evaluation on synthetic universes (C1 success criteria).

Usage (from ``ml/``)::

    .\.venv\Scripts\python.exe -m dq.evaluate
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from dq.checks import FAULT_CLASSES, Finding, Thresholds
from dq.fixtures import InjectedFault, clean_universe, fault_universe
from dq.report import flagged_symbol_years, symbol_years
from dq.scan import DEFAULT_THRESHOLDS, scan_frame
from lifecycle.snapshot import normalize_price_frame

SEED = 20261015
CLEAN_SYMBOLS = 200
CLEAN_RANGE = ("2021-01-01", "2025-12-31")
FAULTS_PER_CLASS = 40
FAULT_RANGE = ("2023-01-01", "2025-12-31")
RECALL_TARGET = 0.95
CLASS_RECALL_FLOOR = 0.90
FALSE_FLAG_TARGET = 0.01


@dataclass(frozen=True)
class Evaluation:
    recall_by_class: dict[str, float]
    overall_recall: float
    clean_symbol_years: int
    clean_flagged_symbol_years: int

    @property
    def false_flag_rate(self) -> float:
        return self.clean_flagged_symbol_years / self.clean_symbol_years

    def meets_targets(self) -> bool:
        return (
            self.overall_recall >= RECALL_TARGET
            and min(self.recall_by_class.values()) >= CLASS_RECALL_FLOOR
            and self.false_flag_rate < FALSE_FLAG_TARGET
        )


def detected(label: InjectedFault, findings: list[Finding]) -> bool:
    return any(
        finding.symbol == label.symbol
        and finding.fault_class == label.fault_class
        and label.start <= finding.session_date <= label.end
        for finding in findings
    )


def evaluate(thresholds: Thresholds, seed: int = SEED) -> Evaluation:
    clean = normalize_price_frame(clean_universe(CLEAN_SYMBOLS, *CLEAN_RANGE, seed=seed))
    clean_findings, _ = scan_frame(clean, thresholds)
    faulty_raw, labels = fault_universe(FAULTS_PER_CLASS, *FAULT_RANGE, seed=seed + 1)
    fault_findings, _ = scan_frame(normalize_price_frame(faulty_raw), thresholds)
    hits = {fault_class: [] for fault_class in FAULT_CLASSES}
    for label in labels:
        hits[label.fault_class].append(detected(label, fault_findings))
    recall = {fault_class: sum(flags) / len(flags) for fault_class, flags in hits.items()}
    overall = sum(sum(flags) for flags in hits.values()) / len(labels)
    return Evaluation(recall, overall, symbol_years(clean), flagged_symbol_years(clean_findings))


def main() -> int:
    result = evaluate(Thresholds.load(DEFAULT_THRESHOLDS))
    print(json.dumps({
        "recall_by_class": result.recall_by_class,
        "overall_recall": result.overall_recall,
        "false_flag_rate": result.false_flag_rate,
        "clean_flagged_symbol_years": result.clean_flagged_symbol_years,
        "clean_symbol_years": result.clean_symbol_years,
        "meets_targets": result.meets_targets(),
    }, indent=2, sort_keys=True))
    return 0 if result.meets_targets() else 1


if __name__ == "__main__":
    raise SystemExit(main())
