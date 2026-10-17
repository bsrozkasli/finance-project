# S1 Zero-Shot News Classification — Pre-Registration

Committed before any headline is labelled and before any prediction exists
(spec §10, "researcher degrees of freedom"). Edits are allowed only before
Task 4 Step 3 (the first prediction run) and must be recorded in the change log.

## Question

Do pretrained Hugging Face text models classify our news by event type, tone,
and materiality well enough without training? (Spec §5 P1.4.) The output is a
recommendation only: `zero_shot_adequate`, `fine_tune_needed`, or
`approach_not_viable`. Spike code is throwaway and is not imported by the product.

## Data

Headlines come from the locally running Spring backend
(`GET /api/v1/news/{symbol}`, which already calls Finnhub for the last 7 days),
through a manual collector. Headlines are deduplicated by normalized text
(case and spacing ignored). The target is 300–500 unique headlines; the collector
exits 1 below 300 and samples down to 500 with seed 20261015 if more.

Headlines are Finnhub content: kept local under `ml/datasets/s1/`, never
committed, never used for training (spec §4.4, D-1). The committed evidence
contains counts, metrics, confidence intervals, confusion matrices, and the
recommendation; no headline text, symbol, or URL.

## Label schema

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

`material` is a labelled property of news, not a price forecast; reports never
present model scores as confidence in a price move (spec §4.3).

## Labelling procedure

1. Label every row of `datasets/s1/labels.csv` (all three heads) before Task 4.
2. Never open `reports/s1/` while labelling.
3. Relabel the 50-row sample (`relabels.csv`, seed 20261016) at least 3 days later,
   without opening `labels.csv`.
4. Record the `labels.csv` SHA-256 before predicting; from then on the label files are read-only.

## Models

Candidates, to be license-checked before use and not assumed:

- `nli` = `MoritzLaurer/deberta-v3-base-zeroshot-v2.0` (NLI zero-shot, all three heads).
- `finbert` = `ProsusAI/finbert` (financial tone classifier, `tone` head only).

Financial classifiers have no event-type head, so the event and materiality heads
use a general NLI model. If either license is not acceptable, Task 2 records
`reject` and the owner may name a replacement before Task 4, never after.
Revisions are pinned in `models.lock.json`. No fine-tuning, no threshold tuning on
the labelled set, no prompt iteration after predictions are seen.

## Hypotheses

NLI zero-shot hypothesis templates and label phrases, frozen here and in
`run_zero_shot.HYPOTHESES`:

| Head | Template | Label → phrase |
|---|---|---|
| `event_type` | `This headline is about {}.` | `earnings` → earnings results; `guidance` → company guidance or outlook; `m_and_a` → a merger or acquisition; `litigation_regulatory` → litigation or regulation; `analyst_action` → an analyst rating or price target change; `product_operations` → products or business operations; `capital_return_financing` → dividends, buybacks, or financing; `macro_sector` → the economy or the industry sector; `other` → something else |
| `tone` | `This headline is {}.` | `negative` → bad news for the company; `neutral` → neither good nor bad news for the company; `positive` → good news for the company |
| `material` | `This headline is {}.` | `yes` → likely to move the company's stock price; `no` → unlikely to move the company's stock price |

## Metrics

Per model and head: macro-F1 over labels with support ≥ 10 (labels below the floor
are still shown in the confusion matrix); 95% bootstrap CI (1000 resamples,
seed 20261015); full confusion matrix. Intra-rater Cohen's kappa on `event_type`
for 50 relabelled headlines (seed 20261016), relabelled at least 3 days after the
first pass without looking at the first labels.

## Decision rule

1. `approach_not_viable` if kappa < 0.60, or fewer than 5 event types reach the
   support floor, or fewer than 10 `material = yes` labels — the task as defined
   cannot be measured reliably.
2. Otherwise `zero_shot_adequate` if best event macro-F1 ≥ 0.70 **and** best tone
   macro-F1 ≥ 0.70 **and** best material macro-F1 ≥ 0.60.
3. Otherwise `fine_tune_needed`.

The numeric thresholds are implemented in `evaluate.py` as `EVENT_ADEQUATE`,
`TONE_ADEQUATE`, `MATERIAL_ADEQUATE`, `KAPPA_FLOOR`, and `MIN_SCORED_EVENT_CLASSES`.

## What is committed

Aggregate evidence only: `docs/product/evidence/s1-news-zero-shot-recommendation.md`
with counts, metrics, CIs, confusion matrices, model ids and pinned revisions with
license decisions, and the recommendation.

## Change log

| Date | Change | Reason |
|---|---|---|
