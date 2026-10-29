r"""S1 Amendment 1: score the approved models on public labelled finance-news tweets.

The owner declined headline labelling (D-5), so the event-type and tone heads are measured
on two MIT-licensed public validation splits instead. The topic-to-event mapping, text
cleaning, and decision rule are frozen in PREREGISTRATION.md (Amendment 1). Materiality has
no public label and is not measured.

Usage (from ``ml/``)::

    .\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.public_benchmark prepare
    .\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.public_benchmark predict [--limit 5]
    .\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.public_benchmark evaluate
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from spikes.s1_news_zero_shot.collect_headlines import headline_id
from spikes.s1_news_zero_shot.metrics import head_result
from spikes.s1_news_zero_shot.schema import EVENT_TYPES, TONES

DATA_DIR = Path("datasets") / "s1" / "public"
REPORT_DIR = Path("reports") / "s1" / "public"

# Pinned public datasets (validation splits only). Licenses read from each dataset card.
DATASETS: dict[str, dict[str, str]] = {
    "event_type": {
        "repo": "zeroshot/twitter-financial-news-topic",
        "revision": "acbc8af2a35ccf0916124efcbe9e6cf25f191012",
        "file": "topic_valid.csv",
        "license": "mit",
    },
    "tone": {
        "repo": "zeroshot/twitter-financial-news-sentiment",
        "revision": "ccbe24de388e287beb92dd393a335c376b350ac3",
        "file": "sent_valid.csv",
        "license": "mit",
    },
}

# Topic label id -> S1 event type; None excludes the class because it mixes two event types.
TOPIC_TO_EVENT: dict[int, str | None] = {
    0: "analyst_action",            # Analyst Update
    1: "macro_sector",              # Fed | Central Banks
    2: "product_operations",        # Company | Product News
    3: None,                        # Treasuries | Corporate Debt (rates vs. company financing)
    4: "capital_return_financing",  # Dividend
    5: "earnings",                  # Earnings
    6: "macro_sector",              # Energy | Oil
    7: None,                        # Financials (sector news vs. company news)
    8: "macro_sector",              # Currencies
    9: "other",                     # General News | Opinion
    10: "macro_sector",             # Gold | Metals | Materials
    11: "capital_return_financing",  # IPO
    12: "litigation_regulatory",    # Legal | Regulation
    13: "m_and_a",                  # M&A | Investments
    14: "macro_sector",             # Macro
    15: "macro_sector",             # Markets
    16: "macro_sector",             # Politics
    17: "other",                    # Personnel Change
    18: "other",                    # Stock Commentary
    19: "other",                    # Stock Movement
}
SENTIMENT_TO_TONE: dict[int, str] = {0: "negative", 1: "positive", 2: "neutral"}  # Bearish, Bullish, Neutral

# Pre-registered decision thresholds (PREREGISTRATION.md, Amendment 1).
EVENT_ADEQUATE = 0.70
TONE_ADEQUATE = 0.70
MIN_SCORED_EVENT_CLASSES = 5

_URL = re.compile(r"https?://\S+")


def clean_text(text: str) -> str:
    return " ".join(_URL.sub(" ", str(text)).split())


def build_set(raw: pd.DataFrame, head: str) -> pd.DataFrame:
    """Map a public split onto one S1 head: drop excluded classes and empty texts, dedupe by text."""
    mapping = TOPIC_TO_EVENT if head == "event_type" else SENTIMENT_TO_TONE
    unknown = sorted(set(raw["label"]) - set(mapping))
    if unknown:
        raise ValueError(f"{head}: unmapped source labels {unknown}")
    frame = pd.DataFrame({"text": raw["text"].map(clean_text), head: raw["label"].map(mapping)})
    frame = frame[frame[head].notna() & (frame["text"] != "")]
    frame.insert(0, "id", frame["text"].map(headline_id))
    return frame.drop_duplicates("id", keep="first").reset_index(drop=True)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(out: Path = DATA_DIR) -> dict:
    from huggingface_hub import hf_hub_download

    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for head, source in DATASETS.items():
        path = Path(hf_hub_download(source["repo"], source["file"], repo_type="dataset", revision=source["revision"]))
        frame = build_set(pd.read_csv(path), head)
        frame.to_csv(out / f"{head}.csv", index=False, encoding="utf-8")
        manifest[head] = {**source, "source_sha256": sha256_file(path), "rows": len(frame),
                          "support": frame[head].value_counts().sort_index().to_dict()}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def predict(data: Path = DATA_DIR, out: Path = REPORT_DIR, limit: int | None = None) -> int:
    from spikes.s1_news_zero_shot import run_zero_shot

    rows = []
    for entry in run_zero_shot.approved_models():
        for head in entry["heads"]:
            if head not in DATASETS:
                continue  # materiality has no public label
            frame = pd.read_csv(data / f"{head}.csv", dtype=str, keep_default_na=False)
            if limit:
                frame = frame.head(limit)
            predictions = run_zero_shot.predict({**entry, "heads": [head]}, frame["text"].tolist())[head]
            for item_id, (prediction, score) in zip(frame["id"], predictions):
                rows.append({"id": item_id, "model_key": entry["key"], "head": head, "prediction": prediction, "score": score})
    out.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(out / "predictions.csv", index=False, encoding="utf-8")
    return len(rows)


def recommend(*, event_f1: float, tone_f1: float, scored_event_classes: int) -> str:
    if scored_event_classes < MIN_SCORED_EVENT_CLASSES:
        return "approach_not_viable"
    if event_f1 >= EVENT_ADEQUATE and tone_f1 >= TONE_ADEQUATE:
        return "zero_shot_adequate"
    return "fine_tune_needed"


def build_report(sets: dict[str, pd.DataFrame], predictions: pd.DataFrame) -> dict:
    labels_by_head = {"event_type": EVENT_TYPES, "tone": TONES}
    results: dict[str, dict[str, dict]] = {}
    for (model_key, head), group in predictions.groupby(["model_key", "head"], sort=True):
        truth = sets[head]
        joined = truth.merge(group, on="id", how="inner")
        if len(joined) != len(truth):
            raise ValueError(f"{model_key}/{head}: {len(truth) - len(joined)} items lack a prediction")
        results.setdefault(model_key, {})[head] = asdict(
            head_result(joined[head].tolist(), joined["prediction"].tolist(), labels_by_head[head]))

    def best(head: str) -> dict:
        return max((by_head[head] for by_head in results.values() if head in by_head), key=lambda item: item["macro_f1"])

    event, tone = best("event_type"), best("tone")
    return {
        "items": {head: len(frame) for head, frame in sets.items()},
        "results": results,
        "material": "not_measured",
        "recommendation": recommend(event_f1=event["macro_f1"], tone_f1=tone["macro_f1"],
                                    scored_event_classes=len(event["scored_labels"])),
    }


def report_markdown(report: dict) -> str:
    lines = [
        "# S1 Public-Benchmark Report (Amendment 1)",
        "",
        f"- Event-type items: {report['items']['event_type']}; tone items: {report['items']['tone']}",
        "- Materiality: not measured (no public label)",
        f"- Recommendation: **{report['recommendation']}**",
        "",
        "| Model | Head | Macro-F1 | 95% CI | Scored labels |",
        "|---|---|---:|---|---|",
    ]
    for model_key, by_head in report["results"].items():
        for head, result in by_head.items():
            lines.append(f"| {model_key} | {head} | {result['macro_f1']:.3f} | {result['ci_low']:.3f}–{result['ci_high']:.3f} | "
                         f"{', '.join(result['scored_labels'])} |")
    for model_key, by_head in report["results"].items():
        for head, result in by_head.items():
            lines += ["", f"## Confusion matrix — {model_key} / {head} (rows true, columns predicted)", ""]
            lines.append("| true \\ pred | " + " | ".join(result["labels"]) + " |")
            lines.append("|---|" + "---:|" * len(result["labels"]))
            for label, row in zip(result["labels"], result["confusion"]):
                lines.append(f"| {label} | " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(lines) + "\n"


def evaluate(data: Path = DATA_DIR, out: Path = REPORT_DIR) -> dict:
    sets = {head: pd.read_csv(data / f"{head}.csv", dtype=str, keep_default_na=False) for head in DATASETS}
    report = build_report(sets, pd.read_csv(out / "predictions.csv", dtype={"id": str}))
    (out / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out / "REPORT.md").write_text(report_markdown(report), encoding="utf-8")
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="S1 Amendment 1 public benchmark")
    parser.add_argument("command", choices=("prepare", "predict", "evaluate"))
    parser.add_argument("--limit", type=int, default=None, help="predict: smoke-run on the first N items per head")
    args = parser.parse_args(argv)
    if args.command == "prepare":
        for head, entry in prepare().items():
            print(f"{head}: {entry['rows']} items, source sha256 {entry['source_sha256'][:12]}")
    elif args.command == "predict":
        print(f"{predict(limit=args.limit)} predictions -> {REPORT_DIR / 'predictions.csv'}")
    else:
        print(f"recommendation={evaluate()['recommendation']} -> {REPORT_DIR / 'REPORT.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
