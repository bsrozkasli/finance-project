# STORY-000-05 - Reconcile Legacy Document Claims

- Status: Complete for conflict inventory and disposition recording; open
  conflicts remain open.

## User Story

As a product owner, I want archived and proposed claims compared with current
source evidence so an obsolete route, provider rule, storage claim, or roadmap
does not become a false implementation baseline.

## Business Value

The conflict ledger gives later feature owners a precise unresolved question
instead of forcing them to infer a product decision from historical prose.

## Scope

Review all ten records in the
[legacy conflict ledger](../../evidence/legacy-document-conflicts.md), their
claim sources under `archive/legacy-docs-2026-09-29`, the
[archive manifest](../../../LEGACY_ARCHIVE_MANIFEST.md), and the stronger
runtime/cross-runtime evidence.

## Out of Scope

No archived document deletion, runtime fix, contract migration, provider
switch, legal decision, or reclassification of a target requirement.

## Preconditions

`STORY-000-04` has traced the current source boundaries, and the runtime
evidence artifacts plus legacy archive/manifest are available for comparison.

## Acceptance Criteria

1. [Conflict ledger](../../evidence/legacy-document-conflicts.md) declares
   `DOC-CONFLICT-001` through `DOC-CONFLICT-010`; each record names competing
   claims, stronger evidence, locator, verification, limitation, affected
   artifact, and explicit disposition.
2. The archived source paths and manifest permit retrieval without promoting
   roadmap or proposed JWT/Mongo behavior into current capability. The current
   source and `CAP-CUR-XR-001` through `CAP-CUR-XR-009` govern runtime claims.
3. The ledger preserves `DOC-CONFLICT-002` as Unresolved and the remaining
   Correct Later or Historical dispositions. Direct-yfinance, current PEG,
   permissive symbol resolution, mixed degradation, and legacy agent fields
   remain visible as current/target differences.
4. [Baseline](../../CURRENT_STATE_BASELINE.md) carries the ten dispositions
   and affected current evidence without assigning a future fix as already
   implemented.
5. `python scripts/validate_product_docs.py --root docs/product` succeeds;
   it must not pass by deleting a conflict or its limitation.

## Data and Provenance

Historical paths are claim sources, not E2/E3 runtime evidence. Each conflict
record cites its audited commit, source locator, reviewer/date/environment,
and stronger current record. No live market or AI data is involved.

## Degradation

Unknown route ownership and variable provider failure semantics remain
explicit. Unresolved does not mean silently compatible or safely substituted.

## Testing

Review claim/locator/disposition fields for all ten ledger entries against
the archive and current evidence; run incremental product-document validation.
The earlier runtime tests support bounded current claims, not a new fix.

## Dependencies

The three runtime audits and cross-runtime trace precede this reconciliation;
`STORY-000-06` uses its disposition table in the baseline.

## Traceability

`EPIC-000`; `DOC-CONFLICT-001`, `DOC-CONFLICT-002`,
`DOC-CONFLICT-003`, `DOC-CONFLICT-004`, `DOC-CONFLICT-005`,
`DOC-CONFLICT-006`, `DOC-CONFLICT-007`, `DOC-CONFLICT-008`,
`DOC-CONFLICT-009`, `DOC-CONFLICT-010`; `CAP-CUR-XR-001`,
`CAP-CUR-XR-002`, `CAP-CUR-XR-003`, `CAP-CUR-XR-004`,
`CAP-CUR-XR-005`, `CAP-CUR-XR-006`, `CAP-CUR-XR-007`,
`CAP-CUR-XR-008`, `CAP-CUR-XR-009`.

- Disposition: Retain exactly the owning ledger's per-record statuses;
  recording the conflict audit is not resolution of Correct Later or
  Unresolved items.

## Definition of Done

All ten claim pairs, retrieval locators, stronger-evidence decisions, and
dispositions are reviewable; the baseline preserves them; incremental
validation passes. Follow-on architecture and contract decisions remain open.
