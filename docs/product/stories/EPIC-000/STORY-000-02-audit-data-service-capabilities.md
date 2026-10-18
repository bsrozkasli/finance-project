# STORY-000-02 - Audit Data-Service Capabilities

- Status: Complete for the current-state documentation audit; provider and LLM
  availability remain unverified.

## User Story

As a product owner, I want the FastAPI route, provider, analytics, agent, and
cache boundaries evidenced so I can avoid treating a resolver abstraction as
proof that all analytics use it.

## Business Value

The inventory exposes the direct-yfinance inconsistency and preserves the
read-only analytics boundary before later architecture and provider work.

## Scope

Record FastAPI routes, resolver chain, direct-provider paths, technical and
research responses, sequential metrics-only agents, read-only portfolio
analytics, macro/calendar caches, and local pytest evidence in
[data-service evidence](../../evidence/data-service.md).

## Out of Scope

No provider migration, financial formula revision, persistence addition, live
API call, or agent-order change.

## Preconditions

The audited data-service source at commit `d82aa7d`, its evidence artifact,
and the [verification contract](../../../agent/verification.md) are available.

## Acceptance Criteria

1. [Data-service evidence](../../evidence/data-service.md) declares
   `CAP-CUR-DS-001` through `CAP-CUR-DS-009` with reproducible locators,
   evidence levels, verification, limitations, and legacy-claim handling.
2. `CAP-CUR-DS-002` and `CAP-CUR-DS-004` separately show resolver-backed
   routes and direct-yfinance analytics. `CAP-CUR-DS-006` records the
   Fundamental -> Technical -> Risk -> Bull -> Bear -> Portfolio Manager
   sequence with prepared metrics only.
3. `CAP-CUR-DS-009` retains the recorded `data-service/`
   `.venv/Scripts/python.exe -m pytest` result: 50 passed, with provider,
   Redis, and LLM I/O stubbed. It does not prove external availability.
4. `python scripts/validate_product_docs.py --root docs/product` succeeds
   while these current evidence records remain distinct from target claims.

## Data and Provenance

Each record points to source paths and the audited commit. The recorded pytest
fixtures use boundary doubles; no live quotes, FRED/FMP data, news, model
output, or MongoDB records were generated.

## Degradation

Keep route-specific empty, nullable, 404, 422, 500, and 503 outcomes visible.
Do not infer uniform structured status, resolver fallback for direct calls, or
cache freshness from configured TTLs.

## Testing

Review `CAP-CUR-DS-009` and the direct-provider call-site inventory in
`CAP-CUR-DS-004`; the historical pytest run is evidence at its audited commit.
Run the incremental product-document validator for this package.

## Dependencies

Second runtime audit in [EPIC-000](../../epics/EPIC-000-current-state-verification.md);
its provider and agent boundaries feed `STORY-000-04` and `STORY-000-05`.

## Traceability

`EPIC-000`; `CAP-CUR-DS-001`, `CAP-CUR-DS-002`, `CAP-CUR-DS-003`,
`CAP-CUR-DS-004`, `CAP-CUR-DS-005`, `CAP-CUR-DS-006`, `CAP-CUR-DS-007`,
`CAP-CUR-DS-008`, `CAP-CUR-DS-009`.

## Definition of Done

The evidence artifact exists, the direct-provider limitation and test scope
remain explicit, and incremental documentation validation passes. Audit
completion does not resolve provider-boundary or target analytics gaps.
