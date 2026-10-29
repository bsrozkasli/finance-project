"""Shared fake yfinance ticker helpers for financial-history tests (no live providers)."""

from __future__ import annotations

import pandas as pd

from app.services import financial_history_service as svc_module
from app.services.financial_history_service import FinancialHistoryService  # noqa: F401

D24 = pd.Timestamp("2024-09-28")
D23 = pd.Timestamp("2023-09-30")
D22 = pd.Timestamp("2022-09-24")


def frame(rows: dict, cols):
    return pd.DataFrame(
        {c: [vals[i] for vals in rows.values()] for i, c in enumerate(cols)},
        index=list(rows.keys()),
    )


class _Raiser:
    pass


class FakeTicker:
    def __init__(self, financials=None, balance_sheet=None, cashflow=None, info=None):
        self._f = financials
        self._b = balance_sheet
        self._c = cashflow
        self._i = info if info is not None else {}

    @staticmethod
    def _get(v):
        if isinstance(v, Exception):
            raise v
        return v if v is not None else pd.DataFrame()

    @property
    def financials(self):
        return self._get(self._f)

    @property
    def balance_sheet(self):
        return self._get(self._b)

    @property
    def cashflow(self):
        return self._get(self._c)

    @property
    def info(self):
        if isinstance(self._i, Exception):
            raise self._i
        return self._i


def install(monkeypatch, ticker, record=None):
    def factory(symbol):
        if record is not None:
            record.append(symbol)
        return ticker

    monkeypatch.setattr(svc_module.yf, "Ticker", factory)


def full_ticker(**over):
    cols = [D24, D23]
    kw = dict(
        financials=frame(
            {"Total Revenue": [391.0, 383.0], "Net Income": [93.0, 97.0]}, cols
        ),
        balance_sheet=frame(
            {
                "Total Assets": [365.0, 352.0],
                "Total Liabilities Net Minority Interest": [308.0, 290.0],
                "Stockholders Equity": [57.0, 62.0],
                "Total Debt": [106.0, 111.0],
                "Cash And Cash Equivalents": [29.0, 30.0],
                "Current Assets": [152.0, 143.0],
                "Current Liabilities": [176.0, 145.0],
            },
            cols,
        ),
        cashflow=frame(
            {"Operating Cash Flow": [118.0, 110.0], "Capital Expenditure": [-9.0, -11.0]},
            cols,
        ),
        info={"financialCurrency": "USD"},
    )
    kw.update(over)
    return FakeTicker(**kw)
