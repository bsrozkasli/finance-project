# Ambiguous Scenarios - FundamentalsController

## 1) Null institutional scores: null vs zero

- Scenario: `GET /api/v1/fundamentals/{symbol}/institutional` when one or more score fields are null.
- Repository evidence: `docs/ERROR_CATALOG.md` defines empty-list degradation for missing institutional scores but does not define null-field rendering semantics for partially present score objects.
- Observed behavior: controller helper methods (`asBigDecimal`, `scorePercent`) convert null scores to `0`.
- Interpretation A: null should stay null to avoid implying measured value.
- Interpretation B: null-to-zero is accepted as explicit "unavailable treated as zero" normalization.
- Financial/data-integrity risk: zero can be interpreted as an actual score and mislead screening/ranking.
- Recommended ownership: define institutional score null policy in `SPEC.md` + DTO contract.
- Proposed future assertion: explicit null-score fixture expecting either `null` or `0` based on finalized contract.

## 2) Symbol whitespace trimming ownership

- Scenario: path symbols with surrounding or whitespace-only content (e.g. `" AaPl "`, `"   "`).
- Repository evidence: controller uppercases symbol but does not trim; docs require uppercase normalization but do not assign trim layer explicitly.
- Observed behavior: whitespace is preserved after uppercasing.
- Interpretation A: controller should trim and/or reject blank symbols with `400`.
- Interpretation B: trimming/validation belongs to provider adapter/service layer.
- Financial/data-integrity risk: inconsistent provider/cache behavior and noisy cache keys.
- Recommended ownership: document canonical symbol normalization boundary once (controller vs adapter).
- Proposed future assertion: either strict `400` for blank/whitespace or deterministic trimmed delegation contract.

## 3) Provider-exception degradation ownership (controller vs outbound adapters)

- Scenario: outbound collaborators throw runtime exceptions.
- Repository evidence: AGENTS/SPEC emphasize graceful degradation for non-critical provider failures; some adapters (e.g., concrete `FinnhubClient`) already swallow exceptions in production.
- Observed behavior: direct throws from mocked collaborators propagate as `ServletException` without graceful HTTP response.
- Interpretation A: controller must harden and degrade even if adapter throws unexpectedly.
- Interpretation B: adapters own catch/degrade behavior; controller assumes non-throwing degraded contracts.
- Financial/data-integrity risk: brittle API behavior if adapter implementation changes.
- Recommended ownership: make outbound port exception contract explicit (throws vs never-throws/degrade).
- Proposed future assertion: dedicated contract tests at adapter boundary plus controller expectations aligned to that contract.

## 4) Stable error schema rollout scope

- Scenario: whether this existing controller must already emit `timestamp/status/error/message/path` for every 4xx/5xx.
- Repository evidence: AGENTS smoke scenario expects stable error shape; docs also mention existing handlers may still rely on default Spring output during migration.
- Observed behavior: representative 400 security checks pass, but strict global shape enforcement remains unclear across legacy endpoints.
- Interpretation A: enforce stable schema now for all controllers.
- Interpretation B: phased migration is acceptable for legacy endpoints.
- Financial/data-integrity risk: frontend error handling inconsistency and brittle client parsing.
- Recommended ownership: publish a single repository-wide migration deadline/policy.
- Proposed future assertion: enable strict error-schema assertions once rollout policy is finalized.

## 5) Earnings period clamp vs rejection policy outside integer parse errors

- Scenario: `periods` query behavior for zero/negative/non-numeric values.
- Repository evidence: `ERROR_CATALOG` notes clamp-to-1 for minimum; API spec table does not detail all invalid cases.
- Observed behavior: zero/negative clamp to 1, non-numeric returns 400.
- Interpretation A: clamp behavior is intended and should remain.
- Interpretation B: zero/negative should be rejected with 400 for stricter input validation.
- Financial/data-integrity risk: silent coercion can hide caller bugs and telemetry quality issues.
- Recommended ownership: define exact validation policy in API spec text for `periods`.
- Proposed future assertion: pin one explicit contract (`clamp` or `reject`) and test both negative and zero accordingly.
