"""Resolver behavior when a provider is rate limited."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

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
    # Blacklisted: the provider is skipped, but the window still reports the rate limit (R-1).
    with pytest.raises(RateLimitedError):
        resolver.get_ohlcv("AAPL")
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


def _drive_to_blacklist(resolver):
    for _ in range(3):
        try:
            resolver.get_ohlcv("AAPL")
        except RateLimitedError:
            pass


def test_blacklist_window_reports_rate_limit_with_remaining_seconds(scripted_provider):
    limited = scripted_provider("fx-bl-a", ohlcv=RateLimitedError(provider="fx-bl-a", retry_after=5))
    resolver = MarketDataResolver([limited])
    _drive_to_blacklist(resolver)

    with pytest.raises(RateLimitedError) as error:
        resolver.get_ohlcv("AAPL")

    assert error.value.provider == "fx-bl-a"
    assert 1 <= error.value.retry_after <= 60
    assert len(limited.calls_for("ohlcv")) == 3  # skipped, not called


def test_blacklist_window_reports_for_asset_info_and_quote():
    limit = RateLimitedError(provider="fx-bl-q", retry_after=5)
    resolver = MarketDataResolver([_Quoting("fx-bl-q", limit)])
    for _ in range(3):
        with pytest.raises(RateLimitedError):
            resolver.get_asset_info("AAPL")

    with pytest.raises(RateLimitedError) as info:
        resolver.get_asset_info("AAPL")
    with pytest.raises(RateLimitedError) as quote:
        resolver.get_market_quote("AAPL")

    assert info.value.retry_after >= 1
    assert quote.value.retry_after >= 1


def test_rate_limited_blacklist_recovers_after_the_window(scripted_provider, bars):
    limited = scripted_provider("fx-bl-b", ohlcv=RateLimitedError(provider="fx-bl-b", retry_after=5))
    resolver = MarketDataResolver([limited])
    _drive_to_blacklist(resolver)
    resolver._blacklisted_until["fx-bl-b"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    limited.ohlcv = bars([1.0, 2.0])

    assert len(resolver.get_ohlcv("AAPL")) == 2
    assert "fx-bl-b" not in resolver._blacklisted_until


def test_non_rate_limit_blacklist_still_returns_empty(scripted_provider):
    broken = scripted_provider("fx-bl-c", ohlcv=RuntimeError("503"))
    resolver = MarketDataResolver([broken])
    for _ in range(3):
        assert resolver.get_ohlcv("AAPL") == []

    assert resolver.get_provider_health("fx-bl-c").status.value == "blacklisted"
    assert resolver.get_ohlcv("AAPL") == []


def test_mixed_chain_reports_only_the_rate_limit_blacklist(scripted_provider):
    limited = scripted_provider("fx-bl-d", ohlcv=RateLimitedError(provider="fx-bl-d", retry_after=5))
    broken = scripted_provider("fx-bl-e", ohlcv=RuntimeError("503"))
    resolver = MarketDataResolver([limited, broken])
    _drive_to_blacklist(resolver)

    with pytest.raises(RateLimitedError) as error:
        resolver.get_ohlcv("AAPL")

    assert error.value.provider == "fx-bl-d"


def test_blacklist_cause_is_the_failure_that_completes_the_threshold(scripted_provider):
    flaky = scripted_provider("fx-bl-f", ohlcv=RateLimitedError(provider="fx-bl-f", retry_after=5))
    resolver = MarketDataResolver([flaky])
    for _ in range(2):
        with pytest.raises(RateLimitedError):
            resolver.get_ohlcv("AAPL")
    flaky.ohlcv = RuntimeError("503")  # the failure that blacklists is not a rate limit
    assert resolver.get_ohlcv("AAPL") == []

    assert resolver.get_provider_health("fx-bl-f").status.value == "blacklisted"
    assert resolver.get_ohlcv("AAPL") == []
