from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentAnalysisRequest(BaseModel):
    ticker: str
    price: float
    metrics: dict[str, dict[str, float]] = Field(default_factory=dict)
    sentiment: dict[str, Any] = Field(default_factory=dict)


class AgentAnalysisResponse(BaseModel):
    decision: str
    confidence: int = Field(ge=0, le=100)
    fundamental_summary: str
    technical_summary: str
    risk_summary: str
    bull_case: str
    bear_case: str
    portfolio_manager_reasoning: str
    token_usage: int | None = None
