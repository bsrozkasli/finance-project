from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


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
