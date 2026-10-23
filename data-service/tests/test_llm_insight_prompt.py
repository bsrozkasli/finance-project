"""The LLM context marks unknown composite values instead of printing placeholders."""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.composite import CompositeInvestmentScore, CompositeScoreBreakdown
from app.services.llm_insight_service import LlmInsightService


def _composite(**overrides) -> CompositeInvestmentScore:
    values = dict(
        symbol="AAPL", overall_score=None, grade=None, recommendation=None,
        breakdown=CompositeScoreBreakdown(sentiment_score=70),
        confidence=0.2, calculated_at=datetime(2026, 10, 23, tzinfo=timezone.utc),
        breakdown_availability={}, unavailable_components=["factor"],
    )
    values.update(overrides)
    return CompositeInvestmentScore(**values)


def test_prompt_marks_unknown_composite_values_as_unavailable():
    prompt = LlmInsightService._build_context_prompt({"composite": _composite()})

    assert "COMPOSITE SCORE: unavailable" in prompt
    assert "Valuation unavailable" in prompt
    assert "Sentiment 70" in prompt
    assert "None" not in prompt
    assert "50" not in prompt
