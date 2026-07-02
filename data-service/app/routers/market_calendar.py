from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.market_calendar import EarningsEvent, EconomicEvent, MacroSnapshot, MarketCalendar
from app.services.market_calendar_service import MarketCalendarService

router = APIRouter(prefix="/api/v1", tags=["market-calendar"])


def _symbols_param(symbols: str | None) -> list[str] | None:
    if not symbols:
        return None
    return [symbol.strip().upper() for symbol in symbols.split(",") if symbol.strip()]


@router.get("/macro/snapshot", response_model=MacroSnapshot)
async def get_macro_snapshot() -> MacroSnapshot:
    return await MarketCalendarService.macro_snapshot()


@router.get("/calendar", response_model=MarketCalendar)
async def get_market_calendar(symbols: str | None = Query(default=None)) -> MarketCalendar:
    return await MarketCalendarService.market_calendar(_symbols_param(symbols))


@router.get("/calendar/earnings", response_model=list[EarningsEvent])
async def get_earnings_calendar(symbols: str | None = Query(default=None)) -> list[EarningsEvent]:
    return await MarketCalendarService.earnings(_symbols_param(symbols))


@router.get("/calendar/economic-events", response_model=list[EconomicEvent])
async def get_economic_events() -> list[EconomicEvent]:
    return await MarketCalendarService.economic_events()