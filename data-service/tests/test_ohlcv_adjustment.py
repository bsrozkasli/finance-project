"""The adjusted flag flows from callers through the resolver to providers."""

from __future__ import annotations

from types import SimpleNamespace

import pandas as pd
import pytest

from app.providers import yahoo_provider
from app.providers.finnhub_provider import FinnhubProvider
from app.providers.market_data_resolver import MarketDataResolver
from app.providers.yahoo_provider import YahooProvider


class FakeTicker:
    history_kwargs: list[dict] = []

    def __init__(self, symbol: str) -> None:
        self.symbol = symbol

    def history(self, **kwargs):
        FakeTicker.history_kwargs.append(kwargs)
        index = pd.DatetimeIndex(["2026-01-02 00:00"], tz="America/New_York")
        return pd.DataFrame(
            {"Open": [10.0], "High": [11.0], "Low": [9.0], "Close": [10.5], "Volume": [100]},
            index=index,
        )


@pytest.fixture
def fake_yfinance(monkeypatch):
    FakeTicker.history_kwargs = []
    monkeypatch.setattr(yahoo_provider, "yf", SimpleNamespace(Ticker=FakeTicker))
    return FakeTicker


@pytest.mark.parametrize("adjusted", [False, True])
def test_yahoo_maps_adjusted_flag_to_auto_adjust(fake_yfinance, adjusted):
    bars = YahooProvider().get_ohlcv("AAPL", "1d", "1mo", adjusted=adjusted)

    assert fake_yfinance.history_kwargs == [
        {"period": "1mo", "interval": "1d", "auto_adjust": adjusted, "actions": False}
    ]
    assert [bar.close for bar in bars] == [10.5]


def test_yahoo_defaults_to_unadjusted_prices(fake_yfinance):
    YahooProvider().get_ohlcv("AAPL")

    assert fake_yfinance.history_kwargs[0]["auto_adjust"] is False


@pytest.mark.parametrize("adjusted", [False, True])
def test_resolver_forwards_adjusted_flag(scripted_provider, bars, adjusted):
    provider = scripted_provider("fx-adjusted-forward", ohlcv=bars([1.0]))

    MarketDataResolver([provider]).get_ohlcv("AAPL", "1d", "1y", adjusted=adjusted)

    assert provider.calls_for("ohlcv") == [("ohlcv", ("AAPL", "1d", "1y"), {"adjusted": adjusted})]


def test_finnhub_ohlcv_accepts_adjusted_and_stays_empty():
    assert FinnhubProvider(api_key="test-finnhub-key").get_ohlcv("AAPL", adjusted=True) == []
