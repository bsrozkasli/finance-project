# ADR-0005: DB-First Lazy Price History Loading

Date: 2026-06-28
Status: Accepted
Deciders: Development team

## Context

Historical price data is requested frequently by frontend charts, technical analysis, reports, and agent-analysis metrics. External providers can be slow, rate limited, incomplete, or unavailable. The backend already has PostgreSQL persistence for price history, so repeated reads should prefer local data. When local data is missing or stale, the system refreshes through `FinancialDataPort`, whose current composite adapter tries the backend Yahoo adapter and then the FastAPI data-service, and saves valid matching rows for later requests.

## Decision

Price history reads will use a DB-first lazy loading strategy: read from PostgreSQL, refresh through the configured `FinancialDataPort` provider chain when needed, and persist valid matching fetched rows back into PostgreSQL.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Always fetch from provider | It increases latency, provider cost, and rate-limit risk while ignoring reusable persisted data. |
| Database only | It cannot serve symbols or ranges that have not been loaded yet. |
| Background-only preloading | It adds scheduling complexity and still cannot guarantee coverage for every user-requested symbol/range. |

## Consequences

### Positive

- Repeated historical price requests are faster and less dependent on provider availability.
- Provider calls are reduced, protecting rate limits.
- Missing data can still be populated on demand.
- Persisted candles create a reusable base for reports, technical metrics, and agent-analysis snapshots.

### Negative / trade-offs

- `PriceRefreshService` needs freshness logic to decide when provider refresh is required.
- Persistence must handle duplicate candles through uniqueness/upsert behavior.
- First request for a missing symbol or range still pays provider latency.

## References

- `docs/spec/current-system/architecture.md` (Price Refresh Flow)
- `docs/spec/current-system/domain-and-data.md` (Price history)
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshService.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/PriceRepositoryPort.java`
