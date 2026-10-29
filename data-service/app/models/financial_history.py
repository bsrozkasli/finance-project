from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

SERIES_KEYS: tuple[str, ...] = (
    "revenue",
    "net_income",
    "operating_cash_flow",
    "capital_expenditure",
    "total_assets",
    "total_liabilities",
    "total_equity",
    "total_debt",
    "cash",
    "current_assets",
    "current_liabilities",
)


class FinancialHistoryResponse(BaseModel):
    """Multi-year annual statement history; every series aligns with fiscal_year_ends."""

    symbol: str
    status: Literal["AVAILABLE", "PARTIAL", "EMPTY"]
    currency: Optional[str] = None
    period_type: Literal["annual"] = "annual"
    fiscal_year_ends: list[str]
    series: dict[str, list[Optional[float]]]
    retrieved_at: datetime
