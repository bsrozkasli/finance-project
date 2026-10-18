# EPIC-006 - AI Decision Explanation

- Phase: Value MVP, after authoritative research and Decision Result.
- Delivery state: Optional target attachment; never decision authority.

## Outcome

An investor may request a grounded explanation of a retained Decision Result
without changing its metrics, label, risk limits, or replay identity.
`CAP-TGT-006` produces an optional `NarrativeAttachment` from prepared metrics
and evidence references; deterministic research remains useful when AI fails.

## Problem

The current sequential analyst flow can produce prose, but its presence does
not prove that factual claims map to a retained snapshot or that malformed,
refused, expensive, or unavailable model responses leave the authoritative
decision untouched.

## Scope

- Pass prepared metrics, approved Decision Result fields, policy conflicts,
  and immutable evidence references into the documented sequential analyst
  order; prohibit agents from fetching authoritative market data.
- Label sourced factual claims separately from interpretation. Explain thesis,
  counter-thesis, catalysts, risks, scenarios, missing evidence, and policy
  conflicts only where the snapshot supports them.
- Validate output schema and source links. On timeout, refusal, malformed
  response, unsupported claim, or outage, return explicit unavailable or
  invalid attachment status while retaining deterministic research/result.
- Measure model token/request cost separately from licensed-data cost per
  Activated User and retained user; enforce approved monthly variable-cost
  budget and independent AI disable switch before cohort expansion.

## Out of Scope

Authoritative calculation, filling missing evidence, changing a label or
suggested weight, overriding hard limits, treating uncertainty as a success
probability, and unsupervised candidate-wide AI runs.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md). The separate deterministic attachment
invariant is owned by the trusted-core decision epic.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-036` | Prepared-metrics and evidence-only agent input. |
| `PRD-FR-037` | Sourced, labeled optional narrative content. |
| `PRD-FR-038` | No authority over metrics, gaps, limits, or probabilities. |
| `PRD-FR-039` | Structured graceful degradation for LLM failure. |
| `PRD-NFR-013` | Separate per-user AI/data cost and approved cohort budget. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) supplies referenced
  evidence; [EPIC-004](EPIC-004-investment-quality-and-portfolio-fit.md)
  supplies the immutable Decision Result; [EPIC-005](EPIC-005-explainable-discovery.md)
  supplies explicit candidate selection for deeper research.
- OQ-2 governs source use and model-input rights; OQ-6 sets cost budgets;
  OQ-7 defines understandable/decision-relevant pilot measurement. Provider
  and AI switches must not disable deterministic research.

## Risks

- A fluent but unsupported claim can appear more authoritative than the
  calculation. Grounding checks must fail visibly, not substitute invented
  citations or success probabilities.
- Model/version and prompt drift can alter prose. Attachment revisions need
  identity and audit links without rewriting the retained structured result.

## Success Evidence

- Contract and adversarial fixtures pass only prepared metrics/references to
  agents and reject unsourced factual claims, synthetic missing values,
  attempted hard-limit overrides, and probability claims.
- With AI enabled, disabled, timed out, refused, malformed, or regenerated,
  fixtures compare identical Decision Result hashes and usable deterministic
  research, with explicit attachment status and no fabricated prose.
- Cost telemetry fixtures independently reconcile model and licensed-data
  spend per Activated/retained user against the approved OQ-6 monthly budget;
  reproducible pilot survey method and results use the OQ-7 dictionary.

## Story Plan

IDs are proposals, not implementation stories. Detailed criteria wait for
input/output contracts, rights, budgets, and a separate EPIC-006 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-006-01` | Feed sequential analysts prepared metrics and evidence references only. | EPIC-001 and EPIC-004 |
| `STORY-006-02` | Validate grounded optional narrative and failure statuses. | STORY-006-01 and OQ-2 |
| `STORY-006-03` | Enforce cost budgets and prove deterministic fallback. | STORY-006-02 and OQ-6 |
