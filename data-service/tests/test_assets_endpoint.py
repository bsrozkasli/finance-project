from fastapi.testclient import TestClient

from app.providers.base import AssetInfo, MarketQuote
from main import app


class ResolverWithMetadata:
    def get_asset_info(self, symbol: str):
        return AssetInfo(
            symbol=symbol,
            name="Palo Alto Networks, Inc.",
            exchange="NASDAQ",
            currency="USD",
            sector="Technology",
            industry="Software",
            market_cap=100,
        )


class ResolverWithSymbolOnlyMetadata:
    def get_asset_info(self, symbol: str):
        return AssetInfo(symbol=symbol, name=symbol)


def test_asset_info_returns_provider_metadata(monkeypatch):
    from app.routers import assets

    monkeypatch.setattr(assets, "get_resolver", lambda: ResolverWithMetadata())
    response = TestClient(app).get("/api/v1/assets/PANW/info")

    assert response.status_code == 200
    assert response.json()["symbol"] == "PANW"
    assert response.json()["name"] == "Palo Alto Networks, Inc."


def test_asset_info_rejects_symbol_only_metadata(monkeypatch):
    from app.routers import assets

    monkeypatch.setattr(assets, "get_resolver", lambda: ResolverWithSymbolOnlyMetadata())
    response = TestClient(app).get("/api/v1/assets/PANW/info")

    assert response.status_code == 404
class ResolverWithProfileAndQuote(ResolverWithMetadata):
    def get_asset_info(self, symbol: str):
        return AssetInfo(
            symbol=symbol,
            name="Apple Inc.",
            exchange="NASDAQ",
            currency="USD",
            sector="Technology",
            industry="Consumer Electronics",
            market_cap=3_000,
            description="Designs consumer electronics and services.",
            website="https://www.apple.com",
            country="United States",
            quote_type="EQUITY",
            full_time_employees=164000,
        )

    def get_market_quote(self, symbol: str):
        return MarketQuote(
            symbol=symbol,
            market_state="POST_MARKET",
            regular_price=210.0,
            pre_market_price=211.0,
            post_market_price=212.0,
            post_market_change_percent=0.01,
            delayed=True,
        )


def test_asset_profile_and_market_quote_preserve_provider_fields(monkeypatch):
    from app.routers import assets

    monkeypatch.setattr(assets, "get_resolver", lambda: ResolverWithProfileAndQuote())
    client = TestClient(app)

    profile = client.get("/api/v1/assets/AAPL/profile")
    quote = client.get("/api/v1/assets/AAPL/market-quote")

    assert profile.status_code == 200
    assert profile.json()["description"] == "Designs consumer electronics and services."
    assert profile.json()["website"] == "https://www.apple.com"
    assert quote.status_code == 200
    assert quote.json()["market_state"] == "POST_MARKET"
    assert quote.json()["post_market_price"] == 212.0
    assert quote.json()["delayed"] is True

class ResolverWithQuoteType:
    def get_asset_info(self, symbol: str):
        return AssetInfo(symbol=symbol, name="SPDR S&P 500 ETF Trust", exchange="PCX", quote_type="ETF")


def test_asset_info_exposes_provider_quote_type(monkeypatch):
    from app.routers import assets

    monkeypatch.setattr(assets, "get_resolver", lambda: ResolverWithQuoteType())
    response = TestClient(app).get("/api/v1/assets/SPY/info")

    assert response.status_code == 200
    assert response.json()["quote_type"] == "ETF"


def test_asset_info_quote_type_is_null_when_provider_gives_none(monkeypatch):
    from app.routers import assets

    monkeypatch.setattr(assets, "get_resolver", lambda: ResolverWithMetadata())
    response = TestClient(app).get("/api/v1/assets/PANW/info")

    assert response.status_code == 200
    assert response.json()["quote_type"] is None


def test_yahoo_provider_passes_through_provider_quote_type(monkeypatch):
    from app.providers import yahoo_provider

    class FakeTicker:
        info = {"symbol": "SPY", "shortName": "SPDR S&P 500 ETF Trust", "exchange": "PCX", "quoteType": "ETF"}

    monkeypatch.setattr(yahoo_provider.yf, "Ticker", lambda symbol: FakeTicker())

    info = yahoo_provider.YahooProvider().get_asset_info("SPY")

    assert info is not None
    assert info.quote_type == "ETF"


def test_yahoo_provider_leaves_quote_type_none_when_absent(monkeypatch):
    from app.providers import yahoo_provider

    class FakeTicker:
        info = {"symbol": "XYZ", "shortName": "Xyz Corp", "exchange": "NMS"}

    monkeypatch.setattr(yahoo_provider.yf, "Ticker", lambda symbol: FakeTicker())

    info = yahoo_provider.YahooProvider().get_asset_info("XYZ")

    assert info is not None
    assert info.quote_type is None

