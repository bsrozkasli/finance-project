# Decisions: decision status on the agent analysis (second slice of the section status contract)

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent
and asked that every decision be recorded. This continues the
[smart report slice](2026-10-26-section-status-smart-report.md) (D-5 item 1). Legal, data-rights, policy and recovery
decisions (OQ-1, OQ-2, OQ-3, OQ-8) are not taken here.

**Scope:** `PRD-FR-007` and `PRD-FR-009` for `GET /api/v1/agent-analysis/{ticker}` and its Redis cache.
**State:** Accepted 2026-10-26.

## Finding

When the portfolio manager model does not return valid JSON, the data-service builds a placeholder verdict: `HOLD` with
confidence `50`, or `BUY`/`SELL` with confidence `70` chosen by keyword, and marks the section `unparseable`
(`decision_availability`). The Spring backend drops that availability field, so the placeholder reaches the API response
and the Redis cache (15 minutes by default, `agent-analysis.cache-ttl-minutes`) as if it were a decision. The only frontend consumer (`ResearchAgentReport`) does not render
`decision` or `confidence` today, so the placeholder is not on screen yet, but it is in the contract and in the cache, and
any future consumer would show it as evidence. AGENTS.md forbids replacing missing evidence with synthetic values.

## D-1. Contract (stricter, all consumers change together)

1. The response keeps every existing field and gains `decision_status`: `{ "status": <status|null>, "reason": <string|null> }`
   with the seven-status vocabulary of the smart report decision; this slice produces `OK` and `FAILED` only.
2. Mapping: data-service `available` → `OK`; `unparseable` → `FAILED` (the reason code passes through, for example
   `pm_response_not_json_default_hold`); `unavailable` or `insufficient` → `FAILED` as well, because the verdict could not
   be produced; an absent availability (an older data-service) or an unknown status → `null` (unknown), never `OK`.
3. **When the status is `FAILED`, `decision` and `confidence` are `null`** (the placeholder is not passed on). The
   portfolio manager's raw reasoning text is still returned, because it is what the model actually said. When the status is
   `OK` or unknown (`null`), `decision` and `confidence` are returned as received (an unknown status comes only from an
   older data-service during a rollout).
4. This makes `decision` and `confidence` nullable in the response. The repository has one consumer, which changes in the
   same pull request; no external client is visible in the repository, the same assumption as the OQ-5 decisions of
   2026-10-22 and 2026-10-24. Cost if wrong: an external client that assumed non-null fields must handle `null`.

## D-2. Cache

1. Results whose `decision_status` is not `OK` are **not cached**, so the next request asks the data-service again.
2. A cached entry written before this change has no `decisionStatus`; it is treated as a cache miss and recomputed, so a
   stale placeholder can never be served from an old entry. Cost if wrong: one recomputation per symbol after the rollout.

## D-3. Display

1. The AI report shows a visible note in the portfolio manager section when the status is `FAILED` ("Karar çıktısı
   ayrıştırılamadı; karar gösterilmiyor") with the reason code, and a "Durum bilinmiyor" note when the status is unknown.
2. The decision and confidence are not added to the screen by this change; if a status is not `OK` nothing may show them.
3. The status is not an investment signal.

## D-4. Out of this slice

The data-service itself still builds the placeholder internally (it is only marked); changing the data-service response to
omit it is a larger change with its own consumers and is not made here. Adapter exceptions swallowed to empty results and
the `STALE` meaning remain open from the earlier decision record.

## Implementation rulings

Rulings made while coding are appended below as `R-n`.

- **R-1. Correction of the cache duration.** The decision text said six hours; the code default is 15 minutes
  (`agent-analysis.cache-ttl-minutes`). The six hours belong to the smart report cache. Nothing else depends on the
  number; the rules in D-2 hold for any duration.
- **R-2. An unknown status is serialized as `decision_status: null`** (the whole object), not as an object whose `status`
  is null. Frontend and schema accept both. Cost if wrong: none, both mean unknown.
- **R-3. Old cache entries are detected by a missing or non-`OK` `decisionStatus` in the stored payload.** They count as a
  miss and are evicted, so a stale placeholder is never served. Cost if wrong: one recomputation per symbol.
- **R-4. A `FAILED` result is not written to `agent_analysis_history`.** The history columns `decision` and `confidence`
  are `NOT NULL`, and writing the placeholder there would put a synthetic decision into an immutable-looking record.
  No migration is made. Cost if wrong: a failed run leaves no history row; the next successful run does.
- **R-5. Known limits accepted after review.** (1) A verdict with an unknown status (an older data-service that sends no
  availability) still carries its decision and is still written to `agent_analysis_history`, because R-4 covers only
  `FAILED`; if that older service produced a placeholder, it would be recorded. The data-service in this repository always
  sends the availability, so this exists only during a mixed-version rollout. (2) `AgentAnalysisResult` does not enforce
  "`FAILED` means a null decision" in its constructor; the adapter never builds that combination, and a structural
  assertion is a follow-up. (3) The adapter returns an empty result (a 503) when `decision` or `confidence` is missing,
  before it reads the status; the data-service model makes both fields required, so a missing decision together with
  `unavailable` cannot occur today. (4) The status value's `isOk()` and `isFailed()` helpers may appear in the JSON written
  to the history record; this is cosmetic and was not verified. Cost if wrong: a placeholder in the history during a mixed
  rollout; a stray key in a history JSON.
