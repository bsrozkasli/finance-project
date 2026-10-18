"""EnhancedSentimentService reports availability per section (C0a)."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest

from app.config import settings
from app.models.analysis import SentimentAnalysisResponse
from app.models.availability import SectionAvailability
from app.services.enhanced_sentiment_service import EnhancedSentimentService
from app.services.sentiment_service import SentimentService


def _news(availability: SectionAvailability, score: float = 0.0, label: str = "NEUTRAL") -> SentimentAnalysisResponse:
    return SentimentAnalysisResponse(
        symbol="AAPL", score=score, label=label, article_count=0, articles_analyzed=[],
        calculated_at=datetime.now(timezone.utc), availability=availability,
    )


@pytest.fixture
def news_returns(monkeypatch):
    """Replaces SentimentService (its own branches are covered by Task 2 tests)."""

    def _install(result):
        async def fake(symbol):
            if isinstance(result, Exception):
                raise result
            return result

        monkeypatch.setattr(SentimentService, "analyze_sentiment", fake)

    return _install


@pytest.fixture
def finnhub_http(monkeypatch, wire_async_client):
    """Scripts Finnhub REST responses per path (boundary: live Finnhub API)."""
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "secret-123")

    def _install(recommendation, insider):
        def handler(request: httpx.Request) -> httpx.Response:
            body = recommendation if request.url.path.endswith("/stock/recommendation") else insider
            if isinstance(body, int):
                return httpx.Response(body, json={"error": f"token={request.url.params['token']} rejected"})
            return httpx.Response(200, json=body)

        wire_async_client(handler)

    return _install


_ONE_PURCHASE = {"data": [{"name": "Jane Doe", "title": "CEO", "transactionCode": "P", "change": 100, "transactionPrice": 10.0, "transactionDate": "2026-10-01"}]}
_VOTES = [{"period": "2026-10-01", "strongBuy": 5, "buy": 3, "hold": 2, "sell": 0, "strongSell": 0}]


async def test_all_sections_available(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available(), 0.4, "BULLISH"))
    finnhub_http(_VOTES, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert [result.news_availability.status, result.analyst_availability.status, result.insider_availability.status] == ["available"] * 3
    assert result.unavailable_components == []
    assert (result.news_score, result.analyst_consensus) == (0.4, "Strong Buy")


async def test_news_failure_reports_unavailable_and_keeps_neutral(news_returns, finnhub_http):
    news_returns(RuntimeError("azure down"))
    finnhub_http(_VOTES, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.news_availability.model_dump() == {"status": "unavailable", "unavailable_reason": "news_sentiment_failed"}
    assert (result.news_score, result.news_label) == (0.0, "NEUTRAL")
    assert result.unavailable_components == ["news"]


async def test_news_without_articles_propagates_insufficient(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.insufficient("no_articles_in_lookback")))
    finnhub_http(_VOTES, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.news_availability.unavailable_reason == "no_articles_in_lookback"
    assert result.unavailable_components == ["news"]


async def test_empty_analyst_list_reports_insufficient(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http([], _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.analyst_availability.model_dump() == {"status": "insufficient", "unavailable_reason": "no_analyst_recommendations"}
    assert (result.analyst_score, result.analyst_consensus, result.analyst_data) == (0.0, "Hold", None)


async def test_zero_vote_analyst_entry_reports_insufficient(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http([{"period": "2026-10-01", "strongBuy": 0, "buy": 0, "hold": 0, "sell": 0, "strongSell": 0}], _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.analyst_availability.unavailable_reason == "analyst_counts_empty"
    assert (result.analyst_score, result.analyst_consensus) == (0.0, "Hold")


async def test_analyst_http_failure_reports_unavailable_without_leaking(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http(403, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.analyst_availability.model_dump() == {"status": "unavailable", "unavailable_reason": "analyst_fetch_failed"}
    assert "secret-123" not in result.model_dump_json()


async def test_insider_branches(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http(_VOTES, {"data": []})
    empty = await EnhancedSentimentService.analyze("AAPL")

    finnhub_http(_VOTES, 500)
    failed = await EnhancedSentimentService.analyze("AAPL")

    assert empty.insider_availability.model_dump() == {"status": "insufficient", "unavailable_reason": "no_insider_transactions"}
    assert (empty.insider_score, empty.insider_summary) == (0.0, "No recent insider activity")
    assert failed.insider_availability.model_dump() == {"status": "unavailable", "unavailable_reason": "insider_fetch_failed"}
    assert (failed.insider_score, failed.insider_summary) == (0.0, "No insider data available")
