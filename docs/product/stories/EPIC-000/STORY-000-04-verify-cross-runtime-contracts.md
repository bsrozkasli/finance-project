# STORY-000-04 - Verify Cross-Runtime Contracts

- Status: Complete for source-and-test current-state tracing; target contract
  migration and release-level contract verification remain blocked.

## User Story

As a product owner, I want each important browser-to-Spring-to-FastAPI path
traced so I can see which runtime owns its route, response, persistence,
provider degradation, and unresolved compatibility risk.

## Business Value

This prevents target DTO semantics from silently replacing the current agent
fields or treating a direct browser report request as an evidenced Spring API.

## Scope

Review price, technical, agent, portfolio, watchlist/research/news,
macro/calendar, reports/PEG, persistence/cache/degradation, and browser
verification chains in [cross-runtime evidence](../../evidence/cross-runtime.md).

## Out of Scope

No cross-runtime code, route, DTO, cache, or provider migration; no OQ-5
approval or claim that `PRD-NFR-015` is implemented.

## Preconditions

`STORY-000-01`, `STORY-000-02`, and `STORY-000-03` have reviewable runtime
artifacts; the [cross-runtime audit](../../evidence/cross-runtime.md) was
recorded at commit `1a5e3b5`.

## Acceptance Criteria

1. [Cross-runtime evidence](../../evidence/cross-runtime.md) declares
   `CAP-CUR-XR-001` through `CAP-CUR-XR-009`, each with a route/DTO or state
   contract, source/test locator, ownership, verification, and limitation.
2. The nine records preserve browser-to-Spring and internal FastAPI hops,
   backend-owned persistence, data-service read-only analytics, resolver versus
   direct-yfinance paths, and endpoint-specific failure behavior.
3. `CAP-CUR-XR-007` and `CAP-CUR-XR-009` identify the unmatched direct
   Gemini browser path; `CAP-CUR-XR-003` retains legacy agent
   `decision`/`confidence` fields. `DOC-CONFLICT-002` and
   `DOC-CONFLICT-009` remain visible; no target field is called compatible
   without an OQ-5 decision and all-consumer tests.
4. `CAP-CUR-XR-009` retains the six failed and nine skipped browser cases,
   rather than using the passing unit/build results as end-to-end proof.
5. `python scripts/validate_product_docs.py --root docs/product` succeeds
   with all referenced evidence IDs declared.

## Data and Provenance

Every trace cites the audited source commit and path/test locators. No live
provider, LLM, production database, or external Gemini service was contacted.
The E3 browser record covers executed results, including failures, not a green
end-to-end contract.

## Degradation

Record empty, nullable, HTTP-error, stale-unknown, and UI exception outcomes
as observed. Do not substitute synthetic values or infer a uniform status
contract from one route.

## Testing

Review the recorded backend, data-service, and frontend tests listed in the
cross-runtime records; run incremental product-document validation. A future
compatibility matrix requires separate coordinated consumer fixtures.

## Dependencies

The three runtime audit stories precede this trace. `STORY-000-05` uses its
mismatches to adjudicate legacy claims; `STORY-000-06` uses its limitations in
the baseline.

## Traceability

`EPIC-000`; `PRD-NFR-015` (Blocked); `CAP-CUR-XR-001`, `CAP-CUR-XR-002`,
`CAP-CUR-XR-003`, `CAP-CUR-XR-004`, `CAP-CUR-XR-005`, `CAP-CUR-XR-006`,
`CAP-CUR-XR-007`, `CAP-CUR-XR-008`, `CAP-CUR-XR-009`;
`DOC-CONFLICT-002`, `DOC-CONFLICT-009`.

- Disposition: Retain the conflict statuses in the
  [legacy ledger](../../evidence/legacy-document-conflicts.md); this story
  records the incompatible current boundaries but makes no migration choice.

## Definition of Done

The nine traces and mismatches are reviewable, each referenced current-state ID
has its owning evidence record, and incremental validation passes. The OQ-5
compatibility decision and target contract tests remain open.
