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
