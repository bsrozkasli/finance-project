"""Factor Analysis & Institutional Scores Service – Phases 6 & 7.

Computes multi-factor investment scores (value, growth, quality, momentum,
low-volatility) and institutional-grade financial health indicators
(Piotroski F-Score, Altman Z-Score, Beneish M-Score, etc.) using yfinance
data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

from app.models.factors import (
    FactorAnalysisResponse,
    FactorScores,
    InstitutionalScoreResponse,
    InstitutionalScores,
)

logger = logging.getLogger(__name__)

_MARKET_BENCHMARK = "SPY"


class FactorAnalysisService:
    """Stateless service for multi-factor and institutional scoring.

    All public methods are classmethods – no instance state is required.
    """

    # ==================================================================
    # Safe helpers
    # ==================================================================

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

        *keys* is a list of possible row-index names (yfinance naming varies).
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

    @staticmethod
    def _linear_score(
        value: Optional[float],
        low: float,
        high: float,
        *,
        lower_is_better: bool = False,
    ) -> Optional[float]:
        """Map *value* linearly to 0-100 between *low* and *high*.

        When *lower_is_better* is ``True`` the scale is inverted so that
        *low* → 100 and *high* → 0.
        """
        if value is None:
            return None
        if lower_is_better:
            if value <= low:
                return 100.0
            if value >= high:
                return 0.0
            return (high - value) / (high - low) * 100.0
        else:
            if value >= high:
                return 100.0
            if value <= low:
                return 0.0
            return (value - low) / (high - low) * 100.0

    @staticmethod
    def _weighted_avg(scores: list[Optional[float]], weights: list[float]) -> int:
        """Compute a weighted average of available scores, ignoring ``None``."""
        total_weight = 0.0
        total_score = 0.0
        for s, w in zip(scores, weights):
            if s is not None:
                total_score += s * w
                total_weight += w
        if total_weight == 0:
            return 0
        return int(round(total_score / total_weight))

    # ==================================================================
    # Public API – Factor Analysis (Phase 6)
    # ==================================================================

    @classmethod
    def analyze_factors(cls, symbol: str) -> FactorAnalysisResponse:
        """Return multi-factor investment scores for *symbol*."""

        ticker = yf.Ticker(symbol)
        info = cls._safe_info(ticker)

        # Price data for momentum & volatility
        end = datetime.now()
        start = end - timedelta(days=365)
        price_df = yf.download(symbol, start=start, end=end, progress=False)
        market_df = yf.download(_MARKET_BENCHMARK, start=start, end=end, progress=False)

        value_score, value_comp = cls._compute_value(info)
        growth_score, growth_comp = cls._compute_growth(info)
        quality_score, quality_comp = cls._compute_quality(info)
        momentum_score, momentum_comp = cls._compute_momentum(price_df)
        vol_score, vol_comp = cls._compute_low_volatility(price_df, market_df)

        scores = FactorScores(
            value_score=value_score,
            growth_score=growth_score,
            quality_score=quality_score,
            momentum_score=momentum_score,
            low_volatility_score=vol_score,
            value_components=value_comp,
            growth_components=growth_comp,
            quality_components=quality_comp,
            momentum_components=momentum_comp,
            volatility_components=vol_comp,
        )

        factor_map = {
            "value": value_score,
            "growth": growth_score,
            "quality": quality_score,
            "momentum": momentum_score,
            "low_volatility": vol_score,
        }
        dominant = max(factor_map, key=factor_map.get)  # type: ignore[arg-type]

        return FactorAnalysisResponse(
            symbol=symbol.upper(),
            scores=scores,
            dominant_factor=dominant,
            calculated_at=datetime.now(timezone.utc),
        )

    # ==================================================================
    # Public API – Institutional Scores (Phase 7)
    # ==================================================================

    @classmethod
    def analyze_institutional(cls, symbol: str) -> InstitutionalScoreResponse:
        """Return institutional-grade financial health scores for *symbol*."""

        ticker = yf.Ticker(symbol)
        info = cls._safe_info(ticker)
        financials = cls._safe_df(ticker, "financials")
        balance_sheet = cls._safe_df(ticker, "balance_sheet")
        cashflow = cls._safe_df(ticker, "cashflow")

        piotroski = cls._piotroski_f_score(info, financials, balance_sheet, cashflow)
        altman = cls._altman_z_score(info, financials, balance_sheet)
        beneish = cls._beneish_m_score(financials, balance_sheet, cashflow)

        # ROIC approximation for quality composite
        roic = cls._compute_roic(info, financials, balance_sheet)

        quality_composite = cls._quality_composite(piotroski, roic, info)
        moat = cls._economic_moat(quality_composite, info, roic)
        earnings_quality = cls._earnings_quality(financials, cashflow, balance_sheet)

        scores = InstitutionalScores(
            piotroski_f_score=piotroski,
            altman_z_score=round(altman, 4) if altman is not None else None,
            beneish_m_score=round(beneish, 4) if beneish is not None else None,
            quality_composite=quality_composite,
            economic_moat=moat,
            earnings_quality=earnings_quality,
        )

        interpretations = cls._build_interpretations(scores)

        return InstitutionalScoreResponse(
            symbol=symbol.upper(),
            scores=scores,
            interpretations=interpretations,
            calculated_at=datetime.now(timezone.utc),
        )

    # ==================================================================
    # Factor: Value
    # ==================================================================

    @classmethod
    def _compute_value(cls, info: dict) -> tuple[int, dict[str, Optional[float]]]:
        """Score value attractiveness from valuation multiples."""

        pe = info.get("trailingPE")
        pb = info.get("priceToBook")
        ev_ebitda = info.get("enterpriseToEbitda")
        # FCF yield = freeCashflow / marketCap
        fcf = info.get("freeCashflow")
        market_cap = info.get("marketCap")
        fcf_yield = cls._safe_div(
            float(fcf) if fcf is not None else None,
            float(market_cap) if market_cap is not None else None,
        )

        pe_val = float(pe) if pe is not None else None
        pb_val = float(pb) if pb is not None else None
        ev_val = float(ev_ebitda) if ev_ebitda is not None else None

        pe_score = cls._linear_score(pe_val, 10.0, 35.0, lower_is_better=True)
        pb_score = cls._linear_score(pb_val, 1.0, 5.0, lower_is_better=True)
        ev_score = cls._linear_score(ev_val, 6.0, 25.0, lower_is_better=True)
        fcf_score = cls._linear_score(fcf_yield, 0.01, 0.10)

        components: dict[str, Optional[float]] = {
            "pe_ratio": pe_val,
            "pb_ratio": pb_val,
            "ev_ebitda": ev_val,
            "fcf_yield": fcf_yield,
        }

        available = [s for s in [pe_score, pb_score, ev_score, fcf_score] if s is not None]
        score = int(round(sum(available) / len(available))) if available else 0

        return score, components

    # ==================================================================
    # Factor: Growth
    # ==================================================================

    @classmethod
    def _compute_growth(cls, info: dict) -> tuple[int, dict[str, Optional[float]]]:
        """Score growth profile from revenue/earnings growth rates."""

        rev_growth = info.get("revenueGrowth")
        earn_growth = info.get("earningsGrowth")
        qtr_growth = info.get("earningsQuarterlyGrowth")

        rev_val = float(rev_growth) if rev_growth is not None else None
        earn_val = float(earn_growth) if earn_growth is not None else None
        qtr_val = float(qtr_growth) if qtr_growth is not None else None

        rev_score = cls._linear_score(rev_val, -0.10, 0.30)
        earn_score = cls._linear_score(earn_val, -0.20, 0.30)
        qtr_score = cls._linear_score(qtr_val, -0.20, 0.30)

        components: dict[str, Optional[float]] = {
            "revenue_growth": rev_val,
            "earnings_growth": earn_val,
            "quarterly_earnings_growth": qtr_val,
        }

        # Weights: revenue 40%, earnings 30%, quarterly 30%
        score = cls._weighted_avg(
            [rev_score, earn_score, qtr_score],
            [0.40, 0.30, 0.30],
        )

        return score, components

    # ==================================================================
    # Factor: Quality
    # ==================================================================

    @classmethod
    def _compute_quality(cls, info: dict) -> tuple[int, dict[str, Optional[float]]]:
        """Score financial quality from profitability and leverage metrics."""

        roe = info.get("returnOnEquity")
        roa = info.get("returnOnAssets")
        op_margin = info.get("operatingMargins")
        de = info.get("debtToEquity")  # yfinance reports as %, e.g. 150 = 1.5x

        roe_val = float(roe) if roe is not None else None
        roa_val = float(roa) if roa is not None else None
        op_val = float(op_margin) if op_margin is not None else None
        de_val = float(de) if de is not None else None

        roe_score = cls._linear_score(roe_val, 0.0, 0.25)
        roa_score = cls._linear_score(roa_val, 0.0, 0.15)
        op_score = cls._linear_score(op_val, 0.0, 0.30)
        # D/E: lower is better; yfinance reports in %, so 20 = 0.2x, 300 = 3.0x
        de_score = cls._linear_score(de_val, 20.0, 300.0, lower_is_better=True)

        components: dict[str, Optional[float]] = {
            "return_on_equity": roe_val,
            "return_on_assets": roa_val,
            "operating_margin": op_val,
            "debt_to_equity_pct": de_val,
        }

        # Equal weight
        score = cls._weighted_avg(
            [roe_score, roa_score, op_score, de_score],
            [0.25, 0.25, 0.25, 0.25],
        )

        return score, components

    # ==================================================================
    # Factor: Momentum
    # ==================================================================

    @classmethod
    def _compute_momentum(cls, price_df: pd.DataFrame) -> tuple[int, dict[str, Optional[float]]]:
        """Score price momentum from trailing returns over multiple windows."""

        components: dict[str, Optional[float]] = {
            "return_1m": None,
            "return_3m": None,
            "return_6m": None,
            "return_12m": None,
        }

        if price_df.empty or len(price_df) < 22:
            return 0, components

        # Handle multi-level columns from yfinance
        if isinstance(price_df.columns, pd.MultiIndex):
            close = price_df["Close"].iloc[:, 0]
        else:
            close = price_df["Close"]

        current = float(close.iloc[-1])
        n = len(close)

        def _ret(periods: int) -> Optional[float]:
            if n < periods:
                return None
            past = float(close.iloc[-periods])
            return cls._safe_div(current - past, past)

        ret_1m = _ret(22)
        ret_3m = _ret(66)
        ret_6m = _ret(126)
        ret_12m = _ret(252)

        components["return_1m"] = ret_1m
        components["return_3m"] = ret_3m
        components["return_6m"] = ret_6m
        components["return_12m"] = ret_12m

        # Score each: > +30% = 100, < -20% = 0
        s_1m = cls._linear_score(ret_1m, -0.20, 0.30)
        s_3m = cls._linear_score(ret_3m, -0.20, 0.30)
        s_6m = cls._linear_score(ret_6m, -0.20, 0.30)
        s_12m = cls._linear_score(ret_12m, -0.20, 0.30)

        # Weights: 1M=10%, 3M=20%, 6M=30%, 12M=40%
        score = cls._weighted_avg(
            [s_1m, s_3m, s_6m, s_12m],
            [0.10, 0.20, 0.30, 0.40],
        )

        return score, components

    # ==================================================================
    # Factor: Low Volatility
    # ==================================================================

    @classmethod
    def _compute_low_volatility(
        cls,
        price_df: pd.DataFrame,
        market_df: pd.DataFrame,
    ) -> tuple[int, dict[str, Optional[float]]]:
        """Score low-volatility characteristics (vol, drawdown, beta)."""

        components: dict[str, Optional[float]] = {
            "annualized_volatility": None,
            "max_drawdown": None,
            "beta": None,
        }

        if price_df.empty or len(price_df) < 30:
            return 0, components

        # Handle multi-level columns
        if isinstance(price_df.columns, pd.MultiIndex):
            close = price_df["Close"].iloc[:, 0]
        else:
            close = price_df["Close"]

        daily_ret = close.pct_change().dropna()
        ann_vol = float(np.std(daily_ret, ddof=1)) * np.sqrt(252)

        # Max drawdown
        cumulative = (1 + daily_ret).cumprod()
        running_max = cumulative.cummax()
        drawdowns = (cumulative - running_max) / running_max
        max_dd = abs(float(drawdowns.min()))

        # Beta vs SPY
        beta: Optional[float] = None
        if not market_df.empty and len(market_df) >= 30:
            if isinstance(market_df.columns, pd.MultiIndex):
                mkt_close = market_df["Close"].iloc[:, 0]
            else:
                mkt_close = market_df["Close"]

            mkt_ret = mkt_close.pct_change().dropna()
            # Align
            min_len = min(len(daily_ret), len(mkt_ret))
            a_ret = np.asarray(daily_ret)[-min_len:]
            m_ret = np.asarray(mkt_ret)[-min_len:]

            mkt_var = float(np.var(m_ret, ddof=1))
            if mkt_var > 0 and min_len > 1:
                cov_val = float(np.cov(a_ret, m_ret, ddof=1)[0, 1])
                beta = cov_val / mkt_var

        components["annualized_volatility"] = round(ann_vol, 6)
        components["max_drawdown"] = round(max_dd, 6)
        components["beta"] = round(beta, 6) if beta is not None else None

        vol_score = cls._linear_score(ann_vol, 0.15, 0.50, lower_is_better=True)
        dd_score = cls._linear_score(max_dd, 0.10, 0.40, lower_is_better=True)
        beta_score = cls._linear_score(beta, 0.5, 1.5, lower_is_better=True)

        # Weights: vol 40%, drawdown 30%, beta 30%
        score = cls._weighted_avg(
            [vol_score, dd_score, beta_score],
            [0.40, 0.30, 0.30],
        )

        return score, components

    # ==================================================================
    # Institutional: Piotroski F-Score
    # ==================================================================

    @classmethod
    def _piotroski_f_score(
        cls,
        info: dict,
        financials: pd.DataFrame,
        balance_sheet: pd.DataFrame,
        cashflow: pd.DataFrame,
    ) -> Optional[int]:
        """Compute the Piotroski F-Score (0-9).

        Each of the nine binary signals adds 1 when positive.  Signals
        requiring multi-year data are skipped (not penalised) when
        historical data is unavailable.
        """

        score = 0
        max_possible = 0

        # 1. ROA > 0
        roa = info.get("returnOnAssets")
        if roa is not None:
            max_possible += 1
            if float(roa) > 0:
                score += 1

        # 2. Operating Cash Flow > 0
        ocf = cls._get_item(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"])
        if ocf is not None:
            max_possible += 1
            if ocf > 0:
                score += 1

        # 3. ROA increasing YoY (compare financials col 0 vs col 1)
        if not financials.empty and financials.shape[1] >= 2:
            ni_0 = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"], col=0)
            ni_1 = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"], col=1)
            ta_0 = cls._get_item(balance_sheet, ["Total Assets"], col=0)
            ta_1 = cls._get_item(balance_sheet, ["Total Assets"], col=1)
            roa_0 = cls._safe_div(ni_0, ta_0)
            roa_1 = cls._safe_div(ni_1, ta_1)
            if roa_0 is not None and roa_1 is not None:
                max_possible += 1
                if roa_0 > roa_1:
                    score += 1

        # 4. Cash Flow from Operations > Net Income (accruals quality)
        ni = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"])
        if ocf is not None and ni is not None:
            max_possible += 1
            if ocf > ni:
                score += 1

        # 5. Long-term debt ratio decreasing
        if not balance_sheet.empty and balance_sheet.shape[1] >= 2:
            ltd_0 = cls._get_item(balance_sheet, ["Long Term Debt", "Total Debt"], col=0)
            ltd_1 = cls._get_item(balance_sheet, ["Long Term Debt", "Total Debt"], col=1)
            ta_0 = cls._get_item(balance_sheet, ["Total Assets"], col=0)
            ta_1 = cls._get_item(balance_sheet, ["Total Assets"], col=1)
            ratio_0 = cls._safe_div(ltd_0, ta_0)
            ratio_1 = cls._safe_div(ltd_1, ta_1)
            if ratio_0 is not None and ratio_1 is not None:
                max_possible += 1
                if ratio_0 <= ratio_1:
                    score += 1

        # 6. Current ratio increasing
        if not balance_sheet.empty and balance_sheet.shape[1] >= 2:
            ca_0 = cls._get_item(balance_sheet, ["Current Assets", "Total Current Assets"], col=0)
            cl_0 = cls._get_item(balance_sheet, ["Current Liabilities", "Total Current Liabilities"], col=0)
            ca_1 = cls._get_item(balance_sheet, ["Current Assets", "Total Current Assets"], col=1)
            cl_1 = cls._get_item(balance_sheet, ["Current Liabilities", "Total Current Liabilities"], col=1)
            cr_0 = cls._safe_div(ca_0, cl_0)
            cr_1 = cls._safe_div(ca_1, cl_1)
            if cr_0 is not None and cr_1 is not None:
                max_possible += 1
                if cr_0 > cr_1:
                    score += 1

        # 7. No new shares issued
        shares = info.get("sharesOutstanding")
        if not balance_sheet.empty and balance_sheet.shape[1] >= 2:
            so_0 = cls._get_item(
                balance_sheet,
                ["Share Issued", "Ordinary Shares Number", "Common Stock Shares Outstanding"],
                col=0,
            )
            so_1 = cls._get_item(
                balance_sheet,
                ["Share Issued", "Ordinary Shares Number", "Common Stock Shares Outstanding"],
                col=1,
            )
            if so_0 is not None and so_1 is not None:
                max_possible += 1
                if so_0 <= so_1:
                    score += 1

        # 8. Gross margin increasing
        if not financials.empty and financials.shape[1] >= 2:
            gp_0 = cls._get_item(financials, ["Gross Profit"], col=0)
            rev_0 = cls._get_item(financials, ["Total Revenue"], col=0)
            gp_1 = cls._get_item(financials, ["Gross Profit"], col=1)
            rev_1 = cls._get_item(financials, ["Total Revenue"], col=1)
            gm_0 = cls._safe_div(gp_0, rev_0)
            gm_1 = cls._safe_div(gp_1, rev_1)
            if gm_0 is not None and gm_1 is not None:
                max_possible += 1
                if gm_0 > gm_1:
                    score += 1

        # 9. Asset turnover increasing
        if not financials.empty and financials.shape[1] >= 2:
            rev_0 = cls._get_item(financials, ["Total Revenue"], col=0)
            rev_1 = cls._get_item(financials, ["Total Revenue"], col=1)
            ta_0 = cls._get_item(balance_sheet, ["Total Assets"], col=0)
            ta_1 = cls._get_item(balance_sheet, ["Total Assets"], col=1)
            at_0 = cls._safe_div(rev_0, ta_0)
            at_1 = cls._safe_div(rev_1, ta_1)
            if at_0 is not None and at_1 is not None:
                max_possible += 1
                if at_0 > at_1:
                    score += 1

        if max_possible == 0:
            return None

        # Scale to 0-9: (score / max_possible) * 9
        return int(round(score / max_possible * 9))

    # ==================================================================
    # Institutional: Altman Z-Score
    # ==================================================================

    @classmethod
    def _altman_z_score(
        cls,
        info: dict,
        financials: pd.DataFrame,
        balance_sheet: pd.DataFrame,
    ) -> Optional[float]:
        """Compute the Altman Z-Score for bankruptcy prediction.

        Z = 1.2·(WC/TA) + 1.4·(RE/TA) + 3.3·(EBIT/TA)
          + 0.6·(MktCap/TL) + 1.0·(Rev/TA)
        """

        total_assets = cls._get_item(balance_sheet, ["Total Assets"])
        if total_assets is None or total_assets == 0:
            return None

        # Working Capital = Current Assets − Current Liabilities
        ca = cls._get_item(balance_sheet, ["Current Assets", "Total Current Assets"])
        cl = cls._get_item(balance_sheet, ["Current Liabilities", "Total Current Liabilities"])
        wc = (ca or 0) - (cl or 0) if ca is not None else None

        retained_earnings = cls._get_item(
            balance_sheet, ["Retained Earnings"]
        )

        ebit = cls._get_item(financials, ["EBIT", "Operating Income"])

        market_cap_raw = info.get("marketCap")
        market_cap = float(market_cap_raw) if market_cap_raw is not None else None

        total_liabilities = cls._get_item(
            balance_sheet, ["Total Liabilities Net Minority Interest", "Total Liab"]
        )

        revenue = cls._get_item(financials, ["Total Revenue"])

        # Require at least WC, EBIT, and market_cap for a meaningful result
        if wc is None or ebit is None or market_cap is None:
            return None

        x1 = cls._safe_div(wc, total_assets) or 0.0
        x2 = cls._safe_div(retained_earnings, total_assets) or 0.0
        x3 = cls._safe_div(ebit, total_assets) or 0.0
        x4 = cls._safe_div(market_cap, total_liabilities) or 0.0
        x5 = cls._safe_div(revenue, total_assets) or 0.0

        return 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5

    # ==================================================================
    # Institutional: Beneish M-Score (simplified)
    # ==================================================================

    @classmethod
    def _beneish_m_score(
        cls,
        financials: pd.DataFrame,
        balance_sheet: pd.DataFrame,
        cashflow: pd.DataFrame,
    ) -> Optional[float]:
        """Compute a simplified Beneish M-Score for earnings manipulation.

        M = -4.84 + 0.92·DSRI + 0.528·GMI + 0.404·AQI + 0.892·SGI
          + 0.115·DEPI - 0.172·SGAI + 4.679·TATA - 0.327·LVGI

        Uses neutral values (1.0) for unavailable ratio components.
        """

        if financials.empty or financials.shape[1] < 2:
            return None
        if balance_sheet.empty or balance_sheet.shape[1] < 2:
            return None

        # Convenience: col 0 = current year, col 1 = prior year
        def _ratio(num_keys: list[str], den_keys: list[str], col: int) -> Optional[float]:
            n = cls._get_item(financials, num_keys, col=col) or cls._get_item(balance_sheet, num_keys, col=col)
            d = cls._get_item(financials, den_keys, col=col) or cls._get_item(balance_sheet, den_keys, col=col)
            return cls._safe_div(n, d)

        # DSRI – Days Sales in Receivables Index
        recv_0 = cls._get_item(balance_sheet, ["Net Receivables", "Accounts Receivable"], col=0)
        recv_1 = cls._get_item(balance_sheet, ["Net Receivables", "Accounts Receivable"], col=1)
        rev_0 = cls._get_item(financials, ["Total Revenue"], col=0)
        rev_1 = cls._get_item(financials, ["Total Revenue"], col=1)
        dsr_0 = cls._safe_div(recv_0, rev_0)
        dsr_1 = cls._safe_div(recv_1, rev_1)
        dsri = cls._safe_div(dsr_0, dsr_1) if dsr_0 is not None and dsr_1 is not None else 1.0

        # GMI – Gross Margin Index
        gp_0 = cls._get_item(financials, ["Gross Profit"], col=0)
        gp_1 = cls._get_item(financials, ["Gross Profit"], col=1)
        gm_0 = cls._safe_div(gp_0, rev_0)
        gm_1 = cls._safe_div(gp_1, rev_1)
        gmi = cls._safe_div(gm_1, gm_0) if gm_0 is not None and gm_1 is not None else 1.0

        # AQI – Asset Quality Index
        ta_0 = cls._get_item(balance_sheet, ["Total Assets"], col=0)
        ta_1 = cls._get_item(balance_sheet, ["Total Assets"], col=1)
        ca_0 = cls._get_item(balance_sheet, ["Current Assets", "Total Current Assets"], col=0)
        ca_1 = cls._get_item(balance_sheet, ["Current Assets", "Total Current Assets"], col=1)
        ppe_0 = cls._get_item(balance_sheet, ["Net PPE", "Property Plant Equipment Net"], col=0)
        ppe_1 = cls._get_item(balance_sheet, ["Net PPE", "Property Plant Equipment Net"], col=1)
        if ta_0 and ca_0 is not None and ppe_0 is not None and ta_1 and ca_1 is not None and ppe_1 is not None:
            aq_0 = 1.0 - ((ca_0 + ppe_0) / ta_0)
            aq_1 = 1.0 - ((ca_1 + ppe_1) / ta_1)
            aqi = cls._safe_div(aq_0, aq_1) if aq_1 != 0 else 1.0
        else:
            aqi = 1.0

        # SGI – Sales Growth Index
        sgi = cls._safe_div(rev_0, rev_1) if rev_0 is not None and rev_1 is not None else 1.0

        # DEPI – Depreciation Index
        dep_0 = cls._get_item(cashflow, ["Depreciation And Amortization", "Depreciation"], col=0)
        dep_1 = cls._get_item(cashflow, ["Depreciation And Amortization", "Depreciation"], col=1)
        if dep_0 is not None and dep_1 is not None and ppe_0 is not None and ppe_1 is not None:
            dr_0 = cls._safe_div(dep_0, dep_0 + ppe_0)
            dr_1 = cls._safe_div(dep_1, dep_1 + ppe_1)
            depi = cls._safe_div(dr_1, dr_0) if dr_0 is not None and dr_1 is not None else 1.0
        else:
            depi = 1.0

        # SGAI – SGA Expense Index
        sga_0 = cls._get_item(financials, ["Selling General And Administration", "Selling General Administrative"], col=0)
        sga_1 = cls._get_item(financials, ["Selling General And Administration", "Selling General Administrative"], col=1)
        sgai_r0 = cls._safe_div(sga_0, rev_0)
        sgai_r1 = cls._safe_div(sga_1, rev_1)
        sgai = cls._safe_div(sgai_r0, sgai_r1) if sgai_r0 is not None and sgai_r1 is not None else 1.0

        # TATA – Total Accruals to Total Assets
        ni_0 = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"], col=0)
        ocf_0 = cls._get_item(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"], col=0)
        if ni_0 is not None and ocf_0 is not None and ta_0 is not None and ta_0 != 0:
            tata = (ni_0 - ocf_0) / ta_0
        else:
            tata = 0.0

        # LVGI – Leverage Index
        tl_0 = cls._get_item(balance_sheet, ["Total Liabilities Net Minority Interest", "Total Liab"], col=0)
        tl_1 = cls._get_item(balance_sheet, ["Total Liabilities Net Minority Interest", "Total Liab"], col=1)
        lev_0 = cls._safe_div(tl_0, ta_0)
        lev_1 = cls._safe_div(tl_1, ta_1)
        lvgi = cls._safe_div(lev_0, lev_1) if lev_0 is not None and lev_1 is not None else 1.0

        # Ensure all components are float (replace None with neutral 1.0)
        dsri = dsri if dsri is not None else 1.0
        gmi = gmi if gmi is not None else 1.0
        aqi = aqi if aqi is not None else 1.0
        sgi = sgi if sgi is not None else 1.0
        depi = depi if depi is not None else 1.0
        sgai = sgai if sgai is not None else 1.0
        lvgi = lvgi if lvgi is not None else 1.0

        m = (
            -4.84
            + 0.920 * dsri
            + 0.528 * gmi
            + 0.404 * aqi
            + 0.892 * sgi
            + 0.115 * depi
            - 0.172 * sgai
            + 4.679 * tata
            - 0.327 * lvgi
        )

        return m

    # ==================================================================
    # Institutional: Quality Composite
    # ==================================================================

    @classmethod
    def _compute_roic(
        cls,
        info: dict,
        financials: pd.DataFrame,
        balance_sheet: pd.DataFrame,
    ) -> Optional[float]:
        """Approximate ROIC = NOPAT / Invested Capital."""

        operating_income = cls._get_item(financials, ["Operating Income", "EBIT"])
        net_income = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"])
        pretax_income = cls._get_item(financials, ["Pretax Income", "Income Before Tax"])

        tax_rate = cls._safe_div(
            (pretax_income - net_income) if pretax_income is not None and net_income is not None else None,
            pretax_income,
        )
        if tax_rate is None or operating_income is None:
            return None

        nopat = operating_income * (1 - tax_rate)

        equity = cls._get_item(
            balance_sheet,
            ["Stockholders Equity", "Total Stockholder Equity", "Total Equity Gross Minority Interest"],
        )
        total_debt = cls._get_item(balance_sheet, ["Total Debt", "Long Term Debt"])
        cash = cls._get_item(
            balance_sheet,
            ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"],
        )

        if equity is None:
            return None
        invested_capital = equity + (total_debt or 0) - (cash or 0)
        return cls._safe_div(nopat, invested_capital)

    @classmethod
    def _quality_composite(
        cls,
        piotroski: Optional[int],
        roic: Optional[float],
        info: dict,
    ) -> Optional[int]:
        """Average of Piotroski-derived %, ROIC percentile, margin stability.

        Returns None when Piotroski is unavailable.
        """

        if piotroski is None:
            return None

        piotroski_pct = piotroski / 9.0 * 100.0

        # ROIC score: > 20% = 100, < 0% = 0
        roic_score = cls._linear_score(roic, 0.0, 0.20) if roic is not None else None

        # Margin stability proxy: average of gross margin and operating margin scores
        gm = info.get("grossMargins")
        om = info.get("operatingMargins")
        gm_score = cls._linear_score(float(gm) if gm is not None else None, 0.0, 0.40)
        om_score = cls._linear_score(float(om) if om is not None else None, 0.0, 0.30)
        margin_scores = [s for s in [gm_score, om_score] if s is not None]
        margin_stability = sum(margin_scores) / len(margin_scores) if margin_scores else None

        parts = [s for s in [piotroski_pct, roic_score, margin_stability] if s is not None]
        if not parts:
            return None
        return int(round(sum(parts) / len(parts)))

    # ==================================================================
    # Institutional: Economic Moat
    # ==================================================================

    @classmethod
    def _economic_moat(
        cls,
        quality_composite: Optional[int],
        info: dict,
        roic: Optional[float],
    ) -> Optional[str]:
        """Classify economic moat as Wide / Narrow / None."""

        if quality_composite is None:
            return None

        roe_raw = info.get("returnOnEquity")
        roe = float(roe_raw) if roe_raw is not None else None

        # Wide: quality_composite > 80, ROE > 15%, ROIC > 12%
        if (
            quality_composite > 80
            and roe is not None
            and roe > 0.15
            and roic is not None
            and roic > 0.12
        ):
            return "Wide"

        if quality_composite > 60:
            return "Narrow"

        return "None"

    # ==================================================================
    # Institutional: Earnings Quality
    # ==================================================================

    @classmethod
    def _earnings_quality(
        cls,
        financials: pd.DataFrame,
        cashflow: pd.DataFrame,
        balance_sheet: pd.DataFrame,
    ) -> Optional[int]:
        """Score earnings quality from the accruals ratio.

        accruals_ratio = (Net Income − Operating CF) / Total Assets
        Lower accruals → higher quality.
        Score: < −0.10 → 100, > 0.10 → 0.
        """

        ni = cls._get_item(financials, ["Net Income", "Net Income Common Stockholders"])
        ocf = cls._get_item(cashflow, ["Operating Cash Flow", "Total Cash From Operating Activities"])
        ta = cls._get_item(balance_sheet, ["Total Assets"])

        if ni is None or ocf is None or ta is None or ta == 0:
            return None

        accruals = (ni - ocf) / ta
        score = cls._linear_score(accruals, -0.10, 0.10, lower_is_better=True)
        return int(round(score)) if score is not None else None

    # ==================================================================
    # Institutional: Interpretations
    # ==================================================================

    @classmethod
    def _build_interpretations(cls, scores: InstitutionalScores) -> dict[str, str]:
        """Generate human-readable interpretations for each institutional score."""

        interp: dict[str, str] = {}

        # Piotroski F-Score
        if scores.piotroski_f_score is not None:
            f = scores.piotroski_f_score
            if f >= 7:
                label = "Strong"
            elif f >= 4:
                label = "Moderate"
            else:
                label = "Weak"
            interp["piotroski_f_score"] = (
                f"{label} ({f}/9) - "
                f"{'Company shows good financial health' if f >= 7 else 'Company shows mixed financial signals' if f >= 4 else 'Company shows signs of financial weakness'}"
            )

        # Altman Z-Score
        if scores.altman_z_score is not None:
            z = scores.altman_z_score
            if z > 3.0:
                zone = "Safe Zone"
                desc = "Low probability of bankruptcy"
            elif z >= 1.8:
                zone = "Grey Zone"
                desc = "Moderate risk, further analysis recommended"
            else:
                zone = "Distress Zone"
                desc = "Elevated bankruptcy risk"
            interp["altman_z_score"] = f"{zone} ({z:.2f}) - {desc}"

        # Beneish M-Score
        if scores.beneish_m_score is not None:
            m = scores.beneish_m_score
            if m > -1.78:
                interp["beneish_m_score"] = (
                    f"Likely Manipulator ({m:.2f}) - "
                    f"Earnings may be subject to manipulation"
                )
            else:
                interp["beneish_m_score"] = (
                    f"Unlikely Manipulator ({m:.2f}) - "
                    f"Earnings appear reliable"
                )

        # Quality Composite
        if scores.quality_composite is not None:
            q = scores.quality_composite
            if q >= 80:
                label = "Excellent"
            elif q >= 60:
                label = "Good"
            elif q >= 40:
                label = "Fair"
            else:
                label = "Poor"
            interp["quality_composite"] = f"{label} ({q}/100) - Overall financial quality assessment"

        # Economic Moat
        if scores.economic_moat is not None:
            moat = scores.economic_moat
            descriptions = {
                "Wide": "Durable competitive advantages protect long-term profitability",
                "Narrow": "Some competitive advantages but may erode over time",
                "None": "No significant competitive advantages identified",
            }
            interp["economic_moat"] = f"{moat} Moat - {descriptions.get(moat, '')}"

        # Earnings Quality
        if scores.earnings_quality is not None:
            eq = scores.earnings_quality
            if eq >= 80:
                label = "High"
            elif eq >= 50:
                label = "Moderate"
            else:
                label = "Low"
            interp["earnings_quality"] = (
                f"{label} ({eq}/100) - "
                f"{'Cash flows strongly support reported earnings' if eq >= 80 else 'Cash flows partially support reported earnings' if eq >= 50 else 'Reported earnings may not be well-supported by cash flows'}"
            )

        return interp
