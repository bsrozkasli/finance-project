"""Providers re-raise a provider rate limit as RateLimitedError (no live HTTP)."""

from __future__ import annotations

import httpx
import pytest
from yfinance.exceptions import YFRateLimitError

from app.errors import RateLimitedError
from app.providers import tiingo_provider, yahoo_provider
from app.providers.tiingo_provider import TiingoProvider
from app.providers.yahoo_provider import YahooProvider


@pytest.fixture
def tiingo_http(monkeypatch):
    """Route TiingoProvider's httpx.Client through a MockTransport (mocked boundary)."""
    real_client = httpx.Client

    def _install(handler):
        def _factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(handler)
            return real_client(*args, **kwargs)

        monkeypatch.setattr(tiingo_provider.httpx, "Client", _factory)

    return _install


def test_tiingo_429_raises_with_retry_after_for_ohlcv_and_info(tiingo_http):
    tiingo_http(lambda request: httpx.Response(429, headers={"Retry-After": "30"}, text="slow down"))
    provider = TiingoProvider("test-key")

    with pytest.raises(RateLimitedError) as ohlcv:
        provider.get_ohlcv("AAPL")
    with pytest.raises(RateLimitedError) as info:
        provider.get_asset_info("AAPL")

    assert (ohlcv.value.provider, ohlcv.value.retry_after) == ("tiingo", 30)
    assert (info.value.provider, info.value.retry_after) == ("tiingo", 30)


def test_tiingo_429_without_header_has_unknown_retry_after(tiingo_http):
    tiingo_http(lambda request: httpx.Response(429))
    with pytest.raises(RateLimitedError) as error:
        TiingoProvider("test-key").get_ohlcv("AAPL")
    assert error.value.retry_after is None


def test_tiingo_other_failures_keep_returning_empty(tiingo_http):
    tiingo_http(lambda request: httpx.Response(500, text="Too Many Requests in a body"))
    provider = TiingoProvider("test-key")
    assert provider.get_ohlcv("AAPL") == []
    assert provider.get_asset_info("AAPL") is None


class _LimitedTicker:
    def __init__(self, symbol: str) -> None:
        self.symbol = symbol

    def history(self, **kwargs):
        raise YFRateLimitError()

    @property
    def info(self):
        raise YFRateLimitError()


class _BrokenTicker(_LimitedTicker):
    def history(self, **kwargs):
        raise RuntimeError("connection reset")

    @property
    def info(self):
        raise RuntimeError("connection reset")


def test_yahoo_rate_limit_is_raised_for_ohlcv_info_and_quote(monkeypatch):
    monkeypatch.setattr(yahoo_provider.yf, "Ticker", _LimitedTicker)
    provider = YahooProvider()

    for call in (provider.get_ohlcv, provider.get_asset_info, provider.get_market_quote):
        with pytest.raises(RateLimitedError) as error:
            call("AAPL")
        assert error.value.provider == "yahoo"
        assert error.value.retry_after is None


def test_yahoo_other_errors_keep_returning_empty(monkeypatch):
    monkeypatch.setattr(yahoo_provider.yf, "Ticker", _BrokenTicker)
    provider = YahooProvider()
    assert provider.get_ohlcv("AAPL") == []
    assert provider.get_asset_info("AAPL") is None
    assert provider.get_market_quote("AAPL") is None
