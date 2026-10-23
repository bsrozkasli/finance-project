"""Run the license-approved pretrained models zero-shot on the labelled headlines (CPU only).

Usage (from ``ml/``)::

    .\\.venv-s1\\Scripts\\python.exe -m spikes.s1_news_zero_shot.run_zero_shot [--limit 5]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from transformers import pipeline

from spikes.s1_news_zero_shot.schema import TONES, load_labels
from spikes.s1_news_zero_shot.verify_models import LOCK_FILE

DEFAULT_LABELS = Path("datasets") / "s1" / "labels.csv"
DEFAULT_OUT = Path("reports") / "s1" / "predictions.csv"
BATCH_SIZE = 16

# Natural-language hypotheses for NLI zero-shot; frozen in PREREGISTRATION.md.
HYPOTHESES: dict[str, tuple[str, dict[str, str]]] = {
    "event_type": ("This headline is about {}.", {
        "earnings": "earnings results",
        "guidance": "company guidance or outlook",
        "m_and_a": "a merger or acquisition",
        "litigation_regulatory": "litigation or regulation",
        "analyst_action": "an analyst rating or price target change",
        "product_operations": "products or business operations",
        "capital_return_financing": "dividends, buybacks, or financing",
        "macro_sector": "the economy or the industry sector",
        "other": "something else",
    }),
    "tone": ("This headline is {}.", {
        "negative": "bad news for the company",
        "neutral": "neither good nor bad news for the company",
        "positive": "good news for the company",
    }),
    "material": ("This headline is {}.", {
        "yes": "likely to move the company's stock price",
        "no": "unlikely to move the company's stock price",
    }),
}


def approved_models() -> list[dict]:
    entries = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    approved = [entry for entry in entries if entry["decision"] == "use"]
    if not approved:
        raise SystemExit("no model has decision 'use' in models.lock.json; verify licenses first")
    return approved


def predict(entry: dict, headlines: list[str]) -> dict[str, list[tuple[str, float]]]:
    classifier = pipeline(entry["task"], model=entry["id"], revision=entry["revision"], device=-1)
    out: dict[str, list[tuple[str, float]]] = {}
    for head in entry["heads"]:
        if entry["task"] == "zero-shot-classification":
            template, hypotheses = HYPOTHESES[head]
            reverse = {text: label for label, text in hypotheses.items()}
            results = classifier(headlines, candidate_labels=list(hypotheses.values()), hypothesis_template=template, batch_size=BATCH_SIZE)
            out[head] = [(reverse[result["labels"][0]], float(result["scores"][0])) for result in results]
        else:
            results = classifier(headlines, batch_size=BATCH_SIZE, truncation=True)
            labels = [result["label"].lower() for result in results]
            unknown = sorted(set(labels) - set(TONES))
            if unknown:
                raise SystemExit(f"{entry['id']} emits labels {unknown} outside {TONES}")
            out[head] = [(label, float(result["score"])) for label, result in zip(labels, results)]
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="S1 zero-shot predictions")
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--limit", type=int, default=None, help="smoke-run on the first N headlines")
    args = parser.parse_args(argv)
    labels = load_labels(args.labels)
    if args.limit:
        labels = labels.head(args.limit)
    rows = []
    for entry in approved_models():
        for head, predictions in predict(entry, labels["headline"].tolist()).items():
            for headline_id, (prediction, score) in zip(labels["id"], predictions):
                rows.append({"id": headline_id, "model_key": entry["key"], "head": head, "prediction": prediction, "score": score})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(args.out, index=False, encoding="utf-8")
    print(f"{len(rows)} predictions -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
