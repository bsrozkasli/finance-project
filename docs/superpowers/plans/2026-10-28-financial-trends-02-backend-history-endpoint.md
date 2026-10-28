# Backend Financial History Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve `GET /api/v1/fundamentals/{symbol}/history`: multi-year raw statement values plus derived ratios (debt/equity, current ratio, ROE, ROA, margins, growth, free cash flow), with explicit missing / not-meaningful / unavailable states.

**Architecture:** A framework-free `FinancialHistoryService` (registered in `DomainConfig`) calls a new outbound `FinancialHistoryPort`, implemented by an adapter over the data-service route from plan 01, and derives every ratio with `BigDecimal`. A thin new controller maps the domain result to a DTO. The existing `FinancialStatement`, `FundamentalsController` and their contracts are not touched.

**Tech Stack:** Spring Boot 3.4.5, Java 17, JUnit 5, AssertJ, `MockRestServiceServer`, `MockMvc`.

**Spec:** `docs/product/decisions/2026-10-28-financial-trend-charts.md` (decisions 4, 5, 9, 10); data-service wire contract in `docs/superpowers/plans/2026-10-28-financial-trends-01-data-service-history.md`.

## Global Constraints

- Work on a task branch off `main`, e.g. `git worktree add ../finance-project-fh-be -b feat/financial-history-backend main`. Leave the `fp-approve` working-tree changes alone.
- Preserve every existing endpoint path and DTO field. No Flyway migration (nothing persists).
- Domain code is framework-free; the service is a `@Bean` in `DomainConfig.java`, the adapter and controller are Spring components. Controllers stay thin.
- Money and ratios are `BigDecimal`, never `double`. Ratios use `setScale(6, RoundingMode.HALF_UP)`. Adapter converts the data-service `double` with `BigDecimal.valueOf(double)`.
- Route: `GET /api/v1/fundamentals/{symbol}/history`, symbol upper-cased. HTTP 200 for every business state; the state is in `status`.
- Response status values: `AVAILABLE`, `PARTIAL`, `EMPTY`, `UNAVAILABLE`. `periodType` is `"annual"`. Points are **ascending** by fiscal year.
- Ratio units: `debtToEquity` and `currentRatio` are plain ratios (1.5 = 1.5x); `roe`, `roa`, `netMargin`, `fcfMargin`, `revenueGrowth`, `netIncomeGrowth` are fractions (0.25 = 25 %).
- Formulas (all on year-end values; a null input gives a null result **not** listed in `notMeaningful`; a non-positive denominator gives null **and** the key in `notMeaningful`):
  `freeCashFlow = operatingCashFlow - capitalExpenditure`; `netDebt = totalDebt - cash`; `debtToEquity = totalDebt / totalEquity` (equity > 0); `currentRatio = currentAssets / currentLiabilities` (liabilities > 0); `roe = netIncome / totalEquity` (equity > 0); `roa = netIncome / totalAssets` (assets > 0); `netMargin = netIncome / revenue` and `fcfMargin = freeCashFlow / revenue` (revenue > 0); `revenueGrowth = (revenue - prevRevenue) / prevRevenue` and `netIncomeGrowth = (netIncome - prevNetIncome) / prevNetIncome`, only when the previous point's `fiscalYear` is exactly `fiscalYear - 1` (otherwise null, not "not meaningful") and the previous value is > 0 (otherwise null and in `notMeaningful`).
- `notMeaningful` keys use the field names: `debtToEquity`, `currentRatio`, `roe`, `roa`, `netMargin`, `fcfMargin`, `revenueGrowth`, `netIncomeGrowth`.
- `UNAVAILABLE` results must never be cached (`fundamentalCache` TTL is 24 h, `RedisConfig.java:55`).
- Never call a live provider from tests. Local limit is 120 s: run targeted tests from `backend/` with PowerShell `.\mvnw.cmd -q test -Dtest=<Class>`; the full suite is CI's gate.
- Conventional Commits, scope `backend` / `spec`; end each commit with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Negative or zero equity: `debtToEquity`, `roe` are null and listed in `notMeaningful`; a missing input is null and **not** listed. The two states must stay distinguishable.
- A gap year (2021 then 2023): growth is null and not listed in `notMeaningful`.
- Previous revenue or net income of 0 or below: growth is `notMeaningful`, not a huge or sign-flipped percentage.
- Data-service timeout, connection refusal, HTTP 5xx, malformed JSON, unequal list lengths or an unknown `status` all become an `UNAVAILABLE` snapshot (never an exception to the controller, never an empty `AVAILABLE`).
- A cached `UNAVAILABLE` would hide recovery for 24 h; AVAILABLE/PARTIAL/EMPTY results are cached, UNAVAILABLE is not.
- Cached values must round-trip through the Redis serializer: `fiscalYearEnd` is a `String` in the DTO to avoid date-module issues.
- Check `SecurityConfig` and any rate-limit or route allowlist for per-path rules on `/api/v1/fundamentals/**` and extend only if one exists.

---

### Task 1: Domain model, port and derivation service

**Files:**
- Create: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/FinancialHistoryStatus.java`, `FinancialYearRaw.java`, `FinancialHistorySnapshot.java`, `FinancialHistoryPoint.java`, `FinancialHistory.java`
- Create: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/FinancialHistoryPort.java`
- Create: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/FinancialHistoryService.java`
- Modify: `backend/src/main/java/com/ozkaslibasar/financeproject/config/DomainConfig.java` (register `FinancialHistoryService`)
- Test: `backend/src/test/java/com/ozkaslibasar/financeproject/domain/service/FinancialHistoryServiceTest.java`; extend `config/DomainConfigWiringTest.java`

**Interfaces:**
- Produces:
  - `enum FinancialHistoryStatus { AVAILABLE, PARTIAL, EMPTY, UNAVAILABLE }`
  - `record FinancialYearRaw(int fiscalYear, LocalDate fiscalYearEnd, BigDecimal revenue, BigDecimal netIncome, BigDecimal operatingCashFlow, BigDecimal capitalExpenditure, BigDecimal totalAssets, BigDecimal totalLiabilities, BigDecimal totalEquity, BigDecimal totalDebt, BigDecimal cash, BigDecimal currentAssets, BigDecimal currentLiabilities)` (every `BigDecimal` nullable; `fiscalYear` = `fiscalYearEnd.getYear()`)
  - `record FinancialHistorySnapshot(String symbol, FinancialHistoryStatus status, String currency, Instant retrievedAt, List<FinancialYearRaw> years)` (`currency`, `retrievedAt` nullable; `years` ascending, never null)
  - `record FinancialHistoryPoint(int fiscalYear, LocalDate fiscalYearEnd, BigDecimal revenue, BigDecimal netIncome, BigDecimal operatingCashFlow, BigDecimal capitalExpenditure, BigDecimal freeCashFlow, BigDecimal totalAssets, BigDecimal totalLiabilities, BigDecimal totalEquity, BigDecimal totalDebt, BigDecimal cash, BigDecimal netDebt, BigDecimal debtToEquity, BigDecimal currentRatio, BigDecimal roe, BigDecimal roa, BigDecimal netMargin, BigDecimal fcfMargin, BigDecimal revenueGrowth, BigDecimal netIncomeGrowth, List<String> notMeaningful)`
  - `record FinancialHistory(String symbol, FinancialHistoryStatus status, String currency, Instant retrievedAt, List<FinancialHistoryPoint> points)`
  - `interface FinancialHistoryPort { FinancialHistorySnapshot fetchHistory(String symbol); }` — contract: provider failure is returned as `UNAVAILABLE` with empty `years`, never thrown.
  - `class FinancialHistoryService { FinancialHistoryService(FinancialHistoryPort port); FinancialHistory getHistory(String symbol); static FinancialHistory derive(FinancialHistorySnapshot snapshot); }`

- [ ] **Step 1: Write the failing tests** in `FinancialHistoryServiceTest` (fake port as a lambda/stub; compare `BigDecimal` with `isEqualByComparingTo`):
  - `debtToEquity_isDebtOverEquity`: debt 150, equity 100 → `1.5`.
  - `negativeEquity_makesDebtToEquityAndRoeNotMeaningful`: equity -10 → both null, `notMeaningful` contains `debtToEquity` and `roe`.
  - `missingDebt_isNullAndNotListedAsNotMeaningful`: debt null, equity 100 → `debtToEquity` null, `notMeaningful` empty.
  - `currentRatio_isCurrentAssetsOverCurrentLiabilities`: 200 / 100 → `2`; liabilities 0 → null + `currentRatio` in `notMeaningful`.
  - `roeRoaNetMargin`: net income 25, equity 100, assets 500, revenue 250 → `0.25`, `0.05`, `0.1`.
  - `freeCashFlow_isOperatingMinusCapex`: 120 − 20 → `100`; `fcfMargin` with revenue 500 → `0.2`; capex null → FCF null.
  - `netDebt_isDebtMinusCash`: 150 − 40 → `110`.
  - `growth_usesPreviousConsecutiveYear`: revenue 100 (2022) → 120 (2023) → `0.2`; first point growth null.
  - `growth_skipsGapYear`: 2021 then 2023 → null, not in `notMeaningful`.
  - `growth_nonPositivePrevious_isNotMeaningful`: previous revenue 0, previous net income -5 → both growth keys in `notMeaningful`.
  - `ratiosAreRoundedToSixPlaces`: 1 / 3 → `0.333333`.
  - `unavailableSnapshot_yieldsNoPoints`, `statusAndCurrencyPassThrough`, `pointsStayAscending`.
  - `DomainConfigWiringTest`: the context exposes a `FinancialHistoryService` bean.
- [ ] **Step 2: Run to verify failure.** `.\mvnw.cmd -q test -Dtest=FinancialHistoryServiceTest` → compile FAIL (types undefined).
- [ ] **Step 3: Implement** the records, the port and `FinancialHistoryService` (`derive` is the pure function; `getHistory` = `derive(port.fetchHistory(symbol))`). Register the bean in `DomainConfig` like its neighbours.
- [ ] **Step 4: Run to verify pass.** `.\mvnw.cmd -q test -Dtest=FinancialHistoryServiceTest+DomainConfigWiringTest` → PASS.
- [ ] **Step 5: Commit.** `feat(backend): derive multi-year financial ratios in a domain service`.

### Task 2: Data-service adapter

**Files:**
- Create: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceFinancialHistoryAdapter.java`
- Test: `backend/src/test/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceFinancialHistoryAdapterTest.java`

**Interfaces:**
- Consumes: `FinancialHistoryPort`, `FinancialHistorySnapshot`, `FinancialYearRaw`, `FinancialHistoryStatus` (Task 1); data-service JSON from plan 01 (`status`, `currency`, `fiscal_year_ends`, `series{revenue,net_income,operating_cash_flow,capital_expenditure,total_assets,total_liabilities,total_equity,total_debt,cash,current_assets,current_liabilities}`, `retrieved_at`).
- Produces: `@Component DataServiceFinancialHistoryAdapter implements FinancialHistoryPort` using the shared `RestTemplate` and `@Value("${data-service.base-url:http://localhost:8000}")`, same as `YahooStatementClientAdapter`; calls `{base}/api/v1/research/financial-history/{symbol}`.

- [ ] **Step 1: Write the failing tests** with `MockRestServiceServer`:
  - `mapsFullResponse`: two years → two `FinancialYearRaw`, `fiscalYear` from the date, ascending, values as `BigDecimal`, currency and `retrievedAt` set, URL requested exactly `/api/v1/research/financial-history/AAPL`.
  - `jsonNullStaysNull`: `null` in a series → `null` field (never `0`).
  - `emptyStatus_yieldsEmptyYears`.
  - `serverError_yieldsUnavailable`, `connectionFailure_yieldsUnavailable` (`ResourceAccessException`), `malformedJson_yieldsUnavailable`.
  - `unequalListLengths_yieldUnavailable`, `unknownStatus_yieldsUnavailable`, `missingSeriesKey_treatedAsAllNull` (a key absent from `series` → that field null for every year, status as reported).
- [ ] **Step 2: Run to verify failure.** `.\mvnw.cmd -q test -Dtest=DataServiceFinancialHistoryAdapterTest` → FAIL (class missing).
- [ ] **Step 3: Implement** the adapter: private `@JsonIgnoreProperties(ignoreUnknown = true)` DTO with `@JsonProperty` snake_case names; catch `RestClientException` and mapping errors, log `operation=financial_history provider=data-service symbol=… result=unavailable`, return `new FinancialHistorySnapshot(symbol, UNAVAILABLE, null, null, List.of())`. Increment the same `data.ingestion.*` meters only if `YahooStatementClientAdapter` pattern is cheap to mirror; otherwise log only.
- [ ] **Step 4: Run to verify pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `feat(backend): add data-service financial history adapter`.

### Task 3: Controller, caching and contract docs

**Files:**
- Create: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/FinancialHistoryController.java`
- Test: `backend/src/test/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/FinancialHistoryControllerTest.java`
- Modify: `docs/spec/current-system/contracts.md` (add `GET /fundamentals/{symbol}/history` after the `/institutional` row, ~line 84, with the field list), `docs/spec/current-system/domain-and-data.md` (formulas, units, not-meaningful rule, year-end basis, fiscal-year labelling), `docs/spec/current-system/operations.md` (`UNAVAILABLE` not cached)

**Interfaces:**
- Consumes: `FinancialHistoryService.getHistory(String)` (Task 1).
- Produces: `GET /api/v1/fundamentals/{symbol}/history` → `FinancialHistoryResponse(String symbol, String status, String currency, String periodType, String retrievedAt, List<FinancialHistoryPointResponse> points)` and `FinancialHistoryPointResponse` with the same field names as `FinancialHistoryPoint` except `fiscalYearEnd` is an ISO `String` and `notMeaningful` is `List<String>`; nested public records in the controller as `FundamentalsController` does; `@Cacheable(value = "fundamentalCache", key = "'history:' + #symbol.toUpperCase()", unless = "#result.status() == 'UNAVAILABLE'")`.

- [ ] **Step 1: Write the failing tests** (`MockMvc` standalone or `@WebMvcTest`, whichever `FundamentalsControllerTest` uses; service mocked):
  - `returnsDocumentedJsonShape`: field names exactly as above; `status` string; `fiscalYearEnd` `"2024-09-28"`; ascending points; `notMeaningful` array present on every point.
  - `uppercasesSymbol`: `/aapl/history` → service called with `AAPL`.
  - `unavailableIsStill200WithStatus`.
  - `nullValuesSerializeAsJsonNull`.
  - `cacheAnnotation_excludesUnavailable`: reflect on the method like `FundamentalsControllerTest:484` (value `fundamentalCache`, `unless` contains `UNAVAILABLE`), plus a cache behaviour test with `@EnableCaching` + `ConcurrentMapCacheManager("fundamentalCache")`: two calls returning `UNAVAILABLE` invoke the service twice; two calls returning `AVAILABLE` invoke it once.
- [ ] **Step 2: Run to verify failure.** `.\mvnw.cmd -q test -Dtest=FinancialHistoryControllerTest` → FAIL.
- [ ] **Step 3: Implement** the controller (map `FinancialHistory` → response; no logic beyond mapping) and the three doc updates.
- [ ] **Step 4: Run to verify pass.** `.\mvnw.cmd -q test -Dtest=FinancialHistoryControllerTest+FundamentalsControllerTest+FinancialHistoryServiceTest+DataServiceFinancialHistoryAdapterTest` → PASS. Do not claim the full backend suite passes; CI is the gate (see `docs/agent/verification.md`).
- [ ] **Step 5: Commit.** `feat(backend): serve multi-year financial history endpoint` and `docs(spec): document financial history contract and formulas`.
