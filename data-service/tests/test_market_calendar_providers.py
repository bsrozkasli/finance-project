from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone

import pytest

from app.models.market_calendar import EarningsEvent, MacroSnapshot
from app.providers.fmp_provider import FmpProvider, filter_earnings_by_symbols, is_high_impact_event
from app.providers.fred_provider import FredProvider
from app.services.market_calendar_service import MarketCalendarService


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.expirations: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.store[key] = value
        self.expirations[key] = ex


@pytest.fixture(autouse=True)
def clear_market_calendar_cache():
    MarketCalendarService.clear_cache()
    MarketCalendarService._redis_client = None
    yield
    MarketCalendarService.clear_cache()
    MarketCalendarService._redis_client = None


def test_fred_missing_api_key_returns_null_snapshot():
    snapshot = asyncio.run(FredProvider(api_key="").get_macro_snapshot())

    assert snapshot.fed_funds_rate is None
    assert snapshot.cpi_yoy is None
    assert snapshot.yield_curve_spread is None


def test_fred_dot_value_parses_as_null():
    assert FredProvider.parse_value(".") is None
    assert FredProvider.parse_value("5.33") == 5.33


def test_fmp_missing_api_key_returns_empty_lists():
    provider = FmpProvider(api_key="")

    assert provider.get_earnings_calendar() == []
    assert provider.get_economic_events() == []


def test_fmp_uses_current_earnings_calendar_endpoint(monkeypatch):
    paths = []

    def fake_get(self, path, params):
        paths.append(path)
        return []

    monkeypatch.setattr(FmpProvider, "_get", fake_get)

    assert FmpProvider(api_key="key").get_earnings_calendar() == []
    assert paths == ["/earnings-calendar"]


def test_fmp_high_impact_filter():
    assert is_high_impact_event("FOMC Interest Rate Decision") is True
    assert is_high_impact_event("Core CPI m/m") is True
    assert is_high_impact_event("Factory Orders") is False


def test_earnings_symbol_filtering():
    events = [
        EarningsEvent(symbol="AAPL", date=date(2026, 1, 1)),
        EarningsEvent(symbol="MSFT", date=date(2026, 1, 2)),
    ]

    filtered = filter_earnings_by_symbols(events, ["aapl"])

    assert [event.symbol for event in filtered] == ["AAPL"]


def test_fred_fetches_series_in_parallel(monkeypatch):
    started = []

    async def fake_fetch_series(self, client, series_id):
        started.append(asyncio.get_running_loop().time())
        await asyncio.sleep(0.05)
        return [(date(2026, 6, 1), 1.0)]

    monkeypatch.setattr(FredProvider, "_fetch_series", fake_fetch_series)

    snapshot = asyncio.run(FredProvider(api_key="key").get_macro_snapshot())

    assert len(started) == 6
    assert max(started) - min(started) < 0.02
    assert snapshot.fed_funds_rate == 1.0
    assert snapshot.unemployment_rate == 1.0


def test_fred_series_failure_keeps_partial_snapshot(monkeypatch):
    values = {
        "FEDFUNDS": 5.33,
        "CPIAUCSL": 315.0,
        "A191RL1Q225SBEA": 2.4,
        "UNRATE": 4.0,
        "DGS10": 4.3,
    }

    async def fake_fetch_series(self, client, series_id):
        if series_id == "DGS2":
            raise RuntimeError("provider timeout")
        return [(date(2026, 6, 1), values[series_id])]

    monkeypatch.setattr(FredProvider, "_fetch_series", fake_fetch_series)

    snapshot = asyncio.run(FredProvider(api_key="key").get_macro_snapshot())

    assert snapshot.fed_funds_rate == 5.33
    assert snapshot.cpi == 315.0
    assert snapshot.gdp_growth == 2.4
    assert snapshot.unemployment_rate == 4.0
    assert snapshot.treasury_10y == 4.3
    assert snapshot.treasury_2y is None
    assert snapshot.yield_curve_spread is None


def test_fmp_calendar_window_slides_at_fetch_time():
    first_day = datetime(2026, 6, 30, 12, 0, tzinfo=timezone.utc)
    second_day = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)

    assert MarketCalendarService._calendar_window(first_day) == (
        date(2026, 6, 30),
        date(2026, 7, 30),
    )
    assert MarketCalendarService._calendar_window(second_day) == (
        date(2026, 7, 1),
        date(2026, 7, 31),
    )


def test_macro_cache_survives_service_restart_with_redis(monkeypatch):
    fake_redis = FakeRedis()
    MarketCalendarService._redis_client = fake_redis
    calls = 0

    async def fake_macro_snapshot(self):
        nonlocal calls
        calls += 1
        return MacroSnapshot(fed_funds_rate=5.33, cached_at=datetime(2026, 6, 30, tzinfo=timezone.utc))

    monkeypatch.setattr(FredProvider, "get_macro_snapshot", fake_macro_snapshot)

    first = asyncio.run(MarketCalendarService.macro_snapshot())
    MarketCalendarService.clear_cache()
    second = asyncio.run(MarketCalendarService.macro_snapshot())

    assert calls == 1
    assert first.fed_funds_rate == 5.33
    assert second.fed_funds_rate == 5.33