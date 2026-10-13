"""TiingoProvider OHLCV field selection and interval guard (no live HTTP)."""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest

from app.providers import tiingo_provider
from app.providers.tiingo_provider import TiingoProvider

ROW = {
    "date": "2026-01-02T00:00:00.000Z",
    "open": 100.0, "high": 110.0, "low": 90.0, "close": 105.0, "volume": 1000,
    "adjOpen": 50.0, "adjHigh": 55.0, "adjLow": 45.0, "adjClose": 52.5, "adjVolume": 2000.0,
}


class FakeResponse:
    def __init__(self, payload: list[dict]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> list[dict]:
        return self._payload


class FakeClient:
    payload: list[dict] = []
    created = 0

    def __init__(self, timeout: float) -> None:
        FakeClient.created += 1

    def __enter__(self) -> "FakeClient":
        return self

    def __exit__(self, *exc) -> bool:
        return False

    def get(self, url: str, headers: dict, params: dict) -> FakeResponse:
        return FakeResponse(FakeClient.payload)


@pytest.fixture
def fake_http(monkeypatch):
    FakeClient.payload = [dict(ROW)]
    FakeClient.created = 0
    monkeypatch.setattr(
        tiingo_provider, "httpx", SimpleNamespace(Client=FakeClient, HTTPStatusError=httpx.HTTPStatusError)
    )
    return FakeClient


def test_unadjusted_bars_use_raw_fields(fake_http):
    [bar] = TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", "1d", "1mo")

    assert (bar.open, bar.high, bar.low, bar.close, bar.volume) == (100.0, 110.0, 90.0, 105.0, 1000)


def test_adjusted_bars_use_adj_fields(fake_http):
    [bar] = TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", "1d", "1mo", adjusted=True)

    assert (bar.open, bar.high, bar.low, bar.close, bar.volume) == (50.0, 55.0, 45.0, 52.5, 2000)


def test_unadjusted_request_never_substitutes_adjusted_close(fake_http):
    row = dict(ROW)
    del row["close"]
    fake_http.payload = [row]

    assert TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", "1d", "1mo") == []


@pytest.mark.parametrize("interval", ["1h", "5m", "1wk"])
def test_non_daily_interval_returns_empty_without_http_call(fake_http, interval):
    assert TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", interval, "1mo") == []
    assert fake_http.created == 0
