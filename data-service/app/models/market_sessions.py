from datetime import datetime
from pydantic import BaseModel


class MarketSession(BaseModel):
    exchange: str
    state: str
    timezone: str
    next_open: datetime | None = None
    next_close: datetime | None = None
    source: str = "exchange_calendars"


class MarketSessionsResponse(BaseModel):
    sessions: list[MarketSession]
    observed_at: datetime