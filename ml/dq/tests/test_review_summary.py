"""Owner review sheet aggregation (C1 real-snapshot review)."""

from __future__ import annotations

import pytest

from dq.review_summary import ReviewIncompleteError, summarize

HEADER = "symbol,session_date,fault_class,detail,measured_value,threshold,verdict,note\n"


def test_counts_and_precision_per_class(tmp_path):
    sheet = tmp_path / "review-sheet.csv"
    sheet.write_text(
        HEADER
        + "AAA,2025-01-02,unadjusted_split,factor=2,0.5,0.05,true,\n"
        + "BBB,2025-01-03,unadjusted_split,factor=2,0.5,0.05,TRUE,\n"
        + "CCC,2025-01-06,unadjusted_split,factor=2,0.5,0.05,false,real crash\n"
        + "DDD,2025-01-07,return_outlier,reverting_spike,9.1,8,unsure,\n",
        encoding="utf-8",
    )

    table = summarize(sheet)

    assert "| unadjusted_split | 3 | 2 | 1 | 0 | 0.67 |" in table
    assert "| return_outlier | 1 | 0 | 0 | 1 | n/a |" in table
    assert "| stale_bars | 0 | 0 | 0 | 0 | n/a |" in table


def test_blank_verdict_is_refused(tmp_path):
    sheet = tmp_path / "review-sheet.csv"
    sheet.write_text(HEADER + "AAA,2025-01-02,stale_bars,identical_ohlcv_run,6,5,,\n", encoding="utf-8")

    with pytest.raises(ReviewIncompleteError, match=r"\[2\]"):
        summarize(sheet)
