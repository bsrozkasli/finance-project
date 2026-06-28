from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FundamentalMetrics(BaseModel):
    """Core fundamental financial metrics for a company."""

    # Profitability
    roe: Optional[float] = None
    roa: Optional[float] = None
    roic: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    # Liquidity
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    cash_ratio: Optional[float] = None
    # Leverage
    debt_to_equity: Optional[float] = None
    debt_to_assets: Optional[float] = None
    interest_coverage: Optional[float] = None
    # Cash Flow
    free_cash_flow: Optional[float] = None
    fcf_margin: Optional[float] = None
    fcf_yield: Optional[float] = None
    # Growth (YoY)
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    eps_growth: Optional[float] = None
    fcf_growth: Optional[float] = None

    # Raw statement fields — exposed so Java YahooStatementClientAdapter can
    # map them into FinancialStatement domain records without a second API call.
    revenue: Optional[float] = None
    net_income: Optional[float] = None
    operating_cash_flow: Optional[float] = None
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    total_equity: Optional[float] = None


class FundamentalAnalysisResponse(BaseModel):
    """Response model for fundamental analysis endpoint."""

    symbol: str
    metrics: FundamentalMetrics
    fiscal_year: Optional[str] = None
    currency: Optional[str] = None
    calculated_at: datetime
