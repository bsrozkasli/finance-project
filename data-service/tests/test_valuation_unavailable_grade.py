"""All-null valuation metrics must grade UNAVAILABLE, never the fabricated FAIR default."""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.availability import SectionAvailability
from app.models.valuation import ValuationGrade, ValuationMetrics
from app.services.composite_score_service import _valuation_score
from app.services.valuation_service import ValuationService


def test_all_null_ratios_grade_unavailable():
    ratios = {name: None for name in ("pe", "forward_pe", "peg", "price_to_book", "ev_ebitda",
                                      "ev_sales", "price_to_sales", "dividend_yield", "fcf_yield")}
    assert ValuationService._compute_grade(ratios) is ValuationGrade.UNAVAILABLE


def test_empty_ratio_map_grades_unavailable():
    assert ValuationService._compute_grade({}) is ValuationGrade.UNAVAILABLE


def test_partial_ratios_still_grade():
    assert ValuationService._compute_grade({"pe": 9.0, "peg": None}) is ValuationGrade.VERY_CHEAP


def test_metrics_default_grade_is_unavailable():
    assert ValuationMetrics().valuation_grade is ValuationGrade.UNAVAILABLE


def test_analyze_with_empty_provider_info_is_unavailable(monkeypatch):
    monkeypatch.setattr(ValuationService, "_fetch_info", classmethod(lambda cls, symbol: {}))
    result = ValuationService.analyze("aapl")
    assert result.metrics.valuation_grade is ValuationGrade.UNAVAILABLE
    assert result.metrics.pe is None


def test_composite_maps_unavailable_grade_to_insufficient_not_score():
    class Res:
        metrics = ValuationMetrics()
    score, availability = _valuation_score(Res())
    assert score is None
    assert availability == SectionAvailability.insufficient("valuation_grade_unavailable")
