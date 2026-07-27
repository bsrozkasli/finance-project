"""Tests for immutable, adjusted ML data snapshots."""

from __future__ import annotations

import pandas as pd
import pytest

from finance_ml.adapters.parquet import (
    normalize_market_frame,
    read_prepared_snapshot,
    write_prepared_snapshot,
)
from finance_ml.core.quality import DataQualityError


def _raw_prices() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "Date": ["2024-01-02", "2024-01-03"],
            "Ticker": ["abc", "abc"],
            "Open": [100.0, 101.0],
            "High": [102.0, 103.0],
            "Low": [99.0, 100.0],
            "Close": [101.0, 102.0],
            "Adj Close": [50.5, 51.0],
            "Volume": [1_000, 1_100],
        }
    )


def test_normalize_materializes_split_adjusted_ohlc() -> None:
    prepared = normalize_market_frame(_raw_prices(), "stocks-v1")

    assert prepared.loc[0, "symbol"] == "ABC"
    assert prepared.loc[0, "adjusted_open"] == pytest.approx(50.0)
    assert prepared.loc[1, "adjusted_high"] == pytest.approx(51.5)
    assert prepared.loc[1, "adjusted_close"] == pytest.approx(51.0)


def test_normalize_rejects_duplicate_symbol_date_rows() -> None:
    duplicate_rows = pd.concat([_raw_prices(), _raw_prices().iloc[[0]]], ignore_index=True)

    with pytest.raises(DataQualityError, match="Duplicate"):
        normalize_market_frame(duplicate_rows, "stocks-v1")


def test_prepared_snapshot_round_trips_with_provenance(tmp_path) -> None:
    pytest.importorskip("pyarrow")
    prepared = normalize_market_frame(_raw_prices(), "stocks-v1")
    snapshot = tmp_path / "stocks.parquet"

    manifest = write_prepared_snapshot(prepared, snapshot)
    actual = read_prepared_snapshot(snapshot)

    pd.testing.assert_frame_equal(actual, prepared)
    assert manifest["rows"] == 2
    assert len(str(manifest["sha256"])) == 64
    assert snapshot.with_suffix(".manifest.json").is_file()
