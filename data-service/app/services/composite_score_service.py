import asyncio
from datetime import datetime, timezone

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

        success_count = sum(1 for r in results if r is not None and not isinstance(r, Exception))
        total_calls = 6
        confidence = success_count / total_calls if total_calls > 0 else 0.0

        # Default neutral scores
        quality_score = 50
        growth_score = 50
        momentum_score = 50
        risk_score = 50

        if factor_res and not isinstance(factor_res, Exception):
            if hasattr(factor_res, "quality_score") and factor_res.quality_score is not None:
                quality_score = int(factor_res.quality_score)
            if hasattr(factor_res, "growth_score") and factor_res.growth_score is not None:
                growth_score = int(factor_res.growth_score)
            if hasattr(factor_res, "momentum_score") and factor_res.momentum_score is not None:
                momentum_score = int(factor_res.momentum_score)
            if hasattr(factor_res, "low_volatility_score") and factor_res.low_volatility_score is not None:
                risk_score = int(factor_res.low_volatility_score)

        fundamental_score = (quality_score + growth_score) // 2

        valuation_score = 50
        if val_res and not isinstance(val_res, Exception):
            if hasattr(val_res, "valuation_grade") and val_res.valuation_grade is not None:
                grade_str = getattr(val_res.valuation_grade, "value", str(val_res.valuation_grade)).upper()
                if "VERY CHEAP" in grade_str:
                    valuation_score = 95
                elif "CHEAP" in grade_str:
                    valuation_score = 75
                elif "FAIR" in grade_str:
                    valuation_score = 50
                elif "VERY EXPENSIVE" in grade_str:
                    valuation_score = 5
                elif "EXPENSIVE" in grade_str:
                    valuation_score = 25

        earnings_score = 50
        if earn_res and not isinstance(earn_res, Exception) and hasattr(earn_res, "earnings_score") and earn_res.earnings_score is not None:
            earnings_score = int(earn_res.earnings_score)

        sentiment_score = 50
        if sent_res and not isinstance(sent_res, Exception) and hasattr(sent_res, "sentiment_score") and sent_res.sentiment_score is not None:
            sentiment_score = int(sent_res.sentiment_score)

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
            calculated_at=datetime.now(timezone.utc)
        )
