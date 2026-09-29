# Ambiguous Scenarios - NewsController

## 1) Provider exception degradation ownership

- Scenario: `finnhubClient.getCompanyNews(...)` throws runtime exception.
- Repository evidence: `FinnhubClient` implementation catches provider errors and returns `Collections.emptyList()`, but `NewsController` itself does not catch exceptions.
- Observed behavior: only degradation path was asserted via normal return values; direct throw-path ownership is not documented at controller layer.
- Interpretation A: controller-level contract requires `200 []` even if client throws.
- Interpretation B: degradation responsibility is inside `FinnhubClient`; controller assumes non-throwing degraded client.
- Risk: inconsistent `500` vs `200 []` behavior if client implementation changes.
- Recommended ownership: document degradation ownership in `FinnhubClient` contract and/or add global exception mapping.
- Proposed future test: enable throw-path assertion once ownership is explicitly documented.

## 2) Blank or malformed symbol validation ownership

- Scenario: symbols like whitespace-only, `..`, `$INVALID`.
- Repository evidence: controller uppercases input but does not trim/validate format; docs do not assign strict validation layer explicitly.
- Observed behavior: controller delegates to client and returns normal response shape when client returns empty.
- Interpretation A: controller should reject malformed symbols with `400`.
- Interpretation B: normalization/validation belongs to client or upstream provider boundary.
- Risk: cache fragmentation and inconsistent semantics across controllers.
- Recommended ownership: centralize symbol validation policy and reference it in API contract.
- Proposed future test: assert `400` or delegation deterministically after ownership is finalized.

## 3) Null provider return contract

- Scenario: mocked client returns `null` list.
- Repository evidence: concrete `FinnhubClient` currently degrades with `Collections.emptyList()`, but interface-level non-null guarantee is not explicitly documented.
- Observed behavior: null-contract test is intentionally disabled pending ownership definition.
- Interpretation A: non-null is guaranteed and null should never happen.
- Interpretation B: controller should defensively normalize null to `[]`.
- Risk: null propagation could create unstable API output if client implementation changes.
- Recommended ownership: make non-null return contract explicit at client boundary.
- Proposed future test: enforce non-null with either defensive normalization or explicit contract assertion.

## 4) Cache key normalization requirement

- Scenario: `@Cacheable(value = "newsCache", key = "#symbol")` uses raw path symbol as cache key.
- Repository evidence: method uppercases symbol for client call, but cache key uses original path variable.
- Observed behavior: case variants may create separate cache entries (`aapl` vs `AAPL`) even though downstream call normalizes.
- Interpretation A: key should normalize (e.g., uppercase/trim) to avoid duplicates.
- Interpretation B: raw input key is acceptable and cache behavior is implementation-defined.
- Risk: cache inefficiency and inconsistent hit ratio.
- Recommended ownership: define canonical symbol key strategy in caching rules.
- Proposed future test: cache integration test validating key equivalence across symbol variants.

## 5) Stable error schema rollout scope

- Scenario: whether all existing controllers must already return `timestamp/status/error/message/path` for representative errors.
- Repository evidence: AGENTS smoke scenario emphasizes stable shape; migration state in docs for existing controllers is not fully explicit.
- Observed behavior: security-oriented error checks pass, but stable schema enforcement for this legacy path remains uncertain.
- Interpretation A: enforce stable schema now for all controllers.
- Interpretation B: phased migration is allowed for existing controllers.
- Risk: frontend error handling inconsistency.
- Recommended ownership: publish a single repository-wide enforcement date/policy.
- Proposed future test: un-disable stable-schema assertions when rollout policy is explicit.
