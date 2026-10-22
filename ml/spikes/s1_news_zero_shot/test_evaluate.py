"""Pre-registered S1 decision rule and report assembly (no model, no network)."""

from __future__ import annotations

import pandas as pd
import pytest

from spikes.s1_news_zero_shot.evaluate import build_report, recommend, report_markdown
from spikes.s1_news_zero_shot.schema import EVENT_TYPES

VIABLE = {"scored_event_classes": 5, "material_yes_support": 10, "event_kappa": 0.8}


@pytest.mark.parametrize(
    ("scores", "overrides", "expected"),
    [
        ((0.70, 0.70, 0.60), {}, "zero_shot_adequate"),
        ((0.69, 0.90, 0.90), {}, "fine_tune_needed"),
        ((0.90, 0.90, 0.59), {}, "fine_tune_needed"),
        ((0.90, 0.90, 0.90), {"event_kappa": 0.59}, "approach_not_viable"),
        ((0.90, 0.90, 0.90), {"scored_event_classes": 4}, "approach_not_viable"),
        ((0.90, 0.90, 0.90), {"material_yes_support": 9}, "approach_not_viable"),
    ],
)
def test_recommendation_rule(scores, overrides, expected):
    event, tone, material = scores
    assert recommend(event_f1=event, tone_f1=tone, material_f1=material, **{**VIABLE, **overrides}) == expected


def _labels(n_per_class: int = 10) -> pd.DataFrame:
    rows = []
    for index in range(n_per_class * len(EVENT_TYPES)):
        rows.append({
            "id": f"{index:012d}", "symbol": "X", "published_at": "2026-10-15T00:00:00Z", "source": "s",
            "headline": f"h{index}", "event_type": EVENT_TYPES[index % len(EVENT_TYPES)],
            "tone": ("negative", "neutral", "positive")[index % 3], "material": ("no", "yes")[index % 2],
        })
    return pd.DataFrame(rows)


def test_perfect_predictions_give_zero_shot_adequate_and_render():
    labels = _labels()
    predictions = pd.concat([
        labels[["id"]].assign(model_key="nli", head=head, prediction=labels[head], score=0.9)
        for head in ("event_type", "tone", "material")
    ])

    report = build_report(labels, labels.head(30), predictions)

    assert report["recommendation"] == "zero_shot_adequate"
    assert report["event_type_intra_rater_kappa"] == pytest.approx(1.0)
    assert report["results"]["nli"]["event_type"]["macro_f1"] == pytest.approx(1.0)
    assert "| nli | event_type | 1.000 |" in report_markdown(report)


def test_missing_predictions_are_refused():
    labels = _labels()
    predictions = labels[["id"]].iloc[:-1].assign(model_key="nli", head="tone", prediction="neutral", score=0.5)

    with pytest.raises(ValueError, match="lack a prediction"):
        build_report(labels, labels.head(30), predictions)
