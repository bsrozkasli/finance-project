from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.providers.base import OHLCVBar
from app.providers.market_data_resolver import MarketDataResolver
from app.routers import analysis
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def _trend_bars(count: int, low: float, high: float, step: timedelta = timedelta(days=1)) -> list[OHLCVBar]:
    """Rising bars with Open=Close-1, High=Close+1, Low=Close-3, starting 2024-01-01 05:00 UTC."""
    start = datetime(2024, 1, 1, 5, tzinfo=timezone.utc)
    closes = np.linspace(low, high, count)
    return [
        OHLCVBar(
            timestamp=start + step * index,
            open=float(close - 1), high=float(close + 1), low=float(close - 3), close=float(close),
            volume=1_000_000,
        )
        for index, close in enumerate(closes)
    ]


@pytest.fixture
def serve_bars(monkeypatch, scripted_provider):
    def _serve(bars: list[OHLCVBar], *, first_empty: bool = False):
        providers = [scripted_provider("fx-analysis-empty", ohlcv=[])] if first_empty else []
        primary = scripted_provider("fx-analysis-primary", ohlcv=bars)
        providers.append(primary)
        monkeypatch.setattr(analysis, "get_resolver", lambda: MarketDataResolver(providers))
        return primary

    return _serve


def test_get_patterns_endpoint_smoke_test(serve_bars, client):
    serve_bars(_trend_bars(100, 101, 151))

    response = client.get("/api/v1/patterns/AAPL")

    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"
    assert data["interval"] == "1d"
    assert isinstance(data["patterns"], list)
    assert "detected_at" in data
    for pattern in data["patterns"]:
        assert {"pattern_type", "direction", "start_index", "end_index", "description"} <= pattern.keys()
        assert 0.0 <= pattern["confidence"] <= 1.0


def test_get_patterns_endpoint_with_custom_interval(serve_bars, client):
    primary = serve_bars(_trend_bars(100, 101, 151, step=timedelta(hours=1)))

    response = client.get("/api/v1/patterns/AAPL?interval=1h&range=1mo")

    assert response.status_code == 200
    assert response.json()["interval"] == "1h"
    assert primary.calls_for("ohlcv")[0][1] == ("AAPL", "1h", "1mo")


def test_get_patterns_endpoint_no_data(serve_bars, client):
    serve_bars([])

    assert client.get("/api/v1/patterns/INVALID").status_code == 404


def test_get_patterns_insufficient_data(serve_bars, client):
    serve_bars(_trend_bars(30, 101, 111))

    response = client.get("/api/v1/patterns/AAPL")

    assert response.status_code == 200
    data = response.json()
    assert data["patterns"] == []
    assert data["dominant_pattern"] is None


def test_get_technical_analysis_insufficient_candles_returns_422(serve_bars, client):
    serve_bars(_trend_bars(29, 101, 111))

    response = client.get("/api/v1/technical/AAPL?interval=1d&range=1mo")

    assert response.status_code == 422
    assert "At least 30 candles" in response.json()["detail"]


def test_get_technical_signals_insufficient_candles_returns_422(serve_bars, client):
    serve_bars(_trend_bars(29, 101, 111))

    response = client.get("/api/v1/technical/AAPL/signals?interval=1d&range=1mo")

    assert response.status_code == 422
    assert "At least 30 candles" in response.json()["detail"]


def test_technical_analysis_falls_back_to_second_provider(serve_bars, client):
    primary = serve_bars(_trend_bars(100, 101, 151), first_empty=True)

    response = client.get("/api/v1/technical/AAPL")

    assert response.status_code == 200
    assert primary.calls_for("ohlcv") == [("ohlcv", ("AAPL", "1d", "3mo"), {"adjusted": False})]


def test_technical_timestamp_is_last_bar_instant_in_utc(serve_bars, client):
    serve_bars(_trend_bars(100, 101, 151))

    response = client.get("/api/v1/technical/AAPL")

    assert response.json()["timestamp"] == "2024-04-09T05:00:00Z"
