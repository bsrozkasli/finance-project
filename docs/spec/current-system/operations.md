# Current-System Operations Contract

**Status:** Verified brownfield baseline

**Last verified:** 2026-10-01

This document owns local runtime configuration, provider behavior, degradation,
caching, security limits, performance controls, logging, and observability.

## Local Services and Ports

| Service | Port | Current purpose |
|---|---:|---|
| Spring backend | `8080` | Public application API, Actuator, OpenAPI |
| FastAPI data-service | `8000` | Internal analytics/provider API and metrics |
| Vite frontend | `5173` | Development UI |
| PostgreSQL | `5433` | Relational persistence |
| Redis | `6379` | Spring caches and data-service cache support |
| Prometheus | `9090` | Metrics collection |
| Grafana | `3000` | Local visualization |
| MongoDB | `27017` | Configured/reserved document store; no durable product repository use was verified |

Port or base-URL changes are coordinated contract migrations. Update Compose,
runtime configuration, CORS, health checks, `frontend/src/api/config.ts`, and
`frontend/vite.config.ts` together as applicable. Do not change
`docker-compose.yml` bindings or `prometheus.yml` scrape targets incidentally.

## Configuration

The backend loads the repository-root `.env` through `dotenv-java`. The
data-service also loads environment values. Real `.env` files and credentials are
never committed or exposed to the frontend.

| Variable | Default/requirement | Purpose and degradation |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5433` | PostgreSQL host port |
| `DB_NAME` | `financedb` | Database name |
| `DB_USERNAME` | `finance_user` | Database user |
| `DB_PASSWORD` | Required for Compose/backend login | Secret; no safe functional fallback |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `DATA_SERVICE_URL` | `http://localhost:8000` | Spring-to-FastAPI base URL |
| `TIINGO_API_KEY` | Optional | Enables Tiingo fallback/enrichment |
| `FINNHUB_API_KEY` | Optional | Enables Finnhub news, analyst, sentiment, and related coverage |
| `FRED_API_KEY` | Optional | Missing key leaves macro fields nullable |
| `FMP_API_KEY` | Optional | Missing key returns empty calendar collections |
| `AZURE_OPENAI_API_KEY` | Required for LLM success | Missing key makes agent/chat/insight unavailable |
| `AZURE_OPENAI_ENDPOINT` | Required for LLM success | Azure endpoint |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Required for LLM success | Azure deployment |
| `AZURE_OPENAI_API_VERSION` | `2024-05-01-preview` | Azure API version |
| `LLM_MAX_TOKENS` | `500` | Data-service response token ceiling |
| `SENTIMENT_CACHE_TTL_SECONDS` | `3600` | Sentiment cache duration |
| `NEWS_LOOKBACK_HOURS` | `24` | News lookback window |
| `PROVIDER_CHAIN` | `yahoo,tiingo,finnhub` | Data-service provider registration order. Names are trimmed, lower-cased, and de-duplicated; unknown names are logged and ignored; keyed providers without keys are skipped; omitted providers are not registered. A chain with no usable provider logs an error and falls back to the default order |
| `FLYWAY_BASELINE_ON_MIGRATE` | `true` | One-time compatibility baseline (version 4) for databases previously managed by Hibernate; set to `false` once every existing environment has a Flyway history table |
| `FLYWAY_OUT_OF_ORDER` | `true` | Lets the idempotent pre-V3 journal schema repair (`V2_2`) apply on databases that already reached later versions |
| `MONGO_URI` | `mongodb://localhost:27017/financedb` | Read only by the backend (`spring.data.mongodb.uri`); the data-service does not read it; no durable product repository use was verified |

`JWT_SECRET` appears only as a CI/example secret note; production authentication
is not implemented and must not be described as a current runtime capability.

## Provider Responsibilities

| Provider | Current role |
|---|---|
| Yahoo/yfinance | Primary no-key OHLCV, asset metadata, company profile, and regular/pre-market/post-market quotes; backend also has Yahoo adapters for prices/statements |
| Tiingo | Optional daily-only EOD OHLCV/news fallback when configured; non-daily intervals return empty so the resolver never serves daily bars as intraday; `adjusted` requests use Tiingo `adj*` fields |
| Finnhub | News, sentiment, analyst recommendations, targets, metrics, insider-related data when configured |
| FRED | Macro series; missing/failed series remain individually nullable |
| Financial Modeling Prep | Earnings and high-impact economic calendar |
| Azure OpenAI | Optional chat, insight, and sequential agent reasoning over prepared evidence |

The data-service `MarketDataResolver` tries active providers in registration order,
records empty/error transitions, blacklists repeatedly failing providers, and
periodically probes recovery. An empty list or `None` after the chain is valid
degradation; it is not replaced with sample data.

Price-history consumers state adjustment explicitly (ADR-0006): `/api/v1/prices`
and technical/pattern routes request unadjusted bars; risk analytics, factor
momentum/volatility, and portfolio optimization request split- and
dividend-adjusted bars. Daily bars are indexed by exchange session date.

When adding or changing a provider, register its resolver priority and health
tracking explicitly, keep credentials server-side, and document its empty/error
behavior and fallback position. Provider-chain changes are incomplete without
tests for success, empty response, provider failure, and fallback ordering.

## Degradation Contract

- Market/provider failures produce empty lists, nullable fields, partial DTOs,
  explicit status metadata, or dependency errors according to the public endpoint
  contract.
- `PriceRefreshService` may return existing persisted rows when a refresh fails.
  Price DTOs expose timestamps but no explicit stale flag, so consumers can only
  infer freshness from time. This is a current contract gap; documentation and UI
  must not claim that fallback price rows carry explicit stale metadata.
- `PriceRefreshService.lookupFreshLatest` returns the newest price with its origin:
  `FRESH` (the provider returned a row for the symbol), `STORED_REFRESH_FAILED` (the
  provider call threw, only a stored price), `STORED_REFRESH_EMPTY` (null, empty or
  only other symbols' rows, only a stored price), `NONE_REFRESH_FAILED`,
  `NONE_REFRESH_EMPTY`. It shares the fetch-and-persist path with `getFreshLatest`;
  failure is told from empty by the exception, never by message text. Only the
  watchlist research snapshot (price section status) and the journal's open-trade
  enrichment use it (see `contracts.md`); both map the origin through the single
  `PriceStatus.from` (`FRESH`=`OK`, `STORED_*`=`STALE`, `NONE_REFRESH_FAILED`=`FAILED`,
  `NONE_REFRESH_EMPTY`=`EMPTY`). Follow-up: `PortfolioDashboardController` and
  `PriceController` still use `getFreshLatest` and can present a stored price as
  current after a failed refresh (decided in
  `docs/product/decisions/2026-10-26-price-staleness.md` D-4, not built).
- Asset metadata uses `VERIFIED`, `PARTIAL`, or `UNAVAILABLE`.
- Technical analysis rejects fewer than 30 candles and leaves long-lookback
  indicators nullable when history is insufficient.
- Macro snapshot fields are independently nullable. The Spring endpoint returns
  503 when every macro field is unavailable.
- FMP calendar failure or missing key returns empty lists, not fabricated events.
- Extended-hours quotes are provider-backed and nullable. The UI shows provider
  timestamps and delay state, and prefers `UNKNOWN` market state over a local
  market-hours guess. Batch quote/profile reads degrade per symbol; no paid logo
  provider is used.
- Portfolio valuation endpoints keep holdings visible but return `null` for
  current price, market value, allocation, and PnL when no real current price
  exists. Average cost is never substituted as market price.
- Factor analysis returns `null` for unavailable factor scores and components;
  available components are reweighted and a measured zero is never treated as
  missing.
- Azure OpenAI failure produces no agent decision, chat answer, or insight text.
- Composite reports and research grids retain successful independent sections.

## Cache Contract

### Spring Redis caches

| Cache | TTL |
|---|---:|
| default | 60 minutes |
| `latestPriceCache` | 30 seconds |
| `marketQuoteCache` | 30 seconds |
| `assetProfileCache` | 24 hours |
| `priceCache` | 5 minutes |
| `technicalCache` | 10 minutes |
| `indicatorCache` | 60 minutes |
| `newsCache` | 30 minutes |
| `analystCache` | 6 hours |
| `insiderCache` | 6 hours |
| `companyReportCache` | 30 minutes |
| `smartReportCache` | 6 hours |
| `fundamentalCache` | 24 hours |
| `researchCache` | 12 hours |
| `assetsCache` / `assetCache` | 24 hours |

Agent analysis uses its own serialized Redis entry with
`agent-analysis.cache-ttl-minutes=15`. `AgentAnalysisFacade` checks it before
computing and writes it only after a successful analysis whose
`decision_status` is `OK`; `FAILED` and unknown-status results are not cached, so
the next request asks the data-service again. A cached entry without
`decision_status` (written before 2026-10-26) is treated as a miss and evicted,
so an old placeholder verdict is never served.

`researchCache` does not store an empty result (empty `Optional` or empty list)
for fundamentals, valuation, earnings, institutional scores or the composite
score, because the adapter cannot tell "no data exists" from a swallowed failure
on that path; the data-service has its own caches. Non-empty results keep the
12 hour TTL. The outcome-returning methods used by the watchlist research
snapshot are cached in `researchCache` under their own keys
(`fundamental-result:`, `earnings-result:`, `institutional-result:`) only when
the outcome is `OK`; `FAILED`, `RATE_LIMITED`, `INSUFFICIENT_DATA` and `EMPTY` are
never cached. The technical outcome methods are not cached. Earnings lists are
returned as mutable lists because an immutable list cannot be read back from the
Redis serializer. Cached outcome entries embed record class names, so a change to
those record shapes needs the cache cleared or its 12 hours to pass.

Watchlist research snapshot circuit breaker: one breaker per section
(`technical`, `fundamentals`, `earnings`, `institutional`; the `price` section has
none), shared across symbols
and requests. Three provider-side failures (`RATE_LIMITED`, or `FAILED` from a
5xx, I/O error, timeout, unreadable body or other exception) open it for 60
seconds and the section reads `STALE` meanwhile. A `FAILED` from a 4xx other than
429, `EMPTY` and `INSUFFICIENT_DATA` do not count, and an `OK`, `EMPTY` or
`INSUFFICIENT_DATA` answer resets the count (a `FAILED` from a 4xx neither counts nor
resets it). A real provider outage therefore shows `STALE` for that section
across the whole watchlist for up to 60 seconds. The per-row overall status
includes this `STALE` (order `RATE_LIMITED`, `FAILED`, `STALE`,
`INSUFFICIENT_DATA`, `OK`, `EMPTY`), so rows that read `OK` during an outage now
read `STALE`: a behavior change, see `contracts.md`.

`RATE_LIMITED` now arises from provider limits: the data-service answers 429 with
`Retry-After` when Yahoo or Tiingo rate limits and no provider returned data
(`contracts.md`), the backend maps it to `RATE_LIMITED`, and it counts toward the
breaker, so a Yahoo rate limit can open the technical or fundamentals breaker
where it used to read `EMPTY`. The data-service resolver also counts the rate
limit toward its provider blacklist (three failures, 60 seconds). Unchanged: the
legacy Spring adapters (price, asset detail, metadata) swallow every error, and
the backend does not read `Retry-After`.

### Data-service caches

- Macro snapshots are cached for four hours in Redis with in-memory fallback.
- Calendar responses use a fetch-time 30-day lookahead and cache until midnight
  UTC, with in-memory fallback.
- Cache absence never authorizes synthetic provider output.

## Resilience and Performance

- Backend Hikari defaults: maximum pool size 10, minimum idle 2, connection
  timeout 30 seconds.
- Finnhub Resilience4j configuration uses 30 calls per one-second period,
  three retry attempts with exponential backoff, a 10-call circuit window with
  50% failure threshold, 30-second open state, and bulkhead maximum 10.
- `PriceRefreshService` avoids unnecessary provider calls by reading persistence
  first, but live-range/intraday requests and stale daily windows can refresh.
- Provider downloads should not repeat when valid persisted/cache evidence
  satisfies the request.
- Frontend live polling requests only the de-duplicated portfolio/watchlist
  symbol union every 30 seconds while the document is visible; historical candles
  and profiles are not part of this loop.
- Watchlist research provider calls are bounded by per-provider timeouts and
  circuit behavior so one section does not erase other evidence.

### Logical backup and restore exercise

`PortfolioBackupRestoreTest` (R-23) is a repeatable proof that EPIC-002 data survives a logical PostgreSQL backup. It
is evidence, not a target: it sets no recovery objective, encryption, retention or access-control requirement.

What it covers, on two real PostgreSQL 16 Testcontainers (A and B):

- Container A is filled through the application's own beans: a portfolio; assets and daily closes (AAPL and MSFT
  priced in USD, SAP priced in EUR against a USD ledger, so its position is `CURRENCY_MISMATCH`); ledger events (a BUY
  later partly sold, a dividend, a manual event and a CSV-imported event that are then voided); three CSV batches
  (accepted with an `INVALID` row, a second accepted with `DUPLICATE` rows including one whose event is voided, and one
  left `STAGED`); two persisted Portfolio States, a `COMPLETE` one stored before the void and a `PARTIAL` one after.
- `pg_dump -Fc` runs inside A; the file is copied out and into B; `pg_restore --no-owner --exit-on-error` restores it
  into an empty database there.
- The application starts against the restored database, so Flyway validates the restored `flyway_schema_history`
  (same rows, checksums and success flags as in A). Row counts and an `md5` digest of every public table equal A's.
  Active and voided event counts, CSV batch statuses and per-row outcomes, and holdings equal A's. Every stored state
  replays through `PortfolioStateService.replay` to the same version hash, including the state stored before the
  void. Re-staging the same CSV marks the voided and active rows `DUPLICATE`, so voided events still reserve their
  locator.

It is opt-in (R-30) because it would not fit the default suite's 120 s fork budget. From `backend/` in PowerShell, with Docker running:

```powershell
node ..\scripts\run-with-timeout.cjs 115000 .\mvnw.cmd "-Dtest=PortfolioBackupRestoreTest" "-Dbackup.restore=true" test
```

Measured on a developer machine (Windows, Docker Desktop, 2026-10-25; information only, no threshold beyond a
110 s guard on dump plus restore plus verification): seeding 36-38 s, dump and copy out 0.4 s, copy in and restore
0.6 s, application start on the restored database about 7 s, verification 7-8 s in total, dump 59 KB, whole test
class 50-54 s. A later run on a loaded machine took 82 s (seed 52 s, restore 4 s, start 17 s). Both application contexts run in this JVM. The pom hard-codes `forkedProcessTimeoutInSeconds=120`: a run longer than that reports BUILD FAILURE after the tests passed, so judge the result from `backend/target/surefire-reports`, not the Maven exit code (both runs here finished in under 120 s and reported success). The test also inserts one ledger event after the restore and asserts its id is above every restored id, so the sequences were restored.

What this does not prove:

- No RPO, RTO or backup schedule.
- No encryption of dumps or of at-rest storage.
- No retention period.
- No access control on dumps or on the dump file's location.
- No point-in-time recovery (WAL archiving); the dump is one logical snapshot.
- No restore across PostgreSQL or application versions; both sides use `postgres:16-alpine` and the same build.
- No restore of Redis or data-service state; only the Spring PostgreSQL database is dumped.
- No production-size data; the dataset is a few dozen rows.

OQ-8 (recovery objectives, encryption, retention) is still open and owned by the operations/security lead; Task 3
acceptance stays blocked on it.

## Security Boundary

- Provider keys and database credentials remain server-side environment values.
- Never log raw secrets, authorization headers, or provider credentials.
- Current CORS allows the local Vite origins for the backend API; it is not a
  production origin policy.
- The current system has no production authentication, authorization, tenant
  isolation, or brokerage execution.
- Production hardening requires an explicit design for identity, ownership,
  secrets management, TLS, edge rate limiting, audit logging, backups, and
  stricter CORS. Those are target concerns, not current guarantees.

## Logging and Request Correlation

- Both Spring and FastAPI accept or generate `X-Request-ID`, return it to the
  caller, and include it in structured request context.
- Spring stores the ID in MDC as `requestId` and propagates it to downstream
  requests configured through `WebConfig`.
- Data-service logs completion/error events with request ID, method, normalized
  route, status/outcome, and duration.
- Provider logs should include provider, operation, symbol, interval/range where
  relevant, and fallback outcome without secrets.
- Feign/default backend client logging stays `BASIC`; avoid sensitive bodies.

## Observability

- Backend: `/actuator/health` and `/actuator/prometheus`.
- Data-service: `/metrics`, `/health/providers`, individual provider health
  routes, and `/health/metrics`.
- `prometheus.yml` scrapes the backend (`host.docker.internal:8080/actuator/prometheus`),
  the data-service (`data-service:8000/metrics`), `postgres-exporter:9187`,
  `redis-exporter:9121`, Prometheus itself, and Grafana. The exporters are
  internal Docker-network services with no host ports.
- Grafana is provisioned from `infra/grafana` (datasource `Finance Prometheus`,
  uid `finance-prometheus`; dashboard `Finance Observability` at
  `http://localhost:3000`) with target health, backend and data-service
  throughput/p95/errors, outbound provider calls, resolver state, agent
  analysis, PostgreSQL, Redis, and Prometheus/Grafana panels.
- Backend metrics include Micrometer `http_server_requests_seconds_*`,
  `finance_http_server_requests_total` and
  `finance_http_server_request_duration_seconds_*` (route-labelled, unknown
  paths collapsed to `unmatched`), `provider_request_total`,
  `dataservice_request_latency_seconds_*`, and `agent_analysis_*` /
  `agent_azure_tokens_total`.
- Data-service metrics cover HTTP count/latency/errors, provider success/empty/
  error/fallback/blacklist state, agent latency/failures/estimated tokens,
  and macro/calendar cache lookups (`data_service_cache_lookups_total{cache,result}`
  with `memory_hit`, `redis_hit`, `miss`) plus Redis failures
  (`data_service_cache_errors_total{cache,operation}`).
- Spring cache-hit visibility remains an observability gap rather than a
  claimed metric.

## Evidence Anchors

- `.env.example`
- `docker-compose.yml`
- `prometheus.yml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/ozkaslibasar/financeproject/config/RedisConfig.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/config/RequestCorrelationFilter.java`
- `data-service/app/config.py`
- `data-service/app/dependencies.py`
- `data-service/app/providers/market_data_resolver.py`
- `data-service/app/services/market_calendar_service.py`
- `data-service/app/observability.py`
