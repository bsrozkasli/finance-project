# System Refactor Roadmap

Status: first backend journal slice implemented on `feat/system-refactor-foundation`.

The system refactor is behavior-preserving. Public endpoint paths, DTO field names,
fixed ports, persistence semantics, and provider degradation rules remain stable.

## Priority Findings

- `frontend/src/App.tsx` mixes routing, remote-data mapping, modal state, and commands.
- `frontend/src/api/client.ts` exposes about 100 declarations from one module.
- `PortfolioDashboardController` contains performance and allocation calculations.
- `JournalController` contained PnL, return, enrichment, and statistics calculations.
- `factor_analysis_service.py` mixes provider access, normalization, and scoring.

## Completed Slice

- Added characterization coverage for journal controller delegation and journal trade calculations.
- Extracted journal list enrichment, stats, create/update/delete orchestration, and PnL/return calculations into framework-free domain service `JournalTradeService`.
- Registered `JournalTradeService` through `DomainConfig` without adding Spring annotations to domain classes.
- Preserved `/api/v1/journal/trades`, `/api/v1/journal/trades/stats`, DTO field names, status codes, and `JournalTradePort` persistence semantics.

## Delivery Order

1. Add characterization tests for journal and portfolio dashboard contracts. Journal done; portfolio pending.
2. Extract journal calculations into a framework-free domain service and use case. Done.
3. Extract portfolio dashboard calculations into focused use cases. Pending.
4. Move frontend remote-data orchestration from `App.tsx` into feature hooks. Pending.
5. Split `api/client.ts` into compatible domain modules behind a barrel export. Pending.
6. Separate data-service provider access from pure factor calculations. Pending.
7. Add architecture tests and CI thresholds for dependency and bundle regressions. Pending.

## Next Slice

Continue with portfolio dashboard characterization tests, then move performance,
allocation, max drawdown, and enriched-position calculations out of
`PortfolioDashboardController` into domain/use-case services. Preserve all existing
portfolio dashboard endpoint paths and response field names.

Suggested atomic commits after this slice:

1. `test(backend): characterize portfolio dashboard calculations`
2. `refactor(backend): extract portfolio dashboard service`

Do not combine this work with authentication, schema redesign, provider replacement,
dependency upgrades, or visual redesign.