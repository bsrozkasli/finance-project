"""Valuation analysis service.

Fetches fundamental valuation ratios via yfinance and grades a stock
against S&P 500 median benchmarks using a weighted scoring system.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Optional, Tuple

import yfinance as yf

from app.models.valuation import (
    ValuationGrade,
    ValuationMetrics,
    ValuationResponse,
)


# Benchmark tuples: (very_cheap, cheap, fair, expensive)
# For "lower-is-cheaper" ratios the value climbs left→right.
# For "higher-is-cheaper" ratios (dividend/FCF yield) the value falls left→right.
_BENCHMARKS: dict[str, Tuple[float, float, float, float]] = {
    "pe": (10.0, 15.0, 20.0, 30.0),
    "forward_pe": (8.0, 13.0, 18.0, 28.0),
    "peg": (0.5, 1.0, 1.5, 2.5),
    "price_to_book": (1.0, 2.0, 3.5, 6.0),
    "ev_ebitda": (6.0, 10.0, 15.0, 25.0),
    "ev_sales": (1.0, 3.0, 6.0, 12.0),
    "price_to_sales": (0.5, 2.0, 5.0, 10.0),
    "dividend_yield": (0.04, 0.025, 0.015, 0.005),
    "fcf_yield": (0.08, 0.05, 0.03, 0.01),
}

# Ratios where a *higher* value means *cheaper*.
_HIGHER_IS_CHEAPER: set[str] = {"dividend_yield", "fcf_yield"}

# Weights for the weighted-average score.  Every ratio defaults to 1.0;
# override here to emphasise or de-emphasise specific metrics.
_WEIGHTS: dict[str, float] = {
    "pe": 1.0,
    "forward_pe": 1.0,
    "peg": 1.0,
    "price_to_book": 1.0,
    "ev_ebitda": 1.0,
    "ev_sales": 1.0,
    "price_to_sales": 1.0,
    "dividend_yield": 1.0,
    "fcf_yield": 1.0,
}


class ValuationService:
    """Stateless service that analyses the valuation of a single ticker."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def analyze(cls, symbol: str) -> ValuationResponse:
        """Return a full valuation analysis for *symbol*.

        Parameters
        ----------
        symbol:
            Ticker symbol understood by Yahoo Finance (e.g. ``"AAPL"``).

        Returns
        -------
        ValuationResponse
            Metrics, an overall valuation grade, and a timestamp.
        """

        info: dict[str, Any] = cls._fetch_info(symbol)

        # --- Extract individual ratios -----------------------------------
        pe = cls._safe_get(info, "trailingPE")
        forward_pe = cls._safe_get(info, "forwardPE")
        peg = cls._safe_get(info, "pegRatio")
        price_to_book = cls._safe_get(info, "priceToBook")
        ev_ebitda = cls._safe_get(info, "enterpriseToEbitda")
        ev_sales = cls._safe_get(info, "enterpriseToRevenue")
        price_to_sales = cls._safe_get(info, "priceToSalesTrailing12Months")
        dividend_yield = cls._safe_get(info, "dividendYield")

        # FCF yield is derived: freeCashflow / marketCap
        fcf_yield = cls._compute_fcf_yield(info)

        # --- Grade -------------------------------------------------------
        ratio_map: dict[str, Optional[float]] = {
            "pe": pe,
            "forward_pe": forward_pe,
            "peg": peg,
            "price_to_book": price_to_book,
            "ev_ebitda": ev_ebitda,
            "ev_sales": ev_sales,
            "price_to_sales": price_to_sales,
            "dividend_yield": dividend_yield,
            "fcf_yield": fcf_yield,
        }

        grade = cls._compute_grade(ratio_map)

        metrics = ValuationMetrics(
            pe=pe,
            forward_pe=forward_pe,
            peg=peg,
            price_to_book=price_to_book,
            ev_ebitda=ev_ebitda,
            ev_sales=ev_sales,
            price_to_sales=price_to_sales,
            dividend_yield=dividend_yield,
            fcf_yield=fcf_yield,
            valuation_grade=grade,
        )

        return ValuationResponse(
            symbol=symbol.upper(),
            metrics=metrics,
            peer_comparison=None,
            calculated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _fetch_info(cls, symbol: str) -> dict[str, Any]:
        """Fetch the ``Ticker.info`` dict, returning ``{}`` on failure."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            if info is None:
                return {}
            return info
        except Exception:
            return {}

    @classmethod
    def _safe_get(cls, info: dict[str, Any], key: str) -> Optional[float]:
        """Return a float from *info[key]*, or ``None`` when unavailable.

        Handles missing keys, ``None``, ``NaN``, and ``Inf`` gracefully.
        """
        value = info.get(key)
        if value is None:
            return None
        try:
            fval = float(value)
            if math.isnan(fval) or math.isinf(fval):
                return None
            return fval
        except (TypeError, ValueError):
            return None

    @classmethod
    def _compute_fcf_yield(cls, info: dict[str, Any]) -> Optional[float]:
        """Derive FCF yield as ``freeCashflow / marketCap``."""
        fcf = cls._safe_get(info, "freeCashflow")
        market_cap = cls._safe_get(info, "marketCap")
        if fcf is None or market_cap is None or market_cap == 0:
            return None
        return fcf / market_cap

    @classmethod
    def _score_ratio(
        cls,
        value: float,
        low_is_cheap: bool,
        benchmarks: Tuple[float, float, float, float],
    ) -> float:
        """Score a single ratio on a 0-100 scale.

        Parameters
        ----------
        value:
            The observed ratio value.
        low_is_cheap:
            ``True`` when a *lower* ratio means the stock is cheaper
            (e.g. P/E). ``False`` for yields where *higher* is cheaper.
        benchmarks:
            Four thresholds ``(very_cheap, cheap, fair, expensive)``.
            When *low_is_cheap* is ``True`` the thresholds ascend;
            when ``False`` they descend.

        Returns
        -------
        float
            A score between 0 (very cheap) and 100 (very expensive).
        """
        b0, b1, b2, b3 = benchmarks

        if low_is_cheap:
            # Ascending thresholds: b0 < b1 < b2 < b3
            if value <= b0:
                return 0.0
            if value <= b1:
                return 20.0 * (value - b0) / (b1 - b0)
            if value <= b2:
                return 20.0 + 20.0 * (value - b1) / (b2 - b1)
            if value <= b3:
                return 40.0 + 20.0 * (value - b2) / (b3 - b2)
            # Beyond the most-expensive benchmark — extrapolate but cap at 100
            extra = 60.0 + 40.0 * (value - b3) / (b3 - b2)
            return min(extra, 100.0)
        else:
            # Descending thresholds (higher value = cheaper): b0 > b1 > b2 > b3
            if value >= b0:
                return 0.0
            if value >= b1:
                return 20.0 * (b0 - value) / (b0 - b1)
            if value >= b2:
                return 20.0 + 20.0 * (b1 - value) / (b1 - b2)
            if value >= b3:
                return 40.0 + 20.0 * (b2 - value) / (b2 - b3)
            extra = 60.0 + 40.0 * (b3 - value) / (b2 - b3)
            return min(extra, 100.0)

    @classmethod
    def _compute_grade(
        cls, ratio_map: dict[str, Optional[float]]
    ) -> ValuationGrade:
        """Compute a weighted-average score and map it to a grade."""
        total_weight = 0.0
        weighted_sum = 0.0

        for name, value in ratio_map.items():
            if value is None:
                continue
            benchmarks = _BENCHMARKS.get(name)
            if benchmarks is None:
                continue

            low_is_cheap = name not in _HIGHER_IS_CHEAPER
            score = cls._score_ratio(value, low_is_cheap, benchmarks)
            weight = _WEIGHTS.get(name, 1.0)
            weighted_sum += score * weight
            total_weight += weight

        if total_weight == 0:
            return ValuationGrade.FAIR

        avg = weighted_sum / total_weight

        if avg < 20:
            return ValuationGrade.VERY_CHEAP
        if avg < 40:
            return ValuationGrade.CHEAP
        if avg < 60:
            return ValuationGrade.FAIR
        if avg < 80:
            return ValuationGrade.EXPENSIVE
        return ValuationGrade.VERY_EXPENSIVE
