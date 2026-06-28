from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RiskTimeframe(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class VaRResult(BaseModel):
    var_95: float = Field(description="95% parametric VaR")
    var_99: float = Field(description="99% parametric VaR")
    cvar_95: float = Field(description="Conditional VaR (Expected Shortfall) at 95%")
    historical_var_95: float = Field(description="Historical (non-parametric) VaR at 95%")
    monte_carlo_var_95: float = Field(description="Monte Carlo simulated VaR at 95%")


class RiskMetrics(BaseModel):
    volatility: float
    downside_volatility: float
    sortino_ratio: Optional[float] = None
    calmar_ratio: Optional[float] = None
    beta: Optional[float] = None
    tracking_error: Optional[float] = None
    information_ratio: Optional[float] = None
    var: VaRResult
    timeframe: RiskTimeframe


class RiskAnalyticsResponse(BaseModel):
    symbol: str
    daily: RiskMetrics
    weekly: RiskMetrics
    monthly: RiskMetrics
    max_drawdown: float
    calculated_at: datetime
