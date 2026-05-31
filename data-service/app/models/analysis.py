from pydantic import BaseModel, Field


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
