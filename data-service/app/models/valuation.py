from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ValuationGrade(str, Enum):
    VERY_CHEAP = "Very Cheap"
    CHEAP = "Cheap"
    FAIR = "Fair"
    EXPENSIVE = "Expensive"
    VERY_EXPENSIVE = "Very Expensive"


class ValuationMetrics(BaseModel):
    pe: Optional[float] = None
    forward_pe: Optional[float] = None
    peg: Optional[float] = None
    price_to_book: Optional[float] = None
    ev_ebitda: Optional[float] = None
    ev_sales: Optional[float] = None
    price_to_sales: Optional[float] = None
    dividend_yield: Optional[float] = None
    fcf_yield: Optional[float] = None
    valuation_grade: ValuationGrade = ValuationGrade.FAIR


class ValuationResponse(BaseModel):
    symbol: str
    metrics: ValuationMetrics
    peer_comparison: Optional[dict[str, float]] = None
    calculated_at: datetime
