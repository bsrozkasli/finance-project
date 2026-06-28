from __future__ import annotations

from datetime import date

from app.providers.fmp_provider import FmpProvider, filter_earnings_by_symbols, is_high_impact_event
from app.providers.fred_provider import FredProvider
from app.models.market_calendar import EarningsEvent


def test_fred_missing_api_key_returns_null_snapshot():
    snapshot = FredProvider(api_key="").get_macro_snapshot()

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