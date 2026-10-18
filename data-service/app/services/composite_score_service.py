import asyncio
from datetime import datetime, timezone

from app.models.availability import SectionAvailability
from app.models.composite import (
    CompositeInvestmentScore,
    CompositeScoreBreakdown,
    InvestmentGrade,
)
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from app.services.valuation_service import ValuationService
from app.services.factor_analysis_service import FactorAnalysisService
from app.services.risk_analytics_service import RiskAnalyticsService
from app.services.earnings_analysis_service import EarningsAnalysisService
from app.services.enhanced_sentiment_service import EnhancedSentimentService

_LEGACY_NEUTRAL = 50  # legacy default kept by C0a; availability says it is not evidence
_VALUATION_GRADE_SCORES = (("VERY CHEAP", 95), ("CHEAP", 75), ("FAIR", 50), ("VERY EXPENSIVE", 5), ("EXPENSIVE", 25))


def _missing(result) -> bool:
    return result is None or isinstance(result, Exception)


def _factor_score(factor_res, attribute: str) -> tuple[int, SectionAvailability]:
    if _missing(factor_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("factor_component_unavailable")
    if not hasattr(factor_res, attribute):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("factor_score_not_mapped")
    value = getattr(factor_res, attribute)
    if value is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("factor_score_missing")
    return int(value), SectionAvailability.available()


def _valuation_score(val_res) -> tuple[int, SectionAvailability]:
    if _missing(val_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("valuation_component_unavailable")
    if not hasattr(val_res, "valuation_grade"):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("valuation_grade_not_mapped")
    if val_res.valuation_grade is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("valuation_grade_missing")
    grade_str = getattr(val_res.valuation_grade, "value", str(val_res.valuation_grade)).upper()
    for keyword, score in _VALUATION_GRADE_SCORES:
        if keyword in grade_str:
            return score, SectionAvailability.available()
    return _LEGACY_NEUTRAL, SectionAvailability.insufficient("valuation_grade_unrecognized")


def _earnings_score(earn_res) -> tuple[int, SectionAvailability]:
    if _missing(earn_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("earnings_component_unavailable")
    if not hasattr(earn_res, "earnings_score"):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("earnings_score_not_mapped")
    if earn_res.earnings_score is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("earnings_score_missing")
    return int(earn_res.earnings_score), SectionAvailability.available()


def _sentiment_score(sent_res) -> tuple[int, SectionAvailability]:
    if _missing(sent_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("sentiment_component_unavailable")
    if not hasattr(sent_res, "sentiment_score"):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("sentiment_score_not_mapped")
    if sent_res.sentiment_score is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("sentiment_score_missing")
    score = int(sent_res.sentiment_score)
    if getattr(sent_res, "unavailable_components", []):
        return score, SectionAvailability.insufficient("sentiment_sections_unavailable")
    return score, SectionAvailability.available()


class CompositeScoreService:

    @classmethod
    async def analyze(cls, symbol: str) -> CompositeInvestmentScore:
        async def fetch_fundamental():
            try:
                return await asyncio.to_thread(FundamentalAnalysisService.analyze, symbol)
            except Exception:
                return None

        async def fetch_valuation():
            try:
                return await asyncio.to_thread(ValuationService.analyze, symbol)
            except Exception:
                return None

        async def fetch_factor():
            try:
                return await asyncio.to_thread(FactorAnalysisService.analyze_factors, symbol)
            except Exception:
                return None

        async def fetch_risk():
            try:
                return await asyncio.to_thread(RiskAnalyticsService.analyze, symbol)
            except Exception:
                return None

        async def fetch_earnings():
            try:
                return await EarningsAnalysisService.analyze(symbol)
            except Exception:
                return None

        async def fetch_sentiment():
            try:
                return await EnhancedSentimentService.analyze(symbol)
            except Exception:
                return None

        results = await asyncio.gather(
            fetch_fundamental(),
            fetch_valuation(),
            fetch_factor(),
            fetch_risk(),
            fetch_earnings(),
            fetch_sentiment(),
            return_exceptions=True
        )

        fund_res, val_res, factor_res, risk_res, earn_res, sent_res = results
        fetched = {
            "fundamental": fund_res, "valuation": val_res, "factor": factor_res,
            "risk": risk_res, "earnings": earn_res, "sentiment": sent_res,
        }
        unavailable_components = [name for name, result in fetched.items() if _missing(result)]

        success_count = sum(1 for r in results if r is not None and not isinstance(r, Exception))
        total_calls = 6
        confidence = success_count / total_calls if total_calls > 0 else 0.0

        quality_score, quality_availability = _factor_score(factor_res, "quality_score")
        growth_score, growth_availability = _factor_score(factor_res, "growth_score")
        momentum_score, momentum_availability = _factor_score(factor_res, "momentum_score")
        risk_score, risk_availability = _factor_score(factor_res, "low_volatility_score")

        fundamental_score = (quality_score + growth_score) // 2
        if quality_availability.status == "available" and growth_availability.status == "available":
            fundamental_availability = SectionAvailability.available()
        else:
            fundamental_availability = SectionAvailability.unavailable("derived_from_defaulted_fields")

        valuation_score, valuation_availability = _valuation_score(val_res)
        earnings_score, earnings_availability = _earnings_score(earn_res)
        sentiment_score, sentiment_availability = _sentiment_score(sent_res)

        overall_float = (
            fundamental_score * 0.25 +
            valuation_score * 0.20 +
            quality_score * 0.15 +
            growth_score * 0.10 +
            momentum_score * 0.10 +
            risk_score * 0.10 +
            earnings_score * 0.05 +
            sentiment_score * 0.05
        )
        overall_score = min(max(int(round(overall_float)), 0), 100)

        # Cap the score if confidence is low
        if confidence < 0.5:
            overall_score = min(overall_score, 69)

        if overall_score >= 90:
            grade = InvestmentGrade.A_PLUS
            recommendation = "Strong Buy"
        elif overall_score >= 80:
            grade = InvestmentGrade.A
            recommendation = "Buy"
        elif overall_score >= 70:
            grade = InvestmentGrade.B_PLUS
            recommendation = "Accumulate"
        elif overall_score >= 60:
            grade = InvestmentGrade.B
            recommendation = "Hold"
        elif overall_score >= 45:
            grade = InvestmentGrade.C
            recommendation = "Reduce"
        elif overall_score >= 30:
            grade = InvestmentGrade.D
            recommendation = "Sell"
        else:
            grade = InvestmentGrade.F
            recommendation = "Strong Sell"

        breakdown = CompositeScoreBreakdown(
            fundamental_score=fundamental_score,
            valuation_score=valuation_score,
            quality_score=quality_score,
            growth_score=growth_score,
            momentum_score=momentum_score,
            risk_score=risk_score,
            earnings_score=earnings_score,
            sentiment_score=sentiment_score,
        )

        return CompositeInvestmentScore(
            symbol=symbol,
            overall_score=overall_score,
            grade=grade,
            recommendation=recommendation,
            breakdown=breakdown,
            confidence=confidence,
            calculated_at=datetime.now(timezone.utc),
            breakdown_availability={
                "fundamental_score": fundamental_availability,
                "valuation_score": valuation_availability,
                "quality_score": quality_availability,
                "growth_score": growth_availability,
                "momentum_score": momentum_availability,
                "risk_score": risk_availability,
                "earnings_score": earnings_availability,
                "sentiment_score": sentiment_availability,
            },
            unavailable_components=unavailable_components,
        )
