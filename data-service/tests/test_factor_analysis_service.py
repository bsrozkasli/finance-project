from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from app.services.factor_analysis_service import FactorAnalysisService


class _TickerWithInfo:
    ticker = "AAPL"

    def __init__(self, info: dict[str, object]) -> None:
        self.info = info


@pytest.mark.parametrize(
    ("scores", "weights", "expected"),
    [
        ([None, None], [0.25, 0.75], None),
        ([0.0, None], [0.25, 0.75], 0),
        ([100.0, None], [0.25, 0.75], 100),
        ([20.0, 80.0], [0.25, 0.75], 65),
    ],
)
def test_weighted_average_renormalizes_available_scores(
    scores: list[float | None],
    weights: list[float],
    expected: int | None,
) -> None:
    assert FactorAnalysisService._weighted_avg(scores, weights) == expected


def test_weighted_average_rejects_mismatched_inputs() -> None:
    with pytest.raises(ValueError, match="same length"):
        FactorAnalysisService._weighted_avg([50.0], [0.5, 0.5])


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, None),
        (float("nan"), None),
        (float("inf"), None),
        ("not-a-number", None),
        (0, 0.0),
        ("12.5", 12.5),
    ],
)
def test_finite_float_conversion_distinguishes_zero_from_missing(
    value: object,
    expected: float | None,
) -> None:
    assert FactorAnalysisService._as_finite_float(value) == expected


def test_value_score_is_missing_when_all_components_are_missing() -> None:
    score, components = FactorAnalysisService._compute_value({})

    assert score is None
    assert set(components.values()) == {None}


def test_growth_score_preserves_a_measured_zero_growth_rate() -> None:
    score, components = FactorAnalysisService._compute_growth({"revenueGrowth": 0.0})

    # Linear interpolation from -10% (0 points) to 30% (100 points) gives 25.
    assert score == 25
    assert components["revenue_growth"] == 0.0
    assert components["earnings_growth"] is None


def test_price_factors_are_missing_without_enough_history() -> None:
    momentum_score, momentum_components = FactorAnalysisService._compute_momentum(pd.DataFrame())
    volatility_score, volatility_components = FactorAnalysisService._compute_low_volatility(
        pd.DataFrame(),
        pd.DataFrame(),
    )

    assert momentum_score is None
    assert set(momentum_components.values()) == {None}
    assert volatility_score is None
    assert set(volatility_components.values()) == {None}


def test_download_failure_degrades_to_empty_history(monkeypatch: pytest.MonkeyPatch) -> None:
    def raise_provider_error(*args: object, **kwargs: object) -> pd.DataFrame:
        raise RuntimeError("provider timeout")

    # Mock external market-data I/O; tests must never call Yahoo live.
    monkeypatch.setattr("app.services.factor_analysis_service.yf.download", raise_provider_error)

    result = FactorAnalysisService._safe_download("AAPL", datetime(2026, 1, 1), datetime(2026, 2, 1))

    assert result.empty


@pytest.mark.parametrize(
    ("info", "expected_growth", "expected_dominant"),
    [
        ({}, None, None),
        ({"revenueGrowth": 0.0}, 25, "growth"),
        ({"revenueGrowth": np.nan}, None, None),
    ],
)
def test_factor_analysis_exposes_missing_scores_without_fabricating_zeroes(
    monkeypatch: pytest.MonkeyPatch,
    info: dict[str, object],
    expected_growth: int | None,
    expected_dominant: str | None,
) -> None:
    # Mock external ticker and price-history I/O; tests must never call Yahoo live.
    monkeypatch.setattr("app.services.factor_analysis_service.yf.Ticker", lambda symbol: _TickerWithInfo(info))
    monkeypatch.setattr(
        "app.services.factor_analysis_service.yf.download",
        lambda *args, **kwargs: pd.DataFrame(),
    )

    response = FactorAnalysisService.analyze_factors("aapl")

    assert response.symbol == "AAPL"
    assert response.scores.value_score is None
    assert response.scores.growth_score == expected_growth
    assert response.scores.quality_score is None
    assert response.scores.momentum_score is None
    assert response.scores.low_volatility_score is None
    assert response.dominant_factor == expected_dominant
