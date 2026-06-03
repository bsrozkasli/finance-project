from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AnalystRecommendation(BaseModel):
    """Most-recent analyst recommendation breakdown from Finnhub."""

    period: str
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0


class InsiderTransaction(BaseModel):
    """Single insider transaction record."""

    name: str
    title: str
    transaction_type: str
    shares: float
    value: Optional[float] = None
    date: str


class EnhancedSentimentResponse(BaseModel):
    """Combined sentiment response merging news, analyst, and insider signals."""

    symbol: str

    # News sentiment (from existing SentimentService)
    news_score: float = Field(ge=-1.0, le=1.0)
    news_label: str

    # Analyst recommendations
    analyst_score: float = Field(ge=-1.0, le=1.0)
    analyst_consensus: str
    analyst_data: Optional[AnalystRecommendation] = None

    # Insider transactions
    insider_score: float = Field(ge=-1.0, le=1.0)
    insider_summary: str
    recent_insider_transactions: list[InsiderTransaction] = Field(default_factory=list)

    # Composite score (0-100)
    sentiment_score: int = Field(ge=0, le=100)
    calculated_at: datetime
