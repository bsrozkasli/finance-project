from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dependencies import get_resolver

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])


class AssetInfoResponse(BaseModel):
    symbol: str
    name: str
    exchange: Optional[str] = None
    currency: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[int] = None
    source: str = "provider-chain"


@router.get("/{symbol}/info", response_model=AssetInfoResponse)
def get_asset_info(symbol: str) -> AssetInfoResponse:
    resolver = get_resolver()
    info = resolver.get_asset_info(symbol.upper())
    if info is None or not info.name or info.name.upper() == symbol.upper():
        raise HTTPException(status_code=404, detail=f"Asset metadata unavailable for {symbol.upper()}")

    return AssetInfoResponse(
        symbol=info.symbol.upper(),
        name=info.name,
        exchange=info.exchange,
        currency=info.currency,
        sector=info.sector,
        industry=info.industry,
        market_cap=info.market_cap,
    )