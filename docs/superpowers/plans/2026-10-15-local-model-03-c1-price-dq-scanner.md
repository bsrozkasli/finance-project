# Local Model Decision-Support Plan 3 — C1 Offline Price-History Data-Quality Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline command-line scanner finds nine classes of single-series integrity faults in a frozen `price_history` snapshot, meets recall ≥ 95% and false flags < 1% of symbol-years on a deterministic synthetic suite, writes a byte-replayable versioned report, and produces an owner-reviewed true/false count on the real snapshot as the D-3 input.

**Architecture:** A read-only `psql \copy` export (role `ml_readonly`) produces a CSV; `lifecycle.price_export` turns it into a Plan 2 snapshot. `dq.checks` runs per symbol: rule checks on every row, then statistical checks on one bar per session with a positive close, and only if the symbol has at least 30 such sessions (otherwise the symbol is listed as insufficient, not judged). Thresholds live in a versioned, hashed `dq/thresholds.json` committed before any real data is scanned. `dq.fixtures` generates GARCH(1,1)-t(5) clean series and single-fault series with ground-truth labels; `dq.evaluate` turns them into the spec's success numbers. No trained artifact, no product integration, no request path.

**Tech Stack:** Python 3.13 (`ml/.venv`), numpy (`sliding_window_view`, `busday_count`), pandas 3, pyarrow, pytest; PostgreSQL 16 `psql \copy` in the `finance_postgres` container; PowerShell 5.1.

**Plan Set:** Plan 3 of 5 in `docs/superpowers/plans/2026-10-15-local-model-decision-support-plan-set.md`.

**Depends On:** Plan 2 (`ml/.venv`, `ml/pytest.ini`, `.gitignore` ML section, `lifecycle.snapshot` API, `lifecycle.hashing.sha256_file`).

**Produces:**
- `ml/dq/create_readonly_role.sql`, `ml/dq/export_price_history.sql`, `ml/dq/README.md` (runbook).
- `lifecycle.price_export.read_price_export(csv_path: Path) -> pd.DataFrame`, `lifecycle.price_export.main(argv) -> int`.
- `dq.checks`: `SCAN_VERSION = "dq-scan-1.0.0"`, `FAULT_CLASSES` (9 names), `Finding`, `Thresholds.load(path)`, `SymbolScan`, `robust_z(values, window, min_periods) -> np.ndarray`, `scan_symbol(symbol, rows, thresholds) -> SymbolScan`.
- `dq/thresholds.json` version `dq-thresholds-v1`.
- `dq.fixtures`: `InjectedFault`, `trading_calendar`, `clean_series`, `clean_universe(n_symbols, start, end, seed)`, `fault_universe(per_class, start, end, seed) -> (frame, labels)`.
- `dq.report`: `ScanResult`, `report_json`, `summary_markdown`, `review_sheet_csv`, `flagged_symbol_years`, `symbol_years`.
- `dq.scan`: `scan_frame(frame, thresholds)`, `scan_snapshot(snapshot_dir, thresholds_path)`, `write_outputs(result, reports_root) -> Path`, CLI `python -m dq.scan`.
- `dq.evaluate`: `Evaluation`, `evaluate(thresholds, seed)`, CLI `python -m dq.evaluate`.
- `dq.review_summary`: `summarize(sheet) -> str`, CLI `python -m dq.review_summary`.
- `docs/product/evidence/c1-dq-real-snapshot-review.md` (owner gate, Task 7).

**Spec:** `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` §5 P1.3, §7 D-3/D-4, §8 bullet 3, §9 C1 bullet, §10 risks "no point-in-time data" and "researcher degrees of freedom".

## Locked Decisions

- **Fault classes (exact names and definitions).**

  | Class | Definition | Finding date | `measured_value` | `threshold` |
  |---|---|---|---|---|
  | `non_positive_price` | min(open, high, low, close) ≤ 0 | that session | the minimum | `0` |
  | `ohlc_inconsistency` | any of low > high, open > high, open < low, close > high, close < low; `detail` lists the broken rules, sorted | that session | largest violation | `0` |
  | `duplicate_session` | more than one row maps to a `session_date` (PF-3: mixed intervals) | that session | row count | `1` |
  | `stale_bars` | ≥ 5 consecutive sessions with identical OHLCV | first bar of the run | run length | `5` |
  | `missing_sessions` | ≥ 3 business days absent between consecutive sessions | first session after the gap | absent business days | `3` |
  | `unadjusted_split` | close ratio within 5% of 1/f and the 5-session median ratio within 10% of 1/f, f ∈ {1.5, 2, 3, 4, 5, 8, 10, 15, 20, 25, 50, 100} | first bar at the new level | the ratio | `0.05` |
  | `unadjusted_reverse_split` | the same with f instead of 1/f | first bar at the new level | the ratio | `0.05` |
  | `return_outlier` | reverting spike: two consecutive log returns each with robust z ≥ 8, opposite signs, net move ≤ 50% of the smaller; never on a split bar | spike bar | smaller z | `8` |
  | `volume_anomaly` | robust z of `log1p(volume)` ≥ 8, or volume < 0 (`detail = negative_volume`) | that session | z or the volume | `8` or `0` |

- **Robust z** = |x_t − median| / (1.4826 · MAD) over the trailing 63 values excluding x_t; undefined (no finding) with fewer than 30 prior values or MAD = 0.
- **Why a reverting spike, not every large return.** During planning, a trailing-window robust z ≥ 8 on all returns flagged 16.5% of clean symbol-years (12: 3.6%) because real-like returns are fat-tailed and clustered. Large persistent moves are real events or splits; bad ticks revert. The reverting-spike rule flagged 0.6% with 99.5% spike recall in the planning prototype.
- **Missing sessions without an exchange calendar.** `price_history` has no exchange column, so a single missing business day is indistinguishable from a holiday. The class therefore starts at 3 absent business days; single-day gaps are a documented blind spot, not a finding.
- **Insufficient history is explicit.** Symbols with fewer than 30 positive-close sessions appear in `summary.insufficient_history_symbols`; rule checks still run on them; statistical checks do not.
- **Pre-registration (spec §10).** `dq/thresholds.json` (`dq-thresholds-v1`) is committed in Task 2, before any real snapshot is scanned. The fixture evaluation (Task 5) may lead to a threshold change only before Task 7 starts; any change bumps `thresholds_version` and is recorded in the commit message. After Task 7 starts, thresholds are frozen for Phase 1.
- **Planning evidence for the committed thresholds** (prototype on 2026-10-15, numpy 2.5.4, pandas 3.0.6): overall recall 1.00, every class 1.00, clean false-flag rate 0.006 (6 of 1000 symbol-years) with `split_ratio_tolerance = 0.05`; with 0.03 the split recall dropped to 0.95.
- **Synthetic calendar.** Business days minus nine holidays per year, no two within five business days (random clustering produced 40% false `missing_sessions` flags in planning — an artifact, not a scanner defect).
- **Success numbers.** Overall recall ≥ 0.95 (spec) and every class ≥ 0.90 (plan guard so a weak class cannot hide in the average); false flags < 1% of clean symbol-years. Suites: 200 clean symbols × 2021-2025 (1000 symbol-years, seed 20261015); 40 single-fault symbols per class × 2023-2025 (seed 20261016).
- **Report identity.** Output directory `reports/dq/<snapshot_id>/<scan_version>/` holding `dq-report.json`, `dq-summary.md`, `review-sheet.csv`. JSON uses `sort_keys=True, indent=2`, floats rounded to 10 significant digits, and contains no wall-clock time, so the same snapshot, thresholds, and scan version give identical bytes.
- **Owner data stays local.** Exports, snapshots, reports, and the filled review sheet are under ignored directories. Only the aggregate table from `dq.review_summary` (counts and precision per class; no symbols, dates, or prices) is committed.
- **Read-only export.** Role `ml_readonly` with `default_transaction_read_only = on`, `USAGE` on `public`, `SELECT` on `public.price_history` only, no password (container-local socket only). The role is operational setup, never a Flyway migration.

## Global Constraints

- "**Form:** CLI `ml/dq/scan.py`; never on a request path; no product integration in Phase 1." (spec §5 P1.3)
- "**Input:** a snapshot exported from Postgres `price_history` by a documented read-only SQL export (`\copy` under a read-only role) … No new backend endpoint and no data-service persistence." (spec §5 P1.3)
- "Thresholds live in a versioned `thresholds.json`. No trained artifact in Phase 1." (spec §5 P1.3)
- "a replay test proving the same snapshot and scan version produce a byte-identical report." (spec §9)
- "Never fabricate market data …" — fixtures are labeled synthetic data used only in tests and evaluation; they never enter `snapshots/` of owner data or any product path.
- "Applied Flyway migrations are immutable" — no migration is added.
- Preserve unrelated working-tree changes.

## Review Focus

- **`log(0)` or negative prices crash or poison the statistics.** A zero close must yield exactly one `non_positive_price` finding and no return or split finding. Task 2 `test_non_positive_close_is_reported_and_excluded_from_returns`.
- **A real persistent jump is mislabeled a bad tick.** A +60% move that stays must give no `return_outlier`. Task 2 `test_persistent_jump_is_not_a_return_outlier`.
- **Holiday gaps flood the report.** Two absent business days must give no finding; three must. Task 2 `test_missing_sessions_from_three_business_days`; calendar realism in Task 5 `test_recall_and_false_flag_targets` (false-flag rate < 1%).
- **Short series judged as clean.** A 10-session symbol must be reported as insufficient while its zero price is still found. Task 2 `test_short_history_is_insufficient_but_rules_still_run`.
- **A corrupt snapshot produces a report anyway.** A snapshot whose Parquet fails its hash must exit 2 and write nothing. Task 4 `test_cli_refuses_tampered_snapshot`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `ml/dq/__init__.py` | Create | Empty package marker |
| `ml/dq/tests/__init__.py` | Create | Empty package marker |
| `ml/dq/create_readonly_role.sql` | Create | One-time read-only role |
| `ml/dq/export_price_history.sql` | Create | `\copy` export to STDOUT |
| `ml/dq/README.md` | Create | Runbook: export → snapshot → scan → review |
| `ml/lifecycle/price_export.py` | Create | CSV export → snapshot |
| `ml/tests/test_price_export.py` | Create | Export conversion |
| `ml/dq/thresholds.json` | Create | Pre-registered thresholds v1 |
| `ml/dq/checks.py` | Create | Fault-class checks |
| `ml/dq/tests/test_checks.py` | Create | Hand-built series per class |
| `ml/dq/fixtures.py` | Create | Synthetic clean and fault universes |
| `ml/dq/report.py` | Create | JSON report, Markdown summary, review sheet |
| `ml/dq/scan.py` | Create | Scan orchestration and CLI |
| `ml/dq/tests/test_scan_report.py` | Create | Replay, versions, refusal |
| `ml/dq/evaluate.py` | Create | Recall / false-flag evaluation |
| `ml/dq/tests/test_fixture_suite.py` | Create | Determinism and success criterion |
| `ml/dq/review_summary.py` | Create | Review sheet aggregation |
| `ml/dq/tests/test_review_summary.py` | Create | Aggregation and refusal |
| `ml/pytest.ini` | Modify | `testpaths = tests dq/tests` |
| `docs/product/evidence/c1-dq-real-snapshot-review.md` | Create | Owner-reviewed aggregate counts |

Test counts below assume this plan runs directly after Plan 2 (26 tests). If Plan 5 ran first, add its 13 tests to every full-suite count.

---

## Task 1: Read-Only Export and Snapshot Conversion

**Files:**
- Create: `ml/dq/__init__.py`, `ml/dq/create_readonly_role.sql`, `ml/dq/export_price_history.sql`, `ml/dq/README.md`, `ml/lifecycle/price_export.py`
- Test: `ml/tests/test_price_export.py`

**Interfaces:**
- Consumes: `lifecycle.snapshot.INPUT_COLUMNS`, `SnapshotSchemaError`, `write_price_snapshot` (Plan 2).
- Produces: export CSV header `symbol,timestamp,open,high,low,close,volume` with UTC `YYYY-MM-DDTHH:MM:SSZ`; `read_price_export`; CLI `python -m lifecycle.price_export --csv <file> [--snapshots snapshots]` printing `<snapshot_id> rows=<n> symbols=<n> dir=<path>`, exit 2 on refusal.
- Preserves: database contents and schema (read-only role; no migration).

**Acceptance Evidence:**
- `pytest tests/test_price_export.py -v` → 2 passed.

- [ ] **Step 1: Write the failing tests** — `ml/tests/test_price_export.py`:

```python
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
```

- [ ] **Step 2: Run them and confirm failure**

Run (from `ml/`): `.\.venv\Scripts\python.exe -m pytest tests/test_price_export.py -v`

Expected: collection error `ModuleNotFoundError: No module named 'lifecycle.price_export'`.

- [ ] **Step 3: Implement `ml/lifecycle/price_export.py`**

```python
"""Convert a read-only ``price_history`` CSV export into a snapshot (ADR-0007 D3).

Usage (from ``ml/``)::

    .\\.venv\\Scripts\\python.exe -m lifecycle.price_export --csv datasets/exports/price_history-YYYYMMDD.csv
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
```

- [ ] **Step 4: Add the SQL files**

`ml/dq/create_readonly_role.sql`:

```sql
-- One-time setup, run as the database owner inside the Postgres container.
-- No password: the role can only connect through the container's local socket.
-- CONNECT on the database is already granted to PUBLIC by default.
CREATE ROLE ml_readonly LOGIN;
ALTER ROLE ml_readonly SET default_transaction_read_only = on;
GRANT USAGE ON SCHEMA public TO ml_readonly;
GRANT SELECT ON public.price_history TO ml_readonly;
```

`ml/dq/export_price_history.sql` (the `\copy` must stay on one line):

```sql
-- Read-only export of price_history for the offline C1 scan (ADR-0007 D3, spec §5 P1.3).
-- Run as ml_readonly. Writes UTF-8 CSV with header to STDOUT; timestamps are UTC ISO-8601.
\copy (SELECT asset_id AS symbol, to_char(price_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS timestamp, open_price AS open, high_price AS high, low_price AS low, close_price AS close, volume FROM public.price_history ORDER BY asset_id, price_timestamp) TO STDOUT WITH (FORMAT csv, HEADER true)
```

- [ ] **Step 5: Write `ml/dq/README.md`**

Sections, in order:

1. **What C1 is** — offline, never on a request path; link the spec §5 P1.3 and ADR-0007.
2. **One-time role setup** (repo root, Postgres running):

   ```powershell
   Get-Content ml/dq/create_readonly_role.sql | docker exec -i finance_postgres psql -U finance_user -d financedb -v ON_ERROR_STOP=1
   docker exec finance_postgres psql -U ml_readonly -d financedb -tAc "SHOW default_transaction_read_only"
   docker exec finance_postgres psql -U ml_readonly -d financedb -c "DELETE FROM price_history WHERE false"
   ```

   Expected: `CREATE ROLE`, `ALTER ROLE`, `GRANT`, `GRANT`; then `on`; then an `ERROR` (read-only transaction or permission denied). If `DB_USERNAME`/`DB_NAME` differ from the Compose defaults, substitute them. If `psql` asks for a password, stop: the container is not using local-socket trust, and the owner must decide how to authenticate the role.
3. **Export** (repo root):

   ```powershell
   New-Item -ItemType Directory -Force ml/datasets/exports | Out-Null
   $stamp = Get-Date -Format yyyyMMdd
   Get-Content ml/dq/export_price_history.sql | docker exec -i finance_postgres psql -U ml_readonly -d financedb -v ON_ERROR_STOP=1 -q | Out-File -Encoding utf8 "ml/datasets/exports/price_history-$stamp.csv"
   Get-Content "ml/datasets/exports/price_history-$stamp.csv" -TotalCount 2
   ```

   Expected: header `symbol,timestamp,open,high,low,close,volume`, then a row such as `AAPL,2026-10-14T04:00:00Z,…`. (`Out-File -Encoding utf8` writes a BOM in Windows PowerShell 5.1; `read_price_export` accepts it.)
4. **Snapshot** (from `ml/`): `.\.venv\Scripts\python.exe -m lifecycle.price_export --csv datasets/exports/price_history-<stamp>.csv`.
5. **Scan** (from `ml/`): `.\.venv\Scripts\python.exe -m dq.scan --snapshot snapshots/<snapshot_id>`.
6. **Review** — fill `verdict` in `review-sheet.csv` with `true`, `false`, or `unsure` (guidance per class from Task 7), then `.\.venv\Scripts\python.exe -m dq.review_summary <sheet>`.
7. **Fault classes** — the Locked Decisions table.
8. **Known blind spots** — single missing sessions; splits within 5 sessions of a series edge; cross-provider conflicts (no provider column); intraday rows mapped to the next session date (PF-3).

- [ ] **Step 6: Run the focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_price_export.py -v` — Expected: 2 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 28 passed (26 from Plan 2 + 2).

- [ ] **Step 7: Commit**

```powershell
git add ml/dq/__init__.py ml/dq/create_readonly_role.sql ml/dq/export_price_history.sql ml/dq/README.md ml/lifecycle/price_export.py ml/tests/test_price_export.py
git diff --cached --check
git commit -m "feat(ml): add read-only price_history export to snapshot"
```

---

## Task 2: Pre-Registered Thresholds and Fault-Class Checks

**Files:**
- Create: `ml/dq/thresholds.json`, `ml/dq/checks.py`, `ml/dq/tests/__init__.py`
- Modify: `ml/pytest.ini` (`testpaths = tests dq/tests`)
- Test: `ml/dq/tests/test_checks.py`

**Interfaces:**
- Consumes: `lifecycle.hashing.sha256_file`; `lifecycle.snapshot.normalize_price_frame` (tests only).
- Produces: the `dq.checks` API listed under **Produces**. `scan_symbol` expects one symbol's rows in snapshot column order sorted by `timestamp`, and returns findings sorted by `(symbol, session_date, fault_class, detail, measured_value, threshold)`.
- Preserves: input frames are not mutated.

**Acceptance Evidence:**
- `pytest dq/tests/test_checks.py -v` → 15 passed.

- [ ] **Step 1: Commit-ready thresholds** — `ml/dq/thresholds.json`:

```json
{
  "min_history_sessions": 30,
  "missing_sessions_min_business_days": 3,
  "return_spike_max_net_fraction": 0.5,
  "return_spike_robust_z": 8.0,
  "robust_min_periods": 30,
  "robust_window_sessions": 63,
  "split_factors": [1.5, 2, 3, 4, 5, 8, 10, 15, 20, 25, 50, 100],
  "split_persistence_sessions": 5,
  "split_persistence_tolerance": 0.10,
  "split_ratio_tolerance": 0.05,
  "stale_run_min_bars": 5,
  "thresholds_version": "dq-thresholds-v1",
  "volume_robust_z": 8.0
}
```

- [ ] **Step 2: Write the failing tests** — `ml/dq/tests/test_checks.py`:

The expected values come from the constructed inputs, not from running the scanner: each test builds a 1%-volatility random walk, plants exactly one fault at a known bar, and asserts that fault (and only it) at that bar's session date. The robust-z case is worked by hand in the comment.

```python
"""Hand-built series pin every fault class and the insufficient-history state (C1)."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from dq.checks import Thresholds, robust_z, scan_symbol
from dq.scan import DEFAULT_THRESHOLDS
from lifecycle.snapshot import normalize_price_frame


@pytest.fixture(scope="module")
def thresholds() -> Thresholds:
    return Thresholds.load(DEFAULT_THRESHOLDS)


def _series(closes, *, volumes=None, dates=None, symbol="TST") -> pd.DataFrame:
    closes = np.asarray(closes, dtype=float)
    if dates is None:
        dates = pd.bdate_range("2025-01-06", periods=len(closes))
    volumes = np.full(len(closes), 1_000_000.0) if volumes is None else np.asarray(volumes, dtype=float)
    frame = pd.DataFrame({
        "symbol": symbol,
        "timestamp": pd.DatetimeIndex(dates).tz_localize("UTC") + pd.Timedelta(hours=5),
        "open": closes, "high": closes, "low": closes, "close": closes, "volume": volumes,
    })
    return normalize_price_frame(frame)


def _walk(n: int, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.round(100.0 * np.exp(np.cumsum(rng.normal(0.0, 0.01, n))), 4)


def _volumes(n: int, seed: int = 11) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.round(np.exp(rng.normal(14.0, 0.3, n)))


def _classes(result) -> list[tuple[str, str]]:
    return [(finding.fault_class, finding.session_date) for finding in result.findings]


def test_robust_z_matches_hand_calculation():
    z = robust_z(np.array([1.0, 2.0, 3.0, 4.0, 100.0, 2.0]), window=5, min_periods=3)

    assert all(math.isnan(value) for value in z[:3])
    # t=3: median(1,2,3)=2, MAD=1 -> 2/1.4826; t=4: median 2.5, MAD 1 -> 97.5/1.4826;
    # t=5: window (1,2,3,4,100): median 3, MAD 1 -> 1/1.4826
    assert z[3:] == pytest.approx([2 / 1.4826, 97.5 / 1.4826, 1 / 1.4826])


def test_clean_walk_has_no_findings(thresholds):
    result = scan_symbol("TST", _series(_walk(120), volumes=_volumes(120)), thresholds)

    assert result.findings == []
    assert result.insufficient_history is False


def test_short_history_is_insufficient_but_rules_still_run(thresholds):
    closes = _walk(10)
    closes[4] = 0.0
    result = scan_symbol("TST", _series(closes, volumes=_volumes(10)), thresholds)

    assert result.insufficient_history is True
    assert [finding.fault_class for finding in result.findings] == ["non_positive_price"]


def test_non_positive_close_is_reported_and_excluded_from_returns(thresholds):
    closes = _walk(120)
    closes[60] = 0.0
    frame = _series(closes, volumes=_volumes(120))

    result = scan_symbol("TST", frame, thresholds)

    assert _classes(result) == [("non_positive_price", frame["session_date"].iloc[60])]


def test_ohlc_inconsistency_names_the_broken_rule(thresholds):
    frame = _series(_walk(120), volumes=_volumes(120))
    frame.loc[50, "low"] = frame.loc[50, "high"] + 1.5

    result = scan_symbol("TST", frame, thresholds)

    finding = next(f for f in result.findings if f.fault_class == "ohlc_inconsistency")
    assert finding.detail == "close_below_low,low_above_high,open_below_low"
    assert finding.measured_value == pytest.approx(1.5)


def test_duplicate_session_counts_rows(thresholds):
    frame = _series(_walk(120), volumes=_volumes(120))
    extra = frame.iloc[[70]].copy()
    extra["timestamp"] = extra["timestamp"] + pd.Timedelta(hours=6)
    frame = normalize_price_frame(pd.concat([frame.drop(columns="session_date"), extra.drop(columns="session_date")]))

    result = scan_symbol("TST", frame, thresholds)

    finding = next(f for f in result.findings if f.fault_class == "duplicate_session")
    assert (finding.session_date, finding.measured_value) == (frame["session_date"].iloc[70], 2.0)


@pytest.mark.parametrize(("copies", "expected"), [(3, []), (5, [6.0])])
def test_stale_run_reported_from_five_identical_bars(thresholds, copies, expected):
    frame = _series(_walk(120), volumes=_volumes(120))
    columns = ["open", "high", "low", "close", "volume"]
    frame.loc[41 : 40 + copies, columns] = frame.loc[40, columns].to_numpy()

    result = scan_symbol("TST", frame, thresholds)

    assert [f.measured_value for f in result.findings if f.fault_class == "stale_bars"] == expected


@pytest.mark.parametrize(("removed", "expected"), [(2, []), (3, [3.0])])
def test_missing_sessions_from_three_business_days(thresholds, removed, expected):
    dates = pd.bdate_range("2025-01-06", periods=120 + removed).delete(range(60, 60 + removed))

    result = scan_symbol("TST", _series(_walk(120), volumes=_volumes(120), dates=dates), thresholds)

    found = [f for f in result.findings if f.fault_class == "missing_sessions"]
    assert [f.measured_value for f in found] == expected


@pytest.mark.parametrize(("factor", "fault_class"), [(2.0, "unadjusted_split"), (0.1, "unadjusted_reverse_split")])
def test_persistent_price_ratio_is_reported_as_split(thresholds, factor, fault_class):
    closes = _walk(120)
    closes[80:] = np.round(closes[80:] / factor, 4)
    frame = _series(closes, volumes=_volumes(120))

    result = scan_symbol("TST", frame, thresholds)

    assert _classes(result) == [(fault_class, frame["session_date"].iloc[80])]


def test_reverting_spike_is_reported_once(thresholds):
    closes = _walk(120)
    closes[90] = round(closes[90] * 1.6, 4)
    frame = _series(closes, volumes=_volumes(120))

    result = scan_symbol("TST", frame, thresholds)

    assert _classes(result) == [("return_outlier", frame["session_date"].iloc[90])]


def test_persistent_jump_is_not_a_return_outlier(thresholds):
    closes = _walk(120)
    closes[90:] = np.round(closes[90:] * 1.6, 4)

    result = scan_symbol("TST", _series(closes, volumes=_volumes(120)), thresholds)

    assert [f for f in result.findings if f.fault_class == "return_outlier"] == []


def test_volume_burst_and_negative_volume(thresholds):
    volumes = _volumes(120)
    volumes[100] *= 300
    volumes[110] = -5.0
    frame = _series(_walk(120), volumes=volumes)

    result = scan_symbol("TST", frame, thresholds)

    found = [(f.session_date, f.detail) for f in result.findings if f.fault_class == "volume_anomaly"]
    assert found == [
        (frame["session_date"].iloc[100], "log_volume_robust_z"),
        (frame["session_date"].iloc[110], "negative_volume"),
    ]
```

The test file imports `DEFAULT_THRESHOLDS` from `dq.scan` (Task 4). Until Task 4 exists, create `ml/dq/scan.py` with exactly these two lines so the import resolves; Task 4 replaces the file:

```python
from pathlib import Path

DEFAULT_THRESHOLDS = Path(__file__).with_name("thresholds.json")
```

- [ ] **Step 3: Run them and confirm failure**

Run: set `testpaths = tests dq/tests` in `ml/pytest.ini`, then `.\.venv\Scripts\python.exe -m pytest dq/tests/test_checks.py -v`

Expected: collection error `ModuleNotFoundError: No module named 'dq.checks'`.

- [ ] **Step 4: Implement `ml/dq/checks.py`**

```python
"""Deterministic single-series integrity checks for price snapshots (C1).

Rule checks run on every row. Statistical checks run on one bar per session with
a positive close, and only when the symbol has enough history; otherwise the
symbol is reported as insufficient instead of being judged.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from numpy.lib.stride_tricks import sliding_window_view

from lifecycle.hashing import sha256_file

SCAN_VERSION = "dq-scan-1.0.0"
FAULT_CLASSES: tuple[str, ...] = (
    "non_positive_price",
    "ohlc_inconsistency",
    "duplicate_session",
    "stale_bars",
    "missing_sessions",
    "unadjusted_split",
    "unadjusted_reverse_split",
    "return_outlier",
    "volume_anomaly",
)
_MAD_TO_SIGMA = 1.4826


@dataclass(frozen=True, order=True)
class Finding:
    symbol: str
    session_date: str
    fault_class: str
    detail: str
    measured_value: float
    threshold: float


@dataclass(frozen=True)
class Thresholds:
    thresholds_version: str
    min_history_sessions: int
    robust_window_sessions: int
    robust_min_periods: int
    return_spike_robust_z: float
    return_spike_max_net_fraction: float
    volume_robust_z: float
    stale_run_min_bars: int
    missing_sessions_min_business_days: int
    split_factors: tuple[float, ...]
    split_ratio_tolerance: float
    split_persistence_sessions: int
    split_persistence_tolerance: float
    sha256: str

    @classmethod
    def load(cls, path: Path) -> "Thresholds":
        raw = json.loads(path.read_text(encoding="utf-8"))
        raw["split_factors"] = tuple(float(factor) for factor in raw["split_factors"])
        return cls(**raw, sha256=sha256_file(path))


@dataclass(frozen=True)
class SymbolScan:
    findings: list[Finding]
    insufficient_history: bool


def robust_z(values: np.ndarray, window: int, min_periods: int) -> np.ndarray:
    """|x_t - median| / (1.4826 * MAD) over the trailing window that excludes x_t.

    NaN where fewer than ``min_periods`` prior values exist or the MAD is zero.
    """
    n = len(values)
    out = np.full(n, np.nan)
    for t in range(min_periods, min(window, n)):
        out[t] = _z(values[t], values[:t])
    if n > window:
        windows = sliding_window_view(values[:-1], window)  # windows[i] = values[i : i + window]
        medians = np.median(windows, axis=1)
        mads = np.median(np.abs(windows - medians[:, None]), axis=1)
        current = values[window:]
        with np.errstate(divide="ignore", invalid="ignore"):
            z = np.abs(current - medians) / (_MAD_TO_SIGMA * mads)
        out[window:] = np.where(mads > 0, z, np.nan)
    return out


def _z(value: float, history: np.ndarray) -> float:
    median = np.median(history)
    mad = np.median(np.abs(history - median))
    return float(abs(value - median) / (_MAD_TO_SIGMA * mad)) if mad > 0 else float("nan")


def scan_symbol(symbol: str, rows: pd.DataFrame, thresholds: Thresholds) -> SymbolScan:
    """Scan one symbol's rows (snapshot columns, sorted by timestamp)."""
    findings: list[Finding] = []
    findings += _rule_checks(symbol, rows)
    daily = rows.drop_duplicates(subset="session_date", keep="first").reset_index(drop=True)
    findings += _stale_bars(symbol, daily, thresholds)
    findings += _missing_sessions(symbol, daily, thresholds)
    valid = daily[daily["close"] > 0].reset_index(drop=True)
    if len(valid) < thresholds.min_history_sessions:
        return SymbolScan(sorted(findings), insufficient_history=True)
    split_bars, split_findings = _splits(symbol, valid, thresholds)
    findings += split_findings
    findings += _return_spikes(symbol, valid, thresholds, split_bars)
    findings += _volume_anomalies(symbol, valid, thresholds)
    return SymbolScan(sorted(findings), insufficient_history=False)


def _rule_checks(symbol: str, rows: pd.DataFrame) -> list[Finding]:
    out: list[Finding] = []
    for row in rows.itertuples(index=False):
        lowest = min(row.open, row.high, row.low, row.close)
        if lowest <= 0:
            out.append(Finding(symbol, row.session_date, "non_positive_price", "min_ohlc", float(lowest), 0.0))
        violations = {
            "low_above_high": row.low - row.high,
            "open_above_high": row.open - row.high,
            "open_below_low": row.low - row.open,
            "close_above_high": row.close - row.high,
            "close_below_low": row.low - row.close,
        }
        broken = {rule: gap for rule, gap in violations.items() if gap > 0}
        if broken:
            out.append(Finding(
                symbol, row.session_date, "ohlc_inconsistency", ",".join(sorted(broken)), float(max(broken.values())), 0.0,
            ))
        if row.volume < 0:
            out.append(Finding(symbol, row.session_date, "volume_anomaly", "negative_volume", float(row.volume), 0.0))
    counts = rows.groupby("session_date", sort=True).size()
    for session_date, count in counts[counts > 1].items():
        out.append(Finding(symbol, session_date, "duplicate_session", "rows_per_session", float(count), 1.0))
    return out


def _stale_bars(symbol: str, daily: pd.DataFrame, thresholds: Thresholds) -> list[Finding]:
    values = daily[["open", "high", "low", "close", "volume"]].to_numpy()
    out: list[Finding] = []
    start = 0
    for index in range(1, len(values) + 1):
        if index < len(values) and np.array_equal(values[index], values[start]):
            continue
        run = index - start
        if run >= thresholds.stale_run_min_bars:
            out.append(Finding(
                symbol, daily["session_date"].iloc[start], "stale_bars", "identical_ohlcv_run",
                float(run), float(thresholds.stale_run_min_bars),
            ))
        start = index
    return out


def _missing_sessions(symbol: str, daily: pd.DataFrame, thresholds: Thresholds) -> list[Finding]:
    dates = daily["session_date"].to_numpy(dtype="datetime64[D]")
    if len(dates) < 2:
        return []
    missing = np.busday_count(dates[:-1] + np.timedelta64(1, "D"), dates[1:])
    out: list[Finding] = []
    for index in np.flatnonzero(missing >= thresholds.missing_sessions_min_business_days):
        out.append(Finding(
            symbol, str(dates[index + 1]), "missing_sessions", f"after={dates[index]}",
            float(missing[index]), float(thresholds.missing_sessions_min_business_days),
        ))
    return out


def _splits(symbol: str, valid: pd.DataFrame, thresholds: Thresholds) -> tuple[set[int], list[Finding]]:
    closes = valid["close"].to_numpy()
    w = thresholds.split_persistence_sessions
    n = len(closes)
    if n < 2 * w:
        return set(), []
    bars = np.arange(w, n - w + 1)  # bar t needs w bars before it and w bars starting at it
    windows = sliding_window_view(closes, w)
    ratio = closes[bars] / closes[bars - 1]
    persistence = np.median(windows[bars], axis=1) / np.median(windows[bars - w], axis=1)
    split_bars: set[int] = set()
    out: list[Finding] = []
    for position, bar in enumerate(bars):
        for factor in thresholds.split_factors:
            for fault_class, target in (("unadjusted_split", 1.0 / factor), ("unadjusted_reverse_split", factor)):
                if (
                    abs(ratio[position] / target - 1.0) <= thresholds.split_ratio_tolerance
                    and abs(persistence[position] / target - 1.0) <= thresholds.split_persistence_tolerance
                ):
                    split_bars.add(int(bar))
                    out.append(Finding(
                        symbol, valid["session_date"].iloc[bar], fault_class, f"factor={factor:g}",
                        float(ratio[position]), thresholds.split_ratio_tolerance,
                    ))
    return split_bars, out


def _return_spikes(symbol: str, valid: pd.DataFrame, thresholds: Thresholds, split_bars: set[int]) -> list[Finding]:
    log_returns = np.diff(np.log(valid["close"].to_numpy()))  # log_returns[j] moves bar j -> bar j + 1
    z = robust_z(log_returns, thresholds.robust_window_sessions, thresholds.robust_min_periods)
    out: list[Finding] = []
    for j in range(len(log_returns) - 1):
        spike_bar = j + 1
        into, out_of = log_returns[j], log_returns[j + 1]
        if spike_bar in split_bars or spike_bar + 1 in split_bars or np.isnan(z[j]) or np.isnan(z[j + 1]):
            continue
        if (
            z[j] >= thresholds.return_spike_robust_z
            and z[j + 1] >= thresholds.return_spike_robust_z
            and np.sign(into) != np.sign(out_of)
            and abs(into + out_of) <= thresholds.return_spike_max_net_fraction * min(abs(into), abs(out_of))
        ):
            out.append(Finding(
                symbol, valid["session_date"].iloc[spike_bar], "return_outlier", "reverting_spike",
                float(min(z[j], z[j + 1])), thresholds.return_spike_robust_z,
            ))
    return out


def _volume_anomalies(symbol: str, valid: pd.DataFrame, thresholds: Thresholds) -> list[Finding]:
    usable = valid[valid["volume"] >= 0].reset_index(drop=True)
    z = robust_z(np.log1p(usable["volume"].to_numpy()), thresholds.robust_window_sessions, thresholds.robust_min_periods)
    out: list[Finding] = []
    for index in np.flatnonzero(np.nan_to_num(z) >= thresholds.volume_robust_z):
        out.append(Finding(
            symbol, usable["session_date"].iloc[index], "volume_anomaly", "log_volume_robust_z",
            float(z[index]), thresholds.volume_robust_z,
        ))
    return out
```

- [ ] **Step 5: Run the focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_checks.py -v` — Expected: 15 passed, no warnings from `dq/checks.py`.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 43 passed.

- [ ] **Step 6: Commit** (this commit is the pre-registration record)

```powershell
git add ml/pytest.ini ml/dq/thresholds.json ml/dq/checks.py ml/dq/scan.py ml/dq/tests/__init__.py ml/dq/tests/test_checks.py
git diff --cached --check
git commit -m "feat(ml): add pre-registered C1 fault-class checks" -m "Thresholds dq-thresholds-v1 are fixed before any real snapshot is scanned."
```

---

## Task 3: Deterministic Synthetic Universes

**Files:**
- Create: `ml/dq/fixtures.py`
- Test: `ml/dq/tests/test_fixture_suite.py` (first test only; Task 5 appends)

**Interfaces:**
- Consumes: `dq.checks.FAULT_CLASSES`.
- Produces: `InjectedFault(symbol, fault_class, start, end)`; `clean_universe(n_symbols, start, end, seed) -> pd.DataFrame` and `fault_universe(per_class, start, end, seed) -> tuple[pd.DataFrame, list[InjectedFault]]`, both returning `INPUT_COLUMNS` frames with UTC timestamps at 05:00. Symbols: `CLN0000…` (clean) and `F<class index><nnn>` (faults).
- Preserves: no provider data is read or written.

**Acceptance Evidence:**
- `pytest dq/tests/test_fixture_suite.py -v` → 1 passed.

- [ ] **Step 1: Write the failing test** — create `ml/dq/tests/test_fixture_suite.py` with:

```python
"""Phase 1 success criterion for C1 on synthetic data (spec §5 P1.3, §8)."""

from __future__ import annotations

from pandas.testing import assert_frame_equal

from dq.checks import FAULT_CLASSES
from dq.fixtures import clean_universe, fault_universe


def test_fixtures_are_deterministic_and_labelled():
    assert_frame_equal(clean_universe(3, "2024-01-01", "2024-12-31", seed=5), clean_universe(3, "2024-01-01", "2024-12-31", seed=5))
    frame, labels = fault_universe(1, "2024-01-01", "2025-12-31", seed=5)

    assert [label.fault_class for label in labels] == list(FAULT_CLASSES)
    assert {label.symbol for label in labels} == set(frame["symbol"])
```

- [ ] **Step 2: Run it and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_fixture_suite.py -v`

Expected: `ModuleNotFoundError: No module named 'dq.fixtures'`.

- [ ] **Step 3: Implement `ml/dq/fixtures.py`**

```python
"""Deterministic synthetic price universes for evaluating the scanner (C1).

Clean series follow GARCH(1,1) with Student-t(5) innovations so they have the
volatility clustering and fat tails real prices have. Fault series are clean
series with exactly one injected fault and a ground-truth label. Nothing here
reads provider data.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from dq.checks import FAULT_CLASSES

_HOLIDAYS_PER_YEAR = 9
_HOLIDAY_SPACING = 5
_SPLIT_FACTORS = (1.5, 2.0, 3.0, 4.0, 5.0, 10.0)
_REVERSE_SPLIT_FACTORS = (2.0, 5.0, 10.0, 20.0)


@dataclass(frozen=True)
class InjectedFault:
    symbol: str
    fault_class: str
    start: str  # first session date at which a finding counts as a detection
    end: str    # last session date at which a finding counts as a detection


def trading_calendar(start: str, end: str, rng: np.random.Generator) -> pd.DatetimeIndex:
    """Business days minus nine isolated holidays per year, shared by every symbol.

    Like exchange holidays, no two closures fall within five business days of each other.
    """
    days = pd.bdate_range(start, end)
    closed: list[int] = []
    for year in sorted(set(days.year)):
        positions = np.flatnonzero(days.year == year)
        chosen = 0
        for position in rng.permutation(positions):
            if chosen == _HOLIDAYS_PER_YEAR:
                break
            if all(abs(int(position) - other) > _HOLIDAY_SPACING for other in closed):
                closed.append(int(position))
                chosen += 1
    return days.delete(sorted(closed))


def clean_series(symbol: str, calendar: pd.DatetimeIndex, rng: np.random.Generator) -> pd.DataFrame:
    n = len(calendar)
    omega, alpha, beta, dof = 0.02, 0.08, 0.90, 5
    burn_in = 250
    shocks = rng.standard_t(dof, n + burn_in) / np.sqrt(dof / (dof - 2))
    variance = omega / (1 - alpha - beta)
    returns_pct = np.empty(n + burn_in)
    for t in range(n + burn_in):
        returns_pct[t] = np.sqrt(variance) * shocks[t]
        variance = omega + alpha * returns_pct[t] ** 2 + beta * variance
    returns = returns_pct[burn_in:] * rng.uniform(0.6, 2.0) / 100.0
    close = rng.uniform(20.0, 500.0) * np.exp(np.cumsum(returns))
    sigma = np.abs(returns).mean()
    open_ = np.concatenate([[close[0]], close[:-1]]) * np.exp(rng.normal(0.0, 0.2 * sigma, n))
    high = np.maximum(open_, close) * np.exp(np.abs(rng.normal(0.0, 0.3 * sigma, n)))
    low = np.minimum(open_, close) * np.exp(-np.abs(rng.normal(0.0, 0.3 * sigma, n)))
    mean_log_volume = rng.uniform(11.0, 16.0)
    log_volume = np.empty(n)
    log_volume[0] = mean_log_volume
    noise = rng.normal(0.0, 0.35, n)
    for t in range(1, n):
        log_volume[t] = mean_log_volume + 0.6 * (log_volume[t - 1] - mean_log_volume) + noise[t] + 8.0 * abs(returns[t])
    return pd.DataFrame({
        "symbol": symbol,
        "timestamp": calendar + pd.Timedelta(hours=5),
        "open": np.round(open_, 4),
        "high": np.round(high, 4),
        "low": np.round(low, 4),
        "close": np.round(close, 4),
        "volume": np.round(np.exp(log_volume)),
    })


def clean_universe(n_symbols: int, start: str, end: str, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    calendar = trading_calendar(start, end, rng)
    frames = [clean_series(f"CLN{index:04d}", calendar, rng) for index in range(n_symbols)]
    return _with_utc(pd.concat(frames, ignore_index=True))


def fault_universe(per_class: int, start: str, end: str, seed: int) -> tuple[pd.DataFrame, list[InjectedFault]]:
    rng = np.random.default_rng(seed)
    calendar = trading_calendar(start, end, rng)
    frames: list[pd.DataFrame] = []
    labels: list[InjectedFault] = []
    for fault_class in FAULT_CLASSES:
        for index in range(per_class):
            symbol = f"F{FAULT_CLASSES.index(fault_class)}{index:03d}"
            series = clean_series(symbol, calendar, rng)
            position = int(rng.integers(100, len(series) - 20))
            series, label = _INJECTORS[fault_class](series, position, rng)
            frames.append(series)
            labels.append(InjectedFault(symbol, fault_class, *label))
    return _with_utc(pd.concat(frames, ignore_index=True)), labels


def _with_utc(frame: pd.DataFrame) -> pd.DataFrame:
    frame["timestamp"] = pd.to_datetime(frame["timestamp"]).dt.tz_localize("UTC")
    return frame


def _day(series: pd.DataFrame, position: int) -> str:
    return series["timestamp"].iloc[position].strftime("%Y-%m-%d")


def _non_positive(series, p, rng):
    value = 0.0 if rng.random() < 0.5 else -float(series.at[p, "close"])
    series.at[p, "close"] = value
    series.at[p, "low"] = value
    return series, (_day(series, p), _day(series, p))


def _ohlc(series, p, rng):
    variant = int(rng.integers(0, 3))
    if variant == 0:
        series.at[p, "low"] = round(series.at[p, "high"] * 1.02, 4)
    elif variant == 1:
        series.at[p, "close"] = round(series.at[p, "high"] * 1.02, 4)
    else:
        series.at[p, "close"] = round(series.at[p, "low"] * 0.98, 4)
    return series, (_day(series, p), _day(series, p))


def _duplicate(series, p, rng):
    extra = series.iloc[[p]].copy()
    extra["timestamp"] = extra["timestamp"] + pd.Timedelta(hours=6)
    extra["close"] = round(float(extra["close"].iloc[0]) * 1.001, 4)
    extra["high"] = max(float(extra["high"].iloc[0]), float(extra["close"].iloc[0]))
    series = pd.concat([series, extra], ignore_index=True).sort_values("timestamp", kind="mergesort").reset_index(drop=True)
    return series, (_day(series, p), _day(series, p))


def _stale(series, p, rng):
    copies = int(rng.integers(5, 10))
    columns = ["open", "high", "low", "close", "volume"]
    series.loc[p + 1 : p + copies, columns] = series.loc[p, columns].to_numpy()
    return series, (_day(series, p), _day(series, p + copies))


def _missing(series, p, rng):
    removed = int(rng.integers(3, 11))
    after = _day(series, p + removed)
    series = series.drop(index=range(p, p + removed)).reset_index(drop=True)
    return series, (after, after)


def _split(series, p, rng):
    factor = float(rng.choice(_SPLIT_FACTORS))
    for column in ("open", "high", "low", "close"):
        series.loc[p:, column] = (series.loc[p:, column] / factor).round(4)
    series.loc[p:, "volume"] = (series.loc[p:, "volume"] * factor).round()
    return series, (_day(series, p), _day(series, p))


def _reverse_split(series, p, rng):
    factor = float(rng.choice(_REVERSE_SPLIT_FACTORS))
    for column in ("open", "high", "low", "close"):
        series.loc[p:, column] = (series.loc[p:, column] * factor).round(4)
    series.loc[p:, "volume"] = (series.loc[p:, "volume"] / factor).round()
    return series, (_day(series, p), _day(series, p))


def _spike(series, p, rng):
    multiplier = rng.uniform(1.3, 2.0) if rng.random() < 0.5 else rng.uniform(0.5, 0.77)
    close = round(float(series.at[p, "close"]) * multiplier, 4)
    series.at[p, "close"] = close
    series.at[p, "high"] = max(float(series.at[p, "high"]), close)
    series.at[p, "low"] = min(float(series.at[p, "low"]), close)
    return series, (_day(series, p), _day(series, p))


def _volume(series, p, rng):
    series.at[p, "volume"] = round(float(series.at[p, "volume"]) * rng.uniform(100.0, 500.0))
    return series, (_day(series, p), _day(series, p))


_INJECTORS = {
    "non_positive_price": _non_positive,
    "ohlc_inconsistency": _ohlc,
    "duplicate_session": _duplicate,
    "stale_bars": _stale,
    "missing_sessions": _missing,
    "unadjusted_split": _split,
    "unadjusted_reverse_split": _reverse_split,
    "return_outlier": _spike,
    "volume_anomaly": _volume,
}
```

- [ ] **Step 4: Run the focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_fixture_suite.py -v` — Expected: 1 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 44 passed.

- [ ] **Step 5: Commit**

```powershell
git add ml/dq/fixtures.py ml/dq/tests/test_fixture_suite.py
git diff --cached --check
git commit -m "test(ml): add deterministic synthetic price universes for C1"
```

---

## Task 4: Replayable Report, Summary, Review Sheet, and Scan CLI

**Files:**
- Create: `ml/dq/report.py`
- Modify: `ml/dq/scan.py` (replace the Task 2 stub)
- Test: `ml/dq/tests/test_scan_report.py`

**Interfaces:**
- Consumes: `dq.checks` (Task 2), `dq.fixtures.fault_universe` (Task 3, tests only), `lifecycle.snapshot.load_price_snapshot`, `write_price_snapshot`, `SnapshotError`.
- Produces: `dq.report` and `dq.scan` APIs under **Produces**; CLI `python -m dq.scan --snapshot <dir> [--thresholds <json>] [--reports reports/dq]` printing the output directory, exit 2 with `scan refused: …` on `SnapshotError`/`FileNotFoundError`.
- Preserves: `DEFAULT_THRESHOLDS` name and value from the stub.

**Acceptance Evidence:**
- `pytest dq/tests/test_scan_report.py -v` → 4 passed.

- [ ] **Step 1: Write the failing tests** — `ml/dq/tests/test_scan_report.py`:

```python
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
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_scan_report.py -v`

Expected: `ImportError: cannot import name 'main' from 'dq.scan'`.

- [ ] **Step 3: Implement `ml/dq/report.py`**

```python
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
```

- [ ] **Step 4: Replace `ml/dq/scan.py`**

```python
"""Offline price-history data-quality scan (C1). Never runs on a request path.

Usage (from ``ml/``)::

    .\\.venv\\Scripts\\python.exe -m dq.scan --snapshot snapshots/<snapshot_id>
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
```

- [ ] **Step 5: Run the focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_scan_report.py -v` — Expected: 4 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 48 passed.

- [ ] **Step 6: Commit**

```powershell
git add ml/dq/report.py ml/dq/scan.py ml/dq/tests/test_scan_report.py
git diff --cached --check
git commit -m "feat(ml): add replayable C1 scan report and CLI"
```

---

## Task 5: Recall and False-Flag Evaluation (spec §8 C1 fixture criterion)

**Files:**
- Create: `ml/dq/evaluate.py`
- Modify: `ml/dq/tests/test_fixture_suite.py` (append one test, extend imports)

**Interfaces:**
- Consumes: `dq.fixtures` (Task 3), `dq.scan.scan_frame`, `DEFAULT_THRESHOLDS` (Task 4), `dq.report.flagged_symbol_years`, `symbol_years`.
- Produces: `Evaluation(recall_by_class, overall_recall, clean_symbol_years, clean_flagged_symbol_years)` with `false_flag_rate` and `meets_targets()`; constants `SEED = 20261015`, `RECALL_TARGET = 0.95`, `CLASS_RECALL_FLOOR = 0.90`, `FALSE_FLAG_TARGET = 0.01`; CLI `python -m dq.evaluate` (exit 0 iff targets met).
- Preserves: thresholds file unchanged unless the fixture targets fail (see Step 4).

**Acceptance Evidence:**
- `pytest dq/tests/test_fixture_suite.py -v` → 2 passed (about 30 s).
- `python -m dq.evaluate` output pasted into the PR.

- [ ] **Step 1: Append the failing test**

Extend the imports of `ml/dq/tests/test_fixture_suite.py` with `from dq.checks import Thresholds`, `from dq.evaluate import CLASS_RECALL_FLOOR, FALSE_FLAG_TARGET, RECALL_TARGET, evaluate`, and `from dq.scan import DEFAULT_THRESHOLDS`, then append:

```python
def test_recall_and_false_flag_targets():
    result = evaluate(Thresholds.load(DEFAULT_THRESHOLDS))

    assert result.overall_recall >= RECALL_TARGET, result.recall_by_class
    assert min(result.recall_by_class.values()) >= CLASS_RECALL_FLOOR, result.recall_by_class
    assert result.false_flag_rate < FALSE_FLAG_TARGET, result.clean_flagged_symbol_years
```

The complete file after this step:

```python
"""Phase 1 success criterion for C1 on synthetic data (spec §5 P1.3, §8)."""

from __future__ import annotations

from pandas.testing import assert_frame_equal

from dq.checks import FAULT_CLASSES, Thresholds
from dq.evaluate import CLASS_RECALL_FLOOR, FALSE_FLAG_TARGET, RECALL_TARGET, evaluate
from dq.fixtures import clean_universe, fault_universe
from dq.scan import DEFAULT_THRESHOLDS


def test_fixtures_are_deterministic_and_labelled():
    assert_frame_equal(clean_universe(3, "2024-01-01", "2024-12-31", seed=5), clean_universe(3, "2024-01-01", "2024-12-31", seed=5))
    frame, labels = fault_universe(1, "2024-01-01", "2025-12-31", seed=5)

    assert [label.fault_class for label in labels] == list(FAULT_CLASSES)
    assert {label.symbol for label in labels} == set(frame["symbol"])


def test_recall_and_false_flag_targets():
    result = evaluate(Thresholds.load(DEFAULT_THRESHOLDS))

    assert result.overall_recall >= RECALL_TARGET, result.recall_by_class
    assert min(result.recall_by_class.values()) >= CLASS_RECALL_FLOOR, result.recall_by_class
    assert result.false_flag_rate < FALSE_FLAG_TARGET, result.clean_flagged_symbol_years
```

- [ ] **Step 2: Run it and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_fixture_suite.py -v`

Expected: `ModuleNotFoundError: No module named 'dq.evaluate'`.

- [ ] **Step 3: Implement `ml/dq/evaluate.py`**

```python
"""Recall and false-flag evaluation on synthetic universes (C1 success criteria).

Usage (from ``ml/``)::

    .\\.venv\\Scripts\\python.exe -m dq.evaluate
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import pandas as pd

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
```

- [ ] **Step 4: Run the evaluation and the focused test**

Run: `.\.venv\Scripts\python.exe -m dq.evaluate`

Expected (planning prototype, same seeds): `"overall_recall": 1.0`, every class `1.0`, `"clean_flagged_symbol_years": 6`, `"false_flag_rate": 0.006`, `"meets_targets": true`, exit 0. Small differences from other numpy/pandas versions are acceptable while the targets hold.

If a target fails: do not change the fixtures or the targets. Diagnose with the per-class numbers, change only `dq/thresholds.json`, bump `thresholds_version` to `dq-thresholds-v2`, re-run, and state the change and its reason in the commit body. This is allowed only because no real snapshot has been scanned yet.

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_fixture_suite.py -v` — Expected: 2 passed.

- [ ] **Step 5: Run the plan-level check**

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 49 passed.

- [ ] **Step 6: Commit**

```powershell
git add ml/dq/evaluate.py ml/dq/tests/test_fixture_suite.py
git diff --cached --check
git commit -m "test(ml): prove C1 recall and false-flag targets on fixtures"
```

---

## Task 6: Review Sheet Aggregation

**Files:**
- Create: `ml/dq/review_summary.py`
- Test: `ml/dq/tests/test_review_summary.py`

**Interfaces:**
- Consumes: `dq.checks.FAULT_CLASSES`; the `review-sheet.csv` columns from `dq.report.REVIEW_COLUMNS`.
- Produces: `summarize(sheet: Path) -> str` (Markdown table: class, reviewed, true, false, unsure, precision = true / (true + false) or `n/a`); `ReviewIncompleteError`; CLI exit 2 on a blank or unknown verdict.
- Preserves: the review sheet is read, never modified.

**Acceptance Evidence:**
- `pytest dq/tests/test_review_summary.py -v` → 2 passed.

- [ ] **Step 1: Write the failing tests** — `ml/dq/tests/test_review_summary.py`:

```python
"""Owner review sheet aggregation (C1 real-snapshot review)."""

from __future__ import annotations

import pytest

from dq.review_summary import ReviewIncompleteError, summarize

HEADER = "symbol,session_date,fault_class,detail,measured_value,threshold,verdict,note\n"


def test_counts_and_precision_per_class(tmp_path):
    sheet = tmp_path / "review-sheet.csv"
    sheet.write_text(
        HEADER
        + "AAA,2025-01-02,unadjusted_split,factor=2,0.5,0.05,true,\n"
        + "BBB,2025-01-03,unadjusted_split,factor=2,0.5,0.05,TRUE,\n"
        + "CCC,2025-01-06,unadjusted_split,factor=2,0.5,0.05,false,real crash\n"
        + "DDD,2025-01-07,return_outlier,reverting_spike,9.1,8,unsure,\n",
        encoding="utf-8",
    )

    table = summarize(sheet)

    assert "| unadjusted_split | 3 | 2 | 1 | 0 | 0.67 |" in table
    assert "| return_outlier | 1 | 0 | 0 | 1 | n/a |" in table
    assert "| stale_bars | 0 | 0 | 0 | 0 | n/a |" in table


def test_blank_verdict_is_refused(tmp_path):
    sheet = tmp_path / "review-sheet.csv"
    sheet.write_text(HEADER + "AAA,2025-01-02,stale_bars,identical_ohlcv_run,6,5,,\n", encoding="utf-8")

    with pytest.raises(ReviewIncompleteError, match=r"\[2\]"):
        summarize(sheet)
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_review_summary.py -v`

Expected: `ModuleNotFoundError: No module named 'dq.review_summary'`.

- [ ] **Step 3: Implement `ml/dq/review_summary.py`**

```python
"""Aggregate the owner's filled review sheet into counts safe to commit (C1, D-3 input).

Usage (from ``ml/``)::

    .\\.venv\\Scripts\\python.exe -m dq.review_summary reports/dq/<snapshot_id>/<scan_version>/review-sheet.csv
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
```

- [ ] **Step 4: Run the focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest dq/tests/test_review_summary.py -v` — Expected: 2 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 51 passed.

- [ ] **Step 5: Commit**

```powershell
git add ml/dq/review_summary.py ml/dq/tests/test_review_summary.py
git diff --cached --check
git commit -m "feat(ml): summarize owner review of C1 findings"
```

---

## Task 7: Real-Snapshot Scan and Owner Review (owner gate)

This task needs the running Postgres container and about 1–2 hours of owner review time. An agent may run Steps 1–3 and prepare Step 4; only the owner fills verdicts. If the owner is unavailable, stop after Step 3 and report the plan as "complete except owner review".

**Files:**
- Create: `docs/product/evidence/c1-dq-real-snapshot-review.md`
- Local only (ignored): `ml/datasets/exports/price_history-<stamp>.csv`, `ml/snapshots/<snapshot_id>/`, `ml/reports/dq/<snapshot_id>/dq-scan-1.0.0/`

**Interfaces:**
- Consumes: Tasks 1–6; thresholds frozen from this step on.
- Produces: the reviewed aggregate counts that spec §5 P1.3 requires and D-3/D-4 consume.
- Preserves: database contents; no provider call (the export reads stored rows only).

**Acceptance Evidence:**
- `rg -n "dq-scan-1.0.0" docs/product/evidence/c1-dq-real-snapshot-review.md` → match.
- `git status --porcelain -- ml` → empty after commit (no data file tracked).

- [ ] **Step 1: Freeze check**

Run (repo root): `git log --oneline -1 -- ml/dq/thresholds.json; git status --porcelain -- ml/dq/thresholds.json`

Expected: the Task 2 or Task 5 commit, and no uncommitted change.

- [ ] **Step 2: Export and snapshot** — follow `ml/dq/README.md` sections 2–4 exactly. Record the printed `snapshot_id`, row count, and symbol count.

- [ ] **Step 3: Scan** — from `ml/`: `.\.venv\Scripts\python.exe -m dq.scan --snapshot snapshots/<snapshot_id>`. Expected: exit 0 and the output directory path. Run it a second time into a different `--reports` directory and compare `dq-report.json` with `Get-FileHash`; the hashes must match (real-data replay evidence).

- [ ] **Step 4: Owner review** — the owner opens `review-sheet.csv` and sets `verdict` per row:

  | Class | `true` when | Where to check |
  |---|---|---|
  | `unadjusted_split` / `unadjusted_reverse_split` | the company announced a split with that factor effective on that date | issuer investor-relations page or exchange notice |
  | `missing_sessions` | the exchange was open on the absent days | exchange holiday calendar |
  | `stale_bars` | the market was open and the instrument traded, yet bars repeat | provider chart for those dates |
  | `return_outlier` | the spike does not appear in an independent chart | second chart source |
  | `volume_anomaly` | volume is far outside what an independent source shows | second chart source |
  | `duplicate_session` | the rows are different-interval bars or duplicates for one day | `ml/snapshots/<id>/prices.parquet` rows for that date |
  | `non_positive_price`, `ohlc_inconsistency` | the stored values violate the rule (always `true` unless the export is wrong) | the snapshot row |

  Use `unsure` whenever no independent source settles it. Do not use provider data to "correct" anything; this is review only.

- [ ] **Step 5: Aggregate** — from `ml/`: `.\.venv\Scripts\python.exe -m dq.review_summary reports/dq/<snapshot_id>/dq-scan-1.0.0/review-sheet.csv`. Expected: exit 0 and the Markdown table.

- [ ] **Step 6: Write the evidence record** — `docs/product/evidence/c1-dq-real-snapshot-review.md` containing: date; `snapshot_id`; `scan_version`; `thresholds_version` and the first 12 hex of `thresholds_sha256`; symbol, row, symbol-year, and flagged-symbol-year counts; findings per class (from `dq-summary.md`, counts only); the Step 5 table; the replay-hash result of Step 3; number of insufficient-history symbols; known blind spots; and a closing section **Input to D-3 and D-4** stating, per class, whether precision looks high enough to feed deterministic freshness/conflict rules (owner judgment, quoted as such). No symbols, dates, prices, or volumes.

- [ ] **Step 7: Verify and commit**

Run: `rg -n "dq-scan-1.0.0" docs/product/evidence/c1-dq-real-snapshot-review.md; rg -n "\b[A-Z]{1,5}\b,\d{4}-\d{2}-\d{2}" docs/product/evidence/c1-dq-real-snapshot-review.md`

Expected: one match, then no match (no symbol/date rows leaked).

```powershell
git add docs/product/evidence/c1-dq-real-snapshot-review.md
git diff --cached --check
git commit -m "docs(spec): record C1 real-snapshot review counts"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] Every name under **Produces** exists exactly.
- [ ] `ml/` full suite: 51 passed; `python -m dq.evaluate` exit 0 with output in the PR (spec §8: recall and false-flag targets on fixtures).
- [ ] Task 7 evidence committed (spec §8: reviewed report on the owner's real snapshot), or the PR states that the owner gate is open.
- [ ] `git ls-files ml` contains no export, snapshot, report, or review sheet; the Plan 2 hygiene test passes.
- [ ] No file under `data-service/`, `backend/`, or `frontend/` changed.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff

- Inputs made available: `dq` package and CLI; frozen `dq-thresholds-v1` (or v2); the evidence record for D-3/D-4.
- Conditions later work may assume: the scanner is deterministic per (snapshot, thresholds, scan version); findings never modify data.
- Open risks carried forward:
  - Single missing sessions and splits within five sessions of a series edge are undetected. Owner: C1 integration spec revision (Phase 2).
  - `price_history` lacks interval, provider, and adjustment columns (PF-3); the export's `adjusted` is always `null`. Owner: EPIC-001 / C2 adjusted-close migration gate.
  - Synthetic fixtures model US-like daily equities; real universes with other calendars may show more `missing_sessions` findings. Owner: Task 7 review.

## Self-Review

**Spec coverage:** P1.3 form (CLI, offline) — Task 4; input (read-only `\copy`, snapshot format) — Task 1; fault classes (all seven spec classes plus `duplicate_session` from PF-3) — Task 2; method (robust z/MAD, rules, split-ratio detection, versioned thresholds) — Task 2; output (versioned JSON, human-readable summary) — Task 4; success (recall ≥ 95%, < 1% flagged symbol-years, reviewed real snapshot) — Tasks 5 and 7; cross-provider checks deferred as the spec states. §9 replay test — Task 4 `test_same_snapshot_and_scan_version_give_byte_identical_outputs`.

**Step scan:** Every code step contains the complete file verified in a planning workspace (ml venv with numpy 2.5.4, pandas 3.0.6, pyarrow 26.0.0: 36 Plan 2–3 tests passed). Owner-only work is fenced as a gate.

**Type and name consistency:** `DEFAULT_THRESHOLDS` is defined once in `dq.scan` (stub in Task 2, full module in Task 4); `FAULT_CLASSES` order drives labels, report keys (sorted in JSON), and review rows; `session_date` strings compare lexicographically in `detected`.

**Review focus:** All five items map to named tests.

**Proportion:** Statistics and rules only; no model, no integration.
