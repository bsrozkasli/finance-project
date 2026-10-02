# EPIC-004 - Investment Quality and Portfolio Fit

- Phase: V1 Foundation, after trusted evidence, ledger state, and research.
- Delivery state: Target catalog only; external labels and weights remain gated.

## Outcome

An investor can distinguish an asset's standalone Investment Quality from its
marginal fit in an exact Portfolio State, then retain a replayable, structured
Decision Result and Decision Card. `CAP-TGT-004` deterministic policy, not an
LLM or learned preference, decides whether a directional output is permitted.

## Problem

Current research scores, portfolio analytics, and agent decision/confidence
responses do not prove the target quality/Fit separation, marginal hard-limit
effects, complete replay key, or ownership-specific label semantics. Legal and
evidence gates for external policy-conditioned output are still open.

## Scope

- Calculate versioned Investment Quality independently of portfolio state.
  Calculate marginal Portfolio Fit against the exact ledger-derived state and
  explicit User Policy: risk tolerance, horizon, position and sector caps, and
  exclusions. Show concentration, diversification, correlation, sector/factor
  overlap, liquidity, drawdown, and hard-limit effects separately.
- Retain a deterministic Decision Result with snapshot, analytics, Portfolio
  State, User Policy, benchmark, Fit, decision-policy, and optional personal
  model artifact identifiers/versions (`none` when absent). Expose separate
  Medium-Term and Long-Term outlooks, valuation zone, quantitative support and
  risk flags, supported maximum weight or suppression reason, and applied label.
- Enforce `Add` for an eligible owned or unowned increase within hard caps;
  `Hold` and `Reduce` only for owned assets; `Avoid` only for unowned negative
  or hard-blocked assets; and non-directional `Watch` for either ownership.
- If mandatory evidence or policy inputs fail, use `Watch - Insufficient
  Evidence`: show available evidence, gaps, current exposure when relevant,
  and reevaluation conditions, but suppress directional outlook, expected
  return, action-oriented Fit, and suggested weight.
- Retain thesis, counter-thesis, quantitative invalidation thresholds, and
  replay metadata in a Decision Card. Keep optional Narrative Attachment
  separate so failure or regeneration never changes the result hash.
- Bind external policy-conditioned labels/weights to effective jurisdiction-
  specific `LegalApprovalRecord` and `DisclosureVersion` and counsel-approved
  output/profile schema. Fail closed when missing, expired, revoked, or wrong.

## Out of Scope

LLM-authoritative decisions, learned policy override of hard caps, trading or
execution, and any assumption that a current agent `decision/confidence` DTO
is target-compliant. Without OQ-1 approval, external output is limited to
objective research and only a counsel-approved non-action Fit shape if allowed.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md), not evidence of completed delivery.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-024` | Portfolio-independent Investment Quality. |
| `PRD-FR-025` | Marginal Portfolio Fit and hard-limit interactions. |
| `PRD-FR-026` | Minimum explicit V1 User Policy. |
| `PRD-FR-027` | Complete versioned Decision Result replay key. |
| `PRD-FR-028` | Owned/unowned action-label semantics. |
| `PRD-FR-029` | Watch Insufficient Evidence suppression. |
| `PRD-FR-030` | Optional narrative cannot mutate Decision Result. |
| `PRD-FR-031` | Retained replayable Decision Card. |
| `PRD-FR-055` | Legal gate for external policy-conditioned labels/weights. |
| `PRD-FR-065` | Structured horizon, valuation, support, risk, and weight fields. |
| `PRD-FR-066` | Versioned quantitative invalidation thresholds. |
| `PRD-FR-071` | Effective legal/disclosure records bound to output and replay. |
| `PRD-NFR-003` | Byte-equivalent structured deterministic replay. |
| `PRD-NFR-004` | Versioned, independently testable authoritative calculations. |
| `PRD-NFR-009` | Fail-closed external action output without legal approval. |
| `PRD-NFR-014` | Independent financial expected-value fixtures. |
| `PRD-NFR-018` | Bias/cost/regime-controlled point-in-time outcome validation. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) supplies evidence strength;
  [EPIC-002](EPIC-002-transaction-ledger-portfolio-state.md) supplies exact
  Portfolio State; [EPIC-003](EPIC-003-end-to-end-asset-research.md) supplies
  approved analytics and frozen benchmark selection.
- OQ-1 qualified-counsel sign-off gates external label/weight design and
  release. OQ-3 defines minimum evidence. OQ-4 approves formulas, thresholds,
  Fit policy, labels, and weights. OQ-5 requires coordinated migration of
  affected current route/DTO consumers before implementation.
- Later narrative and personalization outcomes may attach or supply bounded
  inputs; neither may alter deterministic safety enforcement.

## Risks

- A missing or inconsistent User Policy, stale mandatory evidence, unsupported
  instrument, or version mismatch could otherwise produce false precision.
- Historical outcomes can be overstated by look-ahead, survivorship,
  delistings, distributions, costs, slippage, or selective regime sampling.
- Disposition: `DOC-CONFLICT-003`, `DOC-CONFLICT-004`,
  `DOC-CONFLICT-008`, and `DOC-CONFLICT-009` remain visible in the
  [conflict ledger](../evidence/legacy-document-conflicts.md); target policy
  does not convert legacy scores or agent output into an approved decision.

## Success Evidence

- Independent expected-value fixtures hold snapshot/horizon fixed while
  varying portfolio state: Investment Quality stays equal; each Fit marginal
  effect and hard-limit boundary changes only as approved.
- Ownership-by-label decision tables reject illegal combinations. Missing
  classification, evidence, legal approval, or policy inputs suppress affected
  output; Watch fixtures prove no directional outlook, expected return,
  action-oriented Fit, or suggested weight leaks through any API/UI path.
- Complete replay-key fixtures reproduce byte-equivalent structured results
  after provider/policy changes; AI on/off/timeout/regeneration leaves the
  result hash unchanged. Card and threshold fixtures reconstruct context.
- OQ-4 versioned formula fixtures record units, periods, rounding, missing,
  stale, conflicted, restated, and corporate-action cases. Frozen point-in-time
  outcome tests report by asset/horizon and control look-ahead, survivorship,
  delistings, distributions, costs, slippage, and regimes with reproducible
  commands, results, environment, dates, and artifact locators.

## Story Plan

These are proposed IDs only. Detailed feature stories wait for OQ-1/3/4/5
approvals and a separate EPIC-004 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-004-01` | Calculate independent Investment Quality from versioned research. | EPIC-003 and OQ-4 formulas |
| `STORY-004-02` | Calculate marginal Fit under explicit policy and hard caps. | EPIC-002 state and OQ-4 Fit policy |
| `STORY-004-03` | Apply evidence, ownership, and legal gates to structured decisions. | STORY-004-01, STORY-004-02, and OQ-1/3 |
| `STORY-004-04` | Retain replayable results, cards, and invalidation thresholds. | STORY-004-03 and OQ-5 contract |
| `STORY-004-05` | Verify formulas and frozen-benchmark outcomes independently. | STORY-004-04 and OQ-4 benchmark policy |
