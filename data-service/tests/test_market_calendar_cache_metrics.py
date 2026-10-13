"""Prometheus counters for the macro and calendar caches."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest
from prometheus_client import REGISTRY

from app.models.market_calendar import MacroSnapshot
from app.providers.fmp_provider import FmpProvider
from app.providers.fred_provider import FredProvider
from app.services.market_calendar_service import MarketCalendarService


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.store[key] = value


class FailingRedis:
    async def get(self, key: str) -> str | None:
        raise ConnectionError("redis down")

    async def set(self, key: str, value: str, ex: int) -> None:
        raise ConnectionError("redis down")


def _lookups(cache: str, result: str) -> float:
    return REGISTRY.get_sample_value("data_service_cache_lookups_total", {"cache": cache, "result": result}) or 0.0


def _errors(cache: str, operation: str) -> float:
    return REGISTRY.get_sample_value("data_service_cache_errors_total", {"cache": cache, "operation": operation}) or 0.0


@pytest.fixture(autouse=True)
def isolated_cache():
    MarketCalendarService.clear_cache()
    MarketCalendarService._redis_client = None
    yield
    MarketCalendarService.clear_cache()
    MarketCalendarService._redis_client = None


@pytest.fixture
def macro_provider(monkeypatch):
    calls = {"count": 0}

    async def fake_macro_snapshot(self):
        calls["count"] += 1
        return MacroSnapshot(fed_funds_rate=5.33, cached_at=datetime(2026, 6, 30, tzinfo=timezone.utc))

    monkeypatch.setattr(FredProvider, "get_macro_snapshot", fake_macro_snapshot)
    return calls


def test_macro_lookups_report_miss_memory_hit_and_redis_hit(macro_provider):
    MarketCalendarService._redis_client = FakeRedis()
    results = ("miss", "memory_hit", "redis_hit")
    before = {result: _lookups("macro", result) for result in results}

    asyncio.run(MarketCalendarService.macro_snapshot())
    asyncio.run(MarketCalendarService.macro_snapshot())
    MarketCalendarService.clear_cache()
    asyncio.run(MarketCalendarService.macro_snapshot())

    assert {result: _lookups("macro", result) - before[result] for result in results} == {
        "miss": 1.0,
        "memory_hit": 1.0,
        "redis_hit": 1.0,
    }
    assert macro_provider["count"] == 1


def test_calendar_lookups_report_miss_then_memory_hit(monkeypatch):
    monkeypatch.setattr(FmpProvider, "get_earnings_calendar", lambda self, *args, **kwargs: [])
    monkeypatch.setattr(FmpProvider, "get_economic_events", lambda self, *args, **kwargs: [])
    MarketCalendarService._redis_client = FakeRedis()
    results = ("miss", "memory_hit")
    before = {result: _lookups("calendar", result) for result in results}

    asyncio.run(MarketCalendarService.economic_events())
    asyncio.run(MarketCalendarService.earnings(["AAPL"]))

    assert {result: _lookups("calendar", result) - before[result] for result in results} == {
        "miss": 1.0,
        "memory_hit": 1.0,
    }


def test_redis_failures_are_counted_and_do_not_hide_provider_result(macro_provider):
    MarketCalendarService._redis_client = FailingRedis()
    read_before, write_before = _errors("macro", "read"), _errors("macro", "write")
    miss_before = _lookups("macro", "miss")

    snapshot = asyncio.run(MarketCalendarService.macro_snapshot())

    assert snapshot.fed_funds_rate == 5.33
    assert _errors("macro", "read") - read_before == 1.0
    assert _errors("macro", "write") - write_before == 1.0
    assert _lookups("macro", "miss") - miss_before == 1.0
