"""Financial history service – multi-year, null-preserving statement series from yfinance."""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import yfinance as yf

from app.errors import DependencyUnavailableError
from app.models.financial_history import SERIES_KEYS, FinancialHistoryResponse

logger = logging.getLogger(__name__)

# series key -> (statement, row names in priority order, absolute value)
_SPEC: dict[str, tuple[str, tuple[str, ...], bool]] = {
    "revenue": ("financials", ("Total Revenue",), False),
    "net_income": ("financials", ("Net Income", "Net Income Common Stockholders"), False),
    "operating_cash_flow": (
        "cashflow",
        ("Operating Cash Flow", "Total Cash From Operating Activities"),
        False,
    ),
    "capital_expenditure": ("cashflow", ("Capital Expenditure", "Capital Expenditures"), True),
    "total_assets": ("balance_sheet", ("Total Assets",), False),
    "total_liabilities": (
        "balance_sheet",
        ("Total Liabilities Net Minority Interest", "Total Liab"),
        False,
    ),
    "total_equity": ("balance_sheet", ("Stockholders Equity", "Total Stockholder Equity"), False),
    "total_debt": ("balance_sheet", ("Total Debt",), False),
    "cash": ("balance_sheet", ("Cash And Cash Equivalents",), False),
    "current_assets": ("balance_sheet", ("Current Assets", "Total Current Assets"), False),
    "current_liabilities": (
        "balance_sheet",
        ("Current Liabilities", "Total Current Liabilities"),
        False,
    ),
}

_STATEMENTS = ("financials", "balance_sheet", "cashflow")


class FinancialHistoryService:
    """Stateless service returning aligned multi-year statement series."""

    @classmethod
    def get(cls, symbol: str) -> FinancialHistoryResponse:
        symbol = symbol.upper()
        ticker = yf.Ticker(symbol)  # statements stay direct reads: ADR-0006 D2 exception

        frames: dict[str, Optional[pd.DataFrame]] = {}
        failures = 0
        for name in _STATEMENTS:
            try:
                frames[name] = getattr(ticker, name)
            except Exception as exc:  # noqa: BLE001 - provider failure degrades to empty
                logger.warning("financial history: %s read failed for %s: %s", name, symbol, exc)
                frames[name] = None
                failures += 1
        if failures == len(_STATEMENTS):
            raise DependencyUnavailableError(f"Statement data unavailable for {symbol}")

        # label -> ISO date per frame; date axis is the sorted union
        label_dates: dict[str, dict] = {}
        all_dates: set[str] = set()
        for name, df in frames.items():
            mapping: dict = {}
            if cls._usable(df):
                for label in df.columns:
                    if pd.isna(label):
                        continue
                    try:
                        iso = pd.Timestamp(label).date().isoformat()
                    except Exception:  # noqa: BLE001
                        continue
                    mapping[iso] = label
                    all_dates.add(iso)
            label_dates[name] = mapping

        dates = sorted(all_dates)
        series: dict[str, list[Optional[float]]] = {}
        for key in SERIES_KEYS:
            statement, rows, absolute = _SPEC[key]
            series[key] = [
                cls._value(frames[statement], label_dates[statement].get(d), rows, absolute)
                for d in dates
            ]

        if not dates:
            status = "EMPTY"
        elif any(v is None for vals in series.values() for v in vals):
            status = "PARTIAL"
        else:
            status = "AVAILABLE"

        return FinancialHistoryResponse(
            symbol=symbol,
            status=status,
            currency=cls._currency(ticker),
            fiscal_year_ends=dates,
            series=series,
            retrieved_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _usable(df: object) -> bool:
        return isinstance(df, pd.DataFrame) and not df.empty

    @classmethod
    def _value(
        cls, df: Optional[pd.DataFrame], label, rows: tuple[str, ...], absolute: bool
    ) -> Optional[float]:
        if label is None or not cls._usable(df):
            return None
        for row in rows:
            if row not in df.index:
                continue
            try:
                value = float(df.at[row, label])
            except (TypeError, ValueError, KeyError):
                return None
            if not math.isfinite(value):
                return None
            return abs(value) if absolute else value
        return None

    @staticmethod
    def _currency(ticker: object) -> Optional[str]:
        try:
            info = ticker.info
            for key in ("financialCurrency", "currency"):
                value = info.get(key)
                if isinstance(value, str) and value:
                    return value
        except Exception:  # noqa: BLE001
            pass
        return None
