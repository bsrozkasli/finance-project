"""S1 label schema and label-file validation (spec §5 P1.4). Throwaway spike code."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

EVENT_TYPES: tuple[str, ...] = (
    "earnings",
    "guidance",
    "m_and_a",
    "litigation_regulatory",
    "analyst_action",
    "product_operations",
    "capital_return_financing",
    "macro_sector",
    "other",
)
TONES: tuple[str, ...] = ("negative", "neutral", "positive")
MATERIAL: tuple[str, ...] = ("no", "yes")
HEADS: dict[str, tuple[str, ...]] = {"event_type": EVENT_TYPES, "tone": TONES, "material": MATERIAL}
HEADLINE_COLUMNS: tuple[str, ...] = ("id", "symbol", "published_at", "source", "headline")
LABEL_COLUMNS: tuple[str, ...] = HEADLINE_COLUMNS + tuple(HEADS)


class LabelFileError(ValueError):
    """The owner-labelled file is incomplete or uses values outside the schema."""


def label_template(headlines: pd.DataFrame) -> pd.DataFrame:
    template = headlines.loc[:, list(HEADLINE_COLUMNS)].copy()
    for head in HEADS:
        template[head] = ""
    return template


RELABEL_COUNT = 50
RELABEL_SEED = 20261016


def relabel_template(labels: pd.DataFrame, count: int = RELABEL_COUNT, seed: int = RELABEL_SEED) -> pd.DataFrame:
    """A blank copy of ``count`` randomly chosen labelled rows for the intra-rater check."""
    chosen = labels.sample(n=min(count, len(labels)), random_state=seed).sort_values("id", kind="mergesort")
    return label_template(chosen.reset_index(drop=True))


def load_labels(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path, encoding="utf-8-sig", dtype=str, keep_default_na=False)
    if tuple(frame.columns) != LABEL_COLUMNS:
        raise LabelFileError(f"columns {tuple(frame.columns)} != {LABEL_COLUMNS}")
    if frame["id"].duplicated().any():
        raise LabelFileError("duplicate ids")
    problems: list[str] = []
    for head, allowed in HEADS.items():
        frame[head] = frame[head].str.strip().str.lower()
        bad = frame.index[~frame[head].isin(allowed)].tolist()
        if bad:
            problems.append(f"{head}: rows {[index + 2 for index in bad]} not in {allowed}")
    if problems:
        raise LabelFileError("; ".join(problems))
    return frame
