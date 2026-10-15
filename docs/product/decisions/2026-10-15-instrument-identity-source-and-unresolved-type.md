# Instrument identity source and unresolved-type decision

**Recorded:** 2026-10-15

**Decision input:** Product owner selected `yfinance` as the initial instrument metadata source and approved removing the implicit `STOCK` classification for unresolved symbols.

**Scope:** EPIC-001 Task 1, `PRD-FR-001`–`003`, OQ-2 source selection, and OQ-5 migration direction.
**State:** Direction recorded; OQ-2 and OQ-5 are not fully closed.

## Decision

- Use the existing Yahoo Finance integration through `yfinance` to obtain available symbol metadata and observed instrument type for the first implementation slice. Keep it behind the existing provider boundary; tests use stubs and never contact Yahoo Finance.
- When provider data and trusted mappings cannot establish type, treat the instrument as **unresolved**. Do not assign `STOCK`, infer a type from its ticker spelling, or claim that it is eligible for stock or ETF evaluation.
- Preserve source, retrieval time, and the actual provider classification when recording an observation. A current observation must not be presented as proof of a historical classification at an arbitrary evaluation time.
- The product owner approved changing the current unresolved-symbol `STOCK/UNAVAILABLE` behavior. Before changing the public batch response or persisted type, OQ-5 still requires the route/DTO/consumer compatibility matrix and a coordinated migration; the existing `Asset.type` domain invariant does not allow null.

## Evidence and remaining gates

The [yfinance project README](https://github.com/ranaroussi/yfinance) describes a library that accesses Yahoo Finance's public APIs, disclaims Yahoo affiliation, and directs users to Yahoo's terms for data-use rights. Its `Ticker.info` and `Ticker.history` interfaces expose metadata and price history; the cited material does not establish a licensed, point-in-time security master or rights for external display, retention, redistribution, derived analytics, backtesting, or model input. These are separate OQ-2 approval requirements. `yfinance` source selection alone does not make `PRD-FR-001`–`003` Ready or authorize external evaluation.

Before EPIC-001 Task 1 can be accepted, the data-governance/legal owner must provide use-specific rights and a reliable point-in-time classification source or an approved restricted scope with independently verifiable historical snapshots. The backend/architecture owners must document how unresolved symbols appear in every affected API consumer and persisted record, then verify the migration. Until then, fail closed for eligibility and retain the existing gap-map `Blocked` status.
