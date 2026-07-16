from fastapi.testclient import TestClient

from app.providers.base import AssetInfo
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