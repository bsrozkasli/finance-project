"""Wire-level degradation of the provider-chain price and health routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app import dependencies
from app.providers.base import OHLCVBar
from app.providers.market_data_resolver import MarketDataResolver
from main import app


def _install(monkeypatch, resolver: MarketDataResolver) -> TestClient:
    monkeypatch.setattr(dependencies, "get_resolver", lambda: resolver)
    return TestClient(app)


def test_prices_endpoint_returns_empty_list_when_every_provider_fails(monkeypatch, scripted_provider):
    client = _install(monkeypatch, MarketDataResolver([
        scripted_provider("fx-wire-empty", ohlcv=[]),
        scripted_provider("fx-wire-error", ohlcv=RuntimeError("down")),
    ]))

    response = client.get("/api/v1/prices/AAPL?interval=1d&range=1mo")

    assert response.status_code == 200
    assert response.json() == []


def test_prices_endpoint_serializes_fallback_bars_in_utc(monkeypatch, scripted_provider):
    bar = OHLCVBar(
        timestamp=datetime(2026, 1, 2, 5, tzinfo=timezone.utc),
        open=10.0, high=12.0, low=9.0, close=11.0, volume=1000,
    )
    client = _install(monkeypatch, MarketDataResolver([
        scripted_provider("fx-wire-first", ohlcv=[]),
        scripted_provider("fx-wire-second", ohlcv=[bar]),
    ]))

    response = client.get("/api/v1/prices/AAPL")

    assert response.status_code == 200
    assert response.json() == [{
        "timestamp": "2026-01-02T05:00:00Z",
        "open": 10.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 1000,
    }]


def test_provider_health_endpoint_reports_degraded_provider(monkeypatch, scripted_provider):
    resolver = MarketDataResolver([
        scripted_provider("fx-wire-degraded", ohlcv=RuntimeError("upstream 502")),
        scripted_provider("fx-wire-ok", ohlcv=[]),
    ])
    resolver.get_ohlcv("AAPL")
    client = _install(monkeypatch, resolver)

    rows = {row["provider"]: row for row in client.get("/health/providers").json()}

    assert rows["fx-wire-degraded"]["status"] == "degraded"
    assert rows["fx-wire-degraded"]["consecutive_failures"] == 1
    assert rows["fx-wire-degraded"]["last_error"] == "upstream 502"
    assert rows["fx-wire-ok"]["status"] == "healthy"
