"""Kaggle adapter tests with a fake client; no external download is performed."""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

from finance_ml.adapters.kaggle import download_dataset
from finance_ml.core.contracts import DatasetSpecification


def test_download_uses_a_versioned_dataset_handle(monkeypatch, tmp_path) -> None:
    calls: list[tuple[str, str]] = []
    fake_kagglehub = SimpleNamespace(
        dataset_download=lambda handle, output_dir: calls.append((handle, output_dir)) or output_dir
    )
    monkeypatch.setitem(sys.modules, "kagglehub", fake_kagglehub)
    specification = DatasetSpecification(
        name="stocks",
        handle="owner/dataset",
        version=7,
        license="Apache-2.0",
        role="asset_ohlcv",
    )

    downloaded = download_dataset(specification, tmp_path / "raw")

    assert downloaded == tmp_path / "raw"
    assert calls == [("owner/dataset/versions/7", str(tmp_path / "raw"))]
