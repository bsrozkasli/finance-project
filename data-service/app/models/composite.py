from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class InvestmentGrade(str, Enum):
    A_PLUS = "A+"
    A = "A"
    B_PLUS = "B+"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


class CompositeScoreBreakdown(BaseModel):
    fundamental_score: int = Field(ge=0, le=100)
    valuation_score: int = Field(ge=0, le=100)
    quality_score: int = Field(ge=0, le=100)
    growth_score: int = Field(ge=0, le=100)
    momentum_score: int = Field(ge=0, le=100)
    risk_score: int = Field(ge=0, le=100)
    earnings_score: int = Field(ge=0, le=100)
    sentiment_score: int = Field(ge=0, le=100)


class CompositeInvestmentScore(BaseModel):
    symbol: str
    overall_score: int = Field(ge=0, le=100)
    grade: InvestmentGrade
    recommendation: str
    breakdown: CompositeScoreBreakdown
    confidence: float = Field(ge=0.0, le=1.0)
    calculated_at: datetime
