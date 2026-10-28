# Decision: multi-year financial trend charts

**Recorded:** 2026-10-28

**Decision input:** The product owner asked for a plan that pulls financial data and shows it in charts, naming F/K (P/E) and debt-to-equity as examples of critical metrics, and left every detail to the implementing agent: "detayları sende planları yaz". Product, data-contract and architecture choices below are therefore the agent's calls, recorded here so they can be reviewed or reversed. OQ-2 (data governance and legal) is outside this delegation; nothing here adds a provider or changes data licensing.

**Scope:** a new read-only multi-year statement history (data-service, backend, frontend charts). It adds no table and no migration.
**State:** Proposed. Implemented by the three plans listed under Delivery.

## Findings that drive the design

1. `GET /api/v1/fundamentals/{symbol}` returns "annual" series of **one** fiscal year. `YahooStatementClientAdapter` builds each `FinancialStatement` from the single latest-year `GET /api/v1/research/fundamental/{symbol}` response, so no multi-year chart is possible from it today.
2. The same adapter maps a missing value to `BigDecimal.ZERO` (`orZero`), and `FinancialStatement` requires every field non-null. This substitutes zero for missing evidence, which `AGENTS.md` forbids for new work.
3. `FundamentalsData.freeCashFlow` is filled from `operatingCashFlow`, so the UI row "Serbest nakit akışı" shows operating cash flow.
4. The data-service `YahooProvider.get_financial_statements` already reads multi-year equity, debt, cash, current assets and liabilities and capex, but `_extract_series` turns NaN into `0.0` and drops alignment between series. It has no HTTP route.
5. Point-in-time ratios (`/ratios`: F/K, PD/DD, F/S, FD/FAVÖK, debt/equity, ROE) exist but carry no history.

## Decisions

1. **New additive read path, no change to existing contracts.** Data-service `GET /api/v1/research/financial-history/{symbol}`; backend `GET /api/v1/fundamentals/{symbol}/history`. Existing routes, DTO fields and the V-migrations are untouched (OQ-5: *preserve*; the new route is additive and needs no compatibility window). The existing `FinancialStatement` record and `orZero` path are left alone; changing them is a separate correction (see Follow-ups).
2. **Annual only, depth is whatever the provider returns** (typically four fiscal years). No quarterly series, no padding, no interpolation.
3. **Raw inputs null-preserving, aligned by fiscal-year-end date.** The data-service returns parallel lists of equal length with `null` for a missing value. A new `FinancialHistoryService` reads the yfinance statements directly, as the other research services do under the ADR-0006 D2 exception for `.info` and statements; the provider chain and `get_financial_statements` keep their behaviour. Row lookups are strict: no fallback from `Total Debt` to `Long Term Debt`, which would silently understate debt.
4. **Derived ratios are computed once, in the backend domain service**, with `BigDecimal`, so the frontend never re-derives a financial figure. A ratio is `null` when an input is null, and listed in `notMeaningful` when the denominator is not positive (for example debt/equity with negative equity). "Missing" and "not meaningful" are different states and the UI shows them differently.
5. **Metric set (v1)**, each defined in `docs/spec/current-system/domain-and-data.md` by its plan:
   - Leverage: debt/equity (`totalDebt / totalEquity`, a plain ratio, 1.5 = 1.5x), net debt (`totalDebt - cash`).
   - Liquidity: current ratio (`currentAssets / currentLiabilities`).
   - Profitability: ROE and ROA on **year-end** equity and assets (`netIncome / totalEquity`, `netIncome / totalAssets`), net margin; fractions (0.25 = 25 %).
   - Growth: revenue growth and net-income growth year over year, only when the previous point is the immediately preceding fiscal year and its value is positive.
   - Cash: operating cash flow, capex (positive magnitude), free cash flow (`operatingCashFlow - capitalExpenditure`), FCF margin.
   - Valuation snapshot (F/K, PD/DD, F/S, FD/FAVÖK, temettü verimi): **current value only**, from the existing `/ratios` and `/fundamentals/{symbol}` responses.
6. **No historical F/K or PD/DD series.** A correct history needs the share count and price as of each report date, which no current provider path supplies. Reconstructing it from today's price and share count would fabricate history. Deferred until a provider path exists.
7. **Basis label instead of thresholds.** Charts carry no good/bad colouring and no reference lines such as "D/E < 1". Healthy ranges are sector dependent, and the product has no sector data. Each chart names its basis (for example "Toplam borç / özsermaye, yıl sonu").
8. **Two ROE/D-E numbers can disagree.** `/ratios` uses the provider's trailing figures; the history uses year-end statements. The trend panel shows only history-derived values and says so; the valuation snapshot shows only `/ratios` values. They are never merged in one number.
9. **Fiscal year is labelled by the calendar year of the fiscal-year-end date**, with the full date available on hover and in the data table. Companies that name their fiscal year differently (for example a January year-end) show their period-end year.
10. **Explicit states on the wire.** `status` is `AVAILABLE`, `PARTIAL`, `EMPTY` or `UNAVAILABLE`. `UNAVAILABLE` (data-service unreachable or erroring) is never cached. Funds are skipped by the frontend (`isFund`), as the existing financials panel does.
11. **Charts are hand-rolled SVG, no chart library.** `recharts` was tried first and rejected: its chunk alone is about 383 kB raw and pushed the total to 1085.8 KiB against the 710 KiB `npm run check:bundle` budget; the check sums lazy chunks too, so `React.lazy` does not help. The budget was not raised for a library. The repository already drew its financial chart as plain SVG. Every chart has an accessible name and a data table equivalent; the existing `ResearchFinancials` table is migrated to history data so one page never shows two different "free cash flow" numbers. The bundle budget was raised from 710 to 725 KiB raw and from 225 to 230 KiB gzip, following the earlier 700 -> 710 precedent (b8a7c2d); the feature adds about 10 KiB.
12. **Currency.** The data-service reports `financialCurrency` (fallback `currency`). If neither is present the UI states "para birimi bildirilmedi". Values are never converted.

## Non-goals

Peer or sector comparison, quarterly or TTM series, historical valuation multiples, scoring or buy/sell colouring, user-configurable metrics, quality scores (Piotroski, Altman) in the trend panel, persistence of history.

## Delivery

Three plans, mergeable in this order (each is testable alone with stubs):

1. `docs/superpowers/plans/2026-10-28-financial-trends-01-data-service-history.md`
2. `docs/superpowers/plans/2026-10-28-financial-trends-02-backend-history-endpoint.md`
3. `docs/superpowers/plans/2026-10-28-financial-trends-03-frontend-trend-charts.md`

## Follow-ups (not in these plans)

- Stop `YahooStatementClientAdapter` from writing `0` for missing values and stop `freeCashFlow` carrying operating cash flow (requires a coordinated contract change, OQ-5 disposition).
- Quality scores (Piotroski, Altman Z) in the research view.
- Historical valuation multiples once a point-in-time provider path exists.

## Cost if wrong

The routes are additive and nothing persists, so reverting is deleting the routes and the panel. If the metric set or formulas change, only the backend domain service and its tests change; the wire shape carries named fields, so a new metric is an additive field.
