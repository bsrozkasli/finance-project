# ADR-0005: DB-First Lazy Price History Loading

Date: 2026-06-28
Status: Accepted
Deciders: Development team

## Context

Historical price data is requested frequently by frontend charts, technical analysis, reports, and agent-analysis metrics. External providers can be slow, rate limited, incomplete, or unavailable. The backend already has PostgreSQL persistence for price history, so repeated reads should prefer local data. When local data is missing or stale, the system still needs to serve useful data by falling back to the FastAPI data-service and then saving the fetched rows for later requests.

## Decision

Price history reads will use a DB-first lazy loading strategy: read from PostgreSQL, fall back to the data-service when needed, and persist fetched rows back into PostgreSQL.

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

- Controllers/adapters need freshness logic to decide when fallback is required.
- Persistence must handle duplicate candles through uniqueness/upsert behavior.
- First request for a missing symbol or range still pays provider latency.

## References

- SPEC.md Section 10
- SPEC.md Section 14
- AGENTS.md Section 3
- backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/PriceRepositoryPort.java