# Cross-Runtime Current-State Evidence

## Audit Metadata

- Audit Commit: `1a5e3b5`
- Branch: `docs/evidence-driven-product-design`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; frontend Node/Vite workspace; Spring Boot 3.4.5 on Java 21.0.2; FastAPI data-service on Python 3.13.9; local ports are frontend 5173, Spring 8080, data-service 8000, Postgres 5433, Redis 6379, and reserved MongoDB 27017.
- Scope: Cross-runtime request chains, DTO and route boundaries, provider and cache ownership, persistence, degradation, and legacy-document contradictions that affect current product evidence.
- Method: Source and test inspection only. No live financial provider, LLM, or production database was contacted.
- Exclusion: `data-service/external/TradingAgents` remains an archived/external subtree and is not treated as current cross-runtime product capability evidence.

## Evidence Records

### CAP-CUR-XR-001 — Price retrieval and refresh chain

- Summary: The browser requests prices through the shared client. Spring owns the public `/api/v1/prices` contract and `PriceRefreshService`; the service reads persisted prices first and refreshes through an outbound port. The data-service OHLCV route then uses `MarketDataResolver`, whose provider chain currently starts with Yahoo and may include configured Tiingo/Finnhub providers. A refresh failure can leave persisted rows available, but the observed response path has no first-class stale flag.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; frontend, Spring, and FastAPI source at the audit commit.
- Contract: Frontend `fetchAssetPrice`, `fetchPriceHistory`, and `fetchBatchPriceHistory` remain Spring-facing; Spring route paths are `/api/v1/prices/{symbol}/latest`, `/history`, and `/batch-history`; the internal data-service route is `GET /api/v1/prices/{symbol}`.
- Evidence Locator: `frontend/src/api/client.ts:21-57`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PriceController.java:30-109`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshService.java:23-61`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServicePriceAdapter.java:25-72`; `data-service/main.py:131-166`; `data-service/app/providers/market_data_resolver.py:93-380`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/` price repositories.
- Verification: Source inspection plus `PriceRefreshServiceTest`, `PriceIngestionUseCaseTest`, `PriceControllerTest`, `DataServicePriceAdapterTest`, and data-service resolver endpoint tests. The backend audit also ran `.\mvnw.cmd test` without failures.
- Limitations: No live quote was fetched. Provider freshness, current quota state, and the exact production cache contents are unproven. Data-service resolver exhaustion is represented as an empty result, while Spring may return persisted data without an explicit stale reason.
- Legacy Claims: Archived data-fetching documentation describes the DB-first Spring price path and a provider chain, but it must not be used as proof of current external freshness; current source and `CAP-CUR-BE-002`/`CAP-CUR-DS-002` are stronger.

### CAP-CUR-XR-002 — Technical analysis chain

- Summary: The frontend technical hook calls Spring `/api/v1/technical/{symbol}` and its signals variant. Spring delegates to `TechnicalAnalysisAdapter`, which calls FastAPI `/api/v1/technical/{symbol}` or `/signals`. The current FastAPI analysis router calls yfinance directly rather than the resolver. No cross-runtime technical persistence path was established; insufficient history is surfaced as a 422 at the data-service boundary and as unavailable/empty behavior in the Spring adapter path.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; frontend React/Vitest source, Spring adapter source, and FastAPI analysis source.
- Contract: `fetchTechnicalAnalysis` remains a Spring-facing client call; Spring owns `/api/v1/technical/{symbol}` and `/signals`; FastAPI owns the internal same-suffix route and returns the technical response model or an insufficient-candle error.
- Evidence Locator: `frontend/src/api/client.ts:171-178`; `frontend/src/hooks/useTechnicalAnalysis.ts`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/TechnicalController.java:22-114`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/TechnicalAnalysisAdapter.java:20-106`; `data-service/app/routers/analysis.py:1-55`; `data-service/app/services/technical_analysis_service.py`; `docs/spec/current-system/contracts.md` technical error contract.
- Verification: Source inspection plus `TechnicalAnalysisAdapterTest`, `TechnicalControllerTest`, `useTechnicalAnalysis` tests, and the frontend hook test that records a 422 insufficient-candle response as unavailable data.
- Limitations: The direct-yfinance path bypasses resolver fallback, provider health metrics, and resolver blacklisting. Backend configuration mentions a technical cache, but this audit did not establish endpoint-level cache use for every technical request. No live market data was contacted.
- Legacy Claims: Archived `DATA_FETCHING_REPORT.md` correctly names FastAPI/yfinance for the technical path, but any claim that technical requests inherit the resolver chain or durable technical snapshots is unsupported by current source.

### CAP-CUR-XR-003 — Agent analysis and prepared-metrics chain

- Summary: The frontend `useAgentAnalysis` flow calls Spring `GET /api/v1/agent-analysis/{ticker}`. `AgentAnalysisFacade` checks the Redis analysis cache, obtains prepared metrics through backend ports, and invokes the AI port; successful responses are written to analysis history. `DataServiceAgentAnalysisAdapter` sends compressed prepared metrics to FastAPI `POST /api/v1/agent-analysis`. The data-service pipeline executes the documented sequential analyst order and requires its configured Azure integration for a live result.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Redis and Azure integrations were not contacted; local source and stub-based tests only.
- Contract: The browser and Spring response use the current `agent-analysis` DTO naming, including `decision`, `confidence`, and `from_cache`; the data-service input is prepared metrics, not raw frontend prompts. Cache invalidation remains under `/api/v1/agent-analysis/{ticker}/cache` and `/cache`.
- Evidence Locator: `frontend/src/hooks/useAgentAnalysis.ts`; `frontend/src/api/client.ts` agent-analysis functions; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AgentAnalysisController.java:22-96`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AgentAnalysisFacade.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AgentAnalysisUseCase.java:26-103`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceAgentAnalysisAdapter.java:24-76`; `data-service/app/routers/agent_analysis.py`; `data-service/app/services/metrics_trading_agents_graph.py`; Redis/history adapters.
- Verification: Source inspection plus `AgentAnalysisUseCaseTest`, `AgentAnalysisControllerTest`, `AgentAnalysisCacheServiceTest`, `DataServiceAgentAnalysisAdapterTest`, and data-service agent-analysis tests. The backend suite passed with five cache-related tests skipped because of the recorded Testcontainers infrastructure limitation.
- Limitations: No external LLM was called. A cache miss, missing Azure configuration, adapter exception, or incomplete prepared metric set can produce unavailable/no-decision behavior. The sequential order is source-verified, not a claim about model quality.
- Legacy Claims: Archived agent descriptions that promise a populated Buy/Hold/Sell or confidence result are weaker than the current optional/degraded contract and the observed `decision`/`confidence` DTO.

### CAP-CUR-XR-004 — Portfolio, positions, and optimization chain

- Summary: Portfolio screens use the shared client and Spring portfolio routes for portfolios, transactions, holdings, positions, dashboard summary, performance, comparison, allocation, and enriched positions. Spring persists ledger and position state through ports and `PortfolioLedgerService`; dashboard values depend on refreshed prices. Optimization and rebalance checks cross the Spring `PortfolioOptimizationAdapter` into FastAPI portfolio routes and are analytic/read-only in the observed data-service code. The data-service portfolio services include direct yfinance paths and do not persist portfolio state.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; local repository source and stubbed tests; no brokerage or provider call.
- Contract: Frontend portfolio functions call Spring `/api/v1/portfolio/*` and `/api/v1/portfolios/*`; Spring owns the persisted ledger and current default-user scoping; only optimization/rebalance requests use the internal FastAPI `/api/v1/portfolio/optimize` and `/rebalance-check` routes.
- Evidence Locator: `frontend/src/api/client.ts:142-158,339-512`; `frontend/src/hooks/useInvestmentPortfolio.ts`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioDashboardController.java:42-811`; `PortfolioManagementController.java:36-197`; `PortfolioPositionController.java:40-205`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PortfolioLedgerService.java:17-131`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/PortfolioOptimizationAdapter.java:21-65`; `data-service/app/routers/portfolio.py`; `data-service/app/services/portfolio_service.py` and `portfolio_analytics_service.py`.
- Verification: Source inspection plus `PortfolioLedgerServiceTest`, portfolio dashboard/management/position controller tests, `PortfolioOptimizationAdapterTest`, and data-service portfolio tests.
- Limitations: Portfolio dashboard completeness depends on real price availability; missing prices can produce empty/null-derived values. No production user isolation, brokerage synchronization, or data-service portfolio persistence was proven. Frontend E2E dashboard navigation is also limited by the separately recorded `DashboardHome.tsx:381` shape error.
- Legacy Claims: Any document that treats portfolio holdings as frontend-only state conflicts with the Spring ledger evidence. Any document that treats data-service optimization as a portfolio system of record conflicts with the read-only route and absence of a persistence adapter.

### CAP-CUR-XR-005 — Watchlists, research, and news chain

- Summary: Watchlists are browser-to-Spring flows: the shared client calls watchlist and research-snapshot routes, Spring persists watchlist state and runs the snapshot use case, and research adapters call FastAPI research routes when prepared research is needed. News browser flows call Spring news routes, where Finnhub/Tiingo and portfolio/watchlist context are composed; no direct frontend-to-FastAPI news hop was found. Data-service research services include direct yfinance analytics, so watchlist research does not inherit one uniform provider boundary.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; frontend, Spring, and FastAPI source with provider calls stubbed in tests.
- Contract: Frontend `fetchWatchlists`, `fetchWatchlistResearchSnapshot`, `fetchNews`, `fetchAllNews`, and `fetchPortfolioNews` use Spring `/api/v1`; Spring owns watchlist persistence and news response DTOs; research subroutes are internal data-service contracts.
- Evidence Locator: `frontend/src/api/client.ts:74-91,734-809,941-971`; `frontend/src/hooks/useWatchlists.ts`, `useWatchlistResearchSnapshot.ts`, and `useNewsFilters.ts`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/WatchlistController.java`; `NewsController.java`; `CategorizedNewsController.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/WatchlistResearchService.java`; `DataServiceResearchAdapter.java:20-128`; `data-service/app/routers/research.py`; `data-service/app/services/fundamental_analysis_service.py`, `factor_analysis_service.py`, and `valuation_service.py`.
- Verification: Source inspection plus watchlist, watchlist research, news, and research adapter/service tests in backend and data-service; frontend watchlist/client tests are part of the 100 passing Vitest tests.
- Limitations: Provider freshness and article completeness are not proven. Backend adapters may return empty/optional research sections after downstream failures; news provider fallback depends on configured credentials. Research direct-yfinance calls can bypass resolver health and fallback.
- Legacy Claims: Archived provider and route tables may be useful historical context, but current Spring mappings and adapter code are authoritative for browser traffic. A claim that watchlist research is fully persisted or resolver-backed is not supported.

### CAP-CUR-XR-006 — Macro and calendar chain

- Summary: Dashboard macro and calendar requests originate in the shared frontend client and cross Spring `MarketCalendarController`/port into FastAPI `/api/v1/macro/snapshot`, `/calendar`, `/calendar/earnings`, and `/calendar/economic-events`. FastAPI uses FRED/FMP provider adapters and Redis with an in-memory fallback: macro data has a four-hour TTL and calendar data is cached through the next UTC midnight. Missing credentials or incomplete upstream data produce empty/nullable data, while Spring can expose an unavailable/503 macro response when required data is absent.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; FRED/FMP credentials were not used; source and stub-based tests only.
- Contract: Frontend `fetchMacroSnapshot` and `fetchEconomicEvents` remain Spring-facing; public paths are `/api/v1/macro/snapshot`, `/api/v1/calendar`, `/api/v1/calendar/earnings`, and `/api/v1/calendar/economic-events`; internal FastAPI paths use the same suffixes.
- Evidence Locator: `frontend/src/api/client.ts:889-929`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/MarketCalendarController.java:23-64`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceMarketCalendarAdapter.java:38-86`; `data-service/app/routers/macro.py`; `data-service/app/routers/calendar.py`; `data-service/app/services/macro_cache_service.py`; `data-service/app/services/calendar_service.py`; `data-service/app/providers/fred_provider.py`; `fmp_provider.py`.
- Verification: Source inspection plus `DataServiceMarketCalendarAdapterTest`, backend market-calendar/controller tests, `test_market_calendar_providers.py`, and cache/health tests in data-service.
- Limitations: No current macro or event values were fetched. Cache warmth, upstream freshness, and exact provider quota state are unknown. Empty/nullable data can be semantically different from an explicit stale status at the browser boundary.
- Legacy Claims: The archived data-fetching report's FRED/FMP and TTL descriptions are consistent with the inspected route/service design, but remain historical evidence rather than live freshness proof.

### CAP-CUR-XR-007 — Reports, valuation, and PEG chain

- Summary: The frontend company-report and smart-report hooks call Spring `/api/v1/reports/company/{symbol}` and `/api/v1/reports/smart/{symbol}`. Company reports compose Spring technical and Finnhub evidence; smart reports use the Spring use case and research/data-service adapters. Current data-service valuation reads provider `pegRatio` directly, leaves PEG nullable when absent, and includes it as one weighted valuation factor; it has no target-date consensus, eligibility/quality gates, or peer-comparison result in the observed implementation. The frontend also contains a separate direct `/api/gemini/portfolio-report` call for which no Spring controller mapping was found.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; source and stub-based tests; no LLM/provider call.
- Contract: Spring report routes and current DTOs remain the browser contract; the current valuation response exposes nullable `peg` and optional `peer_comparison`; the product target separately requires gated, subordinate PEG interpretation and no PEG-only decision.
- Evidence Locator: `frontend/src/hooks/useCompanyReport.ts`, `useSmartReport.ts`; `frontend/src/components/AiReportsView.tsx:142-160`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/CompanyReportController.java`; `SmartReportController.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/usecase/SmartReportUseCase.java`; `DataServiceResearchAdapter.java`; `data-service/app/services/valuation_service.py`; `data-service/app/models/valuation.py`; `docs/spec/current-system/domain-and-data.md`; `docs/product/PRD.md:520-560`.
- Verification: Source inspection plus company-report, smart-report, research, valuation, and frontend hook/client tests. Direct mapping searches covered all Spring inbound controllers and found no `/api/gemini` mapping.
- Limitations: Current provider PEG semantics are not a target-date or peer-validated investment decision. No claim is made that the current nullable field is populated for any symbol. The direct Gemini call may be handled by an external development route not present in this repository, but that route was not evidenced.
- Legacy Claims: Current and archived documents that describe a populated or universal PEG recommendation conflict with both the nullable implementation and the PRD gating policy. The legacy direct-Gemini path is not evidence of a supported Spring contract.

### CAP-CUR-XR-008 — Persistence, cache ownership, and degradation ownership

- Summary: Spring is the product-facing persistence owner for prices, assets, portfolios, positions, transactions, watchlists, journal trades, notifications, and agent-analysis history through ports and JPA/Flyway adapters. Redis is used for agent-analysis caching and selected data-service caches; data-service analytics and optimization are observed as read-only, while its Mongo settings do not establish a Mongo client or durable repository. Provider degradation is split by boundary: resolver routes return empty/nullable/health signals, Spring adapters map failures to optional/empty/HTTP error contracts, and the frontend renders loading, empty, null, or error states. No layer substitutes fabricated financial values.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; local source, configuration, and stub-based test evidence; no external provider or production database.
- Contract: Backend persistence and migrations remain authoritative for current product state; data-service analytics are not a write-through portfolio repository; degradation must remain explicit as unavailable, insufficient, empty, partial, stale, or failed according to route/DTO semantics.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/`; `backend/src/main/resources/db/migration/`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/cache/AgentAnalysisCacheService.java`; `backend/src/main/resources/application.yml`; `data-service/app/services/macro_cache_service.py`; `data-service/app/services/calendar_service.py`; `data-service/app/config.py`; `data-service/app/routers/portfolio.py`; `docs/spec/current-system/operations.md`; `docs/spec/current-system/contracts.md`; frontend fallback paths in `frontend/src/App.tsx` and `DashboardHome.tsx`.
- Verification: Cross-check against `CAP-CUR-BE-008`, `CAP-CUR-BE-009`, `CAP-CUR-DS-003`, `CAP-CUR-DS-006`, and `CAP-CUR-FE-005`; backend, data-service, and frontend verification suites passed at their recorded scopes.
- Limitations: This is ownership evidence, not a production topology or migration-state proof. Redis/Testcontainers persistence coverage was partly skipped because the local Docker API was older than the Testcontainers client requirement. Freshness/status metadata is not uniform across all endpoints.
- Legacy Claims: Archived Mongo/container/config inventories are not proof of an active durable Mongo path. Historical cache TTLs are not proof that every current endpoint uses the named cache.

### CAP-CUR-XR-009 — Browser boundary and verification limitations

- Summary: The intended browser boundary is the Spring `/api/v1` API client, but the frontend has one observed direct relative `/api/gemini/portfolio-report` request with no matching backend controller in this repository. Unit tests, lint, and production build pass at the audited scope; the mocked Playwright suite ran 21 tests across three projects with 6 passed, 6 failed, and 9 skipped. All six failures were associated with `DashboardHome` calling `comparisonSeries.filter` after an unexpected mocked response shape, so end-to-end route confidence is limited even though source route declarations are present.
- Evidence Level: E3
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; frontend Node/npm workspace; Playwright Chromium desktop/tablet/mobile projects; integrated E2E disabled because `E2E_INTEGRATED` was not set.
- Contract: Browser-to-Spring API usage is the supported current pattern; any direct browser endpoint must have an evidenced server owner and response contract before being treated as supported.
- Evidence Locator: `frontend/src/api/client.ts`; `frontend/src/components/AiReportsView.tsx:142-160`; Spring inbound mappings under `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/`; `frontend/src/components/DashboardHome.tsx:336-381`; `frontend/e2e/smoke.spec.ts:108-128`; `docs/product/evidence/frontend.md` `CAP-CUR-FE-004` and `CAP-CUR-FE-006`.
- Verification: `npm test` passed 100 tests; `npm run test:coverage` passed 100 tests; `npm run lint` exited 0; `npm run build` succeeded with a chunk-size warning; `npm run e2e` recorded 6 passed, 6 failed, and 9 skipped. No production or test source was changed to hide or repair the E2E failure.
- Limitations: The E2E failure is a known audit finding, not a claim that all browser paths fail. The direct Gemini call may be served by an untracked/external development service, but no repository evidence identifies its owner or contract. Integrated provider tests were intentionally not run.
- Legacy Claims: A green unit/build result must not be promoted to end-to-end readiness. Archived frontend roadmap or UI claims cannot override the current source boundary and the recorded Playwright failure.

## Limitations

- Cross-runtime traces are source- and test-backed at the recorded commits; they do not establish live provider freshness, production deployment topology, current credentials, or production database contents.
- `CAP-CUR-DS-004` and `CAP-CUR-XR-002`/`005`/`007` show that direct yfinance analytics coexist with resolver-backed routes. This is deliberately recorded as a current boundary inconsistency, not silently normalized.
- `CAP-CUR-FE-004` and `CAP-CUR-XR-009` preserve the direct Gemini route discrepancy and dashboard E2E failure for later reconciliation. No runtime or test fix is included in this audit.
