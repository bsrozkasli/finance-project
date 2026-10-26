"""A provider rate limit reaches the wire as 429 with Retry-After; empty data keeps its old status."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from yfinance.exceptions import YFRateLimitError

from app import dependencies
from app.errors import RateLimitedError
from app.providers.market_data_resolver import MarketDataResolver
from app.routers import analysis, assets
from app.services import (
    factor_analysis_service,
    fundamental_analysis_service,
    valuation_service,
)
from app.services.earnings_analysis_service import EarningsAnalysisService
from app.services.enhanced_sentiment_service import EnhancedSentimentService
from app.services.factor_analysis_service import FactorAnalysisService
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from app.services.risk_analytics_service import RiskAnalyticsService
from app.services.valuation_service import ValuationService
from main import app

DETAIL = "Market data provider rate limited"


@pytest.fixture
def client():
    return TestClient(app)


def _limited(retry_after=30, provider="fx-route"):
    return RateLimitedError(provider=provider, retry_after=retry_after)


def _assert_429(response, retry_after="30"):
    assert response.status_code == 429
    assert response.json() == {"detail": DETAIL}
    assert response.headers.get("Retry-After") == retry_after


class _Quoting:
    """Resolver-chain provider whose asset info and quote are rate limited."""

    provider_name = "fx-route-quote"

    def get_asset_info(self, symbol):
        raise _limited()

    def get_market_quote(self, symbol):
        raise _limited()

    def health_check(self):
        raise NotImplementedError


class _RateLimitedTicker:
    def __init__(self, symbol: str) -> None:
        self.ticker = symbol

    @property
    def info(self):
        raise YFRateLimitError()

    @property
    def financials(self):
        raise YFRateLimitError()

    balance_sheet = financials
    cashflow = financials


def test_handler_rounds_retry_after_up_and_omits_it_when_unknown(monkeypatch, scripted_provider, client):
    for retry_after, header in ((29.2, "30"), (None, None)):
        provider = scripted_provider("fx-route-h", ohlcv=_limited(retry_after))
        monkeypatch.setattr(dependencies, "get_resolver", lambda p=provider: MarketDataResolver([p]))
        response = client.get("/api/v1/prices/AAPL")
        assert response.status_code == 429
        assert response.json() == {"detail": DETAIL}
        assert response.headers.get("Retry-After") == header


def test_prices_route_rate_limited_is_429_but_empty_chain_is_200(monkeypatch, scripted_provider, client):
    limited = MarketDataResolver([scripted_provider("fx-route-p1", ohlcv=_limited())])
    monkeypatch.setattr(dependencies, "get_resolver", lambda: limited)
    _assert_429(client.get("/api/v1/prices/AAPL"))

    empty = MarketDataResolver([scripted_provider("fx-route-p2", ohlcv=[]), scripted_provider("fx-route-p3", ohlcv=[])])
    monkeypatch.setattr(dependencies, "get_resolver", lambda: empty)
    response = client.get("/api/v1/prices/AAPL")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/technical/AAPL",
        "/api/v1/technical/AAPL/workspace",
        "/api/v1/technical/AAPL/signals",
        "/api/v1/patterns/AAPL",
    ],
)
def test_technical_routes_translate_rate_limit_and_keep_404_for_empty_history(
    monkeypatch, scripted_provider, client, path
):
    limited = MarketDataResolver([scripted_provider("fx-route-t1", ohlcv=_limited())])
    monkeypatch.setattr(analysis, "get_resolver", lambda: limited)
    _assert_429(client.get(path))

    empty = MarketDataResolver([scripted_provider("fx-route-t2", ohlcv=[])])
    monkeypatch.setattr(analysis, "get_resolver", lambda: empty)
    response = client.get(path)
    assert response.status_code == 404
    assert "No historical data found" in response.json()["detail"]


@pytest.mark.parametrize("path", ["/api/v1/assets/AAPL/info", "/api/v1/assets/AAPL/profile", "/api/v1/assets/AAPL/market-quote"])
def test_assets_routes_translate_rate_limit(monkeypatch, client, path):
    resolver = MarketDataResolver([_Quoting()])
    monkeypatch.setattr(assets, "get_resolver", lambda: resolver)
    _assert_429(client.get(path))


def test_assets_routes_keep_404_when_nothing_is_rate_limited(monkeypatch, scripted_provider, client):
    resolver = MarketDataResolver([scripted_provider("fx-route-a", asset_info=None)])
    monkeypatch.setattr(assets, "get_resolver", lambda: resolver)
    assert client.get("/api/v1/assets/AAPL/info").status_code == 404


def test_risk_route_translates_resolver_rate_limit(monkeypatch, scripted_provider, client):
    from app.services import risk_analytics_service

    resolver = MarketDataResolver([scripted_provider("fx-route-r", ohlcv=_limited())])
    monkeypatch.setattr(risk_analytics_service, "get_resolver", lambda: resolver)
    _assert_429(client.get("/api/v1/research/risk/AAPL"))


@pytest.mark.parametrize(
    ("module", "path"),
    [
        (fundamental_analysis_service, "/api/v1/research/fundamental/AAPL"),
        (valuation_service, "/api/v1/research/valuation/AAPL"),
        (factor_analysis_service, "/api/v1/research/factors/AAPL"),
        (factor_analysis_service, "/api/v1/research/institutional-scores/AAPL"),
    ],
)
def test_direct_yfinance_services_translate_rate_limit(monkeypatch, client, module, path):
    monkeypatch.setattr(module.yf, "Ticker", _RateLimitedTicker)
    response = client.get(path)
    assert response.status_code == 429
    assert response.json() == {"detail": DETAIL}
    assert "Retry-After" not in response.headers  # yfinance exposes no header


def test_direct_yfinance_service_other_errors_stay_degraded(monkeypatch, client):
    class BrokenTicker(_RateLimitedTicker):
        @property
        def info(self):
            raise RuntimeError("connection reset")

    monkeypatch.setattr(valuation_service.yf, "Ticker", BrokenTicker)
    response = client.get("/api/v1/research/valuation/AAPL")
    assert response.status_code == 200


def test_earnings_route_translates_rate_limit(monkeypatch, client):
    async def limited(cls, symbol):
        raise _limited()

    monkeypatch.setattr(EarningsAnalysisService, "analyze", classmethod(limited))
    _assert_429(client.get("/api/v1/research/earnings/AAPL"))


def _stub_composite(monkeypatch, *, fundamental):
    def boom(cls, symbol):
        raise RuntimeError("component down")

    async def aboom(cls, symbol):
        raise RuntimeError("component down")

    monkeypatch.setattr(FundamentalAnalysisService, "analyze", classmethod(fundamental))
    monkeypatch.setattr(ValuationService, "analyze", classmethod(boom))
    monkeypatch.setattr(FactorAnalysisService, "analyze_factors", classmethod(boom))
    monkeypatch.setattr(RiskAnalyticsService, "analyze", classmethod(boom))
    monkeypatch.setattr(EarningsAnalysisService, "analyze", classmethod(aboom))
    monkeypatch.setattr(EnhancedSentimentService, "analyze", classmethod(aboom))


def test_composite_route_translates_a_rate_limited_component(monkeypatch, client):
    def limited(cls, symbol):
        raise _limited()

    _stub_composite(monkeypatch, fundamental=limited)
    _assert_429(client.get("/api/v1/research/composite/AAPL"))


def test_composite_route_keeps_degrading_for_other_component_failures(monkeypatch, client):
    def broken(cls, symbol):
        raise RuntimeError("component down")

    _stub_composite(monkeypatch, fundamental=broken)
    response = client.get("/api/v1/research/composite/AAPL")
    assert response.status_code == 200
    assert response.json()["overall_score"] is None
