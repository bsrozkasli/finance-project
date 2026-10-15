"""Shared provider doubles for data-service tests.

The doubles stand in for external market-data providers so no test calls a
live financial API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pytest

from app.providers.base import FinancialStatements, OHLCVBar, ProviderHealth, ProviderStatus


class ScriptedProvider:
    """IMarketDataProvider double with per-operation scripted responses.

    Each response attribute holds the value to return or an Exception instance
    to raise. ``ohlcv`` may also be a dict keyed by upper-case symbol. Every
    call is recorded in ``calls`` as ``(operation, args, kwargs)``.
    """

    def __init__(
        self,
        name: str,
        *,
        ohlcv: Any = None,
        statements: Any = None,
        asset_info: Any = None,
        news: Any = None,
        recommendations: Any = None,
        health: Any = None,
    ) -> None:
        self._name = name
        self.ohlcv = [] if ohlcv is None else ohlcv
        self.statements = statements
        self.asset_info = asset_info
        self.news = [] if news is None else news
        self.recommendations = [] if recommendations is None else recommendations
        self.health = health
        self.calls: list[tuple[str, tuple, dict]] = []

    @property
    def provider_name(self) -> str:
        return self._name

    def calls_for(self, operation: str) -> list[tuple[str, tuple, dict]]:
        return [call for call in self.calls if call[0] == operation]

    def _respond(self, operation: str, value: Any, args: tuple, kwargs: dict) -> Any:
        self.calls.append((operation, args, kwargs))
        if isinstance(value, Exception):
            raise value
        return value

    def get_ohlcv(self, symbol: str, interval: str = "1d", period: str = "1y", **kwargs: Any):
        value = self.ohlcv.get(symbol.upper(), []) if isinstance(self.ohlcv, dict) else self.ohlcv
        return self._respond("ohlcv", value, (symbol, interval, period), kwargs)

    def get_financial_statements(self, symbol: str):
        value = FinancialStatements(symbol=symbol.upper()) if self.statements is None else self.statements
        return self._respond("financial_statements", value, (symbol,), {})

    def get_asset_info(self, symbol: str):
        return self._respond("asset_info", self.asset_info, (symbol,), {})

    def get_news(self, symbol: str, from_date: str, to_date: str):
        return self._respond("news", self.news, (symbol, from_date, to_date), {})

    def get_analyst_recommendations(self, symbol: str):
        return self._respond("analyst_recommendations", self.recommendations, (symbol,), {})

    def health_check(self):
        value = ProviderHealth(self._name, ProviderStatus.HEALTHY) if self.health is None else self.health
        return self._respond("health_check", value, (), {})


def make_bars(
    closes: list[float],
    *,
    end: datetime | None = None,
    step: timedelta = timedelta(days=1),
) -> list[OHLCVBar]:
    """Bars with O=H=L=C=close; the last bar sits at ``end`` (default today 05:00 UTC)."""
    if end is None:
        today = datetime.now(timezone.utc).date()
        end = datetime(today.year, today.month, today.day, 5, tzinfo=timezone.utc)
    start = end - step * (len(closes) - 1)
    return [
        OHLCVBar(timestamp=start + step * index, open=close, high=close, low=close, close=close, volume=1000)
        for index, close in enumerate(closes)
    ]


@pytest.fixture
def scripted_provider() -> type[ScriptedProvider]:
    return ScriptedProvider


@pytest.fixture
def bars():
    return make_bars


@pytest.fixture
def wire_async_client(monkeypatch):
    """Route every httpx.AsyncClient built during a test through a MockTransport.

    Mocked boundary: outbound HTTP to Finnhub and Azure OpenAI, so no test reaches a live provider.
    """
    real_async_client = httpx.AsyncClient

    def _install(handler):
        def _factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(handler)
            return real_async_client(*args, **kwargs)

        monkeypatch.setattr(httpx, "AsyncClient", _factory)

    return _install
