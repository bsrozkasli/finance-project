# C0b Compatibility Matrix

**Status:** Evidence artifact — C0a shipped 2026-10-15

This matrix documents how every consumer of the four data-service endpoints
that received C0a availability fields behaves when those fields are present
in the response.

## Audit Metadata

- Audit Commit: `8b32875` (C0a shipped on `feat/local-model-phase-1`, merged to `main` with PR #47)
- Reviewer: Claude
- Review Date: 2026-10-15; sections added 2026-10-22 without changing the findings
- Environment: data-service FastAPI with pytest boundary stubs; Spring backend consumers inspected from source.
- Scope: The four data-service endpoints that gained C0a availability fields and every consumer of them.

## Rule

C0a fields are **additive only**. No existing field changes type, name, or
value. Consumers that do not know about `SectionAvailability` must continue
to work without modification.

## Evidence Records — Consumer Matrix

### `POST /api/v1/agent-analysis` — new field: `decision_availability`

| Consumer | Runtime | How it deserializes | C0a impact | Evidence |
|---|---|---|---|---|
| `DataServiceAgentAnalysisAdapter` | Spring (Java) | `RestTemplate` + Jackson default (`FAIL_ON_UNKNOWN_PROPERTIES=false`) | Field consumed since 2026-10-26: mapped to `decision_status` (`available`→`OK`, other known statuses→`FAILED` with the placeholder decision withheld, absent/unknown→`null`); no longer dropped | `DataServiceC0aCompatibilityTest#agentAnalysisConsumesDecisionAvailabilityAndWithholdsThePlaceholder` and `DataServiceAgentAnalysisAdapterTest` (decision `2026-10-26-agent-analysis-decision-status`) |

### `GET /api/v1/research/composite/{symbol}` — new fields: `breakdown_availability`, `unavailable_components`

| Consumer | Runtime | How it deserializes | C0a impact | Evidence |
|---|---|---|---|---|
| `DataServiceResearchAdapter` | Spring (Java) | `RestTemplate` + Jackson default | Both fields consumed since 2026-10-26 (null when absent); no longer silently dropped | `DataServiceCompositeAvailabilityTest` (present and absent cases); `DataServiceC0aCompatibilityTest#compositeStillMapsScoresWhenBreakdownAvailabilityIsPresent` |

### `GET /api/v1/sentiment/{symbol}` — new field: `availability`

| Consumer | Runtime | How it deserializes | C0a impact | Evidence |
|---|---|---|---|---|
| `LlmInsightAdapter.getSentiment` | Spring (Java) | `RestTemplate` + Jackson default | Field silently dropped | `DataServiceC0aCompatibilityTest#sentimentIgnoresAvailability` — 4/4 pass 2026-10-15 |

### `GET /api/v1/full/{symbol}` — nested `sentiment.availability` (and nested `news_availability`, `analyst_availability`, `insider_availability`, `unavailable_components`)

| Consumer | Runtime | How it deserializes | C0a impact | Evidence |
|---|---|---|---|---|
| `LlmInsightAdapter.getFullAnalysis` | Spring (Java) | `RestTemplate` + Jackson default | All nested fields silently dropped | `DataServiceC0aCompatibilityTest#fullAnalysisIgnoresNestedSentimentAvailability` — 4/4 pass 2026-10-15 |

## Planning Finding 1 (PF-1)

`composite_score_service.py` reads `factor_res.quality_score`, `.growth_score`,
`.momentum_score`, and `.fundamental_score` at the top level, but the
production `FactorAnalysisResponse` schema nests them under `.scores`. The
same mismatch affects `ValuationResponse` (`.metrics.valuation_grade`) and
`EarningsAnalysisResponse` (`.metrics.earnings_score`).

C0a surfaced PF-1 by exposing `factor_score_not_mapped`,
`earnings_score_not_mapped`, and `valuation_grade_not_mapped` reason codes in
`breakdown_availability`. The fix — reading the correct nested path — is deferred
to C0b or the next data-service maintenance window and must be verified with
production-shaped fixtures before closing.

## C0b Scope Recommendation

Before C0b ships:
1. Fix the PF-1 path mismatch in `composite_score_service.py`.
2. Add production-shaped test fixtures for `FactorAnalysisResponse`,
   `ValuationResponse`, and `EarningsAnalysisResponse`.
3. Frontend consumers of the Spring composite endpoint (`/api/v1/reports/smart/`)
   may surface `breakdown_availability` in the UI — wire it in C0b.
4. Done 2026-10-26: Spring `AgentAnalysisResponseDto` relays `decision_availability` as
   `decision_status` (see the decision record of that date).

## Limitations

- PF-1 is still open on `main` as of 2026-10-22. `composite_score_service.py` reports `factor_score_not_mapped`, `valuation_grade_not_mapped` and `earnings_score_not_mapped` for production-shaped responses, so those components fall back to the neutral placeholder and their availability says so.
- Consumers were checked from source and stub-based tests, not against live providers.
