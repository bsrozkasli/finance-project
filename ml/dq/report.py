"""Versioned, replayable scan reports and the owner review sheet (C1)."""

from __future__ import annotations

import csv
import io
import json
from collections import Counter
from dataclasses import asdict, dataclass

import pandas as pd

from dq.checks import FAULT_CLASSES, SCAN_VERSION, Finding, Thresholds
from lifecycle.snapshot import SnapshotManifest

REPORT_FORMAT_VERSION = 1
REVIEW_SAMPLE_PER_CLASS = 20
REVIEW_COLUMNS = ("symbol", "session_date", "fault_class", "detail", "measured_value", "threshold", "verdict", "note")


@dataclass(frozen=True)
class ScanResult:
    manifest: SnapshotManifest
    thresholds: Thresholds
    findings: list[Finding]
    insufficient_history_symbols: list[str]
    symbol_years: int


def _num(value: float) -> float:
    return float(f"{value:.10g}")


def flagged_symbol_years(findings: list[Finding]) -> int:
    return len({(finding.symbol, finding.session_date[:4]) for finding in findings})


def symbol_years(frame: pd.DataFrame) -> int:
    return int(frame[["symbol"]].assign(year=frame["session_date"].str[:4]).drop_duplicates().shape[0])


def report_json(result: ScanResult) -> str:
    by_class = Counter(finding.fault_class for finding in result.findings)
    payload = {
        "report_format_version": REPORT_FORMAT_VERSION,
        "scan_version": SCAN_VERSION,
        "snapshot_id": result.manifest.snapshot_id,
        "thresholds_version": result.thresholds.thresholds_version,
        "thresholds_sha256": result.thresholds.sha256,
        "summary": {
            "symbols": len(result.manifest.symbols),
            "rows": result.manifest.row_count,
            "findings": len(result.findings),
            "by_fault_class": {fault_class: by_class.get(fault_class, 0) for fault_class in FAULT_CLASSES},
            "symbol_years": result.symbol_years,
            "flagged_symbol_years": flagged_symbol_years(result.findings),
            "insufficient_history_symbols": result.insufficient_history_symbols,
        },
        "findings": [
            {**asdict(finding), "measured_value": _num(finding.measured_value), "threshold": _num(finding.threshold)}
            for finding in result.findings
        ],
    }
    return json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def summary_markdown(result: ScanResult) -> str:
    by_class = Counter(finding.fault_class for finding in result.findings)
    by_symbol = Counter(finding.symbol for finding in result.findings)
    lines = [
        f"# Data-Quality Scan {result.manifest.snapshot_id}",
        "",
        f"- Scan version: `{SCAN_VERSION}`",
        f"- Thresholds: `{result.thresholds.thresholds_version}` (sha256 `{result.thresholds.sha256[:12]}`)",
        f"- Symbols: {len(result.manifest.symbols)}; rows: {result.manifest.row_count}",
        f"- Flagged symbol-years: {flagged_symbol_years(result.findings)} of {result.symbol_years}",
        f"- Insufficient history (not judged): {len(result.insufficient_history_symbols)} symbols",
        "",
        "| Fault class | Findings |",
        "|---|---:|",
        *[f"| {fault_class} | {by_class.get(fault_class, 0)} |" for fault_class in FAULT_CLASSES],
        "",
        "| Symbol | Findings |",
        "|---|---:|",
        *[f"| {symbol} | {count} |" for symbol, count in sorted(by_symbol.items(), key=lambda item: (-item[1], item[0]))[:20]],
    ]
    return "\n".join(lines) + "\n"


def review_sheet_csv(result: ScanResult) -> str:
    """Deterministic sample: up to 20 evenly spaced findings per class, verdict left blank."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(REVIEW_COLUMNS)
    for fault_class in FAULT_CLASSES:
        members = [finding for finding in result.findings if finding.fault_class == fault_class]
        step = max(1, -(-len(members) // REVIEW_SAMPLE_PER_CLASS))
        for finding in members[::step][:REVIEW_SAMPLE_PER_CLASS]:
            writer.writerow([
                finding.symbol, finding.session_date, finding.fault_class, finding.detail,
                _num(finding.measured_value), _num(finding.threshold), "", "",
            ])
    return buffer.getvalue()
