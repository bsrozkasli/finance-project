# Local Model Decision-Support Plan 4 — S1 Zero-Shot News Classification Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer, with a pre-registered protocol and owner-labelled headlines, whether pretrained Hugging Face text models classify our news by event type, tone, and materiality well enough without training — and commit a written recommendation (`zero_shot_adequate`, `fine_tune_needed`, or `approach_not_viable`) with macro-F1 per label and confusion matrices.

**Architecture:** Throwaway spike code under `ml/spikes/s1_news_zero_shot/` with its own requirements and venv (`ml/.venv-s1`, CPU-only torch), excluded from the default `ml` test run. The protocol, label schema, metrics, and decision rule are committed before any headline is labelled or any prediction exists. Headlines come from the locally running Spring backend (`GET /api/v1/news/{symbol}`, which already calls Finnhub) through a manual collector; labelled data, predictions, and the full report stay under ignored `ml/datasets/s1/` and `ml/reports/s1/`. Only aggregate metrics and the recommendation are committed.

**Tech Stack:** Python 3.13 (`ml/.venv-s1`), torch (CPU wheel), transformers `pipeline` (`zero-shot-classification`, `text-classification`), huggingface_hub, scikit-learn (`f1_score`, `confusion_matrix`, `cohen_kappa_score`), pandas, pytest; `urllib` against `http://localhost:8080`.

**Plan Set:** Plan 4 of 5 in `docs/superpowers/plans/2026-10-15-local-model-decision-support-plan-set.md`.

**Depends On:** Plan 2 (`ml/pytest.ini` with `norecursedirs` containing `spikes`; `.gitignore` entries for `ml/.venv-*/`, `ml/datasets/`, `ml/reports/`). Owner gates: D-5 (1–2 hours of labelling plus about 10 minutes of relabelling), and license decisions in Task 2.

**Produces:**
- `ml/spikes/s1_news_zero_shot/PREREGISTRATION.md`, `README.md`, `requirements.txt`, `models.lock.json`.
- `spikes.s1_news_zero_shot.schema`: `EVENT_TYPES`, `TONES`, `MATERIAL`, `HEADS`, `HEADLINE_COLUMNS`, `LABEL_COLUMNS`, `LabelFileError`, `label_template`, `relabel_template`, `load_labels`.
- `spikes.s1_news_zero_shot.collect_headlines`: `headline_id`, `normalize_articles`, `deduplicate_and_sample`, CLI.
- `spikes.s1_news_zero_shot.metrics`: `SUPPORT_FLOOR = 10`, `HeadResult`, `head_result`.
- `spikes.s1_news_zero_shot.evaluate`: thresholds, `recommend`, `build_report`, `report_markdown`, CLI.
- `spikes.s1_news_zero_shot.verify_models`, `spikes.s1_news_zero_shot.run_zero_shot` CLIs.
- `docs/product/evidence/s1-news-zero-shot-recommendation.md`.

**Spec:** `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` §4.3, §4.4, §5 P1.4, §7 D-1 and D-5, §8 bullet 4, §9 S1 bullet, §10 risks "domain shift", "licenses", "researcher degrees of freedom".

## Locked Decisions

- **Spike, not product.** Nothing in `ml/spikes/` is imported by any runtime or by `ml/lifecycle`, `ml/dq`, or `ml/sandbox`; the default `ml` test run does not collect it. The spike's output is a report and a recommendation; no artifact is registered.
- **No training.** Pretrained models run as-is. No fine-tuning, no threshold tuning on the labelled set, no prompt iteration after predictions are seen.
- **Label schema (codes and meaning).**

  | Head | Code | Meaning for the labeller |
  |---|---|---|
  | `event_type` | `earnings` | reported results, beats/misses, earnings-call content |
  | | `guidance` | the company's own outlook, guidance raised or cut |
  | | `m_and_a` | mergers, acquisitions, divestitures, spin-offs, takeover bids |
  | | `litigation_regulatory` | lawsuits, settlements, fines, investigations, approvals, antitrust |
  | | `analyst_action` | rating or price-target changes, initiations |
  | | `product_operations` | launches, recalls, outages, production, supply chain, customer contracts, layoffs |
  | | `capital_return_financing` | dividends, buybacks, debt or equity offerings, credit ratings |
  | | `macro_sector` | economy, rates, commodities, industry-wide news where the company is not the subject |
  | | `other` | everything else, including listicles, "stocks to watch", executive changes |
  | `tone` | `negative` / `neutral` / `positive` | from the company's shareholders' point of view |
  | `material` | `yes` / `no` | "would I expect this to move the stock more than on a typical day?" |

- **Candidate models (to be license-checked in Task 2, not assumed).** `nli` = `MoritzLaurer/deberta-v3-base-zeroshot-v2.0` (NLI zero-shot for all three heads); `finbert` = `ProsusAI/finbert` (financial tone classifier, `tone` only). The spec asks for "one or two pretrained Hugging Face financial text models"; financial classifiers have no event-type head, so the event and materiality heads use a general NLI model. If either license is not acceptable, Task 2 records `reject` and the owner may name a replacement before Task 4 — never after.
- **Hypotheses** are frozen in `run_zero_shot.HYPOTHESES` and quoted in `PREREGISTRATION.md`.
- **Metrics.** Per model and head: macro-F1 over labels with support ≥ 10 (labels below the floor are still shown in the confusion matrix); 95% bootstrap CI (1000 resamples, seed 20261015); full confusion matrix. Intra-rater Cohen's kappa on `event_type` for 50 relabelled headlines (seed 20261016), relabelled ≥ 3 days after the first pass without looking at the first labels.
- **Decision rule (pre-registered; owner may edit only before Task 4 Step 3).**
  1. `approach_not_viable` if kappa < 0.60, or fewer than 5 event types reach the support floor, or fewer than 10 `material = yes` labels — the task as defined cannot be measured reliably.
  2. Otherwise `zero_shot_adequate` if best event macro-F1 ≥ 0.70 **and** best tone macro-F1 ≥ 0.70 **and** best material macro-F1 ≥ 0.60.
  3. Otherwise `fine_tune_needed`.
- **Data handling (strict data-rights assumption, spec §4.4 / D-1).** Headlines are Finnhub content: kept local under `ml/datasets/s1/`, never committed, never used for training. The committed evidence contains counts, metrics, CIs, confusion matrices, and the recommendation; no headline text, symbol, or URL.
- **Collector targets** 300–500 unique headlines (exit 1 below 300), deduplicated by normalized text, sampled to 500 with seed 20261015 if more.

## Global Constraints

- "**Output:** a recommendation only — fine-tune needed, not needed, or approach not viable. Spike code is throwaway and is not imported by the product." (spec §5 P1.4)
- "**Prerequisite:** verify and record the licenses of the candidate models before use." (spec §5 P1.4)
- "No model is trained on Yahoo, Tiingo, or Finnhub data. Provider data may be used for evaluation and inference only, for the owner's local use." (spec §4.4)
- "No price-direction or return prediction, no `Buy/Hold/Sell`, no predictive confidence percentage." (spec §4.3) — `material` is a labelled property of news, not a price forecast; reports never present model scores as confidence in a price move.
- "Product-path inference runs on CPU … No CUDA dependency enters `data-service`." (spec §4.7) — the spike installs CPU torch in its own venv only.
- "Never call live financial providers from automated tests." (`AGENTS.md`) — spike tests touch no network; the collector is a manual tool.
- Preserve unrelated working-tree changes.

## Review Focus

- **Labels changed after seeing predictions (researcher degrees of freedom).** `run_zero_shot` must only run once `labels.csv` validates completely, and Task 4 records the labels file hash before predicting. Task 3 Step 6 and Task 4 Step 2; `test_label_file_rejects_values_outside_the_schema`.
- **A label with three examples dominates macro-F1.** Labels below the support floor are excluded from the average but shown. `test_macro_f1_and_confusion_match_hand_calculation` (support floor exercised with `c`).
- **Missing predictions silently shrink the evaluation set.** Any labelled headline without a prediction must abort scoring. `test_missing_predictions_are_refused`.
- **Duplicated syndicated headlines inflate the set.** Case and whitespace variants must collapse to one row. `test_normalize_skips_empty_and_dedupe_ignores_case_and_spacing`.
- **Unlicensed model used.** `run_zero_shot` refuses to run when no `models.lock.json` entry has `decision = "use"`. Task 4 Step 1 runs it before Task 2 approval and expects the refusal.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `ml/spikes/__init__.py`, `ml/spikes/s1_news_zero_shot/__init__.py` | Create | Package markers |
| `ml/spikes/s1_news_zero_shot/PREREGISTRATION.md` | Create | Frozen protocol |
| `ml/spikes/s1_news_zero_shot/README.md` | Create | Runbook |
| `ml/spikes/s1_news_zero_shot/requirements.txt` | Create | Spike-only dependencies |
| `ml/spikes/s1_news_zero_shot/schema.py` | Create | Label schema and validation |
| `ml/spikes/s1_news_zero_shot/collect_headlines.py` | Create | Manual headline collector |
| `ml/spikes/s1_news_zero_shot/metrics.py` | Create | Macro-F1, CI, confusion |
| `ml/spikes/s1_news_zero_shot/evaluate.py` | Create | Decision rule and report |
| `ml/spikes/s1_news_zero_shot/test_spike.py` | Create | Helper tests |
| `ml/spikes/s1_news_zero_shot/test_evaluate.py` | Create | Rule and report tests |
| `ml/spikes/s1_news_zero_shot/verify_models.py` | Create | Revision and license metadata |
| `ml/spikes/s1_news_zero_shot/models.lock.json` | Create | Pinned, human-approved models |
| `ml/spikes/s1_news_zero_shot/run_zero_shot.py` | Create | CPU zero-shot predictions |
| `docs/product/evidence/s1-news-zero-shot-recommendation.md` | Create | Committed aggregate result |

---

## Task 1: Pre-Registered Protocol and Scoring Code

**Files:**
- Create: `ml/spikes/__init__.py`, `ml/spikes/s1_news_zero_shot/__init__.py`, `PREREGISTRATION.md`, `README.md`, `requirements.txt`, `schema.py`, `collect_headlines.py`, `metrics.py`, `evaluate.py`
- Test: `ml/spikes/s1_news_zero_shot/test_spike.py`, `ml/spikes/s1_news_zero_shot/test_evaluate.py`

**Interfaces:**
- Consumes: nothing from other `ml` packages.
- Produces: the schema, collector, metrics, and evaluate APIs under **Produces**.
- Preserves: default `ml` test run unchanged (spikes excluded by `norecursedirs`).

**Acceptance Evidence:**
- From `ml/`: `.\.venv-s1\Scripts\python.exe -m pytest spikes/s1_news_zero_shot -q` → 14 passed.
- `.\.venv\Scripts\python.exe -m pytest -q --co` count unchanged.

- [ ] **Step 1: Create the spike venv**

`ml/spikes/s1_news_zero_shot/requirements.txt`:

```text
# S1 spike only (throwaway). Separate venv ml/.venv-s1; never installed into ml/.venv or any runtime.
# CPU wheels only: torch is resolved from the PyTorch CPU index.
--extra-index-url https://download.pytorch.org/whl/cpu
torch>=2.6
transformers>=4.46
huggingface_hub>=0.26
scikit-learn>=1.5
pandas>=2.2
pytest>=8.2
```

Run (from `ml/`):

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv .venv-s1
.\.venv-s1\Scripts\python.exe -m pip install --upgrade pip
.\.venv-s1\Scripts\python.exe -m pip install -r spikes/s1_news_zero_shot/requirements.txt
.\.venv-s1\Scripts\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

Expected: a version ending in `+cpu` (or a plain version) and `False`. If `True` or a CUDA wheel was installed, uninstall torch and reinstall with `--index-url https://download.pytorch.org/whl/cpu`.

- [ ] **Step 2: Write the failing tests**

`ml/spikes/s1_news_zero_shot/test_spike.py`:

```python
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
```

`ml/spikes/s1_news_zero_shot/test_evaluate.py`:

```python
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
```

- [ ] **Step 3: Run them and confirm failure**

Run (from `ml/`): `.\.venv-s1\Scripts\python.exe -m pytest spikes/s1_news_zero_shot -q`

Expected: collection errors (`ModuleNotFoundError` for `spikes.s1_news_zero_shot.*` modules).

- [ ] **Step 4: Implement the four modules**

`schema.py`:

```python
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
```

`collect_headlines.py`:

```python
"""Collect recent headlines through the locally running Spring backend (manual tool, never a test).

The backend's ``GET /api/v1/news/{symbol}`` already calls Finnhub for the last 7 days.
Output stays under ignored ``ml/datasets/s1/`` (strict data-rights assumption, spec §4.4).

Usage (from ``ml/``, backend running on :8080)::

    .\\.venv-s1\\Scripts\\python.exe -m spikes.s1_news_zero_shot.collect_headlines --symbols AAPL MSFT ...
"""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from spikes.s1_news_zero_shot.schema import HEADLINE_COLUMNS, label_template

DEFAULT_BACKEND = "http://localhost:8080"
DEFAULT_OUT = Path("datasets") / "s1"
TARGET_MAX = 500
SAMPLE_SEED = 20261015


def headline_id(headline: str) -> str:
    normalized = " ".join(headline.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:12]


def normalize_articles(symbol: str, articles: list[dict]) -> list[dict]:
    rows = []
    for article in articles:
        headline = " ".join(str(article.get("headline") or "").split())
        if not headline or not article.get("datetime"):
            continue
        rows.append({
            "id": headline_id(headline),
            "symbol": symbol.upper(),
            "published_at": datetime.fromtimestamp(int(article["datetime"]), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": str(article.get("source") or ""),
            "headline": headline,
        })
    return rows


def deduplicate_and_sample(rows: list[dict], limit: int = TARGET_MAX, seed: int = SAMPLE_SEED) -> pd.DataFrame:
    frame = pd.DataFrame(rows, columns=list(HEADLINE_COLUMNS))
    frame = frame.sort_values(["published_at", "symbol"], kind="mergesort").drop_duplicates("id", keep="first")
    if len(frame) > limit:
        frame = frame.sample(n=limit, random_state=seed)
    return frame.sort_values("id", kind="mergesort").reset_index(drop=True)


def fetch(backend: str, symbol: str) -> list[dict]:
    url = f"{backend}/api/v1/news/{urllib.parse.quote(symbol.upper())}"
    with urllib.request.urlopen(url, timeout=30) as response:  # noqa: S310 - local backend only
        return json.loads(response.read().decode("utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Collect S1 headlines from the local backend")
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--backend", default=DEFAULT_BACKEND)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)
    rows: list[dict] = []
    for symbol in args.symbols:
        articles = fetch(args.backend, symbol)
        rows.extend(normalize_articles(symbol, articles))
        print(f"{symbol}: {len(articles)} articles")
    frame = deduplicate_and_sample(rows)
    args.out.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.out / "headlines.csv", index=False, encoding="utf-8")
    label_template(frame).to_csv(args.out / "labels.csv", index=False, encoding="utf-8-sig")
    print(f"{len(frame)} unique headlines -> {args.out / 'labels.csv'}")
    return 0 if len(frame) >= 300 else 1


if __name__ == "__main__":
    raise SystemExit(main())
```

`metrics.py`:

```python
"""Pre-registered S1 metrics: macro-F1 with a support floor, bootstrap CI, confusion matrix."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.metrics import confusion_matrix, f1_score

SUPPORT_FLOOR = 10
BOOTSTRAP_RESAMPLES = 1000
BOOTSTRAP_SEED = 20261015


@dataclass(frozen=True)
class HeadResult:
    labels: tuple[str, ...]
    scored_labels: tuple[str, ...]   # labels with support >= floor; macro-F1 averages over these
    support: dict[str, int]
    macro_f1: float
    ci_low: float
    ci_high: float
    confusion: list[list[int]]        # rows = true label, columns = predicted label, order = labels


def head_result(y_true: list[str], y_pred: list[str], labels: tuple[str, ...], support_floor: int = SUPPORT_FLOOR) -> HeadResult:
    true = np.asarray(y_true)
    pred = np.asarray(y_pred)
    support = {label: int((true == label).sum()) for label in labels}
    scored = tuple(label for label in labels if support[label] >= support_floor)
    if not scored:
        raise ValueError("no label reaches the support floor")
    macro = float(f1_score(true, pred, labels=list(scored), average="macro", zero_division=0))
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    samples = []
    for _ in range(BOOTSTRAP_RESAMPLES):
        pick = rng.integers(0, len(true), len(true))
        samples.append(f1_score(true[pick], pred[pick], labels=list(scored), average="macro", zero_division=0))
    low, high = np.percentile(samples, [2.5, 97.5])
    matrix = confusion_matrix(true, pred, labels=list(labels)).tolist()
    return HeadResult(labels, scored, support, macro, float(low), float(high), matrix)
```

`evaluate.py`:

```python
"""Score zero-shot predictions against the owner's labels and apply the pre-registered rule.

Usage (from ``ml/``)::

    .\\.venv-s1\\Scripts\\python.exe -m spikes.s1_news_zero_shot.evaluate
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
```

- [ ] **Step 5: Write `PREREGISTRATION.md` and `README.md`**

`PREREGISTRATION.md` sections, in order, each copied from this plan's Locked Decisions without paraphrase: **Question** (spec §5 P1.4 wording); **Data** (collector source, window, dedupe, 300–500 target, seed); **Label schema** (the full table); **Labelling procedure** (label every row before Task 4; never open `reports/s1/`; relabel the 50-row sample ≥ 3 days later without opening `labels.csv`); **Models** (candidates, roles, "license-checked before use", revision pinned in `models.lock.json`); **Hypotheses** (the `HYPOTHESES` table from Task 4, verbatim); **Metrics** (support floor 10, bootstrap 1000 / seed 20261015, confusion matrices, kappa); **Decision rule** (the three numbered rules with their numbers); **What is committed** (aggregate evidence only); **Change log** (empty table: date, change, reason — edits allowed only before Task 4 Step 3).

`README.md`: the Tasks 2–5 commands in order, the owner time budget, and "throwaway: delete this directory once C3 is planned or the approach is rejected".

- [ ] **Step 6: Run the focused and plan-level checks**

Run: `.\.venv-s1\Scripts\python.exe -m pytest spikes/s1_news_zero_shot -q` — Expected: 14 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: unchanged count, spikes not collected.

- [ ] **Step 7: Commit** (this commit is the pre-registration record)

```powershell
git add ml/spikes/__init__.py ml/spikes/s1_news_zero_shot/__init__.py ml/spikes/s1_news_zero_shot/PREREGISTRATION.md ml/spikes/s1_news_zero_shot/README.md ml/spikes/s1_news_zero_shot/requirements.txt ml/spikes/s1_news_zero_shot/schema.py ml/spikes/s1_news_zero_shot/collect_headlines.py ml/spikes/s1_news_zero_shot/metrics.py ml/spikes/s1_news_zero_shot/evaluate.py ml/spikes/s1_news_zero_shot/test_spike.py ml/spikes/s1_news_zero_shot/test_evaluate.py
git diff --cached --check
git commit -m "feat(ml): pre-register S1 zero-shot news spike protocol" -m "Metrics, decision rule, and label schema are fixed before any label or prediction exists."
```

---

## Task 2: Pin Revisions and Record License Decisions (prerequisite)

**Files:**
- Create: `ml/spikes/s1_news_zero_shot/verify_models.py`, `ml/spikes/s1_news_zero_shot/models.lock.json`

**Interfaces:**
- Consumes: Hugging Face Hub metadata API (network, manual run only).
- Produces: `models.lock.json` — list of `{key, id, task, heads, revision, declared_license, model_card_url, checked_on, decision, decision_note}`; `decision` ∈ `pending | use | reject`.
- Preserves: no weights downloaded in this task.

**Acceptance Evidence:**
- `models.lock.json` committed with a 40-hex `revision` and a human `decision` for each entry.

- [ ] **Step 1: Add `verify_models.py`**

```python
"""Record each candidate model's pinned revision and declared license (S1 prerequisite).

The script only fetches metadata. A human reads the model card and license text and
sets ``decision`` to ``use`` or ``reject``; ``run_zero_shot`` refuses anything else.

Usage (from ``ml/``)::

    .\\.venv-s1\\Scripts\\python.exe -m spikes.s1_news_zero_shot.verify_models
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from huggingface_hub import model_info

LOCK_FILE = Path(__file__).with_name("models.lock.json")
CANDIDATES = {
    "nli": ("MoritzLaurer/deberta-v3-base-zeroshot-v2.0", "zero-shot-classification", ("event_type", "tone", "material")),
    "finbert": ("ProsusAI/finbert", "text-classification", ("tone",)),
}


def main() -> int:
    entries = []
    for key, (model_id, task, heads) in CANDIDATES.items():
        info = model_info(model_id)
        card = info.card_data.to_dict() if info.card_data else {}
        entries.append({
            "key": key,
            "id": model_id,
            "task": task,
            "heads": list(heads),
            "revision": info.sha,
            "declared_license": card.get("license"),
            "model_card_url": f"https://huggingface.co/{model_id}/blob/{info.sha}/README.md",
            "checked_on": date.today().isoformat(),
            "decision": "pending",
            "decision_note": "",
        })
        print(f"{key}: {model_id}@{info.sha} declared_license={card.get('license')!r}")
    LOCK_FILE.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {LOCK_FILE}; set decision to 'use' or 'reject' after reading each license")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Fetch metadata**

Run (from `ml/`): `.\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.verify_models`

Expected: one line per model with a revision sha and the declared license (possibly `None`), and `models.lock.json` written with `"decision": "pending"`.

- [ ] **Step 3: Human license review**

For each entry, open `model_card_url` and the repository's license file at that revision. Set `decision` to `use` only if a license is declared and it permits local evaluation and inference by the owner; record the license name and anything relevant (for example a base-model license inherited by a fine-tune, or training-data terms) in `decision_note`. A missing or unclear license → `reject` with the reason. An agent may draft the note, but the owner confirms each `use`. Do not guess a license that the card does not state.

- [ ] **Step 4: Commit**

```powershell
git add ml/spikes/s1_news_zero_shot/verify_models.py ml/spikes/s1_news_zero_shot/models.lock.json
git diff --cached --check
git commit -m "docs(ml): pin S1 candidate model revisions and license decisions"
```

---

## Task 3: Collect and Label Headlines (owner gate D-5)

**Files:**
- Local only (ignored): `ml/datasets/s1/headlines.csv`, `ml/datasets/s1/labels.csv`, `ml/datasets/s1/relabels.csv`

**Interfaces:**
- Consumes: running backend on `http://localhost:8080` with `FINNHUB_API_KEY` configured; Task 1 collector and schema.
- Produces: a fully labelled `labels.csv` and `relabels.csv` that pass `load_labels`; the sha256 of `labels.csv` (recorded in the PR).
- Preserves: no repository file changes in this task; no commit.

**Acceptance Evidence:**
- `load_labels` succeeds on both files; row counts and the `labels.csv` sha256 noted in the PR.

- [ ] **Step 1: Start the backend** with a configured Finnhub key (see `docs/agent/verification.md` smoke preconditions), and confirm `Invoke-RestMethod http://localhost:8080/api/v1/news/AAPL` returns a list.

- [ ] **Step 2: Collect** — from `ml/`: `.\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.collect_headlines --symbols <owner's watchlist symbols>`. Use 40–80 liquid symbols across sectors so most event types occur. Expected: exit 0 and "N unique headlines" with 300 ≤ N ≤ 500. If below 300, add symbols and rerun (the 7-day window is fixed by the backend).

- [ ] **Step 3: Owner labels `datasets/s1/labels.csv`** in a spreadsheet, every row, all three heads, using the schema table. Save as CSV UTF-8.

- [ ] **Step 4: Validate** — from `ml/`:

```powershell
.\.venv-s1\Scripts\python.exe -c "from pathlib import Path; from spikes.s1_news_zero_shot.schema import load_labels; f = load_labels(Path('datasets/s1/labels.csv')); print(len(f)); print(f['event_type'].value_counts().to_string())"
```

Expected: the row count and the per-type support. Fix any row the error names, then rerun.

- [ ] **Step 5: Relabel sample (≥ 3 days later)**

```powershell
.\.venv-s1\Scripts\python.exe -c "from pathlib import Path; from spikes.s1_news_zero_shot.schema import load_labels, relabel_template; relabel_template(load_labels(Path('datasets/s1/labels.csv'))).to_csv('datasets/s1/relabels.csv', index=False, encoding='utf-8-sig')"
```

The owner labels the 50 rows of `relabels.csv` without opening `labels.csv`, then validates it with the Step 4 command pointed at `relabels.csv`.

- [ ] **Step 6: Freeze** — `Get-FileHash datasets/s1/labels.csv -Algorithm SHA256`; paste the hash into the PR. From here on, `labels.csv` and `relabels.csv` are read-only.

---

## Task 4: Zero-Shot Predictions on CPU

**Files:**
- Create: `ml/spikes/s1_news_zero_shot/run_zero_shot.py`
- Local only (ignored): `ml/reports/s1/predictions.csv`, the Hugging Face cache

**Interfaces:**
- Consumes: `models.lock.json` entries with `decision = "use"`; frozen `labels.csv`.
- Produces: `predictions.csv` with columns `id, model_key, head, prediction, score` — one row per (headline, model, head).
- Preserves: labels unchanged (hash matches Task 3 Step 6).

**Acceptance Evidence:**
- Smoke run on 5 headlines, then a full run whose row count equals `labels × Σ heads over approved models`.

- [ ] **Step 1: Add `run_zero_shot.py`** and confirm its license gate

```python
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
```

If Task 2 is not yet approved (all `pending`), run `.\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.run_zero_shot --limit 1` and expect `no model has decision 'use' in models.lock.json; verify licenses first`.

- [ ] **Step 2: Re-check the frozen labels** — `Get-FileHash datasets/s1/labels.csv -Algorithm SHA256` equals the Task 3 hash.

- [ ] **Step 3: Smoke run** — `.\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.run_zero_shot --limit 5`. Expected: the models download once into the Hugging Face cache and `predictions.csv` holds `5 × Σ heads` rows (for example 20 with both models approved). Any exception about an unknown label stops the run; fix only the mapping code, never the hypotheses or the rule. After this step `PREREGISTRATION.md` may no longer change.

- [ ] **Step 4: Full run** — rerun without `--limit`. Expected on a laptop CPU: minutes, not hours, for ≤ 500 headlines. Record wall time in the PR.

- [ ] **Step 5: Commit the runner**

```powershell
git add ml/spikes/s1_news_zero_shot/run_zero_shot.py
git diff --cached --check
git commit -m "feat(ml): add S1 zero-shot CPU prediction runner"
```

---

## Task 5: Score, Recommend, and Record

**Files:**
- Create: `docs/product/evidence/s1-news-zero-shot-recommendation.md`
- Local only (ignored): `ml/reports/s1/report.json`, `ml/reports/s1/REPORT.md`

**Interfaces:**
- Consumes: Task 1 `evaluate` CLI; Task 3 labels; Task 4 predictions.
- Produces: the committed recommendation that the spec §5 Phase 2 C3 gate reads.
- Preserves: no headline text, symbol, or URL in any committed file.

**Acceptance Evidence:**
- `rg -n "Recommendation:" docs/product/evidence/s1-news-zero-shot-recommendation.md` → one match with one of the three codes.

- [ ] **Step 1: Score** — from `ml/`: `.\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.evaluate`. Expected: `recommendation=<code> -> reports\s1\REPORT.md`.

- [ ] **Step 2: Write the evidence record** with: date; labelled and relabelled counts; `labels.csv` sha256; model ids and pinned revisions with license decisions; the macro-F1 table with CIs and scored labels; every confusion matrix (counts only); kappa; the decision rule as pre-registered; the resulting code; and a short **Interpretation** section (owner's words) covering domain shift (spec §10) and which classes failed. End with **Phase 2 gate input**: whether C3 should be planned and, if `fine_tune_needed`, which public dataset licenses must be verified next.

- [ ] **Step 3: Verify and commit**

Run: `rg -n "Recommendation:" docs/product/evidence/s1-news-zero-shot-recommendation.md; rg -n "https?://" docs/product/evidence/s1-news-zero-shot-recommendation.md | rg -v "huggingface.co"`

Expected: one match, then no match (no article URLs).

```powershell
git add docs/product/evidence/s1-news-zero-shot-recommendation.md
git diff --cached --check
git commit -m "docs(spec): record S1 zero-shot news recommendation"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] Spec §8: "S1 produces a written recommendation with macro-F1 per label on the owner-labeled set" — Task 5 record committed.
- [ ] Spike tests: 14 passed in `ml/.venv-s1`; default `ml` suite unchanged.
- [ ] `git ls-files ml` contains no headline, label, prediction, or report file.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff (Phase 2 gate)

- Inputs made available: the recommendation, per-class metrics, frozen labelled set (local) usable as the C3 evaluation set ("evaluate on the frozen S1 labeled set", spec §5 Phase 2).
- Conditions later work may assume: the S1 labelled set has never been used for tuning; its sha256 is recorded.
- Open risks carried forward: 7-day backend window biases the set toward the collection week's news cycle; single labeller (kappa reported); best-of-two-model selection on the same set slightly favors zero-shot. Owner: C3 spec revision.

## Self-Review

**Spec coverage:** P1.4 question, probe (300–500 headlines from the existing Finnhub path, owner labels, one or two pretrained models zero-shot on CPU, macro-F1 and confusion matrix per label), label schema, recommendation-only output, owner cost, license prerequisite — Tasks 1–5. §10 domain shift is measured by this spike; licenses by Task 2; researcher degrees of freedom by the Task 1 pre-registration commit and the Task 3 hash freeze.

**Step scan:** Every code step contains the complete file; the helper and rule code was verified in a planning workspace (14 tests passed with scikit-learn 1.9.1, pandas 3.0.6). `run_zero_shot.py` and `verify_models.py` were not executed during planning (no model download); Task 4 Step 3 is their first smoke run.

**Type and name consistency:** `LABEL_COLUMNS`, `HEADS`, and the `predictions.csv` columns match across `schema`, `run_zero_shot`, and `evaluate`; `models.lock.json` keys match between `verify_models` and `run_zero_shot`.

**Review focus:** All five items map to named tests or explicit gate steps.

**Proportion:** Throwaway spike; protocol and evidence are the deliverable.
