# Ambiguous Scenarios - PriceRefreshService

## 1) Equal timestamp winner for latest-price merge
- Scenario: local latest and fetched latest have identical timestamps but different values.
- Repository evidence: `newestOf(...)` uses max comparator by timestamp only; tie-break is not explicitly documented in SPEC/AGENTS.
- Current behavior: whichever candidate appears first in stream max tie resolution may win.
- Interpretation A: provider row should replace local for same timestamp.
- Interpretation B: local persisted row should remain authoritative for same timestamp.
- Operational risk: inconsistent latest price depending on source ordering can create nondeterministic UI or analytics.
- Recommended ownership: domain service contract should define tie-break rule explicitly.
- Proposed future assertion: assert deterministic winner for equal timestamp (provider-wins or local-wins) after product decision.

## 2) Latest provider exception fallback ownership
- Scenario: `getFreshLatest` provider call throws runtime exception while local latest exists.
- Repository evidence: service currently does not catch exceptions; provider degradation behavior is documented broadly but ownership between adapter and service is not explicit for this method.
- Current behavior: exception bubbles up.
- Interpretation A: adapter must catch/degrade; service may propagate.
- Interpretation B: service should protect local fallback and return local latest on provider failure.
- Operational risk: transient provider outage can break latest-price endpoint even with valid DB data.
- Recommended ownership: define explicit degradation boundary for latest-price path (adapter-only vs service fallback).
- Proposed future assertion: either expect thrown exception or expect local fallback based on decided ownership.

## 3) Repository null list contract
- Scenario: `findByAssetIdAndPeriod` returns `null` instead of empty list.
- Repository evidence: port interface signature returns `List<PriceHistory>` but does not explicitly state null-forbidden contract.
- Current behavior: service throws `NullPointerException` in `shouldRefresh`.
- Interpretation A: adapter contract forbids null; service null-check not required.
- Interpretation B: service should guard against null and degrade to empty list.
- Operational risk: adapter regression can crash history endpoints.
- Recommended ownership: document null-free port contract and enforce at adapter boundaries.
- Proposed future assertion: keep fail-fast if null-forbidden is formalized; otherwise require safe empty fallback.

## 4) Unknown interval validation responsibility
- Scenario: malformed intervals ending with `m`/`h` (e.g., `abc-m`, `hourh`) trigger intraday refresh.
- Repository evidence: service only checks suffix in `isIntradayInterval`; no strict interval validation in service.
- Current behavior: malformed suffix intervals treated as intraday and fetched.
- Interpretation A: validation belongs to controller/adapter layer, service should stay permissive.
- Interpretation B: service should validate supported interval set and reject malformed values.
- Operational risk: noisy provider calls or subtle refresh-policy drift from malformed input.
- Recommended ownership: define canonical interval validation layer and accepted values.
- Proposed future assertion: once ownership is defined, assert rejection or permissive pass-through explicitly.
