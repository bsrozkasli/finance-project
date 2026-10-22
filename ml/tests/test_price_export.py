"""Read-only price_history export -> snapshot conversion (spec §5 P1.3 input)."""

from __future__ import annotations

import json

from lifecycle.price_export import main

HEADER = "symbol,timestamp,open,high,low,close,volume\n"
ROWS = (
    "AAPL,2026-10-13T04:00:00Z,100.0000,102.0000,99.0000,101.0000,1000000.0000\n"
    "AAPL,2026-10-14T04:00:00Z,101.0000,103.0000,100.5000,102.5000,1100000.0000\n"
)


def test_export_with_bom_becomes_snapshot_with_unknown_adjustment(tmp_path, capsys):
    export = tmp_path / "price_history.csv"
    export.write_bytes(("﻿" + HEADER + ROWS).encode("utf-8"))

    assert main(["--csv", str(export), "--snapshots", str(tmp_path / "snapshots")]) == 0

    snapshot_id = capsys.readouterr().out.split()[0]
    manifest = json.loads((tmp_path / "snapshots" / snapshot_id / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["adjusted"] is None
    assert manifest["source"] == "postgres:price_history"
    assert manifest["row_count"] == 2


def test_unexpected_header_is_refused(tmp_path, capsys):
    export = tmp_path / "price_history.csv"
    export.write_text("asset_id,price_timestamp,open_price,high_price,low_price,close_price,volume\n", encoding="utf-8")

    assert main(["--csv", str(export), "--snapshots", str(tmp_path / "snapshots")]) == 2
    assert "export refused" in capsys.readouterr().err
    assert not (tmp_path / "snapshots").exists()
