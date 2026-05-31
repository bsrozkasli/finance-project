from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator


class OptimizationObjective(str, Enum):
    MAX_SHARPE = "MAX_SHARPE"
    MIN_VOLATILITY = "MIN_VOLATILITY"
    MAX_RETURN = "MAX_RETURN"
    RISK_PARITY = "RISK_PARITY"


class OptimizationRequest(BaseModel):
    symbols: list[str] = Field(min_items=2, max_items=20)
    objective: OptimizationObjective
    risk_free_rate: float = Field(ge=-1.0, le=1.0)
    lookback_period: int = Field(ge=1, le=3650)
    max_weight: float = Field(ge=0.0, le=1.0)
    min_weight: float = Field(ge=0.0, le=1.0)
    stress_scenario: str | None = None

    @validator("symbols", pre=True)
    def normalize_symbols(cls, value: list[str]) -> list[str]:
        if not isinstance(value, list):
            raise ValueError("symbols must be a list of strings")
        cleaned = [symbol.strip().upper() for symbol in value]
        if any(not symbol for symbol in cleaned):
            raise ValueError("symbols must be non-empty strings")
        return cleaned


class AssetMetrics(BaseModel):
    symbol: str
    returns: float
    volatility: float = Field(ge=0.0)
    sharpe: float
    drawdown: float = Field(ge=0.0, le=1.0)
    weight: float = Field(ge=0.0, le=1.0)


class PortfolioMetrics(BaseModel):
    returns: float
    volatility: float = Field(ge=0.0)
    sharpe: float
    drawdown: float = Field(ge=0.0, le=1.0)
    weights: dict[str, float] = Field(min_items=2, max_items=20)

    @validator("weights")
    def validate_weights(cls, value: dict[str, float]) -> dict[str, float]:
        if any(weight < 0.0 or weight > 1.0 for weight in value.values()):
            raise ValueError("weights must be between 0.0 and 1.0")
        return value


class EfficientFrontierPoint(BaseModel):
    expected_return: float
    volatility: float = Field(ge=0.0)
    sharpe: float


class OptimizationResponse(BaseModel):
    asset_metrics: list[AssetMetrics]
    portfolio_metrics: PortfolioMetrics
    efficient_frontier: list[EfficientFrontierPoint] | None = None
    stress_test_result: dict[str, float] | None = None
    rebalance_threshold: float = Field(ge=0.0, le=1.0)
    optimized_at: datetime


class RebalanceCheckResponse(BaseModel):
    symbol: str
    target_weight: float = Field(ge=0.0, le=1.0)
    current_weight: float = Field(ge=0.0, le=1.0)
    deviation: float = Field(ge=-1.0, le=1.0)
    requires_rebalance: bool
    action: str = Field(min_length=1)
