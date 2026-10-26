# Decisions: section status on the smart report (first slice of the seven-state contract)

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent
and asked that every decision be recorded (2026-10-22 and 2026-10-25). Legal, data-rights, policy and recovery decisions
(OQ-1, OQ-2, OQ-3, OQ-8) are outside this delegation and are not taken here.

**Scope:** `PRD-FR-007` and `PRD-FR-009` for one path: composite `breakdown_availability` → smart report → Stock Detail
screen. The EPIC-001 plan listed "the seven section statuses" as an OQ-5 item still open. An exploration on 2026-10-26
found that the data-service already says which score components are unavailable and why, but the backend drops those
fields, so a user can read a score without knowing a component was missing.
**State:** Accepted 2026-10-26.

Each decision states what it costs if wrong.

## D-1. Vocabulary and meaning

1. The seven statuses are the existing domain enum `WatchlistResearchStatus` (`OK`, `STALE`, `EMPTY`, `FAILED`,
   `RATE_LIMITED`, `INSUFFICIENT_DATA`, `PENDING_REFRESH`). No second enum is created.
2. Meaning for this contract: `STALE` is data older than its freshness policy. (The watchlist snapshot also uses `STALE`
   for "circuit open"; that is a known inconsistency, not changed here, and is listed under follow-ups.)
3. This slice produces only `OK`, `EMPTY`, `INSUFFICIENT_DATA` and `FAILED`. `RATE_LIMITED`, `STALE` and
   `PENDING_REFRESH` are not produced because no source can state them honestly: the data-service has no rate-limit,
   stale or pending signal in any reason code, and the backend adapters turn exceptions into an empty result.
   Inventing them from message text would present a guess as a status.

Cost if wrong: two more statuses need a source later; the field already carries any of the seven.

## D-2. Mapping from the data-service

| Data-service `status` | Reason codes (examples) | Section status |
|---|---|---|
| `available` | none | `OK` |
| `insufficient` | `no_articles_in_lookback`, `*_empty` | `INSUFFICIENT_DATA` |
| `unavailable` | `*_component_unavailable`, `*_score_not_mapped`, `*_score_missing`, `*_grade_missing`, `*_failed` | `EMPTY` (the data was not produced) |
| `unparseable` | `llm_response_*`, `pm_response_*` | `FAILED` |

1. The reason code is passed through unchanged as `reason`; the backend does not rewrite it.
2. An unknown `status` value maps to no status (`null`), never to `OK`.
3. Fallback score: when the composite call is missing and the Finnhub-derived score is used, every component and the
   overall status are `INSUFFICIENT_DATA` with reason `fallback_source_used`, because the evidence behind the number is
   different and thinner than the composite. It is never `OK`.

Cost if wrong: a few codes move to a different status; the mapping is one table in one class.

## D-3. Contract (additive)

1. `GET /api/v1/reports/smart/{symbol}` keeps every existing field and gains `sectionStatus` (nullable):
   `{ "overall": <status|null>, "components": { "<component>": { "status": <status|null>, "reason": <string|null> } } }`.
   Components are the keys of `breakdown_availability` (for example `sentiment`, `factor`, `valuation`, `earnings`,
   `fundamental`); the map is empty or absent only when the data-service sent none.
2. Overall: `OK` only when every component is `OK`; otherwise the most severe of `FAILED`, `INSUFFICIENT_DATA`, `EMPTY`
   in that order. If the composite response carried no availability at all (an older data-service, or a cached report
   written before this change), `sectionStatus` is `null` and the UI says the status is unknown; it is never shown as `OK`.
3. Existing getters, the cached report shape and `OpportunityRadarJob` are unchanged. The Redis `smartReportCache`
   (6 hours) may still hold old entries without the field; that is tolerated and needs no eviction.

Cost if wrong: an additive field can be reshaped before any consumer depends on it.

## D-4. Display rules (frontend)

1. A component with a `null` score still shows "Veri yok"; next to it the section status appears as a labelled pill using
   the Turkish labels the watchlist screen already uses ("Tamam", "Yetersiz veri", "Boş", "Başarısız", ...), and the reason
   code is shown as small text. `OK` shows no warning styling.
2. A report whose overall status is not `OK`, or is unknown, carries a visible note that the score rests on incomplete
   evidence; the grade and recommendation are still shown but never as stronger than the status allows.
3. The status is not an investment signal and is never combined into the score.
4. Places that default a missing value to 0 or to a neutral number are inspected; any that present a missing evidence
   value as a real one are fixed, cosmetic ones are listed and left.

Cost if wrong: copy and layout only.

## D-5. Out of this slice (next, in this order)

1. Agent analysis: the portfolio-manager parse fallback returns HOLD with confidence 50 or BUY/SELL with 70 and the
   frontend shows it as a decision. This is the largest "missing becomes evidence" gap; it needs its own additive
   `decisionStatus`, a cache payload change and positional-record changes.
2. Exceptions swallowed to empty results in the data-service adapters, so rate limits and failures can reach the
   statuses honestly (`RATE_LIMITED`, `FAILED`).
3. The `STALE` meaning in the watchlist snapshot and the two precedence rules in `WatchlistResearchService` versus
   `WatchlistResearchSnapshotUseCase` (the use case is the canonical one).
4. Asset detail sections (`OK`/`EMPTY`/`FAILED` only) and shared fixtures for the remaining responses.

## Implementation rulings

Rulings made while coding are appended below as `R-n`.
