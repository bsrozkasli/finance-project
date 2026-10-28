# Decision: all-null valuation metrics grade as unavailable

**Recorded:** 2026-10-28

**Decision input:** Delegated to the implementing agent. The product owner delegated engineering decisions to the implementing agent (see the 2026-10-22 decision record). This resolves the SPEC.md open question on the `FAIR` default.

**Scope:** `ValuationGrade`, `ValuationMetrics`, `ValuationService._compute_grade`, and the valuation mapping in `CompositeScoreService` (data-service).
**State:** Closed.

## Disposition

1. **Yes.** When no valuation ratio has a usable value, the grade is `Unavailable` (`ValuationGrade.UNAVAILABLE`), not `Fair`. A grade of `Fair` is positive evidence and must not be fabricated from missing data.
2. **Model default.** `ValuationMetrics.valuation_grade` defaults to `Unavailable`.
3. **Composite score.** `Unavailable` maps to a `null` valuation score with `insufficient` availability and reason `valuation_grade_unavailable`. It is never scored as neutral 50.
4. **Partial evidence unchanged.** Grading with at least one present ratio is unchanged.
5. **Compatibility.** Endpoint paths and field names are unchanged. `valuation_grade` gains one string enum value, `"Unavailable"`. A repository search found no consumer in backend or frontend that reads `valuation_grade`; the only in-repo consumers are the data-service LLM prompt (prints the value as-is) and composite scoring (updated here).

## Cost if wrong

External clients with a closed enum of the five prior grades could see an unknown value. Reverting is a one-line change in each of the model and service.
