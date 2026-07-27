"""Canonical Parquet storage for reproducible offline market-data snapshots."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

import pandas as pd

from finance_ml.core.quality import DataQualityError, sort_market_frame


CANONICAL_COLUMNS: Final = (
    "signal_date",
    "symbol",
    "open",
    "high",
    "low",
    "close",
    "adjusted_close",
    "volume",
)
_SOURCE_ALIASES: Final = {
    "signal_date": ("date", "datetime", "timestamp", "signal_date"),
    "symbol": ("ticker", "symbol"),
    "open": ("open",),
    "high": ("high",),
    "low": ("low",),
    "close": ("close",),
    "adjusted_close": ("adj close", "adj_close", "adjusted close", "adjusted_close"),
    "volume": ("volume",),
}


def _canonical_source_name(columns: pd.Index, candidates: tuple[str, ...]) -> str:
    by_lower_name = {str(column).strip().lower(): str(column) for column in columns}
    for candidate in candidates:
        if candidate in by_lower_name:
            return by_lower_name[candidate]
    raise DataQualityError(f"Source data is missing one of: {', '.join(candidates)}")


def normalize_market_frame(raw_frame: pd.DataFrame, source_dataset: str) -> pd.DataFrame:
    """Map a Kaggle OHLCV table to a canonical, split-adjusted OHLCV table.

    Raw prices are retained in ``open/high/low/close``. Their adjusted variants
    are materialised separately so all return, volatility, and target formulas
    use a consistent split/dividend-adjusted price basis.
    """

    selected = {
        target: raw_frame[_canonical_source_name(raw_frame.columns, aliases)]
        for target, aliases in _SOURCE_ALIASES.items()
    }
    frame = pd.DataFrame(selected)
    frame["signal_date"] = pd.to_datetime(
        frame["signal_date"], errors="coerce", utc=True
    ).dt.tz_localize(None).dt.normalize()
    frame["symbol"] = frame["symbol"].astype(str).str.strip().str.upper()
    for column in ("open", "high", "low", "close", "adjusted_close", "volume"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    if (frame["close"] == 0).any():
        raise DataQualityError("close contains zero; adjustment factor is undefined")

    adjustment_factor = frame["adjusted_close"] / frame["close"]
    frame["adjusted_open"] = frame["open"] * adjustment_factor
    frame["adjusted_high"] = frame["high"] * adjustment_factor
    frame["adjusted_low"] = frame["low"] * adjustment_factor
    frame["source_dataset"] = source_dataset
    return sort_market_frame(frame)


def file_sha256(path: Path) -> str:
    """Return a content hash without keeping the full file in memory."""

    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_prepared_snapshot(frame: pd.DataFrame, destination: Path) -> dict[str, object]:
    """Write a canonical snapshot and a small provenance manifest beside it."""

    prepared = sort_market_frame(frame)
    destination.parent.mkdir(parents=True, exist_ok=True)
    prepared.to_parquet(destination, index=False, engine="pyarrow")
    manifest = {
        "path": destination.name,
        "sha256": file_sha256(destination),
        "rows": int(len(prepared)),
        "symbols": int(prepared["symbol"].nunique()),
        "start_date": prepared["signal_date"].min().date().isoformat(),
        "end_date": prepared["signal_date"].max().date().isoformat(),
        "source_datasets": sorted(
            prepared.get("source_dataset", pd.Series(dtype=str)).dropna().unique().tolist()
        ),
    }
    destination.with_suffix(".manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return manifest


def read_prepared_snapshot(path: Path) -> pd.DataFrame:
    """Load and revalidate a prepared snapshot before feature generation."""

    return sort_market_frame(pd.read_parquet(path, engine="pyarrow"))
