r"""Convert a read-only ``price_history`` CSV export into a snapshot (ADR-0007 D3).

Usage (from ``ml/``)::

    .\.venv\Scripts\python.exe -m lifecycle.price_export --csv datasets/exports/price_history-YYYYMMDD.csv
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from lifecycle.snapshot import INPUT_COLUMNS, SnapshotSchemaError, write_price_snapshot

SOURCE = "postgres:price_history"
DEFAULT_SNAPSHOTS_ROOT = Path("snapshots")


def read_price_export(csv_path: Path) -> pd.DataFrame:
    """Read the CSV produced by ``dq/export_price_history.sql`` (UTF-8, optional BOM)."""
    frame = pd.read_csv(csv_path, encoding="utf-8-sig", dtype={"symbol": str, "timestamp": str})
    if tuple(frame.columns) != INPUT_COLUMNS:
        raise SnapshotSchemaError(f"unexpected header {tuple(frame.columns)}; expected {INPUT_COLUMNS}")
    return frame


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="price_history CSV export -> snapshot")
    parser.add_argument("--csv", type=Path, required=True)
    parser.add_argument("--snapshots", type=Path, default=DEFAULT_SNAPSHOTS_ROOT)
    args = parser.parse_args(argv)
    try:
        frame = read_price_export(args.csv)
        # price_history records no adjustment flag, so adjustment is unknown (null).
        manifest, directory = write_price_snapshot(
            frame, args.snapshots, source=SOURCE, adjusted=None, created_at=datetime.now(timezone.utc),
        )
    except (SnapshotSchemaError, FileNotFoundError) as exc:
        print(f"export refused: {exc}", file=sys.stderr)
        return 2
    print(f"{manifest.snapshot_id} rows={manifest.row_count} symbols={len(manifest.symbols)} dir={directory}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
