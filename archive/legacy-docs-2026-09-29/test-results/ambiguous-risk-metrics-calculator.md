# Ambiguous Scenarios - RiskMetricsCalculator

## Scenario 1: Duplicate timestamps with different close values
- Scenario: Two or more `PriceHistory` candles share the same `timestamp` but have different `close` values.
- Relevant code behavior: `compute()` sorts by `PriceHistory::timestampAsInstant`; for equal timestamps, resulting order depends on stream sort stability and original input order.
- Relevant repository rules: SPEC section 6 requires domain invariants and deterministic analytics, but does not define tie-breaking for duplicate timestamps in risk calculations.
- Interpretation A: Duplicate timestamps are invalid market data and should be rejected with validation error.
- Interpretation B: Duplicate timestamps are accepted and resolved with a deterministic tie-breaker (e.g., last-write-wins or highest-priority source).
- Why neither interpretation is safely authoritative: No explicit contract in AGENTS.md, SPEC.md, or BACKEND_RULES.md defines whether duplicates are invalid or how ties must be resolved.
- Recommended product decision: Define and document duplicate timestamp policy for domain/service risk calculations.
- Recommended future test expectation: Replace `@Disabled` with either (a) assertion for explicit exception type, or (b) deterministic tie-break behavior assertion once policy is defined.
