from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

from app.models.availability import SectionAvailability


class InvestmentGrade(str, Enum):
    A_PLUS = "A+"
    A = "A"
    B_PLUS = "B+"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


class CompositeScoreBreakdown(BaseModel):
    # A component without evidence is None; it is never replaced by a neutral value.
    fundamental_score: Optional[int] = Field(default=None, ge=0, le=100)
    valuation_score: Optional[int] = Field(default=None, ge=0, le=100)
    quality_score: Optional[int] = Field(default=None, ge=0, le=100)
    growth_score: Optional[int] = Field(default=None, ge=0, le=100)
    momentum_score: Optional[int] = Field(default=None, ge=0, le=100)
    risk_score: Optional[int] = Field(default=None, ge=0, le=100)
    earnings_score: Optional[int] = Field(default=None, ge=0, le=100)
    sentiment_score: Optional[int] = Field(default=None, ge=0, le=100)


class CompositeInvestmentScore(BaseModel):
    symbol: str
    # None when the available evidence carries less than half of the score weight.
    overall_score: Optional[int] = Field(default=None, ge=0, le=100)
    grade: Optional[InvestmentGrade] = None
    recommendation: Optional[str] = None
    breakdown: CompositeScoreBreakdown
    confidence: float = Field(ge=0.0, le=1.0)
    calculated_at: datetime
    breakdown_availability: dict[str, SectionAvailability]
    unavailable_components: list[str]
