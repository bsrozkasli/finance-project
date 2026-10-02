# EPIC-003 - End-to-End Asset Research

- Phase: V1 Foundation, after trusted evidence and portfolio-state contracts.
- Delivery state: Target catalog only; policy and rights gates remain open.

## Outcome

An investor can complete one coherent stock or eligible equity-ETF research
workflow, seeing applicable metrics, charts, context, benchmark comparisons,
and every section's source, freshness, and missingness. `CAP-TGT-003` research
uses the frozen evidence snapshot rather than a mixture of live provider facts.

## Problem

Current research sections and analytics exist, but they do not establish one
status-aware workflow or independently verified asset-specific formulas. A
nullable provider PEG is not Target-Horizon PEG, and an apparent benchmark
comparison is not proof of a licensed, point-in-time total-return series.

## Scope

- Join fundamentals, estimates, price/risk, relevant news, sector and macro
  context, benchmarks, and charts with per-section status and provenance.
- Compute the approved stock model and a separate ETF model; omit stock-only
  ratios, including Target-Horizon PEG, from ETF evaluation.
- Freeze stock S&P 500 total-return primary and mapped GICS-sector total-return
  secondary benchmarks; use an ETF's declared index or only a predeclared,
  rights-permitted category substitute with an explicit downgrade.
- Calculate Target-Horizon PEG from snapshot price, normalized current EPS,
  target-date consensus EPS, and exact fractional-period CAGR. The nearest
  target fiscal date must be within 18-32 months of the snapshot; retain inputs,
  units, dates, analyst count, dispersion, and formula version.
- Mark PEG `Not Meaningful` for non-positive EPS, growth at most 2%, fewer
  than three target estimates, or missing inputs. Mark `High Uncertainty` and
  exclude from scoring for growth over 50% or dispersion over 50% of the
  absolute consensus mean. Require ten comparable peers for a percentile.
- Separate any trailing/provider PEG by name, formula, source, and period;
  never let it substitute for Target-Horizon PEG. Keep PEG subordinate to
  approved quality gates and never use a universal `PEG < 1` or PEG-only Add.

## Out of Scope

Portfolio-specific Fit, action labels, weights, AI-authored research facts,
unlicensed benchmark substitution, and scoring before OQ-4 policy approval.
The current raw provider PEG is not silently promoted to target scoring.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md), not an implementation assertion.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-016` | Connected, status-aware stock/ETF research sections. |
| `PRD-FR-017` | Independently verified stock analytics. |
| `PRD-FR-018` | ETF-specific analytics without stock-only ratios. |
| `PRD-FR-019` | Stock S&P 500 total-return primary benchmark. |
| `PRD-FR-020` | Exact-period Target-Horizon PEG and calculation record. |
| `PRD-FR-021` | PEG Not Meaningful eligibility gates. |
| `PRD-FR-022` | High-Uncertainty PEG scoring exclusion. |
| `PRD-FR-023` | No universal PEG cutoff or PEG-only Add. |
| `PRD-FR-056` | Mapped GICS-sector total-return secondary benchmark. |
| `PRD-FR-057` | ETF declared-index and governed substitute policy. |
| `PRD-FR-058` | Frozen benchmark mapping, rights, and outcome record. |
| `PRD-FR-059` | Ten comparable peers before PEG percentile scoring. |
| `PRD-FR-060` | No Target-Horizon PEG in ETF API or UI. |
| `PRD-FR-061` | Provider/trailing PEG distinct from target calculation. |
| `PRD-FR-062` | Peer/lifecycle and estimate-context interpretation. |
| `PRD-FR-063` | Quality gates outrank PEG influence. |
| `PRD-FR-064` | Versioned OQ-4 approval gates PEG scoring. |
| `PRD-NFR-011` | Measured first meaningful result under ten minutes. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) provides instrument type,
  immutable evidence, section status, and data-rights binding;
  [EPIC-002](EPIC-002-transaction-ledger-portfolio-state.md) provides the
  portfolio context consumed later by EPIC-004, not a second research source.
- OQ-2 must approve benchmark, estimate, and ETF-index rights. OQ-3 approves
  asset-specific evidence policy. OQ-4 approves normalized EPS, peers, quality,
  mapping, and PEG formulas before scoring. OQ-5 governs changed API/UI DTOs.
- OQ-7 defines the first-result sample and clock; a currently failing browser
  smoke does not prove the target time gate.

## Risks

- Survivorship, delistings, corporate actions, stale sector/category mapping,
  and post-outcome benchmark remapping can bias evaluation.
- A displayed number can be misleading if its fiscal period, currency,
  rights, or provider formula differs from the approved model.
- Disposition: Keep `DOC-CONFLICT-001`, `DOC-CONFLICT-003`,
  `DOC-CONFLICT-006`, and `DOC-CONFLICT-008` in the
  [conflict ledger](../evidence/legacy-document-conflicts.md); target research
  does not validate those competing current-state interpretations.

## Success Evidence

- Independent formula fixtures document stock and ETF units, periods,
  rounding, missingness, restatements, and corporate actions; ETF API/UI
  fixtures contain no stock PEG metric.
- Hand-calculated PEG fixtures exercise 18/32-month eligibility, 2%/50%
  growth boundaries, two/three estimates, dispersion, nine/ten peers, and
  absent or mismatched policy versions. A favorable PEG alone never yields Add.
- Rights and point-in-time fixtures prove total-return series, declared or
  permitted substitute index, frozen benchmark IDs, and rejection of later
  remapping. Section UI/contract fixtures preserve source and freshness gaps.
- A versioned OQ-7 measurement dictionary and recorded browser-flow sample
  provide environment, cohort, timestamps, exclusions, command/result, and
  locator for the under-ten-minute first meaningful result gate.

## Story Plan

Proposed IDs are not detailed story files. Acceptance criteria wait for OQ-2/3/4
policy and rights artifacts, OQ-5 migration, and a separate EPIC-003 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-003-01` | Connect status-aware research sections and charts. | EPIC-001 evidence contract |
| `STORY-003-02` | Verify separate stock and ETF analytics. | STORY-003-01 and OQ-4 model |
| `STORY-003-03` | Freeze licensed stock and ETF benchmark selections. | STORY-003-01 and OQ-2 rights |
| `STORY-003-04` | Calculate and gate Target-Horizon PEG with peer context. | STORY-003-02 and OQ-4 PEG policy |
| `STORY-003-05` | Prove first-result timing and research contract. | STORY-003-01 and OQ-7 measurement |
