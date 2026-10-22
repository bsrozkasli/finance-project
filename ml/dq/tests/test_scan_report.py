"""Scan reports are replayable, versioned, and refuse unverifiable snapshots (C1)."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone

import pytest

from dq.checks import FAULT_CLASSES, SCAN_VERSION
from dq.fixtures import fault_universe
from dq.scan import main, scan_snapshot, write_outputs
from lifecycle.snapshot import write_price_snapshot

CREATED = datetime(2026, 10, 15, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def snapshot_dir(tmp_path_factory):
    frame, _ = fault_universe(2, "2024-01-01", "2025-12-31", seed=99)
    _, directory = write_price_snapshot(frame, tmp_path_factory.mktemp("snapshots"), source="fixture", adjusted=None, created_at=CREATED)
    return directory


def test_same_snapshot_and_scan_version_give_byte_identical_outputs(snapshot_dir, tmp_path):
    first = write_outputs(scan_snapshot(snapshot_dir), tmp_path / "a")
    second = write_outputs(scan_snapshot(snapshot_dir), tmp_path / "b")

    for name in ("dq-report.json", "dq-summary.md", "review-sheet.csv"):
        assert (first / name).read_bytes() == (second / name).read_bytes()
    assert first.relative_to(tmp_path / "a").parts == (snapshot_dir.name, SCAN_VERSION)


def test_report_records_versions_and_counts_without_wall_clock(snapshot_dir, tmp_path):
    out_dir = write_outputs(scan_snapshot(snapshot_dir), tmp_path)
    text = (out_dir / "dq-report.json").read_text(encoding="utf-8")
    report = json.loads(text)

    assert report["scan_version"] == SCAN_VERSION
    assert report["snapshot_id"] == snapshot_dir.name
    assert report["thresholds_version"] == "dq-thresholds-v1"
    assert len(report["thresholds_sha256"]) == 64
    assert list(report["summary"]["by_fault_class"]) == sorted(FAULT_CLASSES)
    assert report["summary"]["findings"] == len(report["findings"])
    assert "created_at" not in text
    first = report["findings"][0]
    assert set(first) == {"symbol", "session_date", "fault_class", "detail", "measured_value", "threshold"}


def test_review_sheet_samples_at_most_twenty_per_class(snapshot_dir, tmp_path):
    out_dir = write_outputs(scan_snapshot(snapshot_dir), tmp_path)
    rows = list(csv.DictReader(io.StringIO((out_dir / "review-sheet.csv").read_text(encoding="utf-8"))))

    assert rows and all(row["verdict"] == "" for row in rows)
    for fault_class in FAULT_CLASSES:
        assert sum(row["fault_class"] == fault_class for row in rows) <= 20


def test_cli_refuses_tampered_snapshot(snapshot_dir, tmp_path, capsys):
    tampered = tmp_path / snapshot_dir.name
    tampered.mkdir()
    (tampered / "manifest.json").write_bytes((snapshot_dir / "manifest.json").read_bytes())
    (tampered / "prices.parquet").write_bytes(b"not parquet")

    assert main(["--snapshot", str(tampered), "--reports", str(tmp_path / "reports")]) == 2
    assert "scan refused" in capsys.readouterr().err
    assert not (tmp_path / "reports").exists()
