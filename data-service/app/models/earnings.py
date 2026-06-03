from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EarningsQuarter(BaseModel):
    period: str
    actual: Optional[float] = None
    estimate: Optional[float] = None
    surprise: Optional[float] = None
    surprise_pct: Optional[float] = None
    beat: Optional[bool] = None


class EarningsMetrics(BaseModel):
    earnings_score: int = Field(ge=0, le=100)
    beat_ratio: float = Field(ge=0.0, le=1.0)
    miss_ratio: float = Field(ge=0.0, le=1.0)
    average_surprise_pct: float
    consecutive_beats: int = Field(ge=0)
    consecutive_misses: int = Field(ge=0)
    quarters_analyzed: int = Field(ge=0)


class EarningsAnalysisResponse(BaseModel):
    symbol: str
    metrics: EarningsMetrics
    history: list[EarningsQuarter]
    calculated_at: datetime
