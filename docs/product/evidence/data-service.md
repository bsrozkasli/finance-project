# Data-service Current-State Evidence

## Audit Metadata

- Audit Commit: `d82aa7d`
- Branch: `docs/evidence-driven-product-design`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; project `.venv`; pytest 9.0.3.
- Scope: FastAPI routes, provider abstraction/resolver, analytics services, agent pipeline, caches, observability, and data-service write/read boundaries.
- Exclusion: `data-service/external/TradingAgents` is preserved as a read-only external subtree and is not used as current capability evidence.

## Evidence Records

### CAP-CUR-DS-001 — FastAPI route surface

- Summary: The data-service exposes market-data, analysis, research, asset, agent, backtest, chat, health, calendar, portfolio, and metrics routes. `main.py` registers routers and owns the OHLCV `/api/v1/prices/{symbol}` route.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; FastAPI application source.
- Contract: Current route prefixes and response models are taken from the FastAPI decorators; the Spring backend remains the normal frontend-facing boundary.
- Evidence Locator: `data-service/main.py:57-171`; `data-service/app/routers/*.py` at each `router = APIRouter` and `@router` declaration.
- Verification: Source inventory reproduced with `rg -n "^(router|app)\.|^@router\.|^def |^async def |include_router|@app\." data-service/app/routers data-service/main.py`.
- Limitations: This is route/source evidence, not a deployed OpenAPI compatibility test. Some routes call provider or LLM integrations directly from service classes.
- Legacy Claims: Legacy data-service route lists should be reconciled against these decorators before being used as contract evidence.

| Route group | Current endpoints |
| --- | --- |
| Analysis | `GET /api/v1/technical/{symbol}`, `/technical/{symbol}/signals`, `/sentiment/{symbol}`, `/full/{symbol}`, `/patterns/{symbol}`; `POST /api/v1/insight`, `/decision-support`. |
| Prices/assets | `GET /api/v1/prices/{symbol}`; `GET /api/v1/assets/{symbol}/info`. |
| Research | `GET /api/v1/research/fundamental/{symbol}`, `/valuation/{symbol}`, `/risk/{symbol}`, `/earnings/{symbol}`, `/factors/{symbol}`, `/institutional-scores/{symbol}`, `/composite/{symbol}`. |
| Agent/backtest/chat | `POST /api/v1/agent-analysis`; `GET /api/v1/backtest/{symbol}`; `POST /api/v1/chat`. |
| Calendar/health | `GET /api/v1/macro/snapshot`, `/calendar`, `/calendar/earnings`, `/calendar/economic-events`; `GET /health/provider/yahoo`, `/health/provider/tiingo`, `/health/provider/finnhub`, `/health/providers`, `/health/metrics`. |
| Portfolio | `POST /api/v1/portfolio/optimize`, `/portfolio/rebalance-check`; `GET /api/v1/portfolio/efficient-frontier/{symbols}`. |
| Operational metrics | `GET /metrics` (excluded from OpenAPI schema). |

### CAP-CUR-DS-002 — Provider abstraction and resolver chain

- Summary: `IMarketDataProvider` defines provider-neutral value objects and operations. `MarketDataResolver` routes across Yahoo, optional Tiingo, and optional Finnhub providers, tracks success/empty/error/fallback metrics, and blacklists providers after repeated failures.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; provider modules inspected without live calls.
- Contract: Provider methods return non-null empty objects/lists or optional metadata where a provider has no usable data; resolver health is observable through `/health` routes.
- Evidence Locator: `data-service/app/providers/base.py:1-207`; `data-service/app/providers/market_data_resolver.py:93-380`; `data-service/app/dependencies.py:23-75`; `data-service/app/providers/yahoo_provider.py`; `tiingo_provider.py`; `finnhub_provider.py`.
- Verification: Source inspection plus `test_market_data_resolver_metrics.py` and resolver-backed endpoint tests.
- Limitations: Provider chain membership depends on environment API keys; Yahoo is always registered, while Tiingo/Finnhub are disabled when keys are absent. Actual external latency, quotas, and freshness were not tested.
- Legacy Claims: A claim that every data-service capability is routed through the resolver is false for the direct-yfinance analytics paths recorded in `CAP-CUR-DS-004`.

### CAP-CUR-DS-003 — Price, asset, news, analyst, and health degradation

- Summary: The main OHLCV route uses `MarketDataResolver`; resolver exhaustion returns an empty list. Asset metadata returns 404 when no meaningful provider metadata is available. Provider health exposes status, latency, error rate, consecutive failures, and last error; missing FMP/FRED keys produce empty or nullable calendar data.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; local configuration without requiring provider credentials.
- Contract: Unavailable/empty/partial provider results are represented explicitly as empty, nullable, 404, or 503 responses; synthetic market values are not introduced by these paths.
- Evidence Locator: `data-service/main.py:131-166`; `data-service/app/routers/assets.py:22-41`; `data-service/app/routers/health.py:24-66`; `data-service/app/providers/fmp_provider.py:28-63`; `data-service/app/providers/fred_provider.py:24-104`; `data-service/app/config.py:47-65`.
- Verification: Source inspection plus `test_assets_endpoint.py`, `test_market_calendar_providers.py`, `test_market_data_resolver_metrics.py`, and request-correlation tests.
- Limitations: Empty responses do not always carry a structured stale/unavailable reason in the response model; consumers must use route semantics and health/metrics separately.
- Legacy Claims: A legacy “provider failure becomes a successful populated response” claim is not supported by the inspected resolver paths, but direct analytics may raise 500/422 as recorded below.

### CAP-CUR-DS-004 — Direct-provider analytics inconsistency

- Summary: The module-level data-service entry point states that all market data is fetched through `MarketDataResolver`, and provider interfaces prohibit business-code imports of yfinance. However, `app/routers/analysis.py`, `fundamental_analysis_service.py`, `factor_analysis_service.py`, `risk_analytics_service.py`, `valuation_service.py`, `portfolio_service.py`, and `portfolio_analytics_service.py` import or call yfinance directly.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; source inspection at commit `d82aa7d`.
- Contract: This is a current-state conflict, not a proposed fix. Resolver-backed routes and direct-yfinance analytics must not be documented as one uniform provider boundary.
- Evidence Locator: `data-service/main.py:1-7`; `data-service/app/providers/base.py:1-14,118-130`; `data-service/app/routers/analysis.py:1-55`; `data-service/app/services/fundamental_analysis_service.py:1-35`; `factor_analysis_service.py`; `risk_analytics_service.py`; `valuation_service.py`; `portfolio_service.py`; `portfolio_analytics_service.py` at `import yfinance as yf` and `yf.Ticker`/`yf.download` call sites.
- Verification: `rg -n -i "yfinance|Ticker\(|download\(" data-service/app` reproduced direct call sites. Tests monkeypatch yfinance boundaries in analysis and portfolio tests.
- Limitations: No production/test source was changed to reconcile this inconsistency. Direct calls can bypass resolver fallback, provider health, and resolver metrics; this requires a later architecture decision.
- Legacy Claims: “All data-service market data goes through the provider resolver” is contradicted by current source and should be marked unresolved until the direct paths are migrated or explicitly exempted.

### CAP-CUR-DS-005 — Technical, pattern, sentiment, LLM, and research analytics

- Summary: Technical analysis computes indicators and signals with a minimum-candle validation; pattern detection uses historical OHLCV and optionally LLM context; sentiment, insight, chat, and decision-support require configured external services; research routes call dedicated analytics services that currently use yfinance for several data sets.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; pytest test doubles for external I/O.
- Contract: Insufficient candles are returned as 422 for technical routes; missing Finnhub/Azure configuration is returned as 503; service exceptions in research routes are surfaced as 500 by the current routers.
- Evidence Locator: `data-service/app/routers/analysis.py:59-288`; `data-service/app/routers/research.py:20-70`; `data-service/app/services/technical_analysis_service.py`; `pattern_detection_service.py`; `llm_insight_service.py`; `fundamental_analysis_service.py`; `factor_analysis_service.py`.
- Verification: Source inspection plus `test_analysis_endpoints.py`, `test_pattern_detection_service.py`, `test_technical_analysis_service.py`, `test_agents.py`, and related service tests.
- Limitations: The `full` analysis route intentionally swallows technical/sentiment/LLM exceptions into nullable sections; the response does not carry a uniform per-section evidence status.
- Legacy Claims: “Technical analysis always returns a populated signal” conflicts with the explicit insufficient-candle and provider-unavailable paths.

### CAP-CUR-DS-006 — Sequential metrics-only agent pipeline

- Summary: `MetricsTradingAgentsGraph.propagate()` receives prepared price, metrics, sentiment, and macro context, then executes Fundamental → Technical → Risk → Bull → Bear → Portfolio Manager in sequence. It records token usage, latency, and failures; Azure OpenAI configuration is required at the route boundary.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; LLM calls mocked in tests.
- Contract: Agent reasoning receives prepared metrics and preserves the sequential analyst order; missing Azure settings returns 503 and pipeline errors increment failure metrics before being surfaced.
- Evidence Locator: `data-service/app/trading_agents/metrics_trading_graph.py:35-122`; `data-service/app/routers/agent_analysis.py:10-25`; `data-service/app/models/agent_analysis.py`; `data-service/tests/test_metrics_trading_graph.py`.
- Verification: Source inspection plus `test_agent_analysis_endpoint.py`, `test_agents.py`, and `test_metrics_trading_graph.py`.
- Limitations: No Azure OpenAI request was sent. The graph’s singleton service caches the graph instance, while LLM client initialization remains configuration/runtime dependent.
- Legacy Claims: A claim that agent stages run concurrently or receive raw provider data conflicts with the sequential metrics-only implementation.

### CAP-CUR-DS-007 — Portfolio optimization and backtesting

- Summary: Portfolio optimize and efficient-frontier routes use PyPortfolioOpt over a yfinance price matrix, enforce at least two assets and 60 trading days, clean missing values, and return metrics/frontier/stress-test fields. Rebalance-check is a pure request calculation. Backtest delegates to `BacktestService`, which uses the resolver path.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; yfinance boundary mocked in portfolio tests.
- Contract: Portfolio analytics is read-only from the data-service perspective; no portfolio or transaction persistence endpoint exists in the inspected FastAPI surface.
- Evidence Locator: `data-service/app/routers/portfolio.py:37-97`; `data-service/app/services/portfolio_service.py:40-215`; `data-service/app/services/backtest_service.py`; `data-service/tests/test_portfolio_service.py`.
- Verification: Source inspection plus portfolio tests, including `test_fetch_price_matrix_uses_yfinance_close_prices_without_live_call`.
- Limitations: Portfolio optimization bypasses the resolver and therefore has no provider fallback/health semantics. Numerical output depends on supplied historical data and optimizer behavior; it is not an investment recommendation.
- Legacy Claims: MongoDB-backed or write-capable portfolio claims are unsupported by current data-service source; the current portfolio route is analytical/read-only.

### CAP-CUR-DS-008 — Macro/calendar cache and observability

- Summary: Macro and calendar data use FRED/FMP providers with Redis as the source of truth when available and in-memory fallback otherwise. Macro cache TTL is four hours; calendar cache expires at next UTC midnight and uses a sliding 30-day fetch window. HTTP and provider/agent metrics are exposed through Prometheus.
- Evidence Level: E2
- Commit: `d82aa7d`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; Redis behavior stubbed with `FakeRedis` in tests.
- Contract: Redis failure degrades to in-memory/no-cache behavior; missing FRED/FMP credentials yield nullable snapshot fields or empty calendar lists.
- Evidence Locator: `data-service/app/services/market_calendar_service.py:24-155`; `data-service/app/routers/market_calendar.py:17-34`; `data-service/app/observability.py`; `data-service/main.py:65-114,171-173`.
- Verification: Source inspection plus `test_market_calendar_providers.py` and `test_request_correlation.py`.
- Limitations: A configured MongoDB setting exists in `app/config.py`, but no MongoDB client or persistence path was found under `data-service/app`; this is an unresolved configuration/documentation mismatch, not evidence of storage.
- Legacy Claims: “MongoDB is the data-service system of record” conflicts with the inspected implementation; current cache persistence is Redis-only for the observed macro/calendar paths.

### CAP-CUR-DS-009 — Data-service verification evidence

- Summary: The full data-service pytest suite completed successfully with 50 passed tests and no failures.
- Evidence Level: E3
- Commit: `d82aa7d`
- Evidence Locator: `data-service/.venv/Scripts/python.exe -m pytest` (run from `data-service` at audit time).
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Python 3.13.9; pytest 9.0.3; project `.venv`.
- Contract: Tests use local fixtures, monkeypatches, fake providers, fake Redis, and mocked yfinance/LLM boundaries; no live financial provider was called.
- Verification: `============================= 50 passed in 14.40s =============================`.
- Limitations: Passing tests cover the current stubs and source paths; they do not prove external provider availability, Azure OpenAI behavior, Redis availability, or direct-yfinance fallback consistency. `TradingAgents` was not imported or changed as part of this audit.
- Legacy Claims: Test success cannot validate claims outside the current test doubles or establish that all routes share the resolver boundary.

## Limitations

- This audit did not modify production or test code and did not call live financial providers, LLMs, Redis, or MongoDB.
- Direct yfinance usage remains in several analytics paths despite the resolver abstraction and entry-point documentation; this is the most important current-state boundary discrepancy.
- `MONGO_URI` and `MONGO_DB_NAME` are configured fields, but no MongoDB implementation was found in the inspected app tree.
- Data-service responses encode degradation inconsistently across routes: empty/nullable/404/503/500 are all present depending on the capability.
- The external `TradingAgents` subtree remains excluded and unchanged.
