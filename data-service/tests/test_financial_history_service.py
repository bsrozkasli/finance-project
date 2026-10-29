"""Tests for FinancialHistoryService (no live provider calls)."""

from __future__ import annotations

import math

import pandas as pd
import pytest

from app.errors import DependencyUnavailableError
from app.models.financial_history import SERIES_KEYS
from app.services import financial_history_service as svc_module
from app.services.financial_history_service import FinancialHistoryService

from financial_history_helpers import (  # noqa: E402
    D22,
    D23,
    D24,
    FakeTicker,
    frame,
    full_ticker,
    install,
)


def test_aligns_series_ascending_by_fiscal_year_end(monkeypatch):
    install(monkeypatch, full_ticker())
    r = FinancialHistoryService.get("AAPL")
    assert r.fiscal_year_ends == ["2023-09-30", "2024-09-28"]
    assert r.series["revenue"] == [383.0, 391.0]
    assert r.status == "AVAILABLE"
    assert list(r.series.keys()) == list(SERIES_KEYS)
    assert r.period_type == "annual"


def test_nan_cell_is_none_and_status_partial(monkeypatch):
    fin = frame({"Total Revenue": [391.0, 383.0], "Net Income": [float("nan"), 97.0]}, [D24, D23])
    install(monkeypatch, full_ticker(financials=fin))
    r = FinancialHistoryService.get("AAPL")
    assert r.series["net_income"][1] is None
    assert r.series["net_income"][0] == 97.0
    assert r.status == "PARTIAL"


def test_series_absent_from_frame_is_all_none(monkeypatch):
    install(monkeypatch, full_ticker(balance_sheet=pd.DataFrame()))
    r = FinancialHistoryService.get("AAPL")
    assert r.series["total_equity"] == [None, None]
    assert r.series["revenue"] == [383.0, 391.0]
    assert r.status == "PARTIAL"


def test_year_in_only_one_frame_is_kept(monkeypatch):
    cf = frame(
        {"Operating Cash Flow": [118.0, 110.0, 100.0], "Capital Expenditure": [-9.0, -11.0, -8.0]},
        [D24, D23, D22],
    )
    install(monkeypatch, full_ticker(cashflow=cf))
    r = FinancialHistoryService.get("AAPL")
    assert r.fiscal_year_ends[0] == "2022-09-24"
    assert len(r.fiscal_year_ends) == 3
    assert r.series["revenue"][0] is None
    assert r.series["operating_cash_flow"][0] == 100.0
    assert all(len(v) == 3 for v in r.series.values())


def test_capital_expenditure_is_positive_magnitude(monkeypatch):
    cf = frame({"Operating Cash Flow": [1.0, 1.0], "Capital Expenditure": [-10.0, -12.0]}, [D24, D23])
    install(monkeypatch, full_ticker(cashflow=cf))
    r = FinancialHistoryService.get("AAPL")
    assert r.series["capital_expenditure"] == [12.0, 10.0]


def test_total_debt_has_no_long_term_debt_fallback(monkeypatch):
    bs = frame({"Long Term Debt": [90.0, 95.0]}, [D24, D23])
    install(monkeypatch, full_ticker(balance_sheet=bs))
    r = FinancialHistoryService.get("AAPL")
    assert r.series["total_debt"] == [None, None]


def test_infinite_value_is_none(monkeypatch):
    fin = frame({"Total Revenue": [math.inf, 383.0], "Net Income": [93.0, 97.0]}, [D24, D23])
    install(monkeypatch, full_ticker(financials=fin))
    r = FinancialHistoryService.get("AAPL")
    assert r.series["revenue"] == [383.0, None]
    assert r.status == "PARTIAL"


def test_all_frames_empty_is_empty_status(monkeypatch):
    install(monkeypatch, FakeTicker())
    r = FinancialHistoryService.get("ZZZZ")
    assert r.status == "EMPTY"
    assert r.fiscal_year_ends == []
    assert set(r.series.keys()) == set(SERIES_KEYS)
    assert all(r.series[k] == [] for k in SERIES_KEYS)


def test_one_frame_raising_is_treated_as_empty(monkeypatch):
    install(monkeypatch, full_ticker(cashflow=RuntimeError("boom")))
    r = FinancialHistoryService.get("AAPL")
    assert r.series["operating_cash_flow"] == [None, None]
    assert r.series["revenue"] == [383.0, 391.0]
    assert r.status == "PARTIAL"


def test_all_frames_raising_is_dependency_unavailable(monkeypatch):
    err = RuntimeError("down")
    install(monkeypatch, FakeTicker(financials=err, balance_sheet=err, cashflow=err))
    with pytest.raises(DependencyUnavailableError):
        FinancialHistoryService.get("AAPL")


def test_currency_prefers_financial_currency(monkeypatch):
    install(monkeypatch, full_ticker(info={"financialCurrency": "TWD", "currency": "USD"}))
    assert FinancialHistoryService.get("TSM").currency == "TWD"
    install(monkeypatch, full_ticker(info={"currency": "USD"}))
    assert FinancialHistoryService.get("TSM").currency == "USD"
    install(monkeypatch, full_ticker(info={}))
    assert FinancialHistoryService.get("TSM").currency is None
    install(monkeypatch, full_ticker(info=RuntimeError("no info")))
    assert FinancialHistoryService.get("TSM").currency is None


def test_symbol_is_uppercased(monkeypatch):
    seen = []
    install(monkeypatch, full_ticker(), record=seen)
    r = FinancialHistoryService.get("aapl")
    assert r.symbol == "AAPL"
    assert seen == ["AAPL"]


def test_nat_column_label_is_ignored_and_other_years_survive(monkeypatch):
    cols = [D24, pd.NaT, D23]
    fin = frame({"Total Revenue": [391.0, 1.0, 383.0], "Net Income": [93.0, 2.0, 97.0]}, cols)
    install(monkeypatch, full_ticker(financials=fin))
    r = FinancialHistoryService.get("AAPL")
    assert "NaT" not in r.fiscal_year_ends
    assert r.fiscal_year_ends == ["2023-09-30", "2024-09-28"]
    assert r.series["revenue"] == [383.0, 391.0]
