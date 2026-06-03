from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class TechnicalIndicators(BaseModel):
    rsi: float | None = Field(default=None)
    macd: float | None = Field(default=None)
    macd_signal: float | None = Field(default=None)
    macd_histogram: float | None = Field(default=None)
    bb_upper: float | None = Field(default=None)
    bb_middle: float | None = Field(default=None)
    bb_lower: float | None = Field(default=None)
    atr: float | None = Field(default=None)
    sma: float | None = Field(default=None)
    ema: float | None = Field(default=None)


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    timestamp: str
    indicators: TechnicalIndicators


class SentimentScore(BaseModel):
    action: str
    confidence: float


class AnalysisSummaryResponse(BaseModel):
    symbol: str
    timestamp: str
    signal: SentimentScore


class NewsArticle(BaseModel):
    headline: str
    summary: Optional[str] = None
    source: str
    datetime: datetime
    url: Optional[str] = None
    sentiment_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0)


class SentimentAnalysisResponse(BaseModel):
    symbol: str
    score: float
    label: str
    key_themes: list[str] = Field(default_factory=list, max_items=3)
    risk_factors: list[str] = Field(default_factory=list, max_items=2)
    opportunity_factors: list[str] = Field(default_factory=list, max_items=2)
    article_count: int
    articles_analyzed: list[NewsArticle]
    calculated_at: datetime


class LlmInsightRequest(BaseModel):
    symbol: str
    include_technical: bool = True
    include_sentiment: bool = True
    scenario: Optional[str] = None


class LlmInsightResponse(BaseModel):
    symbol: str
    insight: str
    data_sources_used: list[str]
    model_used: str
    generated_at: datetime


class FullAnalysisResponse(BaseModel):
    symbol: str
    technical: Optional[dict] = None
    sentiment: Optional[SentimentAnalysisResponse] = None
    llm_insight: Optional[LlmInsightResponse] = None
    generated_at: datetime


class PatternType(str, Enum):
    DOUBLE_BOTTOM = "DOUBLE_BOTTOM"
    DOUBLE_TOP = "DOUBLE_TOP"
    HEAD_AND_SHOULDERS = "HEAD_AND_SHOULDERS"
    INV_HEAD_AND_SHOULDERS = "INV_HEAD_AND_SHOULDERS"
    SUPPORT_BOUNCE = "SUPPORT_BOUNCE"
    RESISTANCE_REJECT = "RESISTANCE_REJECT"
    GOLDEN_CROSS = "GOLDEN_CROSS"
    DEATH_CROSS = "DEATH_CROSS"


class PatternDirection(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class DetectedPattern(BaseModel):
    pattern_type: PatternType
    direction: PatternDirection
    confidence: float = Field(ge=0.0, le=1.0)
    start_index: int
    end_index: int
    description: str
    price_target: Optional[float] = None


class PatternDetectionResponse(BaseModel):
    symbol: str
    interval: str
    patterns: list[DetectedPattern]
    dominant_pattern: Optional[DetectedPattern] = None
    llm_context: Optional[str] = None
    detected_at: datetime
