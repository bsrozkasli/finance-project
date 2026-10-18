from fastapi import APIRouter, Query
from app.models.market_sessions import MarketSessionsResponse
from app.services.market_session_service import MarketSessionService

router = APIRouter(prefix="/api/v1", tags=["market-sessions"])


@router.get("/market/sessions", response_model=MarketSessionsResponse)
def get_market_sessions(exchanges: str = Query("XNYS,XIST")) -> MarketSessionsResponse:
    values = [value.strip().upper() for value in exchanges.split(",") if value.strip()]
    return MarketSessionService.get_sessions(values)