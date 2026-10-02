# EPIC-000 - Current-State Verification

## Outcome

A product owner can inspect one evidence-backed baseline of the existing Spring,
FastAPI, and React system, including what was tested, what was only inspected,
and what remains contradicted or unverified. This epic packages the Plan 2-3
audit; it does not deliver target product behavior or establish release readiness.

## Problem

Legacy documents mix implemented behavior, proposals, and target intent. Without
an auditable boundary, delivery stories could treat a route, type, passing unit
test, or archived roadmap as proof of a complete user workflow. The current
baseline also records skipped backend integration coverage and failing frontend
browser smoke; those results must stay visible.

## Scope

- Audit backend, data-service, and frontend evidence independently at their
  recorded commits and evidence levels.
- Trace browser-to-Spring-to-FastAPI routes, DTOs, provider/cache boundaries,
  persistence ownership, and failure behavior without changing those contracts.
- Reconcile legacy claims with stronger repository evidence and preserve every
  unresolved conflict and limitation.
- Publish the [current-state baseline](../CURRENT_STATE_BASELINE.md) with
  reproducible locators and a passing incremental documentation check.
- Carry forward the [gap map](../CAPABILITY_GAP_MAP.md) `Documentation` and
  `Verification` rows owned by this epic as open gates, not as delivered target
  requirements.

## Out of Scope

- New market evidence, portfolio, valuation, decision, discovery, AI,
  monitoring, personalization, broker, identity, or SaaS behavior; those belong
  to the respective feature epics.
- Fixing failed E2E tests, executing skipped Testcontainers tests, changing
  production code, or declaring the target release gate satisfied.
- Selecting a contract migration for the direct Gemini route or legacy agent
  fields before the OQ-5 compatibility decision.
- Treating live provider data, production topology, or external legal/data
  rights as verified by this repository audit.

## Requirements

- `PRD-NFR-015` is the documented contract-compatibility gate. Its
  [gap-map row](../CAPABILITY_GAP_MAP.md) is `Documentation`, `Blocked`, and
  depends on OQ-5. The current-state package supplies inputs to the matrix;
  it does not approve a preserve/version/migrate/retire choice.
- `PRD-NFR-017` is the target release-verification gate. Its gap-map row is
  `Verification`, `Blocked`, and depends on OQ-8 plus repaired E2E and complete
  applicable suites. This epic records the current failures; it does not pass
  that gate.
- Current capability assertions are limited to the declared `CAP-CUR-*`
  records in [backend](../evidence/backend.md),
  [data-service](../evidence/data-service.md),
  [frontend](../evidence/frontend.md), and
  [cross-runtime](../evidence/cross-runtime.md) evidence. Contradictions retain
  their `DOC-CONFLICT-*` dispositions in the
  [legacy conflict ledger](../evidence/legacy-document-conflicts.md).

## Dependencies

1. The three runtime audits establish bounded route and test evidence before
   cross-runtime chains are interpreted.
2. Cross-runtime traces establish where legacy contract claims agree or
   conflict with current source.
3. The conflict ledger is reconciled before the baseline is published.
4. The [PRD](../PRD.md) and gap map define target-only requirements and epic
   ownership; OQ-5 and OQ-8 require later approved closure records.

## Risks

- Disposition: Retain each current `DOC-CONFLICT-*` status from the owning
  [legacy conflict ledger](../evidence/legacy-document-conflicts.md). This
  epic records the consequences but does not resolve or relabel a conflict.
- `CAP-CUR-BE-010` reports 13 skipped tests due to the recorded
  Testcontainers/Docker API mismatch. A green Maven result is not full
  persistence/integration coverage.
- `CAP-CUR-FE-007` and `CAP-CUR-XR-009` record 6 failed and 9 skipped
  Playwright cases; passing unit/build checks are not browser readiness.
- `DOC-CONFLICT-001`, `DOC-CONFLICT-002`, `DOC-CONFLICT-008`, and
  `DOC-CONFLICT-009` retain provider-boundary, direct-route, degradation, and
  legacy decision-contract uncertainty.
- Evidence from the audited commits cannot establish current external provider
  freshness, deployed controls, or target policy compliance.

## Success Evidence

- Each of the five evidence artifacts names locators, verification, limitations,
  and relevant `CAP-CUR-*` or `DOC-CONFLICT-*` records; the baseline distinguishes
  E2 inspection from E3 test evidence.
- The [baseline](../CURRENT_STATE_BASELINE.md) covers every listed product area,
  includes verification results and unresolved contradictions, and links back
  to the owning evidence records.
- `python scripts/validate_product_docs.py --root docs/product` exits 0 after
  the epic and all six stories are present. This checks documentation shape and
  references, not runtime or release readiness.
- Completion of an audit story means its documentary acceptance criteria are
  met. It does not change the `Blocked` state of `PRD-NFR-015` or
  `PRD-NFR-017`.

## Story Plan

The order follows evidence dependencies; each story is a verification or
publication artifact, not a feature implementation:

1. `STORY-000-01` - audit backend capabilities and verification limits.
2. `STORY-000-02` - audit data-service capabilities and provider limits.
3. `STORY-000-03` - audit frontend capabilities and failing browser smoke.
4. `STORY-000-04` - verify cross-runtime routes, DTO boundaries, and ownership
   against the three audits.
5. `STORY-000-05` - reconcile legacy claims and preserve conflict
   dispositions against cross-runtime evidence.
6. `STORY-000-06` - publish the current-state baseline with its limitations and
   passing incremental documentation validation.
