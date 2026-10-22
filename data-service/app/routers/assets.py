from datetime import datetime
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
    quote_type: Optional[str] = None
    source: str = "provider-chain"


class AssetProfileResponse(AssetInfoResponse):
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    country: Optional[str] = None
    full_time_employees: Optional[int] = None


class MarketQuoteResponse(BaseModel):
    symbol: str
    market_state: str = "UNKNOWN"
    exchange_timezone: Optional[str] = None
    previous_close: Optional[float] = None
    regular_price: Optional[float] = None
    regular_change: Optional[float] = None
    regular_change_percent: Optional[float] = None
    regular_timestamp: Optional[datetime] = None
    pre_market_price: Optional[float] = None
    pre_market_change: Optional[float] = None
    pre_market_change_percent: Optional[float] = None
    pre_market_timestamp: Optional[datetime] = None
    post_market_price: Optional[float] = None
    post_market_change: Optional[float] = None
    post_market_change_percent: Optional[float] = None
    post_market_timestamp: Optional[datetime] = None
    delayed: Optional[bool] = None
    source: str = "provider-chain"


def _asset_info(symbol: str):
    info = get_resolver().get_asset_info(symbol.upper())
    if info is None or not info.name or info.name.upper() == symbol.upper():
        raise HTTPException(status_code=404, detail=f"Asset metadata unavailable for {symbol.upper()}")
    return info


@router.get("/{symbol}/info", response_model=AssetInfoResponse)
def get_asset_info(symbol: str) -> AssetInfoResponse:
    info = _asset_info(symbol)
    return AssetInfoResponse(
        symbol=info.symbol.upper(), name=info.name, exchange=info.exchange,
        currency=info.currency, sector=info.sector, industry=info.industry,
        market_cap=info.market_cap, quote_type=info.quote_type,
    )


@router.get("/{symbol}/profile", response_model=AssetProfileResponse)
def get_asset_profile(symbol: str) -> AssetProfileResponse:
    info = _asset_info(symbol)
    return AssetProfileResponse(
        symbol=info.symbol.upper(), name=info.name, exchange=info.exchange,
        currency=info.currency, sector=info.sector, industry=info.industry,
        market_cap=info.market_cap, description=info.description, website=info.website,
        logo_url=info.logo_url, country=info.country, quote_type=info.quote_type,
        full_time_employees=info.full_time_employees,
    )


@router.get("/{symbol}/market-quote", response_model=MarketQuoteResponse)
def get_market_quote(symbol: str) -> MarketQuoteResponse:
    quote = get_resolver().get_market_quote(symbol.upper())
    if quote is None:
        raise HTTPException(status_code=404, detail=f"Market quote unavailable for {symbol.upper()}")
    return MarketQuoteResponse(
        symbol=quote.symbol, market_state=quote.market_state or "UNKNOWN",
        exchange_timezone=quote.exchange_timezone, previous_close=quote.previous_close,
        regular_price=quote.regular_price, regular_change=quote.regular_change,
        regular_change_percent=quote.regular_change_percent, regular_timestamp=quote.regular_timestamp,
        pre_market_price=quote.pre_market_price, pre_market_change=quote.pre_market_change,
        pre_market_change_percent=quote.pre_market_change_percent, pre_market_timestamp=quote.pre_market_timestamp,
        post_market_price=quote.post_market_price, post_market_change=quote.post_market_change,
        post_market_change_percent=quote.post_market_change_percent, post_market_timestamp=quote.post_market_timestamp,
        delayed=quote.delayed,
    )