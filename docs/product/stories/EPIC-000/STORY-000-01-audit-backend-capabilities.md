# STORY-000-01 - Audit Backend Capabilities

- Status: Complete for the current-state documentation audit; not a target
  feature or full integration-verification claim.

## User Story

As a product owner, I want backend routes, ownership, persistence, degradation,
and test evidence inventoried so I can distinguish implemented Spring behavior
from proposed delivery work.

## Business Value

The audit prevents a controller mapping or passing unit suite from being
mistaken for verified provider freshness, production authorization, or release
readiness.

## Scope

Record backend REST groups, domain/port boundaries, DB-first prices, asset
resolution, research, portfolio ledger, agent analysis, persistence/migrations,
cache/operations, and the actual backend test result in
[backend evidence](../../evidence/backend.md).

## Out of Scope

No endpoint, DTO, migration, provider, runtime test, or authentication change.
No claim about production database state or live provider output.

## Preconditions

The audited backend source at commit `532e2f2`, the evidence file, and the
[verification contract](../../../agent/verification.md) are available.

## Acceptance Criteria

1. [Backend evidence](../../evidence/backend.md) declares
   `CAP-CUR-BE-001` through `CAP-CUR-BE-010` with evidence level, commit,
   reviewer/date/environment, contract, locator, verification, limitations,
   and legacy-claim handling; source-inspection records remain E2.
2. `CAP-CUR-BE-010` retains the recorded Windows command `.\mvnw.cmd test`
   run from `backend/`: 450 tests, 0 failures, 0 errors, 13
   skipped. The Testcontainers Docker API limitation is visible, so the suite
   is not described as complete integration coverage.
3. [Current-state baseline](../../CURRENT_STATE_BASELINE.md) cites the backend
   evidence in asset, research, portfolio, AI, persistence, operations, and
   verification rows without promoting future auth or target decision policy.
4. `python scripts/validate_product_docs.py --root docs/product` succeeds
   with this story and its evidence references present.

## Data and Provenance

The source locator and audit commit in each record are the provenance. E3 is
limited to the executed suite in `CAP-CUR-BE-010`; no generated prices,
metadata, or production records enter this audit.

## Degradation

The evidence keeps empty/nullable provider responses, timestamp-only persisted
price freshness, and default-user scoping as limitations. A skipped integration
test does not become a pass.

## Testing

Review the recorded `.\mvnw.cmd test` result and its skip reason in
`CAP-CUR-BE-010`; rerun only when backend behavior changes. Run the incremental
product-document validator for this documentation package.

## Dependencies

First runtime audit in [EPIC-000](../../epics/EPIC-000-current-state-verification.md);
its declared evidence is an input to `STORY-000-04` and `STORY-000-06`.

## Traceability

`EPIC-000`; `CAP-CUR-BE-001`, `CAP-CUR-BE-002`, `CAP-CUR-BE-003`,
`CAP-CUR-BE-004`, `CAP-CUR-BE-005`, `CAP-CUR-BE-006`, `CAP-CUR-BE-007`,
`CAP-CUR-BE-008`, `CAP-CUR-BE-009`, `CAP-CUR-BE-010`.

## Definition of Done

The evidence file and baseline links exist, all acceptance criteria can be
checked against their recorded outputs, and incremental documentation
validation passes. Completion means the audit is recorded, not that skipped
tests or external behavior are resolved.
