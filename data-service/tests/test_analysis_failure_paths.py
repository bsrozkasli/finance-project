"""Failure and degradation paths of the analysis router."""

from __future__ import annotations

import logging
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.providers.market_data_resolver import MarketDataResolver
from app.routers import analysis
from app.services.llm_insight_service import LlmInsightService
from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def history(monkeypatch, scripted_provider, bars):
    def _install(closes: list[float]):
        provider = scripted_provider("fx-analysis-failure", ohlcv=bars(closes))
        monkeypatch.setattr(analysis, "get_resolver", lambda: MarketDataResolver([provider]))
        return provider

    return _install


def test_patterns_include_llm_context_returns_insight_text(monkeypatch, history, client):
    history([100.0 + index for index in range(100)])
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "test-azure-key")

    async def fake_generate_insight(request):
        return SimpleNamespace(insight="Context sentence.")

    monkeypatch.setattr(LlmInsightService, "generate_insight", fake_generate_insight)

    response = client.get("/api/v1/patterns/AAPL?include_llm_context=true")

    assert response.status_code == 200
    assert response.json()["llm_context"] == "Context sentence."


def test_patterns_llm_failure_keeps_null_context(monkeypatch, history, client):
    history([100.0 + index for index in range(100)])
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "test-azure-key")

    async def failing_generate_insight(request):
        raise RuntimeError("llm outage")

    monkeypatch.setattr(LlmInsightService, "generate_insight", failing_generate_insight)

    response = client.get("/api/v1/patterns/AAPL?include_llm_context=true")

    assert response.status_code == 200
    assert response.json()["llm_context"] is None


def test_full_analysis_computes_technical_section(monkeypatch, history, client):
    provider = history([100.0 + index for index in range(100)])
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "")

    response = client.get("/api/v1/full/AAPL")

    assert response.status_code == 200
    assert response.json()["technical"]["symbol"] == "AAPL"
    assert provider.calls_for("ohlcv")[0][1] == ("AAPL", "1d", "3mo")


def test_full_analysis_logs_unavailable_technical_section(monkeypatch, history, client, caplog):
    history([])
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "")

    with caplog.at_level(logging.WARNING, logger="app.routers.analysis"):
        response = client.get("/api/v1/full/AAPL")

    assert response.status_code == 200
    assert response.json()["technical"] is None
    assert "event=full_analysis_section_unavailable section=technical symbol=AAPL" in caplog.text
