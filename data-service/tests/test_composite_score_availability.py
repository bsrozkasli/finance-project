"""CompositeScoreService exposes which breakdown values are real evidence (C0a, PF-1)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.models.availability import SectionAvailability
from app.models.composite import CompositeScoreBreakdown
from app.models.earnings import EarningsAnalysisResponse, EarningsMetrics
from app.models.factors import FactorAnalysisResponse, FactorScores
from app.models.sentiment import EnhancedSentimentResponse
from app.models.valuation import ValuationGrade, ValuationMetrics, ValuationResponse
from app.services.composite_score_service import CompositeScoreService
from app.services.earnings_analysis_service import EarningsAnalysisService
from app.services.enhanced_sentiment_service import EnhancedSentimentService
from app.services.factor_analysis_service import FactorAnalysisService
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from app.services.risk_analytics_service import RiskAnalyticsService
from app.services.valuation_service import ValuationService

NOW = datetime(2026, 10, 15, tzinfo=timezone.utc)
FIELDS = set(CompositeScoreBreakdown.model_fields)


@pytest.fixture
def components(monkeypatch):
    """Replaces the six analytics services; each wraps provider I/O covered elsewhere."""

    def _install(*, fundamental, valuation, factor, risk, earnings, sentiment):
        def sync(value):
            def method(cls, symbol):
                if isinstance(value, Exception):
                    raise value
                return value
            return classmethod(method)

        def async_(value):
            async def method(cls, symbol):
                if isinstance(value, Exception):
                    raise value
                return value
            return classmethod(method)

        monkeypatch.setattr(FundamentalAnalysisService, "analyze", sync(fundamental))
        monkeypatch.setattr(ValuationService, "analyze", sync(valuation))
        monkeypatch.setattr(FactorAnalysisService, "analyze_factors", sync(factor))
        monkeypatch.setattr(RiskAnalyticsService, "analyze", sync(risk))
        monkeypatch.setattr(EarningsAnalysisService, "analyze", async_(earnings))
        monkeypatch.setattr(EnhancedSentimentService, "analyze", async_(sentiment))

    return _install


def _enhanced(score: int, unavailable: list[str]) -> EnhancedSentimentResponse:
    ok = SectionAvailability.available()
    gap = SectionAvailability.insufficient("no_insider_transactions")
    return EnhancedSentimentResponse(
        symbol="AAPL", news_score=0.2, news_label="BULLISH", analyst_score=0.2, analyst_consensus="Buy",
        insider_score=0.0, insider_summary="No recent insider activity", sentiment_score=score, calculated_at=NOW,
        news_availability=ok, analyst_availability=ok,
        insider_availability=gap if "insider" in unavailable else ok, unavailable_components=unavailable,
    )


def _reasons(result) -> dict[str, str | None]:
    return {field: availability.unavailable_reason for field, availability in result.breakdown_availability.items()}


async def test_all_components_failing_are_unavailable_and_values_unknown(components):
    boom = RuntimeError("provider down")
    components(fundamental=boom, valuation=boom, factor=boom, risk=boom, earnings=boom, sentiment=boom)

    result = await CompositeScoreService.analyze("AAPL")

    assert result.unavailable_components == ["fundamental", "valuation", "factor", "risk", "earnings", "sentiment"]
    assert set(result.breakdown_availability) == FIELDS
    assert {a.status for a in result.breakdown_availability.values()} == {"unavailable"}
    assert _reasons(result) == {
        "fundamental_score": "derived_from_defaulted_fields",
        "valuation_score": "valuation_component_unavailable",
        "quality_score": "factor_component_unavailable",
        "growth_score": "factor_component_unavailable",
        "momentum_score": "factor_component_unavailable",
        "risk_score": "factor_component_unavailable",
        "earnings_score": "earnings_component_unavailable",
        "sentiment_score": "sentiment_component_unavailable",
    }
    assert set(result.breakdown.model_dump().values()) == {None}
    assert (result.overall_score, result.grade, result.recommendation, result.confidence) == (None, None, None, 0.0)


async def test_production_shaped_inputs_map_nested_scores(components):
    components(
        fundamental=SimpleNamespace(),
        valuation=ValuationResponse(symbol="AAPL", metrics=ValuationMetrics(valuation_grade=ValuationGrade.CHEAP), calculated_at=NOW),
        factor=FactorAnalysisResponse(
            symbol="AAPL", scores=FactorScores(quality_score=90, growth_score=80, momentum_score=70, low_volatility_score=60),
            dominant_factor="quality", calculated_at=NOW,
        ),
        risk=SimpleNamespace(),
        earnings=EarningsAnalysisResponse(
            symbol="AAPL",
            metrics=EarningsMetrics(earnings_score=85, beat_ratio=0.75, miss_ratio=0.25, average_surprise_pct=3.0,
                                    consecutive_beats=2, consecutive_misses=0, quarters_analyzed=4),
            history=[], calculated_at=NOW,
        ),
        sentiment=_enhanced(70, []),
    )

    result = await CompositeScoreService.analyze("AAPL")

    assert result.unavailable_components == []
    assert {field: a.status for field, a in result.breakdown_availability.items()} == dict.fromkeys(FIELDS, "available")
    assert result.breakdown.model_dump() == {
        "fundamental_score": 85, "valuation_score": 75, "quality_score": 90, "growth_score": 80,
        "momentum_score": 70, "risk_score": 60, "earnings_score": 85, "sentiment_score": 70,
    }
    assert (result.overall_score, result.grade.value, result.recommendation) == (78, "B+", "Accumulate")


async def test_unexpected_shapes_still_report_not_mapped(components):
    # Guards against a future schema change silently becoming a neutral 50 "available" value.
    components(fundamental=SimpleNamespace(), risk=SimpleNamespace(), valuation=SimpleNamespace(valuation_grade="Cheap"),
               factor=SimpleNamespace(quality_score=80), earnings=SimpleNamespace(earnings_score=90),
               sentiment=_enhanced(70, []))

    result = await CompositeScoreService.analyze("AAPL")

    assert _reasons(result) == {
        "fundamental_score": "derived_from_defaulted_fields",
        "valuation_score": "valuation_grade_not_mapped",
        "quality_score": "factor_score_not_mapped",
        "growth_score": "factor_score_not_mapped",
        "momentum_score": "factor_score_not_mapped",
        "risk_score": "factor_score_not_mapped",
        "earnings_score": "earnings_score_not_mapped",
        "sentiment_score": None,
    }
    assert result.breakdown.model_dump() == dict.fromkeys(FIELDS - {"sentiment_score"}) | {"sentiment_score": 70}
    # Sentiment alone carries 5% of the weight: too little evidence for an overall verdict.
    assert (result.overall_score, result.grade, result.recommendation) == (None, None, None)


def _nested(*, valuation_grade="Cheap", earnings_score=90, **factor_scores):
    # Production nesting: factor scores under .scores, valuation and earnings under .metrics (PF-1).
    return {
        "valuation": SimpleNamespace(metrics=SimpleNamespace(valuation_grade=valuation_grade)),
        "factor": SimpleNamespace(scores=SimpleNamespace(**factor_scores)),
        "earnings": SimpleNamespace(metrics=SimpleNamespace(earnings_score=earnings_score)),
    }


async def test_mapped_shape_reports_available_and_partial_sentiment(components):
    components(
        fundamental=SimpleNamespace(), risk=SimpleNamespace(), sentiment=_enhanced(70, ["insider"]),
        **_nested(quality_score=80, growth_score=60, momentum_score=40, low_volatility_score=70),
    )

    result = await CompositeScoreService.analyze("AAPL")

    statuses = {field: availability.status for field, availability in result.breakdown_availability.items()}
    assert statuses.pop("sentiment_score") == "insufficient"
    assert set(statuses.values()) == {"available"}
    assert result.breakdown_availability["sentiment_score"].unavailable_reason == "sentiment_sections_unavailable"
    assert result.breakdown.model_dump() == {
        "fundamental_score": 70, "valuation_score": 75, "quality_score": 80, "growth_score": 60,
        "momentum_score": 40, "risk_score": 70, "earnings_score": 90, "sentiment_score": 70,
    }


@pytest.mark.parametrize(
    ("shape", "field", "reason"),
    [
        (_nested(valuation_grade="Unknown", earnings_score=None), "valuation_score", "valuation_grade_unrecognized"),
        (_nested(valuation_grade=None, earnings_score=None), "valuation_score", "valuation_grade_missing"),
        (
            _nested(valuation_grade="Fair", earnings_score=None,
                    quality_score=None, growth_score=60, momentum_score=40, low_volatility_score=70),
            "quality_score",
            "factor_score_missing",
        ),
    ],
)
async def test_present_but_empty_values_are_insufficient(components, shape, field, reason):
    components(fundamental=SimpleNamespace(), risk=SimpleNamespace(), sentiment=_enhanced(50, []), **shape)

    result = await CompositeScoreService.analyze("AAPL")

    assert result.breakdown_availability[field].model_dump() == {"status": "insufficient", "unavailable_reason": reason}
    assert result.breakdown_availability["earnings_score"].unavailable_reason == "earnings_score_missing"
    assert getattr(result.breakdown, field) is None


async def test_overall_score_uses_only_evidence_with_renormalised_weights(components):
    components(
        fundamental=SimpleNamespace(), risk=SimpleNamespace(), sentiment=RuntimeError("provider down"),
        **_nested(earnings_score=None, quality_score=80, growth_score=60, momentum_score=40, low_volatility_score=70),
    )

    result = await CompositeScoreService.analyze("AAPL")

    assert (result.breakdown.earnings_score, result.breakdown.sentiment_score) == (None, None)
    # (70*.25 + 75*.20 + 80*.15 + 60*.10 + 40*.10 + 70*.10) / 0.90 = 68.3: no neutral 50 enters the average.
    assert (result.overall_score, result.grade.value, result.recommendation) == (68, "B", "Hold")


async def test_fundamental_score_is_unknown_when_one_factor_input_is_missing(components):
    components(
        fundamental=SimpleNamespace(), risk=SimpleNamespace(), sentiment=_enhanced(70, []),
        **_nested(quality_score=None, growth_score=60, momentum_score=40, low_volatility_score=70),
    )

    result = await CompositeScoreService.analyze("AAPL")

    assert result.breakdown.fundamental_score is None
    assert result.breakdown_availability["fundamental_score"].status == "unavailable"
