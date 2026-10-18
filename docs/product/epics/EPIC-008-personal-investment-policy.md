# EPIC-008 - Personal Investment Policy

- Phase: Post-V1, after trusted core and Value MVP; not Value-MVP scope.
- Delivery state: Approved target capability `CAP-TGT-008`, but all owned gap
  rows are Deferred for Post-V1 delivery. No learned influence is live.

## Outcome

With revocable informed consent, an investor may inspect, correct, export,
reset, or delete a bounded personal policy that learns from explicit decisions.
It can propose only approved soft adjustments; backend deterministic evidence,
legal, and hard-risk policy remains authoritative and always has a fallback.

## Problem

Passive clicks, model-generated choices, or other users' behavior are not
valid labels for this investor. A learned model without history, shadow,
maturity, deletion, and legal gates could create unexplainable action changes
or retain personal data after consent withdrawal.

## Scope

- Start Decision Event capture only after consent. Retain point-in-time
  inputs, every shown alternative including rejected ones, explicit user
  confirmation, and provenance. Passive views/clicks are diagnostic only;
  reject model-self-labels and cross-user training or feature transfer.
- Limit learning to pairwise ranking among deterministically eligible
  candidates and bounded soft-policy calibration. Ranking eligibility needs
  at least 20 explicit decisions across eight weeks plus four weeks of shadow
  mode. Label/weight influence additionally needs 30 decisions matured over
  three months, zero hard-policy violations, and user approval.
- Emit a versioned adjustment proposal only. With at least `Medium` Evidence
  Strength and no hard-limit violation, backend policy may allow only
  `Add→Watch`, `Watch→Add` when base quality is positive, `Hold→Add`,
  `Hold→Reduce`, `Reduce→Hold`, or `Avoid→Watch`. Never allow `Avoid→Add`,
  `Reduce→Add`, any change to `Watch - Insufficient Evidence`, or a higher
  weight cap than deterministic or explicit policy permits.
- Support access/export, correction/reset by new version, consent withdrawal,
  and deletion across active events, derived features, personal snapshots,
  model artifacts, narratives, exports, caches, personal results, and replay
  keys. Retain only a non-identifying deletion receipt.
- Cryptographically erase or expire backup copies within 30 days unless an
  approved legal duty requires a minimized, restricted hold excluded from
  serving/training; disclose the hold and delete when the duty ends.
- On timeout, drift, insufficient history, reset, deletion, withdrawal, or
  hard-policy violation, disable learned influence and restore explicit-policy
  deterministic behavior while core research remains available.

## Out of Scope

Value-MVP delivery, autonomous policy changes, cross-user behavioral
training, passive-click labels, model authority over hard limits or missing
evidence, and an unapproved external action label or suggested weight.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md). The PRD approves target behavior while
the gap map defers its delivery; this epic does not promote readiness.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-044` | Consented, point-in-time explicit Decision Events. |
| `PRD-FR-045` | Pairwise/soft learning with invalid-label exclusions. |
| `PRD-FR-046` | History, shadow, maturity, and approval thresholds. |
| `PRD-FR-047` | Bounded backend-enforced transition and cap proposal. |
| `PRD-FR-048` | Access/export of personal policy and learning state. |
| `PRD-FR-049` | Failure and withdrawal fallback to explicit policy. |
| `PRD-FR-067` | Versioned correction and reset without history rewrite. |
| `PRD-FR-068` | Revocable learning consent and continued core access. |
| `PRD-FR-069` | Active/derived cross-store deletion and receipt. |
| `PRD-FR-070` | Thirty-day backup expiry or governed legal hold. |
| `PRD-NFR-006` | Personal-data access, correction, export, withdrawal, deletion. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) and
  [EPIC-004](EPIC-004-investment-quality-and-portfolio-fit.md) own the
  non-negotiable evidence, legal, and deterministic decision boundaries;
  [EPIC-007](EPIC-007-material-change-monitoring.md) establishes an independent
  personalization disable switch.
- OQ-1 qualified-counsel output/profile approval and OQ-3/4 policy versions
  precede any label/weight influence. OQ-7 defines shadow/control measurement.
  A personal-data store inventory and legal retention decision precede
  detailed deletion stories; Post-V1 stage approval remains required.

## Risks

- Selection bias, immature decisions, shadow leakage, and consent ambiguity
  could make a measured improvement misleading or unsafe.
- Deletion can leave derived/cache/export or backup copies unless each store
  has an owned inventory, erasure proof, and legal-hold isolation.
- Disposition: `DOC-CONFLICT-009` remains in the
  [conflict ledger](../evidence/legacy-document-conflicts.md); current agent
  decisions are not a personal-model adjustment contract.

## Success Evidence

- Consent and training-set fixtures reject pre-consent, passive, synthetic,
  and cross-user labels and retain all displayed/rejected alternatives.
- Threshold tests cover 19/20 and 29/30 decisions, eight-week, four-week
  shadow, three-month maturity, zero violations, and user approval. Property
  tests enumerate every allowed/unlisted transition and reject cap increases,
  insufficient-evidence changes, and missing legal/policy approvals.
- Timeout/drift/withdrawal/reset/deletion tests reproduce explicit-policy
  output and continued core access. Export reconciles all active stores;
  deletion fixtures prove each store and replay termination, 30-day backup
  expiry or restricted legal hold, duty-end erasure, and receipt. OQ-7 control
  comparison records method, sample, results, environment, date, and locator.

## Story Plan

Proposed IDs are not implementation stories. Separate EPIC-008 planning waits
for Post-V1 approval, consent/retention schema, and OQ-1/3/4/7 artifacts.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-008-01` | Capture consented, complete Decision Events. | EPIC-004 and consent schema |
| `STORY-008-02` | Train bounded pairwise ranking with shadow eligibility. | STORY-008-01 and OQ-7 |
| `STORY-008-03` | Enforce backend-only bounded proposals and fallback. | STORY-008-02 and OQ-1/3/4 |
| `STORY-008-04` | Deliver personal-data rights and store-by-store deletion. | STORY-008-01 and retention approval |
