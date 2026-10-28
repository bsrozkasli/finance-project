"""Route tests for GET /api/v1/research/financial-history/{symbol} (no live providers)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app
from app.models.financial_history import SERIES_KEYS
from financial_history_helpers import (
    D23,
    D24,
    FakeTicker,
    frame,
    full_ticker,
    install,
)

URL = "/api/v1/research/financial-history/{}"


@pytest.fixture
def client():
    return TestClient(app)


def test_returns_200_with_documented_shape(monkeypatch, client):
    install(monkeypatch, full_ticker())
    response = client.get(URL.format("AAPL"))
    assert response.status_code == 200
    body = response.json()
    assert list(body.keys()) == [
        "symbol", "status", "currency", "period_type",
        "fiscal_year_ends", "series", "retrieved_at",
    ]
    assert list(body["series"].keys()) == list(SERIES_KEYS)
    assert body["fiscal_year_ends"] == ["2023-09-30", "2024-09-28"]


def test_unknown_symbol_returns_200_empty(monkeypatch, client):
    install(monkeypatch, FakeTicker())
    response = client.get(URL.format("ZZZZ"))
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "EMPTY"
    assert body["fiscal_year_ends"] == []
    assert all(body["series"][k] == [] for k in SERIES_KEYS)


def test_all_reads_failing_returns_503(monkeypatch, client):
    err = RuntimeError("down")
    install(monkeypatch, FakeTicker(financials=err, balance_sheet=err, cashflow=err))
    response = client.get(URL.format("AAPL"))
    assert response.status_code == 503


def test_null_is_serialized_as_json_null(monkeypatch, client):
    fin = frame({"Total Revenue": [391.0, 383.0], "Net Income": [float("nan"), 97.0]}, [D24, D23])
    install(monkeypatch, full_ticker(financials=fin))
    response = client.get(URL.format("AAPL"))
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PARTIAL"
    assert body["series"]["net_income"] == [97.0, None]
