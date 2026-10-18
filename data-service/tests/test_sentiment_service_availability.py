"""SentimentService reports explicit availability on every branch (C0a)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.services import sentiment_service
from app.services.sentiment_service import SentimentService
from main import app


class FakeFinnhubClient:
    """Stands in for finnhub.Client (boundary: live Finnhub company-news API)."""

    news: list[dict] = []

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def company_news(self, symbol, _from, to):
        return list(type(self).news)


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "test-finnhub-key")
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "test-azure-key")
    monkeypatch.setattr(settings, "AZURE_OPENAI_ENDPOINT", "https://azure.test")
    monkeypatch.setattr(settings, "AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-test")
    monkeypatch.setattr(sentiment_service.finnhub, "Client", FakeFinnhubClient)
    monkeypatch.setattr(FakeFinnhubClient, "news", [])


def _recent_article() -> dict:
    published = int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp())
    return {"datetime": published, "headline": "Apple ships product", "summary": "s", "source": "wire", "url": "https://news.test/a"}


def _llm_content(content: str):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "azure.test"
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    return handler


async def test_no_articles_reports_insufficient(configured):
    result = await SentimentService.analyze_sentiment("aapl")

    assert result.availability.model_dump() == {"status": "insufficient", "unavailable_reason": "no_articles_in_lookback"}
    assert (result.score, result.label, result.article_count) == (0.0, "NEUTRAL", 0)


async def test_non_json_llm_output_reports_unparseable(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    wire_async_client(_llm_content("I think it is mildly positive."))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.model_dump() == {"status": "unparseable", "unavailable_reason": "llm_response_not_json"}
    assert (result.score, result.label, result.article_count) == (0.0, "NEUTRAL", 1)


async def test_non_numeric_score_reports_unparseable(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    wire_async_client(_llm_content(json.dumps({"score": "high", "label": "BULLISH"})))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.unavailable_reason == "llm_response_invalid_score"
    assert (result.score, result.label) == (0.0, "NEUTRAL")


async def test_missing_score_reports_unparseable_and_keeps_label(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    wire_async_client(_llm_content(json.dumps({"label": "BULLISH"})))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.model_dump() == {"status": "unparseable", "unavailable_reason": "llm_response_missing_fields"}
    assert (result.score, result.label) == (0.0, "BULLISH")


async def test_complete_llm_output_reports_available(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    fence = "`" * 3  # the LLM may wrap its JSON in a markdown code fence
    wire_async_client(_llm_content(fence + "json\n" + json.dumps({"score": 0.4, "label": "BULLISH", "key_themes": ["launch"]}) + "\n" + fence))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.model_dump() == {"status": "available", "unavailable_reason": None}
    assert (result.score, result.label, result.key_themes) == (0.4, "BULLISH", ["launch"])


def test_sentiment_route_serializes_availability(configured):
    response = TestClient(app).get("/api/v1/sentiment/AAPL")

    assert response.status_code == 200
    body = response.json()
    assert body["availability"] == {"status": "insufficient", "unavailable_reason": "no_articles_in_lookback"}
    assert (body["score"], body["label"]) == (0.0, "NEUTRAL")
