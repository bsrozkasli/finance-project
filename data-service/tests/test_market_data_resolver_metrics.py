from __future__ import annotations

from datetime import datetime, timezone

from prometheus_client import generate_latest

from app.providers.base import (
    FinancialStatements,
    OHLCVBar,
    ProviderHealth,
    ProviderStatus,
)
from app.providers.market_data_resolver import MarketDataResolver


class EmptyProvider:
    provider_name = "phase2_empty_provider"

    def get_ohlcv(self, symbol: str, interval: str = "1d", period: str = "1y"):
        return []

    def get_financial_statements(self, symbol: str):
        return FinancialStatements(symbol=symbol)

    def get_asset_info(self, symbol: str):
        return None

    def get_news(self, symbol: str, from_date: str, to_date: str):
        return []

    def get_analyst_recommendations(self, symbol: str):
        return []

    def health_check(self):
        return ProviderHealth(self.provider_name, ProviderStatus.HEALTHY)


class SuccessProvider(EmptyProvider):
    provider_name = "phase2_success_provider"

    def get_ohlcv(self, symbol: str, interval: str = "1d", period: str = "1y"):
        return [
            OHLCVBar(
                timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
                open=10.0,
                high=12.0,
                low=9.0,
                close=11.0,
                volume=1000,
            )
        ]


def test_resolver_exports_provider_prometheus_metrics():
    resolver = MarketDataResolver([EmptyProvider(), SuccessProvider()])

    bars = resolver.get_ohlcv("AAPL")

    assert len(bars) == 1
    metrics = generate_latest().decode("utf-8")
    assert 'market_provider_empty_total{operation="ohlcv",provider="phase2_empty_provider"} 1.0' in metrics
    assert 'market_provider_success_total{operation="ohlcv",provider="phase2_success_provider"} 1.0' in metrics
    assert 'market_provider_fallback_total{from_provider="phase2_empty_provider",operation="ohlcv",to_provider="phase2_success_provider"} 1.0' in metrics
    assert 'market_provider_latency_seconds_count{operation="ohlcv",provider="phase2_success_provider",result="success"} 1.0' in metrics
    assert 'market_provider_blacklisted{provider="phase2_success_provider"} 0.0' in metrics


def test_resolver_json_metrics_include_empty_counts():
    resolver = MarketDataResolver([EmptyProvider()])

    assert resolver.get_ohlcv("AAPL") == []

    metrics = resolver.get_observability_metrics()
    assert metrics["empty"] == {"phase2_empty_provider": 1}
    assert metrics["fallback"] == {"phase2_empty_provider": 1}