from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PortfolioRiskDecomposition(BaseModel):
    """Breakdown of portfolio risk across constituent assets."""

    risk_contribution: dict[str, float] = Field(default_factory=dict)
    marginal_risk_contribution: dict[str, float] = Field(default_factory=dict)
    hhi: float = Field(ge=0.0, le=1.0)
    diversification_ratio: float = Field(ge=0.0)
    correlation_matrix: dict[str, dict[str, float]] = Field(default_factory=dict)


class ScenarioResult(BaseModel):
    """Outcome of a single stress-test scenario."""

    scenario_name: str
    estimated_return: float
    estimated_drawdown: float
    most_affected: list[str] = Field(default_factory=list)


class PortfolioAnalyticsResponse(BaseModel):
    """Top-level response for extended portfolio analytics."""

    risk_decomposition: PortfolioRiskDecomposition
    stress_tests: list[ScenarioResult] = Field(default_factory=list)
    calculated_at: datetime
