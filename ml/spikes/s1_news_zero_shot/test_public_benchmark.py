"""S1 Amendment 1: public-set mapping, decision rule, and report assembly (no model, no network)."""

from __future__ import annotations

import pandas as pd
import pytest

from spikes.s1_news_zero_shot.public_benchmark import (
    SENTIMENT_TO_TONE,
    TOPIC_TO_EVENT,
    build_report,
    build_set,
    clean_text,
    recommend,
    report_markdown,
)
from spikes.s1_news_zero_shot.schema import EVENT_TYPES, TONES


def test_mappings_cover_every_source_label_and_stay_inside_the_schema():
    assert sorted(TOPIC_TO_EVENT) == list(range(20))
    assert {value for value in TOPIC_TO_EVENT.values() if value} <= set(EVENT_TYPES)
    assert sorted(SENTIMENT_TO_TONE) == [0, 1, 2]
    assert set(SENTIMENT_TO_TONE.values()) == set(TONES)


def test_clean_text_removes_urls_and_collapses_whitespace():
    assert clean_text("$ABC  beats   estimates https://t.co/xyz123 ") == "$ABC beats estimates"


def test_build_set_drops_excluded_classes_empty_texts_and_duplicates():
    raw = pd.DataFrame({
        "text": ["Results beat https://t.co/a", "Results  beat", "Bond yields rise", "https://t.co/only", "Deal agreed"],
        "label": [5, 5, 3, 13, 13],
    })
    frame = build_set(raw, "event_type")
    assert frame["text"].tolist() == ["Results beat", "Deal agreed"]
    assert frame["event_type"].tolist() == ["earnings", "m_and_a"]
    assert list(frame.columns) == ["id", "text", "event_type"]


def test_build_set_rejects_unmapped_source_labels():
    with pytest.raises(ValueError, match="unmapped"):
        build_set(pd.DataFrame({"text": ["x"], "label": [7]}), "tone")


@pytest.mark.parametrize(
    ("event", "tone", "classes", "expected"),
    [
        (0.70, 0.70, 5, "zero_shot_adequate"),
        (0.69, 0.90, 8, "fine_tune_needed"),
        (0.90, 0.69, 8, "fine_tune_needed"),
        (0.90, 0.90, 4, "approach_not_viable"),
    ],
)
def test_recommendation_rule(event, tone, classes, expected):
    assert recommend(event_f1=event, tone_f1=tone, scored_event_classes=classes) == expected


def _sets(n_per_class: int = 10) -> dict[str, pd.DataFrame]:
    events = [label for label in EVENT_TYPES for _ in range(n_per_class)]
    tones = [label for label in TONES for _ in range(n_per_class)]
    return {
        "event_type": pd.DataFrame({"id": [f"e{i}" for i in range(len(events))], "text": "t", "event_type": events}),
        "tone": pd.DataFrame({"id": [f"t{i}" for i in range(len(tones))], "text": "t", "tone": tones}),
    }


def _perfect(sets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = []
    for head, frame in sets.items():
        for item_id, label in zip(frame["id"], frame[head]):
            rows.append({"id": item_id, "model_key": "nli", "head": head, "prediction": label, "score": 0.9})
    return pd.DataFrame(rows)


def test_perfect_predictions_are_adequate_and_material_is_reported_unmeasured():
    sets = _sets()
    report = build_report(sets, _perfect(sets))
    assert report["recommendation"] == "zero_shot_adequate"
    assert report["material"] == "not_measured"
    assert report["results"]["nli"]["event_type"]["macro_f1"] == 1.0
    assert "Materiality: not measured" in report_markdown(report)


def test_missing_prediction_fails_loudly():
    sets = _sets()
    with pytest.raises(ValueError, match="lack a prediction"):
        build_report(sets, _perfect(sets).iloc[1:])
