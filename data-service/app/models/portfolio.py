from enum import Enum

from pydantic import BaseModel, Field


class OptimizationObjective(str, Enum):
    MAX_SHARPE = "MAX_SHARPE"
    MIN_VOLATILITY = "MIN_VOLATILITY"
    TARGET_RISK = "TARGET_RISK"
    RISK_PARITY = "RISK_PARITY"


class AssetMetrics(BaseModel):
    symbol: str
    expected_return: float = Field(..., description="Annualized expected return")
    volatility: float = Field(..., description="Annualized volatility")
    sharpe_ratio: float | None = Field(default=None, description="Sharpe ratio")


class EfficientFrontierPoint(BaseModel):
    target_return: float
    expected_return: float
    volatility: float
    sharpe_ratio: float
    weights: dict[str, float]
