"""Research routes translate typed failures into explicit statuses."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.providers.market_data_resolver import MarketDataResolver
from app.services import risk_analytics_service
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_insufficient_risk_history_returns_422(monkeypatch, scripted_provider, bars, client):
    provider = scripted_provider("fx-research-risk", ohlcv=bars([100.0 + index for index in range(10)]))
    monkeypatch.setattr(risk_analytics_service, "get_resolver", lambda: MarketDataResolver([provider]))

    response = client.get("/api/v1/research/risk/AAPL")

    assert response.status_code == 422
    assert "Insufficient price data" in response.json()["detail"]


def test_missing_finnhub_key_returns_503_for_earnings(monkeypatch, client):
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")

    response = client.get("/api/v1/research/earnings/AAPL")

    assert response.status_code == 503
    assert response.json()["detail"] == "FINNHUB_API_KEY is not configured"


def test_unexpected_research_error_returns_generic_500(monkeypatch, client):
    def _boom(cls, symbol):
        raise RuntimeError("token=secret-123 upstream failed")

    monkeypatch.setattr(FundamentalAnalysisService, "analyze", classmethod(_boom))

    response = client.get("/api/v1/research/fundamental/AAPL")

    assert response.status_code == 500
    assert response.json()["detail"] == "fundamental research failed"
    assert "secret-123" not in response.text
