r"""Score zero-shot predictions against the owner's labels and apply the pre-registered rule.

Usage (from ``ml/``)::

    .\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.evaluate
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

from spikes.s1_news_zero_shot.metrics import SUPPORT_FLOOR, head_result
from spikes.s1_news_zero_shot.schema import HEADS, load_labels

# Pre-registered decision thresholds (PREREGISTRATION.md). Change only before predictions exist.
EVENT_ADEQUATE = 0.70
TONE_ADEQUATE = 0.70
MATERIAL_ADEQUATE = 0.60
KAPPA_FLOOR = 0.60
MIN_SCORED_EVENT_CLASSES = 5

DEFAULT_DIR = Path("datasets") / "s1"
DEFAULT_REPORTS = Path("reports") / "s1"


def recommend(
    *,
    event_f1: float,
    tone_f1: float,
    material_f1: float,
    scored_event_classes: int,
    material_yes_support: int,
    event_kappa: float,
) -> str:
    if event_kappa < KAPPA_FLOOR or scored_event_classes < MIN_SCORED_EVENT_CLASSES or material_yes_support < SUPPORT_FLOOR:
        return "approach_not_viable"
    if event_f1 >= EVENT_ADEQUATE and tone_f1 >= TONE_ADEQUATE and material_f1 >= MATERIAL_ADEQUATE:
        return "zero_shot_adequate"
    return "fine_tune_needed"


def build_report(labels: pd.DataFrame, relabels: pd.DataFrame, predictions: pd.DataFrame) -> dict:
    results: dict[str, dict[str, dict]] = {}
    for (model_key, head), group in predictions.groupby(["model_key", "head"], sort=True):
        joined = labels.merge(group, on="id", how="inner")
        if len(joined) != len(labels):
            raise ValueError(f"{model_key}/{head}: {len(labels) - len(joined)} labelled headlines lack a prediction")
        results.setdefault(model_key, {})[head] = asdict(head_result(joined[head].tolist(), joined["prediction"].tolist(), HEADS[head]))
    paired = labels.merge(relabels[["id", "event_type"]], on="id", suffixes=("", "_relabel"))
    kappa = float(cohen_kappa_score(paired["event_type"], paired["event_type_relabel"]))

    def best(head: str) -> dict:
        return max((by_head[head] for by_head in results.values() if head in by_head), key=lambda item: item["macro_f1"])

    event, tone, material = best("event_type"), best("tone"), best("material")
    recommendation = recommend(
        event_f1=event["macro_f1"],
        tone_f1=tone["macro_f1"],
        material_f1=material["macro_f1"],
        scored_event_classes=len(event["scored_labels"]),
        material_yes_support=material["support"]["yes"],
        event_kappa=kappa,
    )
    return {
        "labelled_headlines": len(labels),
        "relabelled_headlines": len(paired),
        "event_type_intra_rater_kappa": kappa,
        "results": results,
        "recommendation": recommendation,
    }


def report_markdown(report: dict) -> str:
    lines = [
        "# S1 Zero-Shot Report",
        "",
        f"- Labelled headlines: {report['labelled_headlines']}",
        f"- Intra-rater kappa (event type, {report['relabelled_headlines']} relabelled): {report['event_type_intra_rater_kappa']:.2f}",
        f"- Recommendation: **{report['recommendation']}**",
        "",
        "| Model | Head | Macro-F1 | 95% CI | Scored labels |",
        "|---|---|---:|---|---|",
    ]
    for model_key, by_head in report["results"].items():
        for head, result in by_head.items():
            lines.append(
                f"| {model_key} | {head} | {result['macro_f1']:.3f} | {result['ci_low']:.3f}–{result['ci_high']:.3f} | "
                f"{', '.join(result['scored_labels'])} |"
            )
    for model_key, by_head in report["results"].items():
        for head, result in by_head.items():
            lines += ["", f"## Confusion matrix — {model_key} / {head} (rows true, columns predicted)", ""]
            lines.append("| true \\ pred | " + " | ".join(result["labels"]) + " |")
            lines.append("|---|" + "---:|" * len(result["labels"]))
            for label, row in zip(result["labels"], result["confusion"]):
                lines.append(f"| {label} | " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate S1 zero-shot predictions")
    parser.add_argument("--labels", type=Path, default=DEFAULT_DIR / "labels.csv")
    parser.add_argument("--relabels", type=Path, default=DEFAULT_DIR / "relabels.csv")
    parser.add_argument("--predictions", type=Path, default=DEFAULT_REPORTS / "predictions.csv")
    parser.add_argument("--out", type=Path, default=DEFAULT_REPORTS)
    args = parser.parse_args(argv)
    report = build_report(
        load_labels(args.labels), load_labels(args.relabels), pd.read_csv(args.predictions, dtype={"id": str}),
    )
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (args.out / "REPORT.md").write_text(report_markdown(report), encoding="utf-8")
    print(f"recommendation={report['recommendation']} -> {args.out / 'REPORT.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
