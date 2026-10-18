# Ambiguous Behavior - company-report-controller

1. Finnhub exception-degradation ownership
- `CompanyReportController` does not catch exceptions from `FinnhubClient` recommendation/price-target/news calls.
- The concrete `FinnhubClient` implementation usually catches provider failures and degrades to empty/null values.
- Ambiguity: whether strict degradation ownership belongs only to `FinnhubClient` or must be defense-in-depth in `CompanyReportController` as well.

2. Null list vs empty list contract
- For recommendations and recent news, current report schema can serialize either `null` or `[]`.
- Preferred degradation style is typically empty lists, but docs also allow empty/null partial sections for reports.

3. Whitespace trimming ownership
- Controller currently uppercases symbols but does not trim surrounding whitespace.
- Ambiguity: whether trimming should occur at route/controller layer, domain/input-validation layer, or upstream caller boundary.

4. Mandatory vs optional report sections under dependency failure
- Specs clearly allow partial sections for non-critical provider failures.
- Ambiguity remains on whether every section except `symbol` is optional in all runtime failure modes, or if some failures should map to `503`.

5. Stable error-body requirement for legacy controllers
- Repository docs promote stable error schema for new handlers while legacy controllers may still rely on Spring default error rendering.
- Ambiguity: rollout timeline and strictness for existing report endpoints.

6. Cache-key whitespace risk
- Cache key uses `#symbol.toUpperCase()` without trimming.
- Potential key split between `"AAPL"` and `" AAPL "` is a behavior risk but ownership of normalization is not explicitly assigned.
