"""Fundamental analysis service – extracts key financial metrics from yfinance."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import yfinance as yf

from app.models.fundamental import FundamentalAnalysisResponse, FundamentalMetrics

logger = logging.getLogger(__name__)


class FundamentalAnalysisService:
    """Stateless service that computes fundamental financial metrics for a given ticker.

    All public methods are classmethods – no instance state is required.
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def analyze(cls, symbol: str) -> FundamentalAnalysisResponse:
        """Return a full fundamental-analysis snapshot for *symbol*.

        Uses yfinance Ticker properties (.info, .financials, .balance_sheet,
        .cashflow) to derive profitability, liquidity, leverage, cash-flow,
        and year-over-year growth metrics.
        """
        ticker = yf.Ticker(symbol)

        info = cls._safe_info(ticker)
        financials = cls._safe_df(ticker, "financials")
        balance_sheet = cls._safe_df(ticker, "balance_sheet")
        cashflow = cls._safe_df(ticker, "cashflow")

        metrics = FundamentalMetrics(
            # --- Profitability ---
            roe=cls._extract_roe(info),
            roa=cls._extract_roa(info),
            roic=cls._compute_roic(financials, balance_sheet),
            gross_margin=cls._extract_gross_margin(info, financials),
            operating_margin=cls._extract_operating_margin(info, financials),
            net_margin=cls._extract_net_margin(info, financials),
            # --- Liquidity ---
            current_ratio=cls._extract_current_ratio(info, balance_sheet),
            quick_ratio=cls._extract_quick_ratio(info, balance_sheet),
            cash_ratio=cls._compute_cash_ratio(balance_sheet),
            # --- Leverage ---
            debt_to_equity=cls._extract_debt_to_equity(info, balance_sheet),
            debt_to_assets=cls._compute_debt_to_assets(balance_sheet),
            interest_coverage=cls._compute_interest_coverage(financials),
            # --- Cash Flow ---
            free_cash_flow=cls._extract_fcf(info, cashflow),
            fcf_margin=cls._compute_fcf_margin(info, financials, cashflow),
            fcf_yield=cls._compute_fcf_yield(info, cashflow),
            # --- Growth (YoY) ---
            revenue_growth=cls._compute_revenue_growth(financials),
            earnings_growth=cls._compute_earnings_growth(financials),
            eps_growth=cls._compute_eps_growth(info),
            fcf_growth=cls._compute_fcf_growth(cashflow),
        )

        fiscal_year = cls._resolve_fiscal_year(financials)
        currency = info.get("currency") if info else None

        return FundamentalAnalysisResponse(
            symbol=symbol.upper(),
            metrics=metrics,
            fiscal_year=fiscal_year,
            currency=currency,
            calculated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Safe helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_div(a: Optional[float], b: Optional[float]) -> Optional[float]:
        """Return *a / b*, or ``None`` when division is impossible."""
        if a is None or b is None or b == 0:
            return None
        return a / b

    @staticmethod
    def _safe_info(ticker: yf.Ticker) -> dict:
        """Return ticker.info, falling back to an empty dict on error."""
        try:
            info = ticker.info
            return info if isinstance(info, dict) else {}
        except Exception:
            logger.warning("Failed to fetch .info for %s", ticker.ticker, exc_info=True)
            return {}

    @staticmethod
    def _safe_df(ticker: yf.Ticker, attr: str) -> pd.DataFrame:
        """Return a financial-statement DataFrame, or empty on error."""
        try:
            df = getattr(ticker, attr, None)
            if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                return pd.DataFrame()
            return df
        except Exception:
            logger.warning("Failed to fetch .%s for %s", attr, ticker.ticker, exc_info=True)
            return pd.DataFrame()

    @classmethod
    def _get_item(cls, df: pd.DataFrame, keys: list[str], col: int = 0) -> Optional[float]:
        """Safely retrieve a line-item value from a financial DataFrame.

        *keys* is a list of possible row-index names (yfinance naming can vary).
        *col* selects the fiscal-period column (0 = most recent).
        """
        if df.empty or df.shape[1] <= col:
            return None
        for key in keys:
            if key in df.index:
                val = df.loc[key].iloc[col]
                if pd.notna(val):
                    return float(val)
        return None

    # ------------------------------------------------------------------
    # Profitability
    # ------------------------------------------------------------------

    @classmethod
    def _extract_roe(cls, info: dict) -> Optional[float]:
        val = info.get("returnOnEquity")
        return float(val) if val is not None else None

    @classmethod
    def _extract_roa(cls, info: dict) -> Optional[float]:
        val = info.get("returnOnAssets")
        return float(val) if val is not None else None

    @classmethod
    def _compute_roic(cls, financials: pd.DataFrame, balance_sheet: pd.DataFrame) -> Optional[float]:
        """ROIC = NOPAT / Invested Capital.

        NOPAT = Operating Income × (1 − effective tax rate).
        Invested Capital = Total Equity + Total Debt − Cash.
        """
        operating_income = cls._get_item(financials, ["Operating Income", "EBIT"])
        net_income = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"])
        pretax_income = cls._get_item(financials, ["Pretax Income", "Income Before Tax", "Pretax Income"])

        tax_rate = cls._safe_div(
            (pretax_income - net_income) if pretax_income is not None and net_income is not None else None,
            pretax_income,
        )
        if tax_rate is None or operating_income is None:
            return None

        nopat = operating_income * (1 - tax_rate)

        equity = cls._get_item(balance_sheet, ["Stockholders Equity", "Total Stockholder Equity", "Total Equity Gross Minority Interest"])
        total_debt = cls._get_item(balance_sheet, ["Total Debt", "Long Term Debt"])
        cash = cls._get_item(balance_sheet, ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"])

        if equity is None:
            return None
        invested_capital = equity + (total_debt or 0) - (cash or 0)
        return cls._safe_div(nopat, invested_capital)

    @classmethod
    def _extract_gross_margin(cls, info: dict, financials: pd.DataFrame) -> Optional[float]:
        val = info.get("grossMargins")
        if val is not None:
            return float(val)
        gross_profit = cls._get_item(financials, ["Gross Profit"])
        revenue = cls._get_item(financials, ["Total Revenue"])
        return cls._safe_div(gross_profit, revenue)

    @classmethod
    def _extract_operating_margin(cls, info: dict, financials: pd.DataFrame) -> Optional[float]:
        val = info.get("operatingMargins")
        if val is not None:
            return float(val)
        operating_income = cls._get_item(financials, ["Operating Income"])
        revenue = cls._get_item(financials, ["Total Revenue"])
        return cls._safe_div(operating_income, revenue)

    @classmethod
    def _extract_net_margin(cls, info: dict, financials: pd.DataFrame) -> Optional[float]:
        val = info.get("profitMargins")
        if val is not None:
            return float(val)
        net_income = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"])
        revenue = cls._get_item(financials, ["Total Revenue"])
        return cls._safe_div(net_income, revenue)

    # ------------------------------------------------------------------
    # Liquidity
    # ------------------------------------------------------------------

    @classmethod
    def _extract_current_ratio(cls, info: dict, balance_sheet: pd.DataFrame) -> Optional[float]:
        val = info.get("currentRatio")
        if val is not None:
            return float(val)
        current_assets = cls._get_item(balance_sheet, ["Total Current Assets", "Current Assets"])
        current_liabilities = cls._get_item(balance_sheet, ["Current Liabilities", "Total Current Liabilities"])
        return cls._safe_div(current_assets, current_liabilities)

    @classmethod
    def _extract_quick_ratio(cls, info: dict, balance_sheet: pd.DataFrame) -> Optional[float]:
        val = info.get("quickRatio")
        if val is not None:
            return float(val)
        current_assets = cls._get_item(balance_sheet, ["Total Current Assets", "Current Assets"])
        inventory = cls._get_item(balance_sheet, ["Inventory"]) or 0
        current_liabilities = cls._get_item(balance_sheet, ["Current Liabilities", "Total Current Liabilities"])
        if current_assets is None:
            return None
        return cls._safe_div(current_assets - inventory, current_liabilities)

    @classmethod
    def _compute_cash_ratio(cls, balance_sheet: pd.DataFrame) -> Optional[float]:
        cash = cls._get_item(balance_sheet, ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"])
        current_liabilities = cls._get_item(balance_sheet, ["Current Liabilities", "Total Current Liabilities"])
        return cls._safe_div(cash, current_liabilities)

    # ------------------------------------------------------------------
    # Leverage
    # ------------------------------------------------------------------

    @classmethod
    def _extract_debt_to_equity(cls, info: dict, balance_sheet: pd.DataFrame) -> Optional[float]:
        val = info.get("debtToEquity")
        if val is not None:
            return float(val) / 100  # yfinance reports as percentage
        total_debt = cls._get_item(balance_sheet, ["Total Debt", "Long Term Debt"])
        equity = cls._get_item(balance_sheet, ["Stockholders Equity", "Total Stockholder Equity"])
        return cls._safe_div(total_debt, equity)

    @classmethod
    def _compute_debt_to_assets(cls, balance_sheet: pd.DataFrame) -> Optional[float]:
        total_debt = cls._get_item(balance_sheet, ["Total Debt", "Long Term Debt"])
        total_assets = cls._get_item(balance_sheet, ["Total Assets"])
        return cls._safe_div(total_debt, total_assets)

    @classmethod
    def _compute_interest_coverage(cls, financials: pd.DataFrame) -> Optional[float]:
        ebit = cls._get_item(financials, ["EBIT", "Operating Income"])
        interest = cls._get_item(financials, ["Interest Expense"])
        if interest is not None:
            interest = abs(interest)  # interest expense is sometimes negative
        return cls._safe_div(ebit, interest)

    # ------------------------------------------------------------------
    # Cash Flow
    # ------------------------------------------------------------------

    @classmethod
    def _extract_fcf(cls, info: dict, cashflow: pd.DataFrame) -> Optional[float]:
        val = info.get("freeCashflow")
        if val is not None:
            return float(val)
        return cls._compute_fcf_from_df(cashflow)

    @classmethod
    def _compute_fcf_from_df(cls, cashflow: pd.DataFrame, col: int = 0) -> Optional[float]:
        """FCF = Operating Cash Flow − Capital Expenditure."""
        operating_cf = cls._get_item(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"], col=col)
        capex = cls._get_item(cashflow, ["Capital Expenditure", "Capital Expenditures"], col=col)
        if operating_cf is None:
            return None
        capex_val = abs(capex) if capex is not None else 0
        return operating_cf - capex_val

    @classmethod
    def _compute_fcf_margin(cls, info: dict, financials: pd.DataFrame, cashflow: pd.DataFrame) -> Optional[float]:
        fcf = cls._extract_fcf(info, cashflow)
        revenue = cls._get_item(financials, ["Total Revenue"])
        return cls._safe_div(fcf, revenue)

    @classmethod
    def _compute_fcf_yield(cls, info: dict, cashflow: pd.DataFrame) -> Optional[float]:
        fcf = cls._extract_fcf(info, cashflow)
        market_cap = info.get("marketCap") if info else None
        if market_cap is not None:
            market_cap = float(market_cap)
        return cls._safe_div(fcf, market_cap)

    # ------------------------------------------------------------------
    # Growth (YoY)
    # ------------------------------------------------------------------

    @classmethod
    def _yoy_growth(cls, current: Optional[float], previous: Optional[float]) -> Optional[float]:
        """(current − previous) / abs(previous), or None."""
        if current is None or previous is None or previous == 0:
            return None
        return (current - previous) / abs(previous)

    @classmethod
    def _compute_revenue_growth(cls, financials: pd.DataFrame) -> Optional[float]:
        if financials.empty or financials.shape[1] < 2:
            return None
        current = cls._get_item(financials, ["Total Revenue"], col=0)
        previous = cls._get_item(financials, ["Total Revenue"], col=1)
        return cls._yoy_growth(current, previous)

    @classmethod
    def _compute_earnings_growth(cls, financials: pd.DataFrame) -> Optional[float]:
        if financials.empty or financials.shape[1] < 2:
            return None
        current = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"], col=0)
        previous = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"], col=1)
        return cls._yoy_growth(current, previous)

    @classmethod
    def _compute_eps_growth(cls, info: dict) -> Optional[float]:
        """Approximate EPS growth from trailing vs. forward EPS when available."""
        trailing = info.get("trailingEps")
        forward = info.get("forwardEps")
        if trailing is not None and forward is not None and trailing != 0:
            return (float(forward) - float(trailing)) / abs(float(trailing))
        return None

    @classmethod
    def _compute_fcf_growth(cls, cashflow: pd.DataFrame) -> Optional[float]:
        if cashflow.empty or cashflow.shape[1] < 2:
            return None
        current = cls._compute_fcf_from_df(cashflow, col=0)
        previous = cls._compute_fcf_from_df(cashflow, col=1)
        return cls._yoy_growth(current, previous)

    # ------------------------------------------------------------------
    # Misc helpers
    # ------------------------------------------------------------------

    @classmethod
    def _resolve_fiscal_year(cls, financials: pd.DataFrame) -> Optional[str]:
        """Return the most recent fiscal-period date as a string."""
        if financials.empty or financials.shape[1] == 0:
            return None
        col = financials.columns[0]
        if hasattr(col, "strftime"):
            return col.strftime("%Y-%m-%d")
        return str(col)
