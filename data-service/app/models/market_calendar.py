from __future__ import annotations

from datetime import date as Date, datetime

from pydantic import BaseModel, Field


class MacroSnapshot(BaseModel):
    fed_funds_rate: float | None = None
    cpi: float | None = None
    cpi_yoy: float | None = None
    gdp_growth: float | None = None
    unemployment_rate: float | None = None
    treasury_10y: float | None = None
    treasury_2y: float | None = None
    yield_curve_spread: float | None = None
    observed_at: Date | None = None
    cached_at: datetime


class EarningsEvent(BaseModel):
    symbol: str
    date: Date | None = None
    eps_estimate: float | None = None
    eps_actual: float | None = None
    revenue_estimate: float | None = None
    revenue_actual: float | None = None
    time: str | None = None
    company_name: str | None = None
    exchange: str | None = None
    sector: str | None = None
    portfolio_related: bool | None = None
    sector_leader: bool | None = None


class EconomicEvent(BaseModel):
    event: str
    date: datetime | None = None
    country: str | None = None
    impact: str | None = None
    actual: str | float | None = None
    estimate: str | float | None = None
    previous: str | float | None = None
    event_type: str | None = None
    currency: str | None = None
    unit: str | None = None
    source: str | None = None
    source_url: str | None = None


class MarketCalendar(BaseModel):
    earnings: list[EarningsEvent] = Field(default_factory=list)
    economic_events: list[EconomicEvent] = Field(default_factory=list)
    cached_at: datetime