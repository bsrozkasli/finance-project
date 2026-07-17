from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FactorScores(BaseModel):
    value_score: Optional[int] = Field(default=None, ge=0, le=100)
    growth_score: Optional[int] = Field(default=None, ge=0, le=100)
    quality_score: Optional[int] = Field(default=None, ge=0, le=100)
    momentum_score: Optional[int] = Field(default=None, ge=0, le=100)
    low_volatility_score: Optional[int] = Field(default=None, ge=0, le=100)
    value_components: dict[str, Optional[float]] = Field(default_factory=dict)
    growth_components: dict[str, Optional[float]] = Field(default_factory=dict)
    quality_components: dict[str, Optional[float]] = Field(default_factory=dict)
    momentum_components: dict[str, Optional[float]] = Field(default_factory=dict)
    volatility_components: dict[str, Optional[float]] = Field(default_factory=dict)


class FactorAnalysisResponse(BaseModel):
    symbol: str
    scores: FactorScores
    dominant_factor: Optional[str] = None
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
