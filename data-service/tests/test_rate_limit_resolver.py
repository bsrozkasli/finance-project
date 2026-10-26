"""Resolver behavior when a provider is rate limited."""

from __future__ import annotations

import pytest

from app.errors import RateLimitedError
from app.providers.market_data_resolver import MarketDataResolver


class _Quoting:
    """Provider double whose asset info and quote calls are scripted."""

    def __init__(self, name: str, outcome) -> None:
        self.provider_name = name
        self._outcome = outcome

    def _respond(self):
        if isinstance(self._outcome, Exception):
            raise self._outcome
        return self._outcome

    def get_asset_info(self, symbol):
        return self._respond()

    def get_market_quote(self, symbol):
        return self._respond()

    def health_check(self):
        raise NotImplementedError


def test_rate_limited_first_provider_falls_through_to_bars(scripted_provider, bars):
    limited = scripted_provider("fx-rl-yahoo", ohlcv=RateLimitedError(provider="fx-rl-yahoo", retry_after=30))
    healthy = scripted_provider("fx-rl-tiingo", ohlcv=bars([1.0, 2.0, 3.0]))

    result = MarketDataResolver([limited, healthy]).get_ohlcv("AAPL")

    assert len(result) == 3


def test_rate_limit_is_raised_when_no_provider_has_data(scripted_provider):
    limited = scripted_provider("fx-rl-a", ohlcv=RateLimitedError(provider="fx-rl-a", retry_after=30))
    empty = scripted_provider("fx-rl-b", ohlcv=[])

    with pytest.raises(RateLimitedError) as error:
        MarketDataResolver([limited, empty]).get_ohlcv("AAPL")

    assert (error.value.provider, error.value.retry_after) == ("fx-rl-a", 30)
    assert len(empty.calls_for("ohlcv")) == 1  # the next provider was still tried


def test_largest_retry_after_wins_across_providers(scripted_provider):
    first = scripted_provider("fx-rl-c", ohlcv=RateLimitedError(provider="fx-rl-c", retry_after=10))
    second = scripted_provider("fx-rl-d", ohlcv=RateLimitedError(provider="fx-rl-d", retry_after=90))

    with pytest.raises(RateLimitedError) as error:
        MarketDataResolver([first, second]).get_ohlcv("AAPL")

    assert (error.value.provider, error.value.retry_after) == ("fx-rl-c", 90)


def test_exhausted_chain_without_rate_limit_still_returns_empty(scripted_provider):
    resolver = MarketDataResolver([
        scripted_provider("fx-rl-e", ohlcv=[]),
        scripted_provider("fx-rl-f", ohlcv=RuntimeError("down")),
    ])
    assert resolver.get_ohlcv("AAPL") == []


def test_rate_limit_counts_toward_the_blacklist(scripted_provider):
    limited = scripted_provider("fx-rl-g", ohlcv=RateLimitedError(provider="fx-rl-g", retry_after=5))
    resolver = MarketDataResolver([limited])

    for _ in range(3):
        with pytest.raises(RateLimitedError):
            resolver.get_ohlcv("AAPL")

    health = resolver.get_provider_health("fx-rl-g")
    assert health.consecutive_failures == 3
    assert health.status.value == "blacklisted"
    # Blacklisted: no provider is active, so the chain is empty and returns empty as before.
    assert resolver.get_ohlcv("AAPL") == []
    assert len(limited.calls_for("ohlcv")) == 3


def test_asset_info_and_quote_raise_when_only_rate_limited_and_empty():
    limit = RateLimitedError(provider="fx-rl-quote", retry_after=12)
    resolver = MarketDataResolver([_Quoting("fx-rl-quote", limit), _Quoting("fx-rl-empty", None)])

    with pytest.raises(RateLimitedError) as info:
        resolver.get_asset_info("AAPL")
    with pytest.raises(RateLimitedError) as quote:
        resolver.get_market_quote("AAPL")

    assert info.value.retry_after == 12
    assert quote.value.retry_after == 12


def test_asset_info_and_quote_fall_through_to_data():
    limit = RateLimitedError(provider="fx-rl-quote2", retry_after=12)
    resolver = MarketDataResolver([_Quoting("fx-rl-quote2", limit), _Quoting("fx-rl-fine", "data")])

    assert resolver.get_asset_info("AAPL") == "data"
    assert resolver.get_market_quote("AAPL") == "data"
