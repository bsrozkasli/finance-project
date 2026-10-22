"""Checks for the S1 helpers that touch no network and no model."""

from __future__ import annotations

import pytest

from spikes.s1_news_zero_shot.collect_headlines import deduplicate_and_sample, headline_id, normalize_articles
from spikes.s1_news_zero_shot.metrics import head_result
from spikes.s1_news_zero_shot.schema import LABEL_COLUMNS, LabelFileError, load_labels, relabel_template


def test_normalize_skips_empty_and_dedupe_ignores_case_and_spacing():
    rows = normalize_articles("aapl", [
        {"datetime": 1760500000, "headline": "Apple  beats estimates", "source": "wire"},
        {"datetime": 1760500100, "headline": "apple beats estimates", "source": "other"},
        {"datetime": 1760500200, "headline": "", "source": "wire"},
        {"headline": "No timestamp"},
    ])

    frame = deduplicate_and_sample(rows)

    assert len(rows) == 2 and len(frame) == 1
    assert frame.loc[0, "id"] == headline_id("APPLE BEATS ESTIMATES")
    assert frame.loc[0, "symbol"] == "AAPL"


def test_sampling_is_deterministic_and_capped():
    rows = [{"id": f"{i:012d}", "symbol": "X", "published_at": "2026-10-15T00:00:00Z", "source": "s", "headline": f"h{i}"} for i in range(20)]

    first, second = deduplicate_and_sample(rows, limit=5), deduplicate_and_sample(rows, limit=5)

    assert len(first) == 5 and first.equals(second)


def test_label_file_rejects_values_outside_the_schema(tmp_path):
    path = tmp_path / "labels.csv"
    path.write_text(",".join(LABEL_COLUMNS) + "\n" + "a1,AAPL,2026-10-15T00:00:00Z,wire,Apple beats,Earnings,POSITIVE,maybe\n", encoding="utf-8")

    with pytest.raises(LabelFileError, match=r"material: rows \[2\]"):
        load_labels(path)


def test_label_file_normalizes_case(tmp_path):
    path = tmp_path / "labels.csv"
    path.write_text(",".join(LABEL_COLUMNS) + "\n" + "a1,AAPL,2026-10-15T00:00:00Z,wire,Apple beats,Earnings,POSITIVE,Yes\n", encoding="utf-8")

    frame = load_labels(path)

    assert frame.loc[0, ["event_type", "tone", "material"]].tolist() == ["earnings", "positive", "yes"]


def test_macro_f1_and_confusion_match_hand_calculation():
    # class a: P=1, R=1/2, F1=2/3 ; class b: P=2/3, R=1, F1=4/5 ; macro = (2/3 + 4/5) / 2 = 11/15
    result = head_result(["a", "a", "b", "b"], ["a", "b", "b", "b"], labels=("a", "b", "c"), support_floor=2)

    assert result.scored_labels == ("a", "b")
    assert result.support == {"a": 2, "b": 2, "c": 0}
    assert result.macro_f1 == pytest.approx(11 / 15)
    assert result.confusion == [[1, 1, 0], [0, 2, 0], [0, 0, 0]]
    assert 0.0 <= result.ci_low <= result.macro_f1 <= result.ci_high <= 1.0


def test_relabel_template_is_blank_deterministic_subset():
    rows = [{"id": f"{i:012d}", "symbol": "X", "published_at": "2026-10-15T00:00:00Z", "source": "s", "headline": f"h{i}"} for i in range(80)]
    labels = deduplicate_and_sample(rows).assign(event_type="other", tone="neutral", material="no")

    first, second = relabel_template(labels), relabel_template(labels)

    assert len(first) == 50 and first.equals(second)
    assert set(first["id"]) <= set(labels["id"])
    assert (first[["event_type", "tone", "material"]] == "").all().all()
