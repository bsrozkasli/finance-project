from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FactorScores(BaseModel):
    value_score: int = Field(ge=0, le=100, default=0)
    growth_score: int = Field(ge=0, le=100, default=0)
    quality_score: int = Field(ge=0, le=100, default=0)
    momentum_score: int = Field(ge=0, le=100, default=0)
    low_volatility_score: int = Field(ge=0, le=100, default=0)
    value_components: dict[str, Optional[float]] = Field(default_factory=dict)
    growth_components: dict[str, Optional[float]] = Field(default_factory=dict)
    quality_components: dict[str, Optional[float]] = Field(default_factory=dict)
    momentum_components: dict[str, Optional[float]] = Field(default_factory=dict)
    volatility_components: dict[str, Optional[float]] = Field(default_factory=dict)


class FactorAnalysisResponse(BaseModel):
    symbol: str
    scores: FactorScores
    dominant_factor: str
    calculated_at: datetime


class InstitutionalScores(BaseModel):
    piotroski_f_score: Optional[int] = Field(default=None, ge=0, le=9)
    altman_z_score: Optional[float] = None
    beneish_m_score: Optional[float] = None
    quality_composite: Optional[int] = Field(default=None, ge=0, le=100)
    economic_moat: Optional[str] = None
    earnings_quality: Optional[int] = Field(default=None, ge=0, le=100)


class InstitutionalScoreResponse(BaseModel):
    symbol: str
    scores: InstitutionalScores
    interpretations: dict[str, str] = Field(default_factory=dict)
    calculated_at: datetime
