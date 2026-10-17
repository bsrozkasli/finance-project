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
