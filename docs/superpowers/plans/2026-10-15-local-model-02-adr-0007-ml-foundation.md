# Local Model Decision-Support Plan 2 — ADR-0007 and `ml/` Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the local model lifecycle as ADR-0007 (`Proposed`), create the isolated `ml/` workspace with its own virtual environment and a guard test that keeps data and artifacts out of git, and implement the content-addressed price snapshot format every later plan reads.

**Architecture:** `ml/` is a top-level sibling of the three runtimes, not a runtime: command-line modules only, own `requirements.txt` plus a frozen lock file, own `.venv`, own `pytest.ini`. Python packages live directly under `ml/` (`lifecycle/`, later `dq/`, `sandbox/`), and every command runs from `ml/` with `pythonpath = .`. A snapshot is a directory `ml/snapshots/<snapshot_id>/` holding `prices.parquet` and `manifest.json`; the id is derived from a canonical serialization of the data, so the same rows always give the same id and any byte change is detected on load.

**Tech Stack:** Python 3.13, numpy, pandas 3, pyarrow, pytest; `git check-ignore`; Markdown ADR.

**Plan Set:** Plan 2 of 5 in `docs/superpowers/plans/2026-10-15-local-model-decision-support-plan-set.md`.

**Depends On:** Plan set execution preconditions only.

**Produces:**
- `docs/adr/0007-local-model-lifecycle.md` (`Status: Proposed`) and its README row.
- `ml/README.md`, `ml/requirements.txt`, `ml/requirements.lock.txt`, `ml/pytest.ini`, `ml/.venv` (local, ignored).
- `.gitignore` section "Local ML (ADR-0007)".
- `ml/tests/test_repository_hygiene.py` (guard for spec §8 "no artifact or dataset is tracked by git").
- `ml/lifecycle/hashing.py`: `sha256_file(path: Path) -> str`, `sha256_bytes(data: bytes) -> str`.
- `ml/lifecycle/snapshot.py`: `PRICE_COLUMNS`, `SnapshotError`, `SnapshotSchemaError`, `SnapshotIntegrityError`, `SnapshotFile`, `SnapshotManifest`, `session_date_utc(timestamps: pd.Series) -> pd.Series`, `normalize_price_frame(frame: pd.DataFrame) -> pd.DataFrame`, `write_price_snapshot(frame, snapshots_root, *, source, adjusted, created_at) -> tuple[SnapshotManifest, Path]`, `load_price_snapshot(directory: Path) -> tuple[SnapshotManifest, pd.DataFrame]`.

**Spec:** `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` §4 guardrails 4–10, §5 P1.2, §8 bullets 2 and 6, §11 row C8.

## Locked Decisions

- **ADR number and status.** ADR-0007, `Status: Proposed`, deciders "Owner (pending)". It becomes `Accepted` only by an owner commit; no plan in this set changes the status.
- **Layout.** `ml/` contains code packages (`lifecycle/`, `dq/`, `sandbox/`, `spikes/`) and ignored data directories (`.venv/`, `.venv-*/`, `artifacts/`, `datasets/`, `snapshots/`, `reports/`). Code packages never share a name with a data directory.
- **Environment.** `ml/.venv` is created with `%LOCALAPPDATA%\Programs\Python\Python313\python.exe`. Direct dependencies in `requirements.txt` use floors; `requirements.lock.txt` is the `pip freeze` output committed for replay identity. No CUDA wheel is listed in either file.
- **Snapshot format v1.**
  - Columns and types in `prices.parquet`: `symbol` (str, upper-case), `session_date` (str `YYYY-MM-DD`), `timestamp` (UTC `datetime64[ns, UTC]`), `open`, `high`, `low`, `close`, `volume` (float64). Rows sorted by `symbol`, `timestamp`.
  - `session_date` = UTC timestamp rounded to the nearest day (`floor(timestamp + 12h)`), the ADR-0006 D7 rule.
  - `snapshot_id` = `"<kind>-" + sha256(canonical CSV)[:16]`, canonical CSV = the normalized frame written with `index=False`, `float_format="%.17g"`, `date_format="%Y-%m-%dT%H:%M:%S.%fZ"`, `lineterminator="\n"`. `created_at` and `source` are not part of the id.
  - `manifest.json` keys (exactly): `format_version` (1), `snapshot_id`, `kind` (`"price_history"`), `source`, `created_at`, `symbols` (sorted, unique), `date_range` (`{"start", "end"}` session dates), `adjusted` (`true` | `false` | `null` = unknown), `feature_set_version` (`"ohlcv-v1"`), `row_count`, `files` (`[{"path": "prices.parquet", "sha256", "rows"}]`). Serialized with `sort_keys=True, indent=2` and a trailing newline.
  - Writing is idempotent: if the target directory exists with an identical manifest id and a verifying parquet hash, the existing manifest is returned unchanged.
- **Normalization rejects, never repairs.** Missing columns, nulls, unparseable timestamps or numbers, blank symbols, and duplicate `(symbol, timestamp)` raise `SnapshotSchemaError`. Zero, negative, or inconsistent prices are accepted, because finding them is Plan 3's job.
- **Model card schema** is specified in the ADR (Task 1) but implemented with the first trained model (Phase 2, C3). Phase 1 trains nothing (YAGNI).

## Global Constraints

- "Weights, datasets, snapshots, and labeled sets are gitignored; each artifact has a model card with dataset hashes, license, code SHA, and metrics." (spec §4.6)
- "Offline training only. No training on a request path and no training from live provider calls. Training reads frozen, hashed snapshots." (spec §4.5)
- "Product-path inference runs on CPU (ONNX Runtime or NumPy). No CUDA dependency enters `data-service`." (spec §4.7)
- "No fourth runtime." (spec §5 P1.2)
- "Applied Flyway migrations are immutable" — this plan adds no migration and no backend change.
- Preserve unrelated working-tree changes; `.gitignore` edits append a new section and do not reorder existing lines.

## Review Focus

- **A dataset slips into git through a path the patterns miss.** Task 2 `test_data_and_artifact_paths_are_ignored` covers each data directory, each artifact suffix in an arbitrary directory, and both venv names; `test_no_tracked_file_is_data_or_artifact` scans `git ls-files ml`.
- **Same data, different snapshot id (replay identity broken).** Row order, `created_at`, and `source` must not change the id. Task 3 `test_snapshot_id_ignores_row_order_and_metadata`.
- **Silent tampering.** A rewritten `prices.parquet` with one changed close must fail on load. Task 3 `test_tampered_parquet_is_rejected`.
- **Timezone shift changes the session.** `2026-10-13T22:00Z` (midnight in UTC+2) and `2026-10-14T04:00Z` (US daily bar) both map to `2026-10-14`. Task 3 `test_session_date_rounds_to_nearest_utc_day`.
- **Normalization "fixes" bad data.** A negative close must be kept as-is; a null close must be rejected, not filled. Task 3 `test_bad_prices_are_kept_but_nulls_are_rejected`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/adr/0007-local-model-lifecycle.md` | Create | Lifecycle decision record |
| `docs/adr/README.md` | Modify | ADR list row |
| `.gitignore` | Modify | Local ML ignore section |
| `ml/README.md` | Create | Purpose, rules, setup, layout |
| `ml/requirements.txt` | Create | Direct dependencies (floors) |
| `ml/requirements.lock.txt` | Create | `pip freeze` lock |
| `ml/pytest.ini` | Create | Test configuration |
| `ml/tests/__init__.py` | Create | Empty package marker |
| `ml/tests/test_repository_hygiene.py` | Create | Ignore and tracked-file guard |
| `ml/lifecycle/__init__.py` | Create | Empty package marker |
| `ml/lifecycle/hashing.py` | Create | SHA-256 helpers |
| `ml/lifecycle/snapshot.py` | Create | Snapshot format v1 |
| `ml/tests/test_snapshot.py` | Create | Snapshot behavior |

---

## Task 1: ADR-0007 Local Model Lifecycle (`Proposed`)

**Files:**
- Create: `docs/adr/0007-local-model-lifecycle.md`
- Modify: `docs/adr/README.md` (ADR List table)

**Interfaces:**
- Consumes: spec §4, §5 P1.2; ADR-0002, ADR-0003, ADR-0006 for structure and cross-references.
- Produces: decisions D1–D10 that Plans 3–5 cite by number.
- Preserves: ADR-0001…0006 unchanged.

**Acceptance Evidence:**
- `rg -n "^Status: Proposed" docs/adr/0007-local-model-lifecycle.md` → one match.
- `rg -n "ADR-0007" docs/adr/README.md` → one match.

- [ ] **Step 1: Gate — confirm the ADR is absent**

Run: `Test-Path docs/adr/0007-local-model-lifecycle.md; rg -n "ADR-0007" docs/adr/README.md`

Expected: `False`, then no match.

- [ ] **Step 2: Write the ADR**

Use the ADR-0006 structure: title, `Date: 2026-10-15`, `Status: Proposed`, `Deciders: Owner (pending)`, then `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences` (`### Positive`, `### Negative / trade-offs`), `## References`.

Context (one paragraph each): the owner's two goals (spec §1); the absence of any ML lifecycle in the three runtimes; spec guardrails 4–10; data-rights uncertainty D-1.

Decision — write these ten items verbatim in substance:

1. **D1 Location.** Offline model work lives in top-level `ml/` with its own `requirements.txt`, `requirements.lock.txt`, and `.venv`. It is not a runtime: no server, no port, no Compose service.
2. **D2 Isolation.** `data-service`, `backend`, and `frontend` never import from `ml/`. When a model is approved for serving, its inference code is copied into `data-service` as a reviewed module that depends only on NumPy or ONNX Runtime, and loads a registry artifact by path.
3. **D3 Snapshots.** Training and evaluation read only frozen snapshots: `ml/snapshots/<snapshot_id>/manifest.json` plus Parquet files, format v1 as specified in Plan 2 (columns, session-date rule, content-addressed id, per-file sha256, `adjusted` true/false/null).
4. **D4 Registry.** Artifacts live at `ml/artifacts/<model_id>/<version>/` with `model_card.json` (schema below). Versions are immutable once written.
5. **D5 Model card schema.** Required keys: `model_id`, `model_version`, `task`, `created_at`, `training_code_sha`, `dataset_snapshot_ids`, `feature_set_version`, `datasets` (`name`, `source_url`, `license`, `license_verified_at`, `sha256`), `base_model` (`id`, `revision`, `license`) or `null`, `metrics`, `evaluation_set_id`, `intended_use`, `out_of_scope_uses`, `kill_switch_env`.
6. **D6 Replay identity.** Every served model result carries `model_id`, `model_version`, `dataset_snapshot_id`, `feature_set_version`, `training_code_sha` (spec §4.9, PRD-FR-027).
7. **D7 Serving.** CPU only (NumPy or ONNX Runtime) inside `data-service`; no CUDA dependency in any runtime. Each model has its own kill switch `ML_<MODEL_ID>_ENABLED` (default `false`); disabled, missing, corrupt, or mismatched artifacts yield `unavailable` with a reason (spec §4.8).
8. **D8 Data rights.** Until D-1 is decided, no model trains on Yahoo, Tiingo, or Finnhub data; provider data is used only for local evaluation and inference. Public training data requires a recorded, verified license.
9. **D9 Git hygiene.** `.gitignore` excludes `ml/.venv/`, `ml/.venv-*/`, `ml/artifacts/`, `ml/datasets/`, `ml/snapshots/`, `ml/reports/`, `*.onnx`, `*.gguf`, `*.parquet`, `*.joblib`; `ml/tests/test_repository_hygiene.py` enforces it.
10. **D10 Learning sandbox.** `ml/sandbox/` is never imported by any runtime; a test enforces this (spec §4.10). Sandbox output never enters the product.

Alternatives considered (table): a fourth Python runtime/model server (rejected: ADR-0002 three runtimes, operational cost); training inside `data-service` (rejected: request-path coupling, CUDA risk, read-only analytics rule); MLflow or a hosted registry (rejected for Phase 1: no trained artifact yet, extra service; revisit with C3); storing weights in Redis or git (rejected: ADR-0003 cache semantics, repository hygiene).

Consequences: positive — reproducible evaluation, no product coupling, explicit degradation path; negative — duplicated inference code when serving, a second venv to maintain, `ml/` not yet in CI.

References: spec path, `AGENTS.md`, ADR-0002, ADR-0003, ADR-0006, PRD-FR-027, PRD-NFR-010.

- [ ] **Step 3: Add the README row**

Append to the ADR List table:

```markdown
| [ADR-0007](0007-local-model-lifecycle.md) | Local Model Lifecycle | Proposed |
```

- [ ] **Step 4: Verify and commit**

Run: `rg -n "^Status: Proposed" docs/adr/0007-local-model-lifecycle.md; rg -n "ADR-0007" docs/adr/README.md; rg -c "^\d+\. \*\*D\d+" docs/adr/0007-local-model-lifecycle.md`

Expected: one match, one match, `10`.

```powershell
git add docs/adr/0007-local-model-lifecycle.md docs/adr/README.md
git diff --cached --check
git commit -m "docs(adr): propose ADR-0007 local model lifecycle"
```

---

## Task 2: `ml/` Workspace and Git Hygiene Guard

**Files:**
- Modify: `.gitignore` (append section)
- Create: `ml/README.md`, `ml/requirements.txt`, `ml/requirements.lock.txt`, `ml/pytest.ini`, `ml/tests/__init__.py`
- Test: `ml/tests/test_repository_hygiene.py`

**Interfaces:**
- Consumes: ADR-0007 D1, D9.
- Produces: working `ml/.venv`; command `.\.venv\Scripts\python.exe -m pytest -q` from `ml/`; `REPO_ROOT` resolution pattern `Path(__file__).resolve().parents[2]` reused by later guard tests.
- Preserves: every existing `.gitignore` line and its order.

**Acceptance Evidence:**
- From `ml/`: `.\.venv\Scripts\python.exe -m pytest -q` → 15 passed.

- [ ] **Step 1: Create the workspace files**

`ml/requirements.txt`:

```text
# Direct dependencies of the offline ML workspace (ADR-0007 D1). CPU only.
numpy>=2.2
pandas>=3.0
pyarrow>=17.0
scipy>=1.14
pytest>=8.2
```

`ml/pytest.ini`:

```ini
[pytest]
addopts = -p no:cacheprovider
pythonpath = .
testpaths = tests
norecursedirs = .venv .venv-* spikes artifacts datasets snapshots reports __pycache__
```

`ml/tests/__init__.py`: empty.

`ml/README.md` sections: **Purpose** (two goals, link to the spec and ADR-0007); **Rules** (the ten ADR-0007 decisions as one-line bullets, plus "never commit anything under `datasets/`, `snapshots/`, `reports/`, `artifacts/`"); **Setup** (the four PowerShell commands of Step 2); **Layout** (table of `lifecycle/`, `dq/`, `sandbox/`, `spikes/` and the ignored data directories); **Running** (`.\.venv\Scripts\python.exe -m pytest -q`, and `python -m <package>.<module>` from `ml/`).

- [ ] **Step 2: Create the virtual environment and lock file**

Run (from `ml/`):

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip freeze | Set-Content -Encoding utf8 requirements.lock.txt
```

Expected: install succeeds; `requirements.lock.txt` lists exact `numpy==`, `pandas==`, `pyarrow==`, `scipy==`, `pytest==` lines and no `nvidia-*` or `torch` line.

- [ ] **Step 3: Write the failing guard tests**

`ml/tests/test_repository_hygiene.py`:

```python
"""Data, snapshots, reports, venvs, and model artifacts never enter git (ADR-0007 D9)."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]

MUST_BE_IGNORED = [
    "ml/.venv/pyvenv.cfg",
    "ml/.venv-s1/pyvenv.cfg",
    "ml/artifacts/c3/1/model_card.json",
    "ml/datasets/s1/headlines.csv",
    "ml/snapshots/price_history-0123456789abcdef/manifest.json",
    "ml/reports/dq/price_history-0123456789abcdef/dq-report.json",
    "ml/lifecycle/stray.parquet",
    "data-service/app/model.onnx",
    "backend/weights.gguf",
    "anywhere/model.joblib",
]

MUST_STAY_TRACKABLE = [
    "ml/README.md",
    "ml/requirements.lock.txt",
    "ml/lifecycle/snapshot.py",
    "ml/dq/thresholds.json",
]

FORBIDDEN_TRACKED_SUFFIXES = (".parquet", ".onnx", ".gguf", ".joblib", ".csv", ".jsonl")
FORBIDDEN_TRACKED_PREFIXES = ("ml/datasets/", "ml/snapshots/", "ml/reports/", "ml/artifacts/", "ml/.venv")


def _is_ignored(path: str) -> bool:
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "--quiet", path],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert result.returncode in (0, 1), result.stderr
    return result.returncode == 0


@pytest.mark.parametrize("path", MUST_BE_IGNORED)
def test_data_and_artifact_paths_are_ignored(path):
    assert _is_ignored(path)


@pytest.mark.parametrize("path", MUST_STAY_TRACKABLE)
def test_code_and_config_paths_are_not_ignored(path):
    assert not _is_ignored(path)


def test_no_tracked_file_is_data_or_artifact():
    tracked = subprocess.run(
        ["git", "ls-files", "--", "ml"], cwd=REPO_ROOT, capture_output=True, text=True, check=True,
    ).stdout.splitlines()

    offenders = [p for p in tracked if p.endswith(FORBIDDEN_TRACKED_SUFFIXES) or p.startswith(FORBIDDEN_TRACKED_PREFIXES)]

    assert offenders == []
```

The `pytest -q` count in Acceptance Evidence counts test functions as reported by pytest: 10 + 4 parametrized cases + 1 = 15 tests. Use `15 passed` as the expected count.

- [ ] **Step 4: Run them and confirm failure**

Run (from `ml/`): `.\.venv\Scripts\python.exe -m pytest tests/test_repository_hygiene.py -q`

Expected: all 10 `test_data_and_artifact_paths_are_ignored` cases FAIL (verified during planning: `git check-ignore --no-index` returns 1 for every one of them under the current `.gitignore`); the other 5 tests pass.

- [ ] **Step 5: Append the ignore section to `.gitignore`**

```gitignore

### Local ML (ADR-0007) — data, snapshots, reports, and artifacts never enter git ###
ml/.venv/
ml/.venv-*/
ml/artifacts/
ml/datasets/
ml/snapshots/
ml/reports/
*.onnx
*.gguf
*.parquet
*.joblib
```

- [ ] **Step 6: Run focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: `15 passed`.

Run (repo root): `git status --porcelain -- ml` — Expected: only `?? ml/` entries for the new tracked files; nothing under `ml/.venv`.

- [ ] **Step 7: Commit**

```powershell
git add .gitignore ml/README.md ml/requirements.txt ml/requirements.lock.txt ml/pytest.ini ml/tests/__init__.py ml/tests/test_repository_hygiene.py
git diff --cached --check
git commit -m "chore(ml): add isolated ml workspace and git hygiene guard"
```

---

## Task 3: Content-Addressed Price Snapshot Format v1

**Files:**
- Create: `ml/lifecycle/__init__.py` (empty), `ml/lifecycle/hashing.py`, `ml/lifecycle/snapshot.py`
- Test: `ml/tests/test_snapshot.py`

**Interfaces:**
- Consumes: Task 2 workspace.
- Produces (exact):

  ```python
  PRICE_COLUMNS: tuple[str, ...] = ("symbol", "session_date", "timestamp", "open", "high", "low", "close", "volume")
  INPUT_COLUMNS: tuple[str, ...] = ("symbol", "timestamp", "open", "high", "low", "close", "volume")
  FORMAT_VERSION = 1
  FEATURE_SET_VERSION = "ohlcv-v1"
  PRICES_FILE = "prices.parquet"
  MANIFEST_FILE = "manifest.json"

  class SnapshotError(Exception): ...
  class SnapshotSchemaError(SnapshotError): ...
  class SnapshotIntegrityError(SnapshotError): ...

  @dataclass(frozen=True)
  class SnapshotFile:
      path: str
      sha256: str
      rows: int

  @dataclass(frozen=True)
  class SnapshotManifest:
      format_version: int
      snapshot_id: str
      kind: str
      source: str
      created_at: str
      symbols: tuple[str, ...]
      date_range: tuple[str, str]
      adjusted: bool | None
      feature_set_version: str
      row_count: int
      files: tuple[SnapshotFile, ...]
      def to_json(self) -> str: ...
      @classmethod
      def from_json(cls, text: str) -> "SnapshotManifest": ...

  def session_date_utc(timestamps: pd.Series) -> pd.Series
  def normalize_price_frame(frame: pd.DataFrame) -> pd.DataFrame
  def write_price_snapshot(frame: pd.DataFrame, snapshots_root: Path, *, source: str, adjusted: bool | None, created_at: datetime) -> tuple[SnapshotManifest, Path]
  def load_price_snapshot(directory: Path) -> tuple[SnapshotManifest, pd.DataFrame]
  ```

- Preserves: input frames are not mutated.

**Acceptance Evidence:**
- `pytest tests/test_snapshot.py -v` → 11 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""Snapshot format v1: normalization, content addressing, integrity (ADR-0007 D3)."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pandas as pd
import pytest
from pandas.testing import assert_frame_equal

from lifecycle.snapshot import (
    SnapshotIntegrityError,
    SnapshotSchemaError,
    load_price_snapshot,
    normalize_price_frame,
    session_date_utc,
    write_price_snapshot,
)

CREATED = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)


def _frame(**overrides) -> pd.DataFrame:
    rows = {
        "symbol": [" aapl", "AAPL", "MSFT"],
        "timestamp": ["2026-10-13T04:00:00Z", "2026-10-14T04:00:00Z", "2026-10-14T04:00:00Z"],
        "open": [100.0, 101.0, 400.0],
        "high": [102.0, 103.0, 405.0],
        "low": [99.0, 100.5, 398.0],
        "close": [101.0, 102.5, 401.0],
        "volume": [1_000_000.0, 1_100_000.0, 900_000.0],
    }
    rows.update(overrides)
    return pd.DataFrame(rows)


def test_session_date_rounds_to_nearest_utc_day():
    stamps = pd.Series(pd.to_datetime(
        ["2026-10-13T22:00:00Z", "2026-10-14T04:00:00Z", "2026-10-14T11:59:00Z", "2026-10-14T12:00:00Z"], utc=True,
    ))
    assert session_date_utc(stamps).tolist() == ["2026-10-14", "2026-10-14", "2026-10-14", "2026-10-15"]


def test_normalize_uppercases_sorts_and_adds_session_date():
    normalized = normalize_price_frame(_frame())

    assert list(normalized.columns) == ["symbol", "session_date", "timestamp", "open", "high", "low", "close", "volume"]
    assert normalized["symbol"].tolist() == ["AAPL", "AAPL", "MSFT"]
    assert normalized["session_date"].tolist() == ["2026-10-13", "2026-10-14", "2026-10-14"]
    assert str(normalized["timestamp"].dtype) == "datetime64[ns, UTC]"


def test_bad_prices_are_kept_but_nulls_are_rejected():
    kept = normalize_price_frame(_frame(close=[-1.0, 0.0, 401.0], low=[105.0, 100.5, 398.0]))
    assert kept["close"].tolist() == [-1.0, 0.0, 401.0]
    assert kept["low"].tolist()[0] == 105.0

    with pytest.raises(SnapshotSchemaError, match="close"):
        normalize_price_frame(_frame(close=[101.0, None, 401.0]))


@pytest.mark.parametrize(
    "broken",
    [
        _frame().drop(columns=["volume"]),
        _frame(symbol=["AAPL", "  ", "MSFT"]),
        _frame(timestamp=["2026-10-13T04:00:00Z", "not-a-date", "2026-10-14T04:00:00Z"]),
        _frame(symbol=["AAPL", "AAPL", "AAPL"], timestamp=["2026-10-13T04:00:00Z"] * 2 + ["2026-10-14T04:00:00Z"]),
    ],
    ids=["missing-column", "blank-symbol", "bad-timestamp", "duplicate-symbol-timestamp"],
)
def test_structural_problems_raise_schema_error(broken):
    with pytest.raises(SnapshotSchemaError):
        normalize_price_frame(broken)


def test_round_trip_and_manifest(tmp_path):
    manifest, directory = write_price_snapshot(_frame(), tmp_path, source="postgres:price_history", adjusted=None, created_at=CREATED)

    loaded_manifest, loaded = load_price_snapshot(directory)

    assert directory == tmp_path / manifest.snapshot_id
    assert manifest.snapshot_id.startswith("price_history-") and len(manifest.snapshot_id) == len("price_history-") + 16
    assert loaded_manifest == manifest
    assert_frame_equal(loaded, normalize_price_frame(_frame()))
    raw = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    assert set(raw) == {
        "format_version", "snapshot_id", "kind", "source", "created_at", "symbols", "date_range",
        "adjusted", "feature_set_version", "row_count", "files",
    }
    assert raw["adjusted"] is None
    assert raw["symbols"] == ["AAPL", "MSFT"]
    assert raw["date_range"] == {"start": "2026-10-13", "end": "2026-10-14"}
    assert raw["files"][0]["path"] == "prices.parquet" and raw["files"][0]["rows"] == 3


def test_snapshot_id_ignores_row_order_and_metadata(tmp_path):
    first, _ = write_price_snapshot(_frame(), tmp_path / "a", source="one", adjusted=None, created_at=CREATED)
    shuffled = _frame().iloc[[2, 0, 1]].reset_index(drop=True)
    second, _ = write_price_snapshot(shuffled, tmp_path / "b", source="two", adjusted=None, created_at=datetime(2027, 1, 1, tzinfo=timezone.utc))
    changed, _ = write_price_snapshot(_frame(close=[101.0, 102.5, 401.01]), tmp_path / "c", source="one", adjusted=None, created_at=CREATED)

    assert first.snapshot_id == second.snapshot_id
    assert changed.snapshot_id != first.snapshot_id


def test_rewrite_is_idempotent(tmp_path):
    first, directory = write_price_snapshot(_frame(), tmp_path, source="one", adjusted=None, created_at=CREATED)
    again, same_directory = write_price_snapshot(_frame(), tmp_path, source="one", adjusted=None, created_at=datetime(2027, 1, 1, tzinfo=timezone.utc))

    assert same_directory == directory
    assert again == first


def test_tampered_parquet_is_rejected(tmp_path):
    _, directory = write_price_snapshot(_frame(), tmp_path, source="one", adjusted=None, created_at=CREATED)
    tampered = pd.read_parquet(directory / "prices.parquet")
    tampered.loc[0, "close"] = 999.0
    tampered.to_parquet(directory / "prices.parquet", index=False)

    with pytest.raises(SnapshotIntegrityError):
        load_price_snapshot(directory)
```

`tests/test_snapshot.py -v` reports 11 items (the structural test has 4 cases). Use `11 passed` as the expected count.

- [ ] **Step 2: Run them and confirm failure**

Run (from `ml/`): `.\.venv\Scripts\python.exe -m pytest tests/test_snapshot.py -v`

Expected: collection error `ModuleNotFoundError: No module named 'lifecycle'`.

- [ ] **Step 3: Implement `lifecycle/hashing.py`**

```python
"""SHA-256 helpers for snapshots and artifacts (ADR-0007 D3, D5)."""

from __future__ import annotations

import hashlib
from pathlib import Path

_CHUNK = 1 << 20


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(_CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()
```

- [ ] **Step 4: Implement `lifecycle/snapshot.py`**

```python
"""Price snapshot format v1 (ADR-0007 D3).

A snapshot is ``<root>/<snapshot_id>/{prices.parquet, manifest.json}``. The id is
derived from the canonical content, so identical rows always share an id and any
byte change is detected on load. Normalization rejects structural problems and
never repairs values; finding bad prices is the scanner's job.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from lifecycle.hashing import sha256_bytes, sha256_file

PRICE_COLUMNS: tuple[str, ...] = ("symbol", "session_date", "timestamp", "open", "high", "low", "close", "volume")
INPUT_COLUMNS: tuple[str, ...] = ("symbol", "timestamp", "open", "high", "low", "close", "volume")
_NUMERIC_COLUMNS = ("open", "high", "low", "close", "volume")
FORMAT_VERSION = 1
FEATURE_SET_VERSION = "ohlcv-v1"
KIND = "price_history"
PRICES_FILE = "prices.parquet"
MANIFEST_FILE = "manifest.json"


class SnapshotError(Exception):
    """Base class for snapshot failures."""


class SnapshotSchemaError(SnapshotError):
    """Input rows are structurally unusable (missing, null, unparseable, or duplicated)."""


class SnapshotIntegrityError(SnapshotError):
    """Stored bytes do not match the manifest."""


@dataclass(frozen=True)
class SnapshotFile:
    path: str
    sha256: str
    rows: int


@dataclass(frozen=True)
class SnapshotManifest:
    format_version: int
    snapshot_id: str
    kind: str
    source: str
    created_at: str
    symbols: tuple[str, ...]
    date_range: tuple[str, str]
    adjusted: bool | None
    feature_set_version: str
    row_count: int
    files: tuple[SnapshotFile, ...]

    def to_json(self) -> str:
        payload = asdict(self)
        payload["symbols"] = list(self.symbols)
        payload["date_range"] = {"start": self.date_range[0], "end": self.date_range[1]}
        payload["files"] = [asdict(item) for item in self.files]
        return json.dumps(payload, sort_keys=True, indent=2) + "\n"

    @classmethod
    def from_json(cls, text: str) -> "SnapshotManifest":
        raw = json.loads(text)
        return cls(
            format_version=raw["format_version"],
            snapshot_id=raw["snapshot_id"],
            kind=raw["kind"],
            source=raw["source"],
            created_at=raw["created_at"],
            symbols=tuple(raw["symbols"]),
            date_range=(raw["date_range"]["start"], raw["date_range"]["end"]),
            adjusted=raw["adjusted"],
            feature_set_version=raw["feature_set_version"],
            row_count=raw["row_count"],
            files=tuple(SnapshotFile(**item) for item in raw["files"]),
        )


def session_date_utc(timestamps: pd.Series) -> pd.Series:
    """UTC timestamp rounded to the nearest day (ADR-0006 D7), as ``YYYY-MM-DD`` strings."""
    return (timestamps + pd.Timedelta(hours=12)).dt.floor("D").dt.strftime("%Y-%m-%d")


def normalize_price_frame(frame: pd.DataFrame) -> pd.DataFrame:
    missing = [column for column in INPUT_COLUMNS if column not in frame.columns]
    if missing:
        raise SnapshotSchemaError(f"missing columns: {missing}")
    out = frame.loc[:, list(INPUT_COLUMNS)].copy()
    for column in INPUT_COLUMNS:
        nulls = int(out[column].isna().sum())
        if nulls:
            raise SnapshotSchemaError(f"{nulls} null values in column {column!r}")
    out["symbol"] = out["symbol"].astype(str).str.strip().str.upper()
    if (out["symbol"] == "").any():
        raise SnapshotSchemaError("blank symbol")
    try:
        out["timestamp"] = pd.to_datetime(out["timestamp"], utc=True, format="ISO8601").astype("datetime64[ns, UTC]")
        for column in _NUMERIC_COLUMNS:
            out[column] = pd.to_numeric(out[column], errors="raise").astype("float64")
    except (ValueError, TypeError) as exc:
        raise SnapshotSchemaError(f"unparseable value: {exc}") from exc
    duplicated = int(out.duplicated(subset=["symbol", "timestamp"]).sum())
    if duplicated:
        raise SnapshotSchemaError(f"{duplicated} duplicate (symbol, timestamp) rows")
    out = out.sort_values(["symbol", "timestamp"], kind="mergesort").reset_index(drop=True)
    out.insert(1, "session_date", session_date_utc(out["timestamp"]))
    return out.loc[:, list(PRICE_COLUMNS)]


def _content_id(normalized: pd.DataFrame) -> str:
    canonical = normalized.to_csv(
        index=False, float_format="%.17g", date_format="%Y-%m-%dT%H:%M:%S.%fZ", lineterminator="\n",
    )
    return f"{KIND}-{sha256_bytes(canonical.encode('utf-8'))[:16]}"


def write_price_snapshot(
    frame: pd.DataFrame,
    snapshots_root: Path,
    *,
    source: str,
    adjusted: bool | None,
    created_at: datetime,
) -> tuple[SnapshotManifest, Path]:
    normalized = normalize_price_frame(frame)
    snapshot_id = _content_id(normalized)
    directory = snapshots_root / snapshot_id
    if (directory / MANIFEST_FILE).exists():
        existing, _ = load_price_snapshot(directory)
        return existing, directory
    directory.mkdir(parents=True, exist_ok=False)
    prices_path = directory / PRICES_FILE
    normalized.to_parquet(prices_path, index=False, engine="pyarrow")
    manifest = SnapshotManifest(
        format_version=FORMAT_VERSION,
        snapshot_id=snapshot_id,
        kind=KIND,
        source=source,
        created_at=created_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        symbols=tuple(sorted(normalized["symbol"].unique())),
        date_range=(normalized["session_date"].min(), normalized["session_date"].max()),
        adjusted=adjusted,
        feature_set_version=FEATURE_SET_VERSION,
        row_count=len(normalized),
        files=(SnapshotFile(PRICES_FILE, sha256_file(prices_path), len(normalized)),),
    )
    (directory / MANIFEST_FILE).write_text(manifest.to_json(), encoding="utf-8", newline="\n")
    return manifest, directory


def load_price_snapshot(directory: Path) -> tuple[SnapshotManifest, pd.DataFrame]:
    manifest = SnapshotManifest.from_json((directory / MANIFEST_FILE).read_text(encoding="utf-8"))
    if manifest.format_version != FORMAT_VERSION or manifest.kind != KIND:
        raise SnapshotIntegrityError(f"unsupported snapshot {manifest.kind} v{manifest.format_version}")
    for item in manifest.files:
        if sha256_file(directory / item.path) != item.sha256:
            raise SnapshotIntegrityError(f"sha256 mismatch for {item.path}")
    frame = pd.read_parquet(directory / PRICES_FILE, engine="pyarrow")
    if _content_id(frame) != manifest.snapshot_id or len(frame) != manifest.row_count:
        raise SnapshotIntegrityError("content does not match snapshot_id")
    return manifest, frame
```

If `assert_frame_equal` in `test_round_trip_and_manifest` fails only on dtypes after the Parquet round trip (for example pandas 3 reading `symbol`/`session_date` as a pyarrow-backed string dtype), make `load_price_snapshot` cast `symbol` and `session_date` with `.astype(normalized_dtype)` taken from `normalize_price_frame` output, re-run, and record the dtype in the ADR's snapshot paragraph. Do not relax the test.

- [ ] **Step 5: Run focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_snapshot.py -v` — Expected: 11 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 26 passed.

- [ ] **Step 6: Commit**

```powershell
git add ml/lifecycle/__init__.py ml/lifecycle/hashing.py ml/lifecycle/snapshot.py ml/tests/test_snapshot.py
git diff --cached --check
git commit -m "feat(ml): add content-addressed price snapshot format"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] ADR-0007 is `Proposed` with its README row (spec §8 bullet 2).
- [ ] `ml/` full suite: `26 passed`; fresh output in the PR.
- [ ] `git ls-files ml` lists only code, config, docs, and the lock file.
- [ ] No file under `data-service/`, `backend/`, or `frontend/` changed in this plan.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff to Plans 3, 4, 5

- Inputs made available: `ml/.venv`; `ml/pytest.ini` (`testpaths = tests`; Plans 3 and 5 append their test directories); `lifecycle.snapshot` API exactly as in Task 3 **Interfaces**; `REPO_ROOT` pattern; ignore rules for `datasets/`, `snapshots/`, `reports/`, `artifacts/`, `.venv-*`.
- Conditions the next plans may assume: identical rows ⇒ identical `snapshot_id`; a loaded snapshot has verified hashes; `session_date` follows ADR-0006 D7; `adjusted` may be `null`.
- Open risks carried forward: `ml/` is not in CI (owner: future `chore/ci-ml`); ADR-0007 is not yet accepted, so Phase 2 planning is blocked until it is (spec §5 Phase 2 gate).

## Self-Review

**Spec coverage:** P1.2 — offline `ml/` package with own dependency file and venv (Task 2); snapshot format with symbols, date range, `adjusted`, feature-set version, per-file sha256 (Task 3); filesystem registry and `model_card.json`, CPU inference, no fourth runtime, `.gitignore` entries (Task 1 ADR D3–D9, Task 2). Guardrail 6 and §8 bullet 6 are enforced by the hygiene test. Guardrail 10 is recorded here (D10) and enforced in Plan 5.

**Step scan:** Each code step shows code; ADR content is enumerated decision by decision.

**Type and name consistency:** `snapshot_id` prefix `price_history-` + 16 hex is used in the hygiene test paths and Plan 3; `session_date` is a string in both the normalizer and the manifest `date_range`.

**Review focus:** All five items map to named tests.

**Proportion:** ADR records decisions; code implements only the snapshot format Phase 1 needs; the model card stays a schema.
