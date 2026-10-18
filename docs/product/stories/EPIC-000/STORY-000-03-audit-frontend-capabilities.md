# STORY-000-03 - Audit Frontend Capabilities

- Status: Complete for the current-state documentation audit; browser smoke
  remains failing.

## User Story

As a product owner, I want browser routes, API/DTO coupling, and UI failure
states evidenced so I can separate a compiled React interface from a verified
end-to-end workflow.

## Business Value

The audit preserves the direct Gemini route discrepancy and the dashboard
failure instead of promoting unit/build success into release confidence.

## Scope

Record the React shell and routes, shared Spring API client, hooks/components,
direct report request, response typing, degradation, and test results in
[frontend evidence](../../evidence/frontend.md).

## Out of Scope

No UI fix, route rewrite, DTO migration, generated market content, or E2E
assertion weakening.

## Preconditions

The frontend source and test outputs audited at commit `82b7836`, plus the
[verification contract](../../../agent/verification.md), are available.

## Acceptance Criteria

1. [Frontend evidence](../../evidence/frontend.md) declares
   `CAP-CUR-FE-001` through `CAP-CUR-FE-007`, retaining locators, E2/E3
   levels, verification output, and limitations.
2. `CAP-CUR-FE-002` identifies the normal Spring `/api/v1` boundary, while
   `CAP-CUR-FE-004` records the `/api/gemini/portfolio-report` exception
   with no matching repository Spring mapping. A TypeScript type is not
   treated as runtime payload validation (`CAP-CUR-FE-006`).
3. `CAP-CUR-FE-007` preserves the audited `npm test` and coverage result
   (100 passing tests), green lint/build, and `npm run e2e` result (6 passed,
   6 failed, 9 skipped), including `DashboardHome.tsx:381` and the disabled
   integrated mode. The story is an audit, not a claim that E2E passed.
4. `python scripts/validate_product_docs.py --root docs/product` succeeds
   without removing the frontend limitations.

## Data and Provenance

Source paths, test commands, output counts, environment, and audited commit
are in the evidence records. Network fixtures are mocked; no live financial
provider or production API response is used as current-state proof.

## Degradation

Loading, empty, null, and error UI paths remain endpoint-specific. An
unexpected comparison payload can still throw during rendering; the failed
E2E case is retained as evidence.

## Testing

Review `CAP-CUR-FE-007` for the historical command results and failure
locator. Run the incremental product-document validator for the story package;
do not rerun routed smoke as a documentation-only acceptance shortcut.

## Dependencies

Third runtime audit in [EPIC-000](../../epics/EPIC-000-current-state-verification.md);
its route and DTO evidence feeds `STORY-000-04` and the baseline.

## Traceability

`EPIC-000`; `CAP-CUR-FE-001`, `CAP-CUR-FE-002`, `CAP-CUR-FE-003`,
`CAP-CUR-FE-004`, `CAP-CUR-FE-005`, `CAP-CUR-FE-006`, `CAP-CUR-FE-007`.

## Definition of Done

The artifact and failure results remain reviewable, all acceptance criteria
point to existing records, and incremental documentation validation passes.
Repairing E2E and approving contract migration are separate work.
