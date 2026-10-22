r"""Offline price-history data-quality scan (C1). Never runs on a request path.

Usage (from ``ml/``)::

    .\.venv\Scripts\python.exe -m dq.scan --snapshot snapshots/<snapshot_id>
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

from dq.checks import SCAN_VERSION, Thresholds, scan_symbol
from dq.report import ScanResult, report_json, review_sheet_csv, summary_markdown, symbol_years
from lifecycle.snapshot import SnapshotError, load_price_snapshot

DEFAULT_THRESHOLDS = Path(__file__).with_name("thresholds.json")
DEFAULT_REPORTS_ROOT = Path("reports") / "dq"


def scan_frame(frame: pd.DataFrame, thresholds: Thresholds):
    findings = []
    insufficient: list[str] = []
    for symbol, rows in frame.groupby("symbol", sort=True):
        result = scan_symbol(symbol, rows.reset_index(drop=True), thresholds)
        findings.extend(result.findings)
        if result.insufficient_history:
            insufficient.append(symbol)
    return sorted(findings), insufficient


def scan_snapshot(snapshot_dir: Path, thresholds_path: Path = DEFAULT_THRESHOLDS) -> ScanResult:
    manifest, frame = load_price_snapshot(snapshot_dir)
    thresholds = Thresholds.load(thresholds_path)
    findings, insufficient = scan_frame(frame, thresholds)
    return ScanResult(manifest, thresholds, findings, insufficient, symbol_years(frame))


def write_outputs(result: ScanResult, reports_root: Path) -> Path:
    out_dir = reports_root / result.manifest.snapshot_id / SCAN_VERSION
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "dq-report.json").write_text(report_json(result), encoding="utf-8", newline="\n")
    (out_dir / "dq-summary.md").write_text(summary_markdown(result), encoding="utf-8", newline="\n")
    (out_dir / "review-sheet.csv").write_text(review_sheet_csv(result), encoding="utf-8", newline="\n")
    return out_dir


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline price-history data-quality scan (C1)")
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--thresholds", type=Path, default=DEFAULT_THRESHOLDS)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS_ROOT)
    args = parser.parse_args(argv)
    try:
        result = scan_snapshot(args.snapshot, args.thresholds)
    except (SnapshotError, FileNotFoundError) as exc:
        print(f"scan refused: {exc}", file=sys.stderr)
        return 2
    print(write_outputs(result, args.reports))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
