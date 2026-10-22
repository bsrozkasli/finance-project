r"""Aggregate the owner's filled review sheet into counts safe to commit (C1, D-3 input).

Usage (from ``ml/``)::

    .\.venv\Scripts\python.exe -m dq.review_summary reports/dq/<snapshot_id>/<scan_version>/review-sheet.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

from dq.checks import FAULT_CLASSES

VERDICTS = ("true", "false", "unsure")


class ReviewIncompleteError(ValueError):
    """A sampled finding has no verdict or an unknown verdict."""


def summarize(sheet: Path) -> str:
    with sheet.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    bad = [index + 2 for index, row in enumerate(rows) if row["verdict"].strip().lower() not in VERDICTS]
    if bad:
        raise ReviewIncompleteError(f"rows without a true/false/unsure verdict: {bad}")
    counts = Counter((row["fault_class"], row["verdict"].strip().lower()) for row in rows)
    lines = [
        "| Fault class | Reviewed | True | False | Unsure | Precision (true / (true + false)) |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for fault_class in FAULT_CLASSES:
        true, false, unsure = (counts[(fault_class, verdict)] for verdict in VERDICTS)
        decided = true + false
        precision = f"{true / decided:.2f}" if decided else "n/a"
        lines.append(f"| {fault_class} | {true + false + unsure} | {true} | {false} | {unsure} | {precision} |")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Summarize a filled C1 review sheet")
    parser.add_argument("sheet", type=Path)
    args = parser.parse_args(argv)
    try:
        print(summarize(args.sheet), end="")
    except ReviewIncompleteError as exc:
        print(f"review incomplete: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
