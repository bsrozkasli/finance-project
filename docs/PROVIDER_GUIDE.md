# Provider Guide

This document defines the external market-data and LLM provider contract for the
finance-project monorepo. It is the operational reference for provider priority,
fallback behavior, health checks, and the rules for adding a new provider.

## 1. Provider Overview

| Provider | Data type | API key | Role |
|---|---|---|---|
| PostgreSQL | Persisted OHLCV price history, assets, reports, cached domain data | No | Primary local source for data already fetched and validated |
| Yahoo Finance / yfinance | OHLCV, asset metadata, fundamentals, earnings, corporate actions, Yahoo news | No | Primary external market-data provider |
| Finnhub | Company news, sentiment, analyst recommendations, price targets, metrics, insider data | `FINNHUB_API_KEY` | Primary news, sentiment, and analyst provider |
| Tiingo | End-of-day prices, basic metadata, news | `TIINGO_API_KEY` optional | Fallback for OHLCV and secondary news source |
| Azure OpenAI | Agent analysis, chat, LLM insight, sentiment explanation | `AZURE_OPENAI_*` | Optional LLM provider for AI-generated analysis |
| Redis | Agent-analysis cache and selected backend cache entries | No external key | Local cache, not a market provider |

## 2. Provider Chain And Priority

All provider chains must degrade without fabricated market data. A provider that
fails should return the neutral value listed below and allow the orchestrator or
controller to continue when the endpoint contract allows it.

| Data type | Priority chain | Failure value |
|---|---|---|
| Price history | PostgreSQL -> yfinance -> Tiingo | PostgreSQL miss continues to yfinance; yfinance returns `[]`; Tiingo returns `[]`; final response is `[]` when all providers fail |
| News | Finnhub -> Tiingo -> `[]` | Finnhub returns `[]`; Tiingo returns `[]`; final response is `[]` |
| Analyst recommendations | Finnhub -> `null` | Finnhub returns `[]`; backend API may expose `null` or an empty collection depending on DTO shape |
| Sentiment | Finnhub -> neutral default | Finnhub returns no recommendations or fails; `FinnhubSentimentAdapter` emits neutral sentiment |
| Fundamentals | yfinance -> partial | Yahoo/yfinance returns an empty `FinancialStatements` object; report/fundamentals DTOs may omit unavailable sections |
| Agent analysis | Redis -> data-service -> Azure OpenAI | Redis miss calls data-service; data-service/Azure failure returns `Optional.empty()` at backend adapter boundaries |

Implementation references:

| Layer | Class or module | Responsibility |
|---|---|---|
| Data-service | `app.providers.market_data_resolver.MarketDataResolver` | Chain-of-responsibility resolver, health state, fallback counters |
| Data-service | `app.providers.yahoo_provider.YahooProvider` | Primary yfinance adapter |
| Data-service | `app.providers.tiingo_provider.TiingoProvider` | Tiingo EOD fallback adapter |
| Data-service | `app.providers.finnhub_provider.FinnhubProvider` | Finnhub news and analyst adapter |
| Backend | `adapter.outbound.client.yahoo.YahooFinancePriceAdapter` | Yahoo chart API adapter through `PriceChartClientPort` |
| Backend | `adapter.outbound.client.yahoo.YahooStatementClientAdapter` | Yahoo statement adapter |
| Backend | `adapter.outbound.client.finnhub.FinnhubClient` | Resilience-hardened Finnhub REST client |
| Backend | `adapter.outbound.client.finnhub.FinnhubSentimentAdapter` | Finnhub recommendation trends to sentiment |
| Backend | `adapter.outbound.client.tiingo.TiingoClient` | Tiingo EOD/news fallback client |
| Backend | `adapter.outbound.client.dataservice.DataServicePriceAdapter` | Backend to data-service OHLCV adapter |
| Backend | `adapter.outbound.client.dataservice.DataServiceAgentAnalysisAdapter` | Backend to data-service agent analysis adapter |
| Backend | `adapter.outbound.client.dataservice.LlmInsightAdapter` | Backend to data-service insight/sentiment/full-analysis adapter |

## 3. Yahoo Finance / yfinance

Yahoo Finance is the default no-key market data source.

| Property | Value |
|---|---|
| API key | Not required |
| Rate limit | Unofficial and unstable; keep usage conservative, roughly 2,000 requests/day or lower for local/dev workloads |
| Returned data | OHLCV, asset metadata, financial statements, earnings/fundamentals, corporate actions, Yahoo news |
| Data-service adapter | `app.providers.yahoo_provider.YahooProvider` |
| Backend adapter | `adapter.outbound.client.yahoo.YahooFinancePriceAdapter`, `YahooStatementClientAdapter` |
| Domain port | `PriceChartClientPort`, `FinancialStatementClientPort`, `FinancialDataPort` through composite adapters |

Failure behavior:

- `get_ohlcv(...)` returns `[]` on empty history, malformed rows, or exceptions.
- `get_asset_info(...)` returns `None` / `Optional.empty()` when metadata is missing.
- `get_financial_statements(...)` returns an empty `FinancialStatements(symbol=...)`.
- Backend asset batch-add falls back to a minimal `STOCK` asset when Yahoo metadata is unavailable.
- No caller may invent prices, fundamentals, metadata, or earnings values.

## 4. Finnhub

Finnhub is the primary provider for research, news, sentiment, analyst, target,
metrics, and insider-related data.

| Property | Value |
|---|---|
| API key | `FINNHUB_API_KEY` |
| Configured limit | 30 requests/second in backend resilience configuration |
| Returned data | Company news, sentiment inputs, analyst recommendations, price targets, metrics, insider transactions |
| Backend client | `adapter.outbound.client.finnhub.FinnhubClient` |
| Backend sentiment adapter | `adapter.outbound.client.finnhub.FinnhubSentimentAdapter` |
| Backend ports | `SmartReportMarketDataPort`, `SentimentDataPort` |
| Data-service adapter | `app.providers.finnhub_provider.FinnhubProvider` |

Backend Finnhub calls are protected at the client boundary:

- `@RateLimiter(name = "finnhubApi")`
- `@Retry(name = "finnhubApi")` with exponential backoff on HTTP 429 and transient failures
- `@CircuitBreaker(name = "finnhubApi")`
- `@Bulkhead(name = "finnhubApi")`

Failure behavior:

- News and analyst calls return `[]` when no data is available or the provider fails.
- Sentiment falls back to a neutral default when recommendation trends are unavailable.
- If a Finnhub-backed endpoint can degrade, it should return `200 OK` with empty or partial data.
- Return `429 Too Many Requests` only when the rate limit is reached and the request cannot be satisfied through degradation or cache.
- Return `503 Service Unavailable` when Finnhub is required for the endpoint and no fallback can satisfy the request.

## 5. Tiingo

Tiingo is an optional fallback/enrichment provider.

| Property | Value |
|---|---|
| API key | `TIINGO_API_KEY`; optional, provider is skipped when absent |
| Rate limit | Plan dependent; data-service comments document free-tier EOD usage as 500 requests/hour and 50 symbols/day; backend resilience keeps calls conservative |
| Returned data | End-of-day OHLCV prices, basic metadata, news |
| Data-service adapter | `app.providers.tiingo_provider.TiingoProvider` |
| Backend adapter | `adapter.outbound.client.tiingo.TiingoClient` |

Fallback usage:

- Price history uses Tiingo after PostgreSQL has no data and Yahoo/yfinance returns no usable bars.
- News uses Tiingo as secondary source after Finnhub.
- Unsupported capabilities return empty values rather than raising into business code.

Failure behavior:

- Missing `TIINGO_API_KEY` skips Tiingo and returns `[]`.
- HTTP/provider failures return `[]` for EOD and news.
- Health checks report `UNHEALTHY` for authentication failures and `DEGRADED` for non-auth HTTP failures.

## 6. Azure OpenAI

Azure OpenAI powers optional LLM workflows. It must never be used to synthesize
missing market facts.

Required environment variables for successful LLM calls:

| Variable | Required for |
|---|---|
| `AZURE_OPENAI_API_KEY` | All Azure OpenAI calls |
| `AZURE_OPENAI_ENDPOINT` | Chat completions endpoint |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment/model selection |
| `AZURE_OPENAI_API_VERSION` | Azure API version, default `2024-05-01-preview` |
| `LLM_MAX_TOKENS` | Token budget for generated output |

Usage:

- Agent analysis through `data-service/app/routers/agent_analysis.py`.
- Chat through `data-service/app/routers/chat.py`.
- LLM insight, sentiment, and full analysis through `data-service/app/services/llm_insight_service.py`.
- Multi-agent graph client creation through `MetricsTradingAgentsGraph._llm_client()` using `AzureChatOpenAI`.
- Backend access through `DataServiceAgentAnalysisAdapter`, `DataServiceChatAdapter`, and `LlmInsightAdapter`.

Failure behavior:

- Backend adapters return `Optional.empty()` on data-service or Azure failures.
- Data-service endpoints that explicitly require Azure OpenAI may return `503 Service Unavailable` when configuration is missing.
- Do not generate synthetic analysis text when Azure OpenAI is unavailable.
- Cached prior successful agent-analysis output may be returned if the cache contract allows it.

## 7. Provider Health Endpoints

Provider health is exposed by the data-service health router.

| Endpoint path | Provider checked | Expected response |
|---|---|---|
| `GET /health/provider/yahoo` | Yahoo Finance / yfinance | `200 OK` with `{ "provider": "yahoo", "status": "healthy|degraded|unhealthy|blacklisted", "latency_ms": ..., "consecutive_failures": ..., "last_error": ..., "last_checked": "..." }`; `404` when not registered |
| `GET /health/provider/tiingo` | Tiingo | Same health shape for `tiingo`; `404` when not registered |
| `GET /health/provider/finnhub` | Finnhub | Same health shape for `finnhub`; `404` when not registered |
| `GET /health/providers` | All registered providers | `200 OK` with a list of provider health objects |
| `GET /health/metrics` | Resolver counters | `200 OK` with fallback, success, and error counters |
| `GET /metrics` | Prometheus metrics | Prometheus text exposition format |

## 8. General Degradation Rules

- Fake market data is forbidden. Never invent prices, volumes, news, analyst ratings, fundamentals, or provider metadata.
- Use an empty list (`[]`) when a collection-shaped provider result is unavailable: prices, news, analyst recommendations, EOD rows.
- Use `null`, `None`, or `Optional.empty()` when a single optional object is unavailable: asset metadata, LLM insight, full analysis, provider-specific optional fields.
- Use partial DTOs when the endpoint can still return useful verified data: company reports, fundamentals, enriched portfolio views.
- Use neutral defaults only for explicitly defined derived values, such as sentiment when Finnhub recommendation data is unavailable.
- Return `429 Too Many Requests` when a provider/client rate limit is reached and the request cannot be served from cache or degraded safely.
- Return `502 Bad Gateway` when an upstream provider or data-service response is malformed or cannot be parsed.
- Return `503 Service Unavailable` when a required dependency is unavailable and no fallback can satisfy the endpoint.
- Provider failures should be logged with provider, symbol, interval/range, and failure context. Secrets and authorization headers must never be logged.
- Provider resolver failures should update health, fallback, success, and error counters where practical.

## 9. Adding A Provider

Use this checklist when adding a new external provider:

1. Add a provider adapter in `data-service/app/providers/` that implements `IMarketDataProvider` from `base.py`.
2. Translate provider payloads into provider-agnostic value objects (`OHLCVBar`, `AssetInfo`, `FinancialStatements`, `NewsItem`, `AnalystRecommendation`).
3. Return empty values on unavailable data instead of leaking provider exceptions into business code.
4. Add or update a backend domain port when the backend needs to depend on the capability directly.
5. Implement the backend adapter under `backend/src/main/java/.../adapter/outbound/client/<provider>/` when backend-side access is required.
6. Add the provider to the resolver chain in the correct priority order.
7. Add a health endpoint or include the provider in `/health/providers`.
8. Add resilience at the adapter/client boundary: rate limiter, retry, circuit breaker, and bulkhead when the provider has quotas or transient failures.
9. Add tests for success, empty response, provider failure, and fallback ordering.
10. Update `SPEC.md`, this guide, `.env.example`, and operational docs with required keys, rate limits, and degradation behavior.
