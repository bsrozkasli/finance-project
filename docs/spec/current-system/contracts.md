# Current-System Contracts

**Status:** Verified brownfield baseline

**Last verified:** 2026-10-01

This document owns browser routes, HTTP endpoints, compatibility boundaries,
response naming, and error/degradation shapes. Paths are current contracts, not a
roadmap. The Spring base URL is `http://localhost:8080/api/v1`; data-service paths
are internal unless explicitly consumed outside the backend.

## Compatibility Rules

- Do not rename an existing endpoint, request field, or response field unless all
  backend, frontend, data-service, tests, and documentation consumers migrate in
  the same change.
- Browser routes and HTTP API paths are separate namespaces.
- The frontend uses the Spring API for normal application flows. Spring may call
  FastAPI through `DATA_SERVICE_URL`.
- Missing optional provider evidence is represented by empty collections, nullable
  fields, partial sections, status metadata, or an unavailable response. It is not
  replaced with synthetic data.

## Frontend Browser Routes

| Route | Current behavior |
|---|---|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Dashboard home |
| `/charts` | Redirects to `/workspace` |
| `/workspace` | Chart workspace |
| `/workspace/:symbol` | Chart workspace scoped to a symbol |
| `/watchlist` | Watchlist and market grid |
| `/news` | News hub |
| `/news/:symbol` | Symbol-scoped news |
| `/reports` | Analysis/reports landing page |
| `/reports/:symbol` | Symbol-scoped reports |
| `/journal` | Trading journal |
| `/transactions` | Transaction ledger view |
| `/portfolio` | Portfolio management |
| `/portfolio/:portfolioId` | Selected portfolio |
| `/portfolios` | Redirects to `/portfolio` |
| unmatched route | Redirects to `/dashboard` |

`frontend/src/App.tsx` is the route authority.

## Backend API

Every path below is relative to `/api/v1`.

| Area | Method and path | Contract purpose |
|---|---|---|
| Assets | `GET /assets` | List tracked assets |
| Assets | `GET /assets/{symbol}` | Fetch a tracked asset |
| Assets | `POST /assets/batch` | Resolve and persist normalized symbols in batch |
| Assets | `POST /assets/batch-profiles` | Company profiles and logo URLs per symbol; each symbol degrades independently; 24-hour cache |
| Assets | `GET /assets/{symbol}/detail` | Company profile plus regular/pre-market/post-market quote sections, each with status/source/timestamp |
| Assets | `DELETE /assets/{symbol}` | Delete a tracked asset |
| Prices | `GET /prices/{symbol}/latest` | Latest real price through refresh service |
| Prices | `GET /prices/{symbol}/history?interval=&range=` | DB-first historical OHLCV refresh |
| Prices | `POST /prices/batch-history` | Per-symbol historical results with isolated degradation |
| Prices | `POST /prices/batch-latest` | Normalized regular/extended-hours quotes with per-symbol degradation; 30-second cache |
| Market | `GET /market/sessions?exchanges=` | Exchange session state (`PRE_MARKET`, `REGULAR`, `POST_MARKET`, `CLOSED`, `UNKNOWN`) |
| Technical | `GET /technical/{symbol}?interval=&range=` | Technical indicators |
| Technical | `GET /technical/{symbol}/signals?interval=&range=` | Technical signal summary |
| Technical | `GET /technical/{symbol}/workspace` | Technical workspace proxy; 503 when unavailable |
| Technical | `POST /technical/{symbol}/copilot` | Technical copilot proxy; 503 when unavailable |
| Analysis | `GET /analysis/patterns/{symbol}` | Pattern detection proxy |
| Analysis | `POST /analysis/decision-support` | Decision-support proxy |
| Agent analysis | `GET /agent-analysis/{ticker}` | Cached or newly computed multi-agent result |
| Agent analysis | `DELETE /agent-analysis/{ticker}/cache` | Evict one ticker cache |
| Agent analysis | `DELETE /agent-analysis/cache` | Evict all agent-analysis cache entries |
| Analyst | `GET /analyst/{symbol}/recommendations` | Analyst recommendation trends |
| Analyst | `GET /analyst/{symbol}/price-target` | Analyst price target |
| Backtest | `GET /backtest/{symbol}` | Strategy backtest |
| Chat | `POST /chat/ask` | Chat/insight request |
| Reports | `GET /reports/company/{symbol}` | Company report |
| Reports | `GET /reports/smart/{symbol}` | Smart report |
| Reports | `GET /reports/test` | Diagnostic report response |
| Fundamentals | `GET /fundamentals/{symbol}` | Fundamental series |
| Fundamentals | `GET /fundamentals/{symbol}/ratios` | Financial ratios |
| Fundamentals | `GET /fundamentals/{symbol}/earnings?periods=` | Earnings history |
| Fundamentals | `GET /fundamentals/{symbol}/insider` | Insider activity |
| Fundamentals | `GET /fundamentals/{symbol}/institutional` | Institutional ownership/scores |
| News | `GET /news?category=&page=&size=&symbols=` | Categorized news page |
| News | `GET /news/portfolio` | Portfolio-related news |
| News | `GET /news/macro` | Macro news |
| News | `GET /news/{symbol}` | Symbol news |
| Notifications | `GET /notifications` | List notifications |
| Notifications | `GET /notifications/unread` | List unread notifications |
| Notifications | `POST /notifications/read-all` | Mark all notifications read |
| Macro | `GET /macro/snapshot` | Macro snapshot; 503 when every field is unavailable |
| Calendar | `GET /calendar?symbols=` | Combined earnings/economic calendar |
| Calendar | `GET /calendar/earnings?symbols=` | Earnings calendar |
| Calendar | `GET /calendar/economic-events` | High-impact economic events |
| Legacy positions | `GET /portfolio/positions` | List position records |
| Legacy positions | `POST /portfolio/positions` | Create a position record |
| Legacy positions | `PUT /portfolio/positions/{id}` | Update a position record |
| Legacy positions | `DELETE /portfolio/positions/{id}` | Delete a position record |
| Dashboard | `GET /portfolio/summary` | Portfolio totals and PnL summary; price-derived fields are `null` and `pricingComplete=false` when any current price is unavailable |
| Dashboard | `GET /portfolio/performance?period=&benchmark=` | Performance and optional benchmark series |
| Dashboard | `GET /portfolio/performance/comparison?portfolioIds=&benchmarks=&period=` | Multi-series cumulative return comparison; portfolio values use ledger quantities held on each price date, including positions later sold |
| Dashboard | `GET /portfolio/positions/performance?portfolioId=` | Position-level time-window performance; price-derived fields are `null` when the current price is unavailable |
| Dashboard | `GET /portfolio/allocation` | Allocation slices; values and amounts are `null`, never cost-based, when real prices are incomplete |
| Dashboard | `GET /portfolio/positions/enriched` | Positions enriched with real current price/PnL; positions stay present with nullable price-derived fields when pricing is unavailable |
| Analytics | `POST /portfolio/optimize` | Portfolio optimization proxy |
| Analytics | `POST /portfolio/rebalance-check` | Rebalance analysis proxy |
| Journal | `GET /journal/trades?page=&size=&sort=` | Paged persistent journal trades; `currentPrice`, `marketValue`, `pnl`, and `returnPct` remain `null` when current market evidence is unavailable |
| Journal | `GET /journal/trades/stats` | Journal statistics; return aggregates are `null` when no priced trade supports them |
| Journal | `POST /journal/trades` | Create a journal trade |
| Journal | `PUT /journal/trades/{id}` | Update a journal trade |
| Journal | `DELETE /journal/trades/{id}` | Delete a journal trade |
| Watchlists | `GET /watchlists` | List persistent watchlists |
| Watchlists | `GET /watchlists/{id}/research-snapshot?limit=&offset=&symbols=&refresh=` | Bounded, partially degradable research grid |
| Watchlists | `POST /watchlists` | Create a watchlist |
| Watchlists | `POST /watchlists/{id}/symbols` | Add a normalized symbol |
| Watchlists | `DELETE /watchlists/{id}/symbols/{symbol}` | Remove a symbol |
| Watchlists | `DELETE /watchlists/{id}` | Delete a watchlist |
| Portfolios | `GET /portfolios` | List transaction-ledger portfolios |
| Portfolios | `POST /portfolios` | Create a portfolio |
| Portfolios | `PUT /portfolios/{portfolioId}` | Update portfolio metadata |
| Portfolios | `DELETE /portfolios/{portfolioId}` | Delete an empty portfolio; active holdings conflict |
| Ledger | `GET /portfolios/{portfolioId}/transactions` | List portfolio transactions; each includes the additive `originLocator` (`manual:<UUID>` or `manual:legacy:<id>` for MANUAL, possibly `null` for CSV) |
| Ledger | `POST /portfolios/{portfolioId}/transactions` | Add a manual/CSV ledger transaction |
| Ledger | `DELETE /portfolios/{portfolioId}/transactions/{transactionId}` | Delete a ledger entry and linked transaction journal record |
| Ledger | `GET /portfolios/{portfolioId}/holdings` | Derive current holdings from transactions |

Spring controller annotations are the route authority. `docs/openapi.yaml` is a
generated/supporting artifact and must be regenerated or validated when public
controller contracts change.

## Data-Service API

| Area | Method and path | Contract purpose |
|---|---|---|
| Prices | `GET /api/v1/prices/{symbol}?interval=&range=` | Provider-chain OHLCV; empty list when all providers fail |
| Assets | `GET /api/v1/assets/{symbol}/info` | Provider-chain metadata; 404 when unavailable/unusable |
| Assets | `GET /api/v1/assets/{symbol}/profile` | Nullable company profile: overview, website, country, sector, industry, logo, employee count |
| Assets | `GET /api/v1/assets/{symbol}/market-quote` | Nullable regular/pre-market/post-market snapshot with market state, timestamps, and delay flag |
| Market | `GET /api/v1/market/sessions` | Exchange session states |
| Technical | `GET /api/v1/technical/{symbol}` | Technical indicators |
| Technical | `GET /api/v1/technical/{symbol}/signals` | Signal summary |
| Technical | `GET /api/v1/technical/{symbol}/workspace` | Technical workspace |
| Technical | `POST /api/v1/technical/{symbol}/copilot` | Technical copilot |
| Sentiment | `GET /api/v1/sentiment/{symbol}` | Sentiment analysis; dependency failures are explicit |
| LLM | `POST /api/v1/insight` | Azure OpenAI insight |
| Analysis | `GET /api/v1/full/{symbol}` | Partially degradable combined analysis; unavailable sections are null and logged as `full_analysis_section_unavailable` |
| Analysis | `GET /api/v1/patterns/{symbol}` | Pattern detection |
| Analysis | `POST /api/v1/decision-support` | Decision-support report |
| Agent analysis | `POST /api/v1/agent-analysis` | Metrics-only sequential multi-agent analysis |
| Research | `GET /api/v1/research/fundamental/{symbol}` | Fundamental analysis |
| Research | `GET /api/v1/research/valuation/{symbol}` | Valuation metrics including nullable PEG |
| Research | `GET /api/v1/research/risk/{symbol}` | Risk analytics |
| Research | `GET /api/v1/research/earnings/{symbol}` | Earnings analysis |
| Research | `GET /api/v1/research/factors/{symbol}` | Factor analysis; unavailable factor/component values and `dominant_factor` are `null`, while a measured zero remains `0` |
| Research | `GET /api/v1/research/institutional-scores/{symbol}` | Institutional scoring |
| Research | `GET /api/v1/research/composite/{symbol}` | Composite investment score |
| Portfolio | `POST /api/v1/portfolio/optimize` | Optimization |
| Portfolio | `POST /api/v1/portfolio/rebalance-check` | Rebalance threshold analysis |
| Portfolio | `GET /api/v1/portfolio/efficient-frontier/{symbols}` | Efficient frontier calculation |
| Macro | `GET /api/v1/macro/snapshot` | Nullable FRED snapshot |
| Calendar | `GET /api/v1/calendar?symbols=` | Combined FMP calendar |
| Calendar | `GET /api/v1/calendar/earnings?symbols=` | Earnings calendar or empty list |
| Calendar | `GET /api/v1/calendar/economic-events` | Economic events or empty list |
| Backtest | `GET /api/v1/backtest/{symbol}` | Backtest response |
| Chat | `POST /api/v1/chat` | Azure OpenAI chat response |
| Health | `GET /health/provider/yahoo` | Yahoo provider health or 404 when unregistered |
| Health | `GET /health/provider/tiingo` | Tiingo provider health or 404 when unregistered |
| Health | `GET /health/provider/finnhub` | Finnhub provider health or 404 when unregistered |
| Health | `GET /health/providers` | Registered provider health list |
| Health | `GET /health/metrics` | Resolver counters/snapshot |
| Metrics | `GET /metrics` | Prometheus exposition |

Research routes (`/api/v1/research/*`) return 422 insufficient data (for example
fewer than 30 sessions of risk history), 503 when a required dependency is
unconfigured (for example `FINNHUB_API_KEY` for earnings), and 500 with the
generic detail `<section> research failed` for unexpected errors. Spring
research adapters treat every non-2xx response as empty evidence.

FastAPI router prefixes and decorators are the route authority. The analysis
routes use the direct `/api/v1` paths shown above; do not insert another path
segment between the version prefix and the operation.

## Response and Error Contracts

### Backend errors

Global backend errors use these five fields:

```json
{
  "timestamp": "2026-06-28T10:15:00Z",
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "Technical analysis requires at least 30 candles",
  "path": "/api/v1/technical/AAPL"
}
```

Representative meanings:

| Status | Meaning |
|---|---|
| `400` | Malformed input or request validation failure |
| `404` | Requested persisted/resource evidence does not exist |
| `409` | Request conflicts with persistent state or domain invariants |
| `422` | Syntactically valid input violates a business/analytics rule |
| `429` | A required provider rate limit cannot be degraded |
| `502` | Upstream response is invalid |
| `503` | Required dependency is unavailable and no valid fallback exists |

The frontend types this body as `BackendErrorResponse` in
`frontend/src/api/errors.ts`.

FastAPI normally uses its `{"detail": ...}` HTTP error shape; the five-field
shape above is the Spring public API contract and must not be falsely applied to
internal data-service routes.

### Agent-analysis naming

The Spring response uses snake_case JSON fields for the analysis summaries,
portfolio-manager reasoning, metrics, generation time, and cache status. The cache
flag is `from_cache`; consumers must not silently rename it to `fromCache`.

### Instrument type and `UNRESOLVED` (additive, 2026-10-17)

- `GET /api/v1/assets/{symbol}/info` (data-service) adds nullable `quote_type`: the provider-reported instrument class (`yfinance` `quoteType`), or `null` when the provider gives none. Other providers leave it `null`.
- Spring `type` on `/api/v1/assets*` and watchlist research rows is a string. It is now one of `STOCK`, `ETF`, `INDEX`, `CRYPTO`, `FOREX`, or `UNRESOLVED`. `UNRESOLVED` means no provider or trusted mapping established the type; it is never eligible for stock or ETF evaluation and is never inferred from names, exchanges, or symbol spelling.
- Provider mapping: `EQUITY`→`STOCK`, `ETF`→`ETF`, `INDEX`→`INDEX`, `CRYPTOCURRENCY`→`CRYPTO`, `CURRENCY`→`FOREX`; anything else or absent→`UNRESOLVED`.
- `V7__relabel_unresolved_asset_types.sql` relabels persisted `STOCK` rows with `metadata_status=UNAVAILABLE` as `UNRESOLVED`. `VERIFIED` and `PARTIAL` rows are unchanged. Re-adding a symbol re-resolves it. See `docs/product/decisions/2026-10-22-oq5-unresolved-instrument-migration.md`.
- The frontend labels types in Turkish (`assetTypeLabel`). `UNRESOLVED` or a missing type reads "Tür bilinmiyor".

### C0a availability fields (additive, 2026-10-15)

C0a added a `SectionAvailability` value object to four data-service response
bodies. These fields are **additive** — existing fields are unchanged; Spring
adapters silently ignore them because Jackson's default
`FAIL_ON_UNKNOWN_PROPERTIES = false` drops unknown properties.

`SectionAvailability` shape:

```json
{ "status": "available | unavailable | insufficient | unparseable",
  "unavailable_reason": "<snake_case code> | null" }
```

Rules: `available` → `unavailable_reason` is null. All other statuses →
`unavailable_reason` is required and must match `^[a-z][a-z0-9_]{0,63}$`. The
object is immutable; use factory methods `.available()`, `.unavailable(reason)`,
`.insufficient(reason)`, `.unparseable(reason)`.

| Response | New field(s) | Notes |
|---|---|---|
| `SentimentAnalysisResponse` (`GET /api/v1/sentiment/{symbol}`) | `availability: SectionAvailability` | reflects news article and LLM parse quality |
| `EnhancedSentimentResponse` (`GET /api/v1/full/{symbol}` → `.sentiment`) | `news_availability`, `analyst_availability`, `insider_availability: SectionAvailability`; `unavailable_components: list[str]` | per sub-source signal quality |
| `CompositeInvestmentScore` (`GET /api/v1/research/composite/{symbol}`) | `breakdown_availability: dict[str, SectionAvailability]`; `unavailable_components: list[str]` | keyed by breakdown field name; not-mapped inputs report `factor_score_not_mapped` |
| `AgentAnalysisResponse` (`POST /api/v1/agent-analysis`) | `decision_availability: SectionAvailability` | reflects portfolio-manager JSON parse quality |

**Planning Finding 1 (PF-1):** `FactorAnalysisResponse` nests scores under
`.scores` but `composite_score_service` reads them at the top level. This
mismatch is now visible as `factor_score_not_mapped` / `earnings_score_not_mapped`
/ `valuation_grade_not_mapped` reason codes in `breakdown_availability`. The
underlying data-path defect is tracked for a follow-up fix (C0b or later).

### Shared contract fixtures

`docs/contracts/fixtures/` holds representative Spring response bodies that both
test suites read. Backend `@WebMvcTest` classes assert that a real serialized
response has the same field-path set as the fixture; frontend Vitest parses each
fixture with a strict schema mirroring the types exported through
`frontend/src/api/client.ts`. Fixture values
are test data, not market data. Covered today: portfolio summary, performance,
enriched positions, and the backend error body.

### Partial research

Watchlist and report aggregation preserve successful sections when another
provider fails. Watchlist sections expose one of `OK`, `STALE`, `EMPTY`, `FAILED`,
`RATE_LIMITED`, `INSUFFICIENT_DATA`, or `PENDING_REFRESH`, plus source/message data
where supported.

## Evidence Anchors

- `frontend/src/App.tsx`
- `frontend/src/api/client.ts`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/GlobalExceptionHandler.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/dto/AgentAnalysisResponseDto.java`
- `data-service/main.py`
- `data-service/app/routers/`
