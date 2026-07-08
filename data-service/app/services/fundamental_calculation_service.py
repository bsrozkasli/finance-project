"""
FundamentalCalculationService — deterministic, independently testable
fundamental financial ratio calculator.

All calculations are pure functions of raw financial statement data.
This service does NOT call any external APIs — it receives FinancialStatements
value objects (from the MarketDataResolver) and returns a FundamentalMetrics
snapshot.

Metrics computed:
- ROA  (Return on Assets)
- ROE  (Return on Equity)
- ROIC (Return on Invested Capital)
- EV/FCF (Enterprise Value / Free Cash Flow)
- Piotroski F-Score (9 binary signals)
- Current Ratio
- Quick Ratio
- Debt/Equity Ratio
- Debt/Assets Ratio
- Interest Coverage (not directly available from FinancialStatements — skipped)
- FCF Margin
- FCF Yield (requires market cap from external call, so set to None here)
- Revenue Growth (YoY)
- Earnings Growth (YoY)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from app.providers.base import FinancialStatements

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Output model
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FundamentalMetricsSnapshot:
    """Immutable snapshot of computed fundamental metrics for one symbol."""

    symbol: str

    # Profitability
    roa: Optional[float]                  # Net Income / Total Assets
    roe: Optional[float]                  # Net Income / Total Equity
    roic: Optional[float]                 # NOPAT / Invested Capital
    gross_margin: Optional[float]
    net_margin: Optional[float]           # Net Income / Revenue
    fcf_margin: Optional[float]           # FCF / Revenue

    # Liquidity
    current_ratio: Optional[float]        # Current Assets / Current Liabilities
    quick_ratio: Optional[float]          # (Current Assets - Inventory) / CL
    cash_ratio: Optional[float]           # Cash / Current Liabilities

    # Leverage
    debt_to_equity: Optional[float]       # Total Debt / Total Equity
    debt_to_assets: Optional[float]       # Total Debt / Total Assets

    # Cash Flow
    free_cash_flow: Optional[float]       # Operating CF - CapEx
    ev_fcf: Optional[float]              # Enterprise Value / FCF (None if market cap unavailable)

    # Growth (YoY, most recent vs prior year)
    revenue_growth: Optional[float]
    earnings_growth: Optional[float]

    # Piotroski F-Score (0-9)
    piotroski_f_score: Optional[int]
    piotroski_signals: dict[str, bool]    # individual signal breakdown

    # Raw inputs for audit
    fiscal_year: Optional[str]            # most recent fiscal period


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class FundamentalCalculationService:
    """
    Stateless service that computes fundamental metrics from raw FinancialStatements.

    All public methods are static — no instance state is required.
    All calculations are deterministic given the same input.
    """

    @staticmethod
    def compute(
        statements: FinancialStatements,
        market_cap: Optional[float] = None,
    ) -> FundamentalMetricsSnapshot:
        """
        Compute a full fundamental metrics snapshot.

        Args:
            statements:  Raw financial statement data from the provider layer.
            market_cap:  Optional market capitalisation in USD for EV/FCF.

        Returns:
            FundamentalMetricsSnapshot with all computable metrics filled in.
        """
        symbol = statements.symbol

        # Convenience aliases (index 0 = most recent period)
        rev = _safe_get(statements.revenue, 0)
        rev_prev = _safe_get(statements.revenue, 1)
        ni = _safe_get(statements.net_income, 0)
        ni_prev = _safe_get(statements.net_income, 1)
        ta = _safe_get(statements.total_assets, 0)
        tl = _safe_get(statements.total_liabilities, 0)
        te = _safe_get(statements.total_equity, 0)
        ca = _safe_get(statements.current_assets, 0)
        cl = _safe_get(statements.current_liabilities, 0)
        td = _safe_get(statements.total_debt, 0)
        cash = _safe_get(statements.cash, 0)
        ocf = _safe_get(statements.operating_cash_flow, 0)
        ocf_prev = _safe_get(statements.operating_cash_flow, 1)
        capex = _safe_get(statements.capital_expenditure, 0)

        # ----- Profitability -------------------------------------------
        roa = _safe_div(ni, ta)
        roe = _safe_div(ni, te)
        roic = FundamentalCalculationService._compute_roic(ni, td, te, cash)
        net_margin = _safe_div(ni, rev)
        fcf = FundamentalCalculationService._compute_fcf(ocf, capex)
        fcf_margin = _safe_div(fcf, rev)

        # Gross margin requires gross profit which is not in FinancialStatements;
        # set to None — the yfinance info dict supplies this to FundamentalAnalysisService
        gross_margin: Optional[float] = None

        # ----- Liquidity -----------------------------------------------
        current_ratio = _safe_div(ca, cl)
        quick_ratio = _safe_div((ca - 0.0) if ca is not None else None, cl)  # no inventory field
        cash_ratio = _safe_div(cash, cl)

        # ----- Leverage ------------------------------------------------
        debt_to_equity = _safe_div(td, te)
        debt_to_assets = _safe_div(td, ta)

        # ----- EV / FCF ------------------------------------------------
        ev_fcf: Optional[float] = None
        if market_cap is not None and fcf and fcf > 0:
            # EV ≈ Market Cap + Total Debt - Cash (simplified)
            ev = (market_cap or 0) + (td or 0) - (cash or 0)
            ev_fcf = _safe_div(ev, fcf)

        # ----- Growth --------------------------------------------------
        revenue_growth = _yoy_growth(rev, rev_prev)
        earnings_growth = _yoy_growth(ni, ni_prev)

        # ----- Piotroski F-Score ---------------------------------------
        p_score, p_signals = FundamentalCalculationService._compute_piotroski(
            ni=ni, ta=ta, ocf=ocf, ocf_prev=ocf_prev,
            roa=roa,
            ta_prev=_safe_get(statements.total_assets, 1),
            td_prev=_safe_get(statements.total_debt, 1),
            ca_prev=_safe_get(statements.current_assets, 1),
            cl_prev=_safe_get(statements.current_liabilities, 1),
            rev=rev, rev_prev=rev_prev, ni_prev=ni_prev,
        )

        fiscal_year_raw = _safe_get(statements.fiscal_years, 0)
        fiscal_year = None if fiscal_year_raw is None else str(fiscal_year_raw)

        return FundamentalMetricsSnapshot(
            symbol=symbol,
            roa=roa,
            roe=roe,
            roic=roic,
            gross_margin=gross_margin,
            net_margin=net_margin,
            fcf_margin=fcf_margin,
            current_ratio=current_ratio,
            quick_ratio=quick_ratio,
            cash_ratio=cash_ratio,
            debt_to_equity=debt_to_equity,
            debt_to_assets=debt_to_assets,
            free_cash_flow=fcf,
            ev_fcf=ev_fcf,
            revenue_growth=revenue_growth,
            earnings_growth=earnings_growth,
            piotroski_f_score=p_score,
            piotroski_signals=p_signals,
            fiscal_year=fiscal_year,
        )

    # ------------------------------------------------------------------
    # ROIC
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_roic(
        ni: Optional[float],
        td: Optional[float],
        te: Optional[float],
        cash: Optional[float],
    ) -> Optional[float]:
        """
        ROIC = Net Income / Invested Capital
        Invested Capital = Total Equity + Total Debt - Cash
        (Simplified ROIC; full ROIC uses NOPAT but requires tax rate)
        """
        if ni is None or te is None:
            return None
        invested_capital = (te or 0) + (td or 0) - (cash or 0)
        return _safe_div(ni, invested_capital)

    # ------------------------------------------------------------------
    # FCF
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_fcf(
        ocf: Optional[float],
        capex: Optional[float],
    ) -> Optional[float]:
        """FCF = Operating Cash Flow - CapEx."""
        if ocf is None:
            return None
        return ocf - (capex or 0)

    # ------------------------------------------------------------------
    # Piotroski F-Score (9 binary signals)
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_piotroski(
        ni: Optional[float],
        ta: Optional[float],
        ocf: Optional[float],
        ocf_prev: Optional[float],
        roa: Optional[float],
        ta_prev: Optional[float],
        td: Optional[float] = None,
        td_prev: Optional[float] = None,
        ca: Optional[float] = None,
        ca_prev: Optional[float] = None,
        cl: Optional[float] = None,
        cl_prev: Optional[float] = None,
        rev: Optional[float] = None,
        rev_prev: Optional[float] = None,
        ni_prev: Optional[float] = None,
    ) -> tuple[Optional[int], dict[str, bool]]:
        """
        Compute the Piotroski F-Score.

        Returns (score, signals_dict) where score ∈ {0..9} or None if
        insufficient data.

        Signals:
        Profitability (4):
          F1: ROA > 0
          F2: Operating Cash Flow > 0
          F3: ROA increased YoY
          F4: Accruals (OCF/TA > ROA)

        Leverage / Liquidity (3):
          F5: Long-term debt ratio did not increase
          F6: Current ratio improved
          F7: No new shares issued (not available — set to True)

        Operating Efficiency (2):
          F8: Gross margin improved (not available — set to None)
          F9: Asset turnover improved (Revenue / TA)
        """
        signals: dict[str, bool] = {}

        # F1: ROA > 0
        signals["f1_roa_positive"] = bool(roa is not None and roa > 0)

        # F2: OCF > 0
        signals["f2_ocf_positive"] = bool(ocf is not None and ocf > 0)

        # F3: ROA improved YoY
        roa_prev = _safe_div(ni_prev, ta_prev)
        if roa is not None and roa_prev is not None:
            signals["f3_roa_improved"] = roa > roa_prev
        else:
            signals["f3_roa_improved"] = False

        # F4: Accruals (OCF/TA > ROA) — high quality earnings
        ocf_ta = _safe_div(ocf, ta)
        if ocf_ta is not None and roa is not None:
            signals["f4_accruals_low"] = ocf_ta > roa
        else:
            signals["f4_accruals_low"] = False

        # F5: Leverage (debt ratio) did not increase
        dr_now = _safe_div(td, ta) if td is not None else None
        dr_prev = _safe_div(td_prev, ta_prev) if td_prev is not None else None
        if dr_now is not None and dr_prev is not None:
            signals["f5_leverage_decreased"] = dr_now <= dr_prev
        else:
            signals["f5_leverage_decreased"] = False

        # F6: Current ratio improved
        cr_now = _safe_div(ca, cl) if ca is not None and cl is not None else None
        cr_prev = _safe_div(ca_prev, cl_prev) if ca_prev is not None and cl_prev is not None else None
        if cr_now is not None and cr_prev is not None:
            signals["f6_liquidity_improved"] = cr_now > cr_prev
        else:
            signals["f6_liquidity_improved"] = False

        # F7: No dilution — not computable without share count; default True
        signals["f7_no_dilution"] = True

        # F8: Gross margin improved — not computable from FinancialStatements; default False
        signals["f8_gross_margin_improved"] = False

        # F9: Asset turnover improved (Revenue / Total Assets)
        at_now = _safe_div(rev, ta) if rev is not None else None
        at_prev = _safe_div(rev_prev, ta_prev) if rev_prev is not None else None
        if at_now is not None and at_prev is not None:
            signals["f9_asset_turnover_improved"] = at_now > at_prev
        else:
            signals["f9_asset_turnover_improved"] = False

        score = sum(1 for v in signals.values() if v)
        return score, signals


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def _safe_get(lst: list, idx: int) -> Optional[float]:
    try:
        val = lst[idx]
        return float(val) if val is not None else None
    except (IndexError, TypeError, ValueError):
        return None


def _safe_div(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None or b == 0:
        return None
    return a / b


def _yoy_growth(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    """(current − previous) / abs(previous)"""
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / abs(previous)
