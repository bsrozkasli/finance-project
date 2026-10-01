# Backend Current-State Evidence

## Audit Metadata

- Audit Commit: `532e2f2`
- Branch: `docs/evidence-driven-product-design`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Spring Boot 3.4.5; Java runtime 21.0.2 observed by Maven Surefire; Maven wrapper; backend test configuration uses local stubs and Testcontainers where enabled.
- Scope: Spring backend REST surface, domain services and ports, provider/data-service adapters, persistence, caching, scheduled jobs, migrations, and test evidence.
- Exclusion: `data-service/external/TradingAgents` was not modified or treated as a backend capability source.

## Evidence Records

### CAP-CUR-BE-001 — REST endpoint surface and delegation

- Summary: The Spring backend exposes the following `/api/v1` REST groups. Controllers are thin inbound adapters, while collaborators are domain services, outbound ports, or provider/data-service adapters.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Existing route prefixes and DTO-facing endpoint paths are preserved as observed; no endpoint behavior is changed by this audit.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/*Controller.java` at each class-level `@RequestMapping` and method-level mapping; controller collaborators are listed below.
- Verification: Source inspection at commit `532e2f2`; endpoint mapping inventory reproduced with `rg -n "@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)" backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest`.
- Limitations: This record inventories implementation mappings; it does not assert that every route has an external consumer or full end-to-end provider coverage. Authentication is not represented in the inspected controller contracts.
- Legacy Claims: Legacy endpoint documents may be stale; the Java mappings above are the current source of truth for this audit.

| Method and path | Delegated collaborator / state path |
| --- | --- |
| `GET /api/v1/agent-analysis/{ticker}`; `DELETE /api/v1/agent-analysis/{ticker}/cache`; `DELETE /api/v1/agent-analysis/cache` | `AgentAnalysisFacade`; cache invalidation is facade-owned. |
| `GET /api/v1/analysis/patterns/{symbol}`; `POST /api/v1/analysis/decision-support` | `PatternDetectionPort` and `LlmInsightPort`. |
| `GET /api/v1/analyst/{symbol}/recommendations`; `GET /api/v1/analyst/{symbol}/price-target` | `FinnhubClient`; provider failures are handled by the controller’s unavailable/empty response paths. |
| `GET /api/v1/assets`; `GET /api/v1/assets/{symbol}`; `POST /api/v1/assets/batch`; `DELETE /api/v1/assets/{symbol}` | `AssetRepositoryPort`; batch resolution uses `AssetResolutionService`, `PriceChartClientPort`, and `PriceRepositoryPort`. |
| `GET /api/v1/backtest/{symbol}` | `DataServiceBacktestAdapter`. |
| `GET /api/v1/news`; `GET /api/v1/news/portfolio` | `FinnhubClient`, `TiingoClient`, `PortfolioPositionPort`, and `WatchlistPort`. |
| `POST /api/v1/chat/ask` | `DataServiceChatAdapter`; request body response is returned through the adapter. |
| `GET /api/v1/reports/company/{symbol}` | `TechnicalAnalysisPort` and `FinnhubClient`. |
| `GET /api/v1/fundamentals/{symbol}`; `GET /api/v1/fundamentals/{symbol}/ratios`; `GET /api/v1/fundamentals/{symbol}/earnings`; `GET /api/v1/fundamentals/{symbol}/insider`; `GET /api/v1/fundamentals/{symbol}/institutional` | `FinancialDataPort`, `SmartReportMarketDataPort`, `ResearchDataPort`, and `FinnhubClient`; unavailable research sub-sections fall back to empty/nullable response fields. |
| `GET /api/v1/journal/trades`; `GET /api/v1/journal/trades/stats`; `POST /api/v1/journal/trades`; `PUT /api/v1/journal/trades/{id}`; `DELETE /api/v1/journal/trades/{id}` | `JournalTradeService`, which uses the journal port and price refresh service. |
| `GET /api/v1/macro/snapshot`; `GET /api/v1/calendar`; `GET /api/v1/calendar/earnings`; `GET /api/v1/calendar/economic-events` | `MarketCalendarPort`; port returns optional/empty results according to provider availability. |
| `GET /api/v1/news/{symbol}` | `FinnhubClient`. |
| `GET /api/v1/notifications`; `GET /api/v1/notifications/unread`; `POST /api/v1/notifications/read-all` | `NotificationRepositoryPort`. |
| `POST /api/v1/portfolio/optimize`; `POST /api/v1/portfolio/rebalance-check` | `PortfolioOptimizationPort`, backed by data-service adapter. |
| `GET /api/v1/portfolio/summary`; `GET /api/v1/portfolio/performance`; `GET /api/v1/portfolio/performance/comparison`; `GET /api/v1/portfolio/positions/performance`; `GET /api/v1/portfolio/allocation`; `GET /api/v1/portfolio/positions/enriched` | Portfolio ports, `PortfolioLedgerService`, and `PriceRefreshService`; unavailable prices produce empty/null-derived dashboard values. |
| `GET /api/v1/portfolios`; `POST /api/v1/portfolios`; `PUT /api/v1/portfolios/{portfolioId}`; `DELETE /api/v1/portfolios/{portfolioId}`; `GET/POST /api/v1/portfolios/{portfolioId}/transactions`; `DELETE /api/v1/portfolios/{portfolioId}/transactions/{transactionId}`; `GET /api/v1/portfolios/{portfolioId}/holdings` | `PortfolioPort`, `PortfolioTransactionPort`, `PortfolioLedgerService`, and journal port. |
| `GET/POST /api/v1/portfolio/positions`; `PUT /api/v1/portfolio/positions/{id}`; `DELETE /api/v1/portfolio/positions/{id}` | `PortfolioPositionPort`, portfolio port, and `PortfolioLedgerService`. |
| `GET /api/v1/prices/{symbol}/latest`; `GET /api/v1/prices/{symbol}/history`; `POST /api/v1/prices/batch-history` | `PriceRefreshService` and `RestMapper`; DB-first refresh/degradation is below. |
| `GET /api/v1/reports/test` | Controller-level diagnostic endpoint; no domain persistence path. |
| `GET /api/v1/reports/smart/{symbol}` | `SmartReportUseCase`; the use case composes data-service and provider evidence. |
| `GET /api/v1/technical/{symbol}`; `GET /api/v1/technical/{symbol}/signals` | `TechnicalAnalysisPort`; insufficient history is represented as unavailable/error according to the adapter contract. |
| `GET /api/v1/watchlists`; `GET /api/v1/watchlists/{id}/research-snapshot`; `POST /api/v1/watchlists`; `POST /api/v1/watchlists/{id}/symbols`; `DELETE /api/v1/watchlists/{id}/symbols/{symbol}`; `DELETE /api/v1/watchlists/{id}` | `WatchlistPort` and `WatchlistResearchSnapshotUseCase`; watchlist state is persisted through the watchlist adapter. |

### CAP-CUR-BE-002 — Price retrieval, refresh, and ingestion

- Summary: Price reads flow through `PriceRefreshService`; the service consults the price repository and refreshes through `FinancialDataPort` when data is not fresh. Scheduled ingestion is a separate outbound adapter.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: `PriceController` preserves latest/history/batch-history routes; `PriceHistory` remains the domain response model.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshService.java:23-61`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PriceController.java:30-109`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceIngestionUseCase.java:23-72`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/scheduler/PriceIngestionJob.java:18-36`.
- Verification: Source inspection; related tests are `PriceRefreshServiceTest`, `PriceIngestionUseCaseTest`, `PriceControllerTest`, and `DataServicePriceAdapterTest` in `backend/src/test`.
- Limitations: The current persisted result has a timestamp but no explicit stale flag in the observed response path; a failed refresh may therefore return persisted rows without a first-class freshness status.
- Legacy Claims: Any documentation describing provider-only price reads conflicts with the observed DB-first service path and should be treated as stale.

### CAP-CUR-BE-003 — Provider and data-service boundaries

- Summary: Outbound ports separate backend domain code from data-service, Finnhub, Tiingo, Yahoo, and LLM integrations. Provider guard and priority code records rate-limit/backoff degradation, while adapters normalize or return optional/empty values.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Backend-facing provider adapters implement domain ports; normal frontend application flows remain behind the Spring `/api/v1` boundary.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/*.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/guard/ProviderRequestGuard.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/*Adapter.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/finnhub/FinnhubClient.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/tiingo/TiingoClient.java`.
- Verification: Source inspection plus `ProviderRequestGuardTest` and `DataServicePriceAdapterTest` in the backend test suite.
- Limitations: No live financial provider was called; tests use mocks/stubs. Provider quotas, credentials, and external uptime are not proven by this audit.
- Legacy Claims: Provider claims must not be upgraded from implementation evidence to live-data availability; unavailable, incomplete, or rate-limited paths remain possible.

### CAP-CUR-BE-004 — Asset metadata and symbol resolution

- Summary: Asset metadata is persisted through `AssetRepositoryPort`; raw symbols are normalized/resolved by `AssetResolutionService`, which can consult symbol mapping and chart data before saving.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Asset list/detail/batch/delete routes are under `/api/v1/assets`; asset status is not inferred from synthetic market values.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AssetController.java:37-166`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AssetResolutionService.java:13-48`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/AssetRepositoryAdapter.java:19-49`.
- Verification: Source inspection plus `AssetResolutionServiceTest`, `AssetRepositoryAdapterTest`, and `AssetControllerTest`.
- Limitations: Repository adapter tests include skipped persistence coverage when container infrastructure is unavailable; semantic source/provider completeness is not established for every ticker.
- Legacy Claims: A legacy claim that asset metadata is only an in-memory frontend concern conflicts with the persisted backend asset adapter.

### CAP-CUR-BE-005 — Fundamentals, technicals, news, analyst, calendar, and reports

- Summary: Research endpoints compose prepared metrics from backend ports and provider/data-service adapters. Technical analysis requires sufficient history; macro/calendar/news/analyst sections may return empty or nullable results when sources are unavailable.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Research routes and response DTOs are owned by the REST controllers listed in `CAP-CUR-BE-001`; provider failure is not replaced with fabricated market evidence.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/FundamentalsController.java:30-353`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/TechnicalController.java:22-114`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/MarketCalendarController.java:23-64`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AnalystController.java:36-109`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/usecase/SmartReportUseCase.java`.
- Verification: Source inspection plus controller tests for fundamentals, technical, calendar, analyst, news, company report, smart report, and related domain tests.
- Limitations: The controller layer still contains composition and fallback mapping in some research paths; this is an observed brownfield shape, not an architectural recommendation. External provider freshness is not verified.
- Legacy Claims: PEG, valuation, and research completeness claims require prepared evidence from the data-service or provider path; presence of an endpoint alone does not prove a populated metric.

### CAP-CUR-BE-006 — Portfolio ledger, positions, dashboard, watchlists, journal, and notifications

- Summary: Portfolio transactions are persisted behind ports and holdings are calculated by `PortfolioLedgerService`. Dashboard endpoints derive values from positions, transactions, and refreshed prices. Watchlist research and journal trade behavior are separated into services/use cases; notifications use a repository port.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Portfolio, position, watchlist, journal, and notification paths remain under the route groups in `CAP-CUR-BE-001`; user scoping is implemented with the current default user value in the inspected controllers.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PortfolioLedgerService.java:17-131`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioManagementController.java:36-197`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioPositionController.java:40-205`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioDashboardController.java:42-811`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/WatchlistResearchService.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/JournalTradeService.java`.
- Verification: Source inspection plus `PortfolioLedgerServiceTest`, `JournalTradeServiceTest`, `WatchlistResearchServiceTest`, `WatchlistResearchSnapshotUseCaseTest`, and the relevant REST controller tests.
- Limitations: This audit does not validate production authentication or multi-user authorization; observed controllers use a default user identifier. Dashboard completeness depends on price availability.
- Legacy Claims: Any legacy statement that portfolio holdings are only a frontend calculation conflicts with the backend ledger service and persistence ports.

### CAP-CUR-BE-007 — Agent analysis, chat, optimization, and backtest

- Summary: Agent analysis is exposed through `AgentAnalysisFacade`, which is backed by domain metrics, an AI port, history persistence, and an analysis cache. Chat, portfolio optimization, rebalance checks, and backtests delegate to data-service adapters; smart reports use a domain use case.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Agent analysis cache invalidation endpoints remain under `/api/v1/agent-analysis`; LLM/provider failure must preserve unavailable/no-decision semantics.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AgentAnalysisUseCase.java:26-103`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/cache/AgentAnalysisCacheService.java:24-86`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AgentAnalysisController.java:22-96`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceChatAdapter.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/PortfolioOptimizationAdapter.java`.
- Verification: Source inspection plus `AgentAnalysisUseCaseTest`, `AgentAnalysisControllerTest`, `AgentAnalysisCacheServiceTest`, `SmartReportUseCaseTest`, `ChatControllerTest`, `BacktestControllerTest`, and `AnalysisControllerTest`.
- Limitations: Five cache tests were skipped in the full run; no external LLM or analytics provider was contacted. The observed cache is an adapter concern with a configured 15-minute analysis TTL.
- Legacy Claims: An LLM-generated decision must not be documented as guaranteed output; the current code preserves empty/no-decision behavior when the relevant source is unavailable.

### CAP-CUR-BE-008 — Persistence model and migrations

- Summary: JPA persistence adapters implement domain ports for assets, prices, financial statements, fundamental snapshots, portfolios, positions, transactions, journal trades, watchlists, notifications, symbol mappings, and agent-analysis history.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Applied schema history is represented by the existing Flyway migration files; future schema changes must use new migrations.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/repository/`; `backend/src/main/resources/db/migration/V1__initial_schema.sql`; `V2__agent_analysis_history.sql`; `V2_1__create_agent_analysis_history.sql`; `V3__portfolio_transaction_ledger.sql`; `V4__symbol_mapping_and_asset_metadata.sql`.
- Verification: Source and migration inventory at commit `532e2f2`; repository adapter tests and the architecture test are present in `backend/src/test`.
- Limitations: The audit does not connect to or inspect a production database, nor does it infer applied migration state from filenames alone. The duplicate-looking V2/V2_1 history requires explicit migration-environment verification before future schema work.
- Legacy Claims: MongoDB-only persistence claims conflict with the observed Spring Data JPA repositories and Flyway resources; the migration list is the current repository evidence.

### CAP-CUR-BE-009 — Cache, scheduling, configuration, errors, and observability

- Summary: Backend configuration includes Postgres, Redis, data-service base URL, provider keys, Resilience4j settings, actuator health/prometheus, and SpringDoc. Cache TTLs are configured for price/research/report/agent-analysis areas; scheduled adapters include price ingestion and opportunity radar. Global error handling and request correlation are tested.
- Evidence Level: E2
- Commit: `532e2f2`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper.
- Contract: Provider degradation and error responses are explicit implementation behavior; cache configuration must not be interpreted as freshness proof.
- Evidence Locator: `backend/src/main/resources/application.yml`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/cache/AgentAnalysisCacheService.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/scheduler/PriceIngestionJob.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/scheduler/OpportunityRadarJob.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/GlobalExceptionHandler.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/config/HttpObservabilityFilter.java`.
- Verification: Source inspection plus `AgentAnalysisCacheServiceTest`, `OpportunityRadarJobTest`, `HttpObservabilityFilterTest`, `RequestCorrelationFilterTest`, and `WebConfigTest`.
- Limitations: Runtime infrastructure, provider credentials, and production Redis/Postgres health are outside this local audit. The current application configuration uses local defaults and may require environment overrides.
- Legacy Claims: Static legacy operational documents must not be treated as current configuration unless they agree with `application.yml` and the observed adapters.

### CAP-CUR-BE-010 — Backend verification evidence

- Summary: The full backend Maven test suite completed successfully with 450 tests, zero failures, zero errors, and 13 skipped tests; JaCoCo report generation also completed.
- Evidence Level: E3
- Contract: Verification is local and non-live; tests use mocks/stubs for provider boundaries and skip infrastructure-dependent tests when their preconditions are unavailable.
- Commit: `532e2f2`
- Evidence Locator: `backend/.mvnw.cmd test` (run from `backend` at audit time).
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Java 21.0.2; Maven wrapper; Docker Desktop 29.6.1 detected by Testcontainers.
- Verification: `BUILD SUCCESS`; `Tests run: 450, Failures: 0, Errors: 0, Skipped: 13`; JaCoCo analyzed 231 classes. Provider tests used local HTTP/mocks rather than live financial providers.
- Limitations: Skipped coverage includes Testcontainers-backed integration/persistence/cache tests. Docker was detected, but Testcontainers Ryuk startup reported Docker API client `1.32` below the daemon minimum `1.40`; therefore infrastructure-backed execution is not fully proven. The Maven run emitted expected Mockito/Byte Buddy and ArchUnit warnings.
- Legacy Claims: Passing the local suite is evidence of the tested code paths only; it does not prove external provider availability, production database migration state, or frontend compatibility.

## Limitations

- This is an implementation audit, not a behavior change or security review.
- No production source or test source was changed for this audit.
- No live financial provider, LLM, or production database was called.
- The full Maven suite passed, but 13 tests were skipped; the Testcontainers Docker API mismatch must be resolved before claiming full integration coverage.
- The current backend still exposes some brownfield risks for later reconciliation: default-user scoping in portfolio/watchlist controllers, nullable/empty provider fallbacks, timestamp-only freshness, and migration-history ambiguity.
