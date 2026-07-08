# Ambiguous Scenarios - PriceController

## 1) Path-variable whitespace trimming ownership

- Scenario: `GET /api/v1/prices/{symbol}/latest` where `{symbol}` contains surrounding spaces.
- Repository evidence: `PriceController` uppercases only (`symbol.toUpperCase(Locale.ROOT)`), while `PriceRefreshService` owns trimming and blank validation (`normalizeSymbol`).
- Current behavior: controller forwards uppercase-with-whitespace, service normalizes.
- Interpretation A: controller should trim early and never forward whitespace.
- Interpretation B: controller stays thin; service owns normalization and validation.
- Risk: duplicated normalization if both layers trim; inconsistent behavior if one layer changes.
- Recommended ownership: keep symbol normalization authoritative in `PriceRefreshService` and document this in API notes.
- Proposed future test: a dedicated contract test proving controller delegates raw path input and service performs final normalization.

## 2) Interval/range validation ownership (`unknown`, whitespace)

- Scenario: history query params such as `interval=unknown`, `range=unknown`, or whitespace-only values.
- Repository evidence: `PriceController` delegates directly; `PriceRefreshService` handles blank defaults; unknown ranges may be defaulted internally.
- Current behavior: deterministic delegation; endpoint does not reject unknown strings at controller level.
- Interpretation A: controller should validate allowed enums and return `400`.
- Interpretation B: service/provider adapter should normalize/interpret values and degrade gracefully.
- Risk: behavior drift between controllers and provider adapters; inconsistent client expectations.
- Recommended ownership: centralize validation/defaulting in service/provider layer, keep controller thin.
- Proposed future test: service-level parameter validation matrix tied to documented allowed intervals/ranges.

## 3) Dependency-exception status mapping location

- Scenario: service throws runtime exceptions on latest/history.
- Repository evidence: no `@ControllerAdvice` or `@RestControllerAdvice` is present; controller methods do not catch exceptions.
- Current behavior: exceptions bubble as `ServletException` in MVC slice tests.
- Interpretation A: each controller should map dependency exceptions explicitly.
- Interpretation B: global exception layer should map dependency exceptions for all controllers.
- Risk: inconsistent status mappings (`500` vs `503`) across endpoints.
- Recommended ownership: add a global exception mapping strategy and keep controller methods thin.
- Proposed future test: one dedicated controller-advice test suite asserting 400/404/503/500 mappings and stable error schema.

## 4) Null history list contract

- Scenario: `PriceRefreshService#getFreshHistory` returns `null`.
- Repository evidence: service implementation normally returns non-null `List`; controller does not null-guard before mapper call.
- Current behavior: unresolved in this phase (test intentionally skipped as ambiguous).
- Interpretation A: non-null list is guaranteed; controller can assume non-null.
- Interpretation B: controller should normalize null to `[]` for defensive degradation.
- Risk: empty body or NPE-like failures if future adapter breaks non-null assumption.
- Recommended ownership: document service non-null guarantee explicitly; optionally enforce with `Objects.requireNonNull` at boundary.
- Proposed future test: service contract test asserting non-null list for all branches.

## 5) Stable error schema rollout scope

- Scenario: whether stable schema (`timestamp,status,error,message,path`) is mandatory for all existing controllers now.
- Repository evidence: AGENTS smoke scenario `S8` requires stable shape broadly; SPEC/docs mention legacy controllers may still use Spring default output while new handlers should keep stable shape.
- Current behavior: `PriceController` 404 reason is present but stable JSON body is absent in this slice.
- Interpretation A: enforce stable schema immediately for all controllers.
- Interpretation B: phased migration is allowed and current behavior is transitional.
- Risk: frontend error parsing inconsistency and hard-to-debug client behavior.
- Recommended ownership: align AGENTS and SPEC/docs with one explicit migration policy date.
- Proposed future test: global contract test run in CI that validates error body shape for representative 4xx/5xx endpoints.

## 6) Cache-key normalization scope (case vs trim)

- Scenario: cache key uses `#symbol.toUpperCase()` but does not trim whitespace.
- Repository evidence: annotation keys in controller include uppercase normalization only.
- Current behavior: case-insensitive keying is guaranteed; whitespace normalization depends on request/route and service handling.
- Interpretation A: key should include `trim()` to avoid accidental key skew.
- Interpretation B: key should mirror raw path variable and leave normalization elsewhere.
- Risk: multiple keys for same logical symbol if whitespace enters routing path.
- Recommended ownership: define canonical symbol normalization once and reuse in cache key strategy.
- Proposed future test: cache integration test verifying key equivalence across symbol formatting variants.
