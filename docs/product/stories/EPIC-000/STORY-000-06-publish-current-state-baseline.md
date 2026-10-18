# STORY-000-06 - Publish Current-State Baseline

- Status: Complete for the evidence-backed baseline artifact; later target
  delivery and release gates remain open.

## User Story

As a product owner, I want one bounded current-state inventory linked to its
audit records so new delivery work starts from what the repository actually
proves.

## Business Value

A stable evidence baseline makes target gaps and epic ownership traceable
without overstating financial correctness, provider availability, or complete
browser/integration verification.

## Scope

Publish [CURRENT_STATE_BASELINE.md](../../CURRENT_STATE_BASELINE.md) with
method, product-area inventory, verification status, unresolved contradiction
table, and limitations, backed by all five evidence artifacts.

## Out of Scope

No target feature implementation, release declaration, live-provider audit,
index publication from Plan 7, or change to the root implemented-system spec.

## Preconditions

`STORY-000-01` through `STORY-000-05` provide the runtime,
cross-runtime, and conflict artifacts; the target
[PRD](../../PRD.md) is interpreted separately from current evidence.

## Acceptance Criteria

1. [Baseline](../../CURRENT_STATE_BASELINE.md) contains Method, Capability
   Inventory, Verification Status, Unresolved Contradictions, and Limitations;
   its 16 product-area rows include asset, research, portfolio, AI,
   monitoring, personalization absence, identity absence, operations,
   cross-runtime boundary, and verification status.
2. Every current capability cited by the inventory has an owning record in
   [backend](../../evidence/backend.md),
   [data-service](../../evidence/data-service.md),
   [frontend](../../evidence/frontend.md), or
   [cross-runtime](../../evidence/cross-runtime.md) evidence. E2 inspection is
   not relabeled E3, and E0 absences remain absences.
3. The baseline retains 13 skipped backend tests, 6 failed and 9 skipped
   browser tests, no live provider/LLM/database verification, mixed provider
   degradation, and the dispositions from the
   [conflict ledger](../../evidence/legacy-document-conflicts.md).
4. `python scripts/validate_product_docs.py --root docs/product` exits 0
   after all six stories exist. This is incremental documentation validation;
   it is not `--complete` publication or an S1-S10 release smoke result.

## Data and Provenance

The baseline identifies audit commit `e1171d5`, date, reviewer, environment,
source set, and evidence-level rule. Its source artifacts carry their own
locators and recorded test results. No financial value or AI output is
manufactured to fill a missing field.

## Degradation

Unverified provider freshness, absent auth/personalization, partial or empty
responses, Testcontainers skips, and failing E2E remain explicit limitations.
The baseline must not be used to infer a populated market value or a uniform
availability contract.

## Testing

Run incremental product-document validation and inspect the baseline's
verification table against the five evidence artifacts. Runtime suites are
historical audit evidence; no runtime source changes occur in this story.

## Dependencies

Final publication story in [EPIC-000](../../epics/EPIC-000-current-state-verification.md).
Plans 4-6 consume this baseline as current evidence, not as target approval.

## Traceability

`EPIC-000`; `CAP-CUR-BE-010`, `CAP-CUR-DS-009`, `CAP-CUR-FE-007`,
`CAP-CUR-XR-009`; `PRD-NFR-017` (Blocked). The full inventory links to
its owning `CAP-CUR-*` records and the conflict table links to all ten
declared `DOC-CONFLICT-*` records.

- Disposition: Retain all conflict statuses in the owning ledger; baseline
  publication does not close the target compatibility or release gates.

## Definition of Done

The baseline and source artifacts are present, each product-area claim is
bounded by its evidence level and limitation, and incremental documentation
validation passes. Target NFR-017 and complete-mode publication stay blocked.
