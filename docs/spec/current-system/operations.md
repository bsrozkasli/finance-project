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
runtime configuration, CORS, health checks, `frontend/src/api/client.ts`, and
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
| `MONGO_URI` | `mongodb://localhost:27017/financedb` | Read only by the backend (`spring.data.mongodb.uri`); the data-service does not read it; no durable product repository use was verified |

`JWT_SECRET` appears only as a CI/example secret note; production authentication
is not implemented and must not be described as a current runtime capability.

## Provider Responsibilities

| Provider | Current role |
|---|---|
| Yahoo/yfinance | Primary no-key OHLCV and asset metadata; backend also has Yahoo adapters for prices/statements |
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
- Asset metadata uses `VERIFIED`, `PARTIAL`, or `UNAVAILABLE`.
- Technical analysis rejects fewer than 30 candles and leaves long-lookback
  indicators nullable when history is insufficient.
- Macro snapshot fields are independently nullable. The Spring endpoint returns
  503 when every macro field is unavailable.
- FMP calendar failure or missing key returns empty lists, not fabricated events.
- Azure OpenAI failure produces no agent decision, chat answer, or insight text.
- Composite reports and research grids retain successful independent sections.

## Cache Contract

### Spring Redis caches

| Cache | TTL |
|---|---:|
| default | 60 minutes |
| `latestPriceCache` | 30 seconds |
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
computing and writes it only after successful analysis.

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
- Watchlist research provider calls are bounded by per-provider timeouts and
  circuit behavior so one section does not erase other evidence.

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
- `prometheus.yml` scrapes the backend (`/actuator/prometheus`) and the
  data-service (`data-service:8000/metrics`); Grafana is provisioned for local
  dashboards.
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
