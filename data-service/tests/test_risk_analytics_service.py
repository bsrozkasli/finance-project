"""RiskAnalyticsService reads adjusted history through the resolver."""

from __future__ import annotations

import pytest

from app.providers.market_data_resolver import MarketDataResolver
from app.services import risk_analytics_service
from app.services.risk_analytics_service import RiskAnalyticsService


@pytest.fixture
def risk_history(monkeypatch, scripted_provider, bars):
    def _install(closes: list[float]):
        provider = scripted_provider("fx-risk", ohlcv=bars(closes))
        monkeypatch.setattr(risk_analytics_service, "get_resolver", lambda: MarketDataResolver([provider]))
        return provider

    return _install


def test_risk_requests_one_year_of_adjusted_daily_bars(risk_history):
    provider = risk_history([100.0 + index for index in range(300)])

    RiskAnalyticsService.analyze("AAPL")

    assert [(call[1], call[2]) for call in provider.calls_for("ohlcv")] == [
        (("AAPL", "1d", "1y"), {"adjusted": True}),
        (("SPY", "1d", "1y"), {"adjusted": True}),
    ]


def test_max_drawdown_matches_hand_worked_price_path(risk_history):
    # 100 -> 200 -> 100: peak-to-trough decline is (200 - 100) / 200 = 0.5.
    risk_history([100.0] * 100 + [200.0] * 100 + [100.0] * 100)

    assert RiskAnalyticsService.analyze("AAPL").max_drawdown == pytest.approx(0.5)


def test_asset_identical_to_benchmark_has_unit_beta(risk_history):
    # cov(r, r) / var(r) = 1 for any non-constant return series.
    risk_history([100.0 + (index % 5) for index in range(300)])

    assert RiskAnalyticsService.analyze("AAPL").daily.beta == pytest.approx(1.0)


def test_fewer_than_thirty_sessions_is_insufficient(risk_history):
    risk_history([100.0 + index for index in range(29)])

    with pytest.raises(ValueError, match="Insufficient price data"):
        RiskAnalyticsService.analyze("AAPL")
