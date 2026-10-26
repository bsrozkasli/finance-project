# Decisions: provider failure status on the watchlist research snapshot (third slice of the section status contract)

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent
and asked that every decision be recorded. This continues the
[smart report slice](2026-10-26-section-status-smart-report.md) (D-5 items 2 and 3) and the
[agent analysis slice](2026-10-26-agent-analysis-decision-status.md). Legal, data-rights, policy and recovery decisions
(OQ-1, OQ-2, OQ-3, OQ-8) are not taken here.

**Scope:** `PRD-FR-007` and `PRD-FR-009` for the sections of `GET /api/v1/watchlists/{id}/research-snapshot`
(fundamentals, earnings, institutional, technical), plus the cache behavior that decides how long a failure is remembered.
**State:** Accepted 2026-10-26.

## Finding

1. The data-service adapters catch every exception and return an empty result. A real provider failure therefore reaches
   the watchlist use case as `EMPTY` ("No data returned by provider"), not `FAILED`; the use case's message-based status
   mapping (`statusFor`) runs only when an exception escapes, which happens only for the technical section's HTTP 422.
2. `@Cacheable` on those adapter methods caches the empty result: no `disableCachingNullValues` is configured, and an
   `Optional.empty()` is stored as a null value. In `researchCache` (12 hours) one failed call to the data-service is
   remembered for the whole period for fundamentals, valuation, earnings, institutional scores and the composite score;
   the smart report then uses its fallback for the same period. A transient failure becomes a lasting wrong answer.
3. The data-service never sends HTTP 429 (a provider 429 becomes a 500, or a 404 when treated as "no history"), so
   `RATE_LIMITED` cannot be observed from the backend today.
4. The use case's own circuit breaker counts a swallowed failure as a success, so it never opens for real failures.

## D-1. Failures are not remembered

The five `researchCache` methods of the research adapter (fundamental, valuation, earnings, institutional, composite) do
not cache an empty result any more (`unless` on the cache annotation: empty `Optional`, empty list). Why: the adapter cannot
tell "no data exists" from "the call failed" on this path, and remembering the wrong one for 12 hours is worse than asking
the data-service again, which has its own caches. Cost if wrong: more data-service calls for symbols that really have no
data; the cache TTL of non-empty results is unchanged.

## D-2. Outcome-returning methods (additive, existing methods untouched)

1. A domain value `ProviderFetch<T>` carries `outcome` (`OK`, `EMPTY`, `FAILED`, `RATE_LIMITED`, `INSUFFICIENT_DATA`), the
   data when `OK`, and a short message. Ports gain methods that return it for fundamentals, earnings and institutional
   scores (`ResearchDataPort`) and technical analysis and signals (`TechnicalAnalysisPort`).
2. The existing `Optional` methods and every other caller (smart report, fundamentals controller, technical controller, company
   report, asset detail, radar job) are not changed in behavior, because several depend on empty-on-failure.
3. Mapping in the adapters, from the HTTP result of the data-service call:

| Result | Outcome |
|---|---|
| 200 with data | `OK` |
| 200 with no body or no usable data, or 404 | `EMPTY` |
| 422 | `INSUFFICIENT_DATA` |
| 429 | `RATE_LIMITED` |
| 5xx, 400, I/O error, timeout, unreadable body | `FAILED` |

   Anything else is `FAILED`. The status is decided from the status code and the exception type, never from message text.
4. `RATE_LIMITED` is mapped for completeness. Because the data-service does not send 429, it will rarely appear; making the
   data-service return 429 with `Retry-After` for a provider limit is a separate decision (see D-5).

Cost if wrong: a mapping table in two adapter classes.

## D-3. Use case

`WatchlistResearchSnapshotUseCase` switches on the outcome and no longer relies on message text for these sections. A
`FAILED` or `RATE_LIMITED` outcome counts as a failure for its circuit breaker; `EMPTY`, `INSUFFICIENT_DATA` and `OK` do
not (they are valid answers). Section messages are the outcome message, not provider text. The overall status keeps the
use case's existing precedence, which is the canonical one.

## D-4. Cache for outcomes

Outcomes are cached only when `OK`, with their own keys (not the keys of the `Optional` methods, whose value types differ), in
the existing `researchCache` TTL, so the snapshot does not call the data-service for every refresh. A real-Redis round trip
proves the outcome value serializes and deserializes through the shared cache serializer; if it does not, the unwrapped
data is cached instead. `FAILED`, `RATE_LIMITED`, `INSUFFICIENT_DATA` and `EMPTY` are never cached. Cost if wrong: a
data-service call per refresh for the affected sections.

## D-5. Out of this slice

The data-service returning 429, the price section of the snapshot (its error handling in `PriceRefreshService` was not
verified), the other swallowing adapters, and deleting `WatchlistResearchService` (dead code in main, referenced only by
tests; its different overall-status precedence is not used). Each needs its own change.

## Implementation rulings

Rulings made while coding are appended below as `R-n`.
