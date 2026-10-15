from app.providers import yahoo_provider


def test_yahoo_metadata_preserves_explicit_quote_type(monkeypatch):
    class StubTicker:
        info = {
            "symbol": "SPY",
            "shortName": "SPDR S&P 500 ETF Trust",
            "exchange": "PCX",
            "currency": "USD",
            "quoteType": "ETF",
        }

    # Mock rationale: yf.Ticker crosses the external Yahoo Finance I/O boundary.
    monkeypatch.setattr(yahoo_provider.yf, "Ticker", lambda symbol: StubTicker())

    info = yahoo_provider.YahooProvider().get_asset_info("SPY")

    assert info is not None
    assert info.quote_type == "ETF"


def test_yahoo_metadata_does_not_guess_missing_quote_type(monkeypatch):
    class StubTicker:
        info = {
            "symbol": "MYSTERY",
            "shortName": "Mystery Instrument",
            "exchange": "NASDAQ",
        }

    # Mock rationale: yf.Ticker crosses the external Yahoo Finance I/O boundary.
    monkeypatch.setattr(yahoo_provider.yf, "Ticker", lambda symbol: StubTicker())

    info = yahoo_provider.YahooProvider().get_asset_info("MYSTERY")

    assert info is not None
    assert info.quote_type is None
