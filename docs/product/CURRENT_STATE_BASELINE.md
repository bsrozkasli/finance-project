# Current-State Baseline

## Audit Metadata

- Audit Commit: `e1171d5`
- Branch: `docs/evidence-driven-product-design`
- Audit Date: 2026-10-02
- Reviewer: Codex
- Scope: Verified brownfield behavior across the React frontend, Spring
  backend, FastAPI data-service, persistence/cache boundaries, degradation,
  observability, and repository verification evidence.
- Source Set: `docs/product/evidence/backend.md`,
  `data-service.md`, `frontend.md`, `cross-runtime.md`, and
  `legacy-document-conflicts.md`.
- Current-Behavior Rule: This document describes what the repository proves
  today. It does not promote target intent, roadmap prose, UI copy, or
  archived proposals into implemented behavior.

## Method

The baseline uses the strongest evidence recorded by Plan 2. E3 means a
passing executed test or scenario at the stated scope; E2 means implementation
and contract inspection; E1 means a documented claim without current source or
runtime proof; E0 means missing, incomplete, or contradicted evidence. A
capability is summarized only when one or more declared `CAP-CUR-*` records
support it. Where the repository proves an absence or contradiction, that
limitation is retained instead of being filled with target behavior.

The audit was performed on Windows PowerShell with Spring Boot 3.4.5/Java
21.0.2, Python 3.13.9/pytest 9.0.3 in the data-service virtual environment,
and the frontend Node/Vite/Vitest/Playwright workspace. No live financial
provider, LLM, production database, or brokerage was contacted. The external
`data-service/external/TradingAgents` subtree was excluded from current product
capability evidence.

## Capability Inventory

| Product area | Current capability summary | Strongest evidence | Material limitation or missing evidence |
|---|---|---|---|
| Asset and market data | The Spring API exposes asset metadata and price routes. Price reads are DB-first through `PriceRefreshService`; refresh delegates through ports and the data-service price route uses the provider resolver. Asset resolution can persist explicit unavailable metadata. | E2 — `CAP-CUR-BE-002`, `CAP-CUR-BE-004`, `CAP-CUR-DS-002`, `CAP-CUR-XR-001` | Provider freshness is not proven. Persisted price rows may be returned after refresh failure without a first-class stale flag. Resolver-backed and direct-provider analytics are not one uniform boundary. |
| Technical analysis | The browser calls Spring technical routes, Spring delegates to FastAPI, and the data-service calculates technical responses through a direct-yfinance analysis path. Insufficient candle history is represented as unavailable/error according to the route. | E2 — `CAP-CUR-BE-005`, `CAP-CUR-DS-005`, `CAP-CUR-XR-002` | The direct-yfinance path bypasses resolver fallback and health metrics. Endpoint-level cache use is not established for every technical request. |
| Fundamental, valuation, and research | Spring exposes fundamentals, ratios, earnings, insider, institutional, smart-report, and research-backed paths. Data-service research includes fundamental, valuation, risk, earnings, factors, institutional-score, and composite routes. | E2 — `CAP-CUR-BE-005`, `CAP-CUR-DS-005`, `CAP-CUR-XR-005`, `CAP-CUR-XR-007` | Sections can be empty, nullable, partial, or unavailable. Current PEG is a nullable provider ratio used in a simple valuation score; target-date, peer, and governed interpretation are not current evidence. |
| News and analyst information | Spring news and analyst routes compose configured Finnhub/Tiingo/provider data with portfolio and watchlist context. Frontend news and analyst flows normally remain behind Spring. | E2 — `CAP-CUR-BE-001`, `CAP-CUR-BE-005`, `CAP-CUR-DS-003`, `CAP-CUR-XR-005` | Provider credentials, article freshness, analyst completeness, and live fallback state are not proven. Downstream failure may become an empty or optional response. |
| Portfolio and ledger | Portfolio, position, transaction, holding, dashboard, allocation, performance, and journal routes are owned by Spring services and persistence ports. `PortfolioLedgerService` derives holdings from persisted transactions; dashboard values depend on refreshed prices. | E2 — `CAP-CUR-BE-006`, `CAP-CUR-BE-008`, `CAP-CUR-XR-004` | Current controllers use a default user identifier; production authorization and multi-user isolation are not evidenced. Missing prices can yield empty or null-derived dashboard values. |
| Portfolio optimization and backtesting | Spring delegates optimization/rebalance requests and backtests to data-service adapters. The observed data-service optimization path is analytic/read-only and does not persist portfolio state. | E2 — `CAP-CUR-BE-007`, `CAP-CUR-DS-007`, `CAP-CUR-XR-004` | Direct-provider analytics remain in data-service portfolio services. No brokerage execution, synchronization, or production backtest freshness guarantee is evidenced. |
| Discovery and watchlists | Watchlists are persisted through Spring routes; watchlist research snapshots are composed through a Spring use case and research adapters. Asset symbol resolution supports several asset types and an unavailable fallback. | E2 — `CAP-CUR-BE-004`, `CAP-CUR-BE-006`, `CAP-CUR-XR-005` | A verified broad ranking/discovery workflow and a fail-closed point-in-time security-master boundary are not evidenced. Current symbol ingestion can default unresolved input to a `STOCK`/`UNAVAILABLE` asset. |
| Macro and calendar | Frontend macro/calendar requests cross Spring into FastAPI FRED/FMP-backed routes. Macro data uses a four-hour cache and calendar data is cached through the next UTC midnight, with in-memory fallback paths. | E2 — `CAP-CUR-BE-001`, `CAP-CUR-DS-008`, `CAP-CUR-XR-006` | No current macro/event values were fetched. Missing credentials or incomplete upstream data produce nullable/empty responses and may surface as unavailable at the Spring boundary. |
| Decision support and AI reports | Agent analysis is a Spring-facing flow with prepared metrics, Redis cache, history persistence, and a FastAPI sequential agent pipeline. Chat and smart/company reports use Spring adapters and use cases. | E2 — `CAP-CUR-BE-007`, `CAP-CUR-DS-006`, `CAP-CUR-XR-003`, `CAP-CUR-XR-007` | Azure/LLM availability is not proven. Current agent response vocabulary includes `decision`, `confidence`, and `from_cache`; an auditable retained Decision Result contract is not evidenced. A direct frontend Gemini route has no matching Spring mapping in the repository. |
| Monitoring and notifications | Backend scheduled adapters, provider health/metrics, actuator/Prometheus configuration, notification routes, and data-service health/metrics are present. Frontend renders loading, empty, null, and error states for failed requests. | E2 — `CAP-CUR-BE-009`, `CAP-CUR-DS-003`, `CAP-CUR-DS-008`, `CAP-CUR-FE-005`, `CAP-CUR-XR-008` | A verified material-change monitoring workflow and alert evidence lifecycle are not established. Cache warmth, provider freshness, and production observability topology are unknown. |
| Personalization | No current user-policy learning or personalization capability is verified. The observed portfolio/watchlist flows use current default-user scoping and persisted domain state, not a proven personalization model. | E0 — absence is bounded by `CAP-CUR-BE-006`, `CAP-CUR-XR-004`, `CAP-CUR-XR-008` | There is no implementation or runtime evidence for consented policy learning, eligibility, shadow mode, or personalized ranking. This baseline does not infer it from target or roadmap documents. |
| Identity and SaaS isolation | The current runtime is local-demo oriented. Spring exposes domain routes but no verified authentication, authorization, tenant isolation, subscription, or SaaS ownership boundary. | E0 — limitation recorded by `CAP-CUR-BE-006`, `CAP-CUR-XR-008` | No current auth/security contract is evidenced; the archived JWT specification is proposed/history, not current behavior. Production identity and cross-user isolation remain unverified. |
| Persistence and cache ownership | Spring JPA/Flyway adapters own product persistence for assets, prices, portfolios, transactions, watchlists, journal trades, notifications, and agent history. Redis and in-memory caches support selected analysis/calendar/macro paths. MongoDB is configured/reserved but no durable product repository was verified. | E2 — `CAP-CUR-BE-008`, `CAP-CUR-BE-009`, `CAP-CUR-DS-008`, `CAP-CUR-XR-008` | Applied migration state and production data are not inspected. Cache TTL configuration is not proof that every named endpoint uses that cache. |
| Cross-runtime API boundary | Normal frontend flows use the shared Spring `/api/v1` client; Spring adapters call FastAPI for selected analytics/provider operations. Route, DTO, fallback, and persistence ownership are split by flow rather than by one universal provider rule. | E2 — `CAP-CUR-FE-002`, `CAP-CUR-XR-001`, `CAP-CUR-XR-002`, `CAP-CUR-XR-003`, `CAP-CUR-XR-004`, `CAP-CUR-XR-005`, `CAP-CUR-XR-006`, `CAP-CUR-XR-007`, `CAP-CUR-XR-008` | The direct `/api/gemini/portfolio-report` browser request has no repository Spring mapping. Direct-yfinance analytics create an unresolved provider-boundary inconsistency. |
| Observability and operations | Backend configuration includes database, Redis, data-service URL, provider keys, Resilience4j, actuator/prometheus, and request correlation. Data-service exposes provider health, resolver metrics, and cache/health endpoints. | E2 — `CAP-CUR-BE-009`, `CAP-CUR-DS-002`, `CAP-CUR-DS-008`, `CAP-CUR-XR-008` | The audit does not prove deployed dashboards, alert rules, credential validity, provider quotas, or production log retention. |
| Verification status | Runtime-specific verification evidence exists for backend, data-service, and frontend unit/build checks; cross-runtime browser verification retains a known dashboard failure. | E3 for the recorded commands — `CAP-CUR-BE-010`, `CAP-CUR-DS-009`, `CAP-CUR-FE-007`, `CAP-CUR-XR-009` | Backend had 13 Testcontainers-related skips because the local Docker API was below the client minimum. Frontend Playwright ran 6 passed, 6 failed, and 9 skipped; failures point to `DashboardHome.tsx:381`. |

## Verification Status

The following results are the verification evidence already recorded in the
runtime artifacts; this baseline does not reinterpret a partial or skipped run
as a green end-to-end release signal.

| Runtime | Command or scenario | Observed result | Evidence |
|---|---|---|---|
| Spring backend | `backend/.mvnw.cmd test` | Build success; 450 tests, 0 failures, 0 errors, 13 skipped. Testcontainers/Ryuk was limited by Docker API client 1.32 versus daemon minimum 1.40. | `CAP-CUR-BE-010` |
| FastAPI data-service | `data-service/.venv/Scripts/python.exe -m pytest` | 50 passed, 0 failures. Tests use stubs/boundary patches and did not call live providers. | `CAP-CUR-DS-009` |
| React frontend unit/coverage | `npm test`; `npm run test:coverage` | Each run passed 100 tests. Recorded coverage was 66.91% statements, 53.73% branches, 66.92% functions, and 68.49% lines. | `CAP-CUR-FE-007` |
| React frontend static/build | `npm run lint`; `npm run build` | Lint exited 0; build succeeded with a chunk-size warning for the generated JavaScript bundle. | `CAP-CUR-FE-007` |
| Frontend browser smoke | `npm run e2e` | 21 scenarios across three projects: 6 passed, 6 failed, 9 skipped. The six failures share `DashboardHome.tsx:381` calling `.filter` on an unexpected `comparisonSeries` shape; integrated mode was not enabled. | `CAP-CUR-FE-007`, `CAP-CUR-XR-009` |
| Product-document validation | `python scripts/validate_product_docs.py --root docs/product` | Passed in incremental mode after baseline creation on 2026-10-02. | This Plan 3 task |

## Unresolved Contradictions

The following records remain part of the current-state interpretation. Their
dispositions are preserved from the legacy conflict ledger; this baseline does
not resolve them or assign delivery ownership.

- Disposition: Each conflict keeps the disposition declared in
  `docs/product/evidence/legacy-document-conflicts.md`; this baseline does not
  change any disposition.

| Conflict | Current-state impact | Disposition | Related current evidence |
|---|---|---|---|
| `DOC-CONFLICT-001` | Resolver-backed and direct-yfinance analytics coexist. | Correct Later | `CAP-CUR-DS-004`, `CAP-CUR-XR-002`, `CAP-CUR-XR-005` |
| `DOC-CONFLICT-002` | A direct Gemini browser path lacks a matching Spring contract in the repository. | Unresolved | `CAP-CUR-FE-004`, `CAP-CUR-XR-007`, `CAP-CUR-XR-009` |
| `DOC-CONFLICT-003` | Current nullable provider PEG behavior differs from governed target interpretation; current behavior remains the baseline. | Correct Later | `CAP-CUR-DS-005`, `CAP-CUR-XR-007` |
| `DOC-CONFLICT-004` | Proposed JWT/auth ownership must not be described as current capability. | Historical | `CAP-CUR-BE-006`, `CAP-CUR-XR-008` |
| `DOC-CONFLICT-005` | Archived MongoDB inventory does not establish current durable product persistence. | Historical | `CAP-CUR-BE-008`, `CAP-CUR-XR-008` |
| `DOC-CONFLICT-006` | Current permissive symbol resolution differs from the restricted universe evidence expected by future product material. | Correct Later | `CAP-CUR-BE-004`, `CAP-CUR-XR-005` |
| `DOC-CONFLICT-007` | Archived roadmap phases remain historical planning claims, not implementation evidence. | Historical | `CAP-CUR-FE-001`, `CAP-CUR-BE-001`, `CAP-CUR-XR-009` |
| `DOC-CONFLICT-008` | Empty/nullable/HTTP-error degradation varies by endpoint and is not a uniform structured status contract. | Correct Later | `CAP-CUR-BE-005`, `CAP-CUR-DS-003`, `CAP-CUR-XR-008` |
| `DOC-CONFLICT-009` | Current agent labels and fields must not be re-described as a different current decision contract. | Correct Later | `CAP-CUR-BE-007`, `CAP-CUR-DS-006`, `CAP-CUR-XR-003` |
| `DOC-CONFLICT-010` | Archived provider/cache tables are historical and cannot override current mixed runtime paths. | Historical | `CAP-CUR-XR-001`, `CAP-CUR-XR-002`, `CAP-CUR-XR-003`, `CAP-CUR-XR-004`, `CAP-CUR-XR-005`, `CAP-CUR-XR-006`, `CAP-CUR-XR-007` |

## Limitations

- No live financial provider, LLM, production database, brokerage, or external
  Gemini service was contacted. Source evidence does not prove freshness,
  quota, credentials, deployed topology, or current external availability.
- Provider degradation is explicit but not uniform: empty lists, nullable
  fields, optional sections, unavailable responses, HTTP errors, and persisted
  rows after refresh failure coexist. Consumers must not treat an empty or
  nullable response as fresh evidence.
- The backend test suite includes skipped infrastructure coverage because the
  local Docker/Testcontainers API versions are incompatible. This is a test
  environment limitation, not evidence that the skipped persistence paths are
  production-verified.
- Frontend unit, lint, and build checks do not establish complete browser
  readiness. The recorded Playwright failure remains open and no source/test
  fix is included in this baseline.
- The baseline intentionally excludes target requirements, target labels,
  future auth, personalization, broker synchronization, SaaS behavior, and
  other roadmap claims unless current evidence above proves a bounded current
  capability.
