"""Characterization of the MarketDataResolver degradation contract.

Expected behavior comes from docs/spec/current-system/operations.md and the
resolver module docstring, not from observed output.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

import pytest
from prometheus_client import REGISTRY

from app.providers import market_data_resolver as resolver_module
from app.providers.base import (
    AnalystRecommendation,
    AssetInfo,
    FinancialStatements,
    NewsItem,
    ProviderStatus,
)
from app.providers.market_data_resolver import MarketDataResolver

SYMBOL = "AAPL"


def _sample(name: str, **labels: str) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_ohlcv_uses_registration_order_and_stops_at_first_usable_provider(scripted_provider, bars):
    first = scripted_provider("fx-order-first", ohlcv=[])
    second = scripted_provider("fx-order-second", ohlcv=bars([10.0, 11.0]))
    third = scripted_provider("fx-order-third", ohlcv=bars([99.0, 99.0]))

    result = MarketDataResolver([first, second, third]).get_ohlcv(SYMBOL, "1d", "1mo")

    assert [bar.close for bar in result] == [10.0, 11.0]
    assert len(first.calls_for("ohlcv")) == 1
    assert len(second.calls_for("ohlcv")) == 1
    assert third.calls_for("ohlcv") == []


def test_ohlcv_falls_back_after_provider_error_and_marks_it_degraded(scripted_provider, bars):
    failing = scripted_provider("fx-error-first", ohlcv=RuntimeError("upstream timeout"))
    healthy = scripted_provider("fx-error-second", ohlcv=bars([20.0]))
    resolver = MarketDataResolver([failing, healthy])

    result = resolver.get_ohlcv(SYMBOL)

    assert [bar.close for bar in result] == [20.0]
    health = resolver.get_provider_health("fx-error-first")
    assert health.status is ProviderStatus.DEGRADED
    assert health.consecutive_failures == 1
    assert health.last_error == "upstream timeout"


def test_ohlcv_exhaustion_returns_empty_list_without_synthetic_bars(scripted_provider):
    resolver = MarketDataResolver([
        scripted_provider("fx-exhaust-empty", ohlcv=[]),
        scripted_provider("fx-exhaust-error", ohlcv=RuntimeError("down")),
    ])

    assert resolver.get_ohlcv(SYMBOL) == []


def test_empty_and_fallback_metrics_count_each_transition_once(scripted_provider):
    fallback = dict(operation="ohlcv", from_provider="fx-metric-a", to_provider="fx-metric-b")
    empty_b = dict(provider="fx-metric-b", operation="ohlcv")
    fallback_before = _sample("market_provider_fallback_total", **fallback)
    empty_before = _sample("market_provider_empty_total", **empty_b)

    MarketDataResolver([
        scripted_provider("fx-metric-a", ohlcv=[]),
        scripted_provider("fx-metric-b", ohlcv=[]),
    ]).get_ohlcv(SYMBOL)

    assert _sample("market_provider_fallback_total", **fallback) - fallback_before == 1.0
    assert _sample("market_provider_empty_total", **empty_b) - empty_before == 1.0


def test_three_consecutive_errors_blacklist_provider_and_skip_it(scripted_provider, bars):
    failing = scripted_provider("fx-blacklist-failing", ohlcv=RuntimeError("503"))
    backup = scripted_provider("fx-blacklist-backup", ohlcv=bars([30.0]))
    resolver = MarketDataResolver([failing, backup])

    for _ in range(3):
        assert [bar.close for bar in resolver.get_ohlcv(SYMBOL)] == [30.0]
    assert resolver.get_provider_health("fx-blacklist-failing").status is ProviderStatus.BLACKLISTED

    resolver.get_ohlcv(SYMBOL)

    assert len(failing.calls_for("ohlcv")) == 3
    assert len(backup.calls_for("ohlcv")) == 4


def test_success_resets_consecutive_failures(scripted_provider, bars):
    flaky = scripted_provider("fx-reset-flaky", ohlcv=RuntimeError("blip"))
    resolver = MarketDataResolver([flaky])
    resolver.get_ohlcv(SYMBOL)
    resolver.get_ohlcv(SYMBOL)

    flaky.ohlcv = bars([40.0])
    assert [bar.close for bar in resolver.get_ohlcv(SYMBOL)] == [40.0]

    flaky.ohlcv = RuntimeError("blip")
    resolver.get_ohlcv(SYMBOL)
    health = resolver.get_provider_health("fx-reset-flaky")
    assert health.status is ProviderStatus.DEGRADED
    assert health.consecutive_failures == 1


@pytest.mark.xfail(
    strict=True,
    reason=(
        "AMBIGUOUS_BEHAVIOR: _record_empty documents empty responses as soft failures that "
        "do not blacklist, but it increments the counter _record_failure compares with "
        "_FAILURE_THRESHOLD, so two empties plus one error blacklist the provider."
    ),
)
def test_empty_responses_do_not_count_toward_blacklist_threshold(scripted_provider):
    provider = scripted_provider("fx-ambiguous-empty", ohlcv=[])
    resolver = MarketDataResolver([provider])
    resolver.get_ohlcv(SYMBOL)
    resolver.get_ohlcv(SYMBOL)

    provider.ohlcv = RuntimeError("single error")
    resolver.get_ohlcv(SYMBOL)

    assert resolver.get_provider_health("fx-ambiguous-empty").status is ProviderStatus.DEGRADED


def test_blacklisted_provider_recovers_after_healthy_probe(scripted_provider, monkeypatch):
    monkeypatch.setattr(resolver_module, "_BLACKLIST_DURATION_SECONDS", 0)
    monkeypatch.setattr(resolver_module, "_HEALTH_CHECK_INTERVAL_SECONDS", 0.01)
    provider = scripted_provider("fx-recovery", ohlcv=RuntimeError("outage"))
    resolver = MarketDataResolver([provider])
    for _ in range(3):
        resolver.get_ohlcv(SYMBOL)

    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        if resolver.get_provider_health("fx-recovery").status is ProviderStatus.HEALTHY:
            break
        time.sleep(0.01)

    assert resolver.get_provider_health("fx-recovery").status is ProviderStatus.HEALTHY
    assert provider.calls_for("health_check")


_NEWS = NewsItem(
    headline="Earnings beat",
    summary="",
    source="stub",
    url="https://example.invalid/news",
    published_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
)

OPERATION_CASES = [
    pytest.param(
        "get_financial_statements", (SYMBOL,), "statements",
        FinancialStatements(symbol=SYMBOL),
        FinancialStatements(symbol=SYMBOL, revenue=[100.0]),
        FinancialStatements(symbol=SYMBOL),
        id="financial_statements",
    ),
    pytest.param(
        "get_asset_info", (SYMBOL,), "asset_info",
        None, AssetInfo(symbol=SYMBOL, name="Apple Inc."), None,
        id="asset_info",
    ),
    pytest.param(
        "get_news", (SYMBOL, "2026-01-01", "2026-01-02"), "news",
        [], [_NEWS], [],
        id="news",
    ),
    pytest.param(
        "get_analyst_recommendations", (SYMBOL,), "recommendations",
        [], [AnalystRecommendation(period="2026-01-01", buy=3)], [],
        id="analyst_recommendations",
    ),
]


@pytest.mark.parametrize("method, args, attribute, empty_value, usable_value, exhausted_value", OPERATION_CASES)
def test_operation_falls_back_past_empty_and_error(
    scripted_provider, method, args, attribute, empty_value, usable_value, exhausted_value
):
    resolver = MarketDataResolver([
        scripted_provider(f"fx-{method}-empty", **{attribute: empty_value}),
        scripted_provider(f"fx-{method}-error", **{attribute: RuntimeError("down")}),
        scripted_provider(f"fx-{method}-usable", **{attribute: usable_value}),
    ])

    assert getattr(resolver, method)(*args) == usable_value


@pytest.mark.parametrize("method, args, attribute, empty_value, usable_value, exhausted_value", OPERATION_CASES)
def test_operation_exhaustion_returns_explicit_empty_value(
    scripted_provider, method, args, attribute, empty_value, usable_value, exhausted_value
):
    resolver = MarketDataResolver([
        scripted_provider(f"fx-{method}-x-empty", **{attribute: empty_value}),
        scripted_provider(f"fx-{method}-x-error", **{attribute: RuntimeError("down")}),
    ])

    assert getattr(resolver, method)(*args) == exhausted_value
