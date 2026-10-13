"""FactorAnalysisService reads momentum/volatility history through the resolver."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.providers.market_data_resolver import MarketDataResolver
from app.services import factor_analysis_service
from app.services.factor_analysis_service import FactorAnalysisService


def test_factor_momentum_uses_resolver_adjusted_history(monkeypatch, scripted_provider, bars):
    # ADR-0006 D2: .info remains a direct yfinance read; stub it with an empty dict.
    monkeypatch.setattr(
        factor_analysis_service,
        "yf",
        SimpleNamespace(Ticker=lambda symbol: SimpleNamespace(ticker=symbol, info={})),
    )
    provider = scripted_provider("fx-factor", ohlcv=bars([100.0 + index for index in range(253)]))
    monkeypatch.setattr(factor_analysis_service, "get_resolver", lambda: MarketDataResolver([provider]))

    result = FactorAnalysisService.analyze_factors("AAPL")

    # Ramp ends at 352; 22 sessions back is 331, so 1-month return = 21 / 331.
    assert result.scores.momentum_components["return_1m"] == pytest.approx(21 / 331)
    assert [(call[1][0], call[2]) for call in provider.calls_for("ohlcv")] == [
        ("AAPL", {"adjusted": True}),
        ("SPY", {"adjusted": True}),
    ]
