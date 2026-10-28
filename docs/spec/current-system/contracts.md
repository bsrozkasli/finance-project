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
| Prices | `GET /prices/{symbol}/latest` | Latest real price through `lookupFreshLatest`. `PriceResponseDto` also carries the nullable `priceAsOf` (ISO instant, UTC: the candle time of the price used, the same value as `timestamp`) and `priceStatus` (`OK` provider-confirmed; `STALE` a stored price that a failed or empty refresh could not confirm). No price at all (`NONE_*` lookup) stays `404` and a dependency failure stays `503`. Only `OK` answers are cached in `latestPriceCache`. `GET /prices/{symbol}/history` and the batch history rows leave both fields `null`. Decision record `docs/product/decisions/2026-10-26-price-staleness.md`. |
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
| Agent analysis | `GET /agent-analysis/{ticker}` | Cached or newly computed multi-agent result. `decision_status` is `{status, reason}` (`OK` or `FAILED`) or `null` when the data-service status is unknown; when `FAILED`, `decision` and `confidence` are `null` (the unparseable placeholder is withheld) and `portfolio_manager_reasoning` is still returned. Only `OK` results are cached; a cache entry without `decision_status` is ignored. See `docs/product/decisions/2026-10-26-agent-analysis-decision-status.md`. Fixtures: `agent-analysis.json`, `agent-analysis-failed.json` |
| Agent analysis | `DELETE /agent-analysis/{ticker}/cache` | Evict one ticker cache |
| Agent analysis | `DELETE /agent-analysis/cache` | Evict all agent-analysis cache entries |
| Analyst | `GET /analyst/{symbol}/recommendations` | Analyst recommendation trends |
| Analyst | `GET /analyst/{symbol}/price-target` | Analyst price target |
| Backtest | `GET /backtest/{symbol}` | Strategy backtest |
| Chat | `POST /chat/ask` | Chat/insight request |
| Reports | `GET /reports/company/{symbol}` | Company report |
| Reports | `GET /reports/smart/{symbol}` | Smart report; additive nullable `sectionStatus` (`overall`, `components` of `status` + `reason`) |
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
| Dashboard | `GET /portfolio/summary` | Portfolio totals and PnL summary; price-derived fields are `null` and `pricingComplete=false` when any current price is unavailable. `pricingStatus` (nullable, appended last) is the worst price status among its positions (`FAILED` > `STALE` > `EMPTY` > `OK`), `null` when there are no positions; a `STALE` stored price is still a price, so it does not make `pricingComplete` false |
| Dashboard | `GET /portfolio/performance?period=&benchmark=` | Performance and optional benchmark series |
| Dashboard | `GET /portfolio/performance/comparison?portfolioIds=&benchmarks=&period=` | Multi-series cumulative return comparison; portfolio values use ledger quantities held on each price date, including positions later sold |
| Dashboard | `GET /portfolio/positions/performance?portfolioId=` | Position-level time-window performance; price-derived fields are `null` when the current price is unavailable. Each row carries the nullable `priceAsOf` (ISO instant, UTC: candle time of the current price, `null` without a price) and `priceStatus` (`OK`, `STALE` for a stored price after a failed or empty refresh, `FAILED`/`EMPTY` with no price; a lookup that throws counts as `FAILED`), appended last |
| Dashboard | `GET /portfolio/allocation` | Allocation slices; values and amounts are `null`, never cost-based, when real prices are incomplete. It reads the same lookup price as `positions/enriched` (a `STALE` stored price is used, as before) but its slice shape is unchanged and carries no price status |
| Dashboard | `GET /portfolio/positions/enriched` | Positions enriched with real current price/PnL; positions stay present with nullable price-derived fields when pricing is unavailable. Each position also carries the nullable `priceAsOf` and `priceStatus` (same meaning as on `positions/performance`), appended last. `GET /portfolio/performance` and `/performance/comparison` are history-only and unchanged |
| Analytics | `POST /portfolio/optimize` | Portfolio optimization proxy |
| Analytics | `POST /portfolio/rebalance-check` | Rebalance analysis proxy |
| Journal | `GET /journal/trades?page=&size=&sort=` | Paged persistent journal trades; `currentPrice`, `marketValue`, `pnl`, and `returnPct` remain `null` when current market evidence is unavailable. Each trade also carries the nullable `priceAsOf` (ISO instant, UTC: the time of the price candle used) and `priceStatus` (`OK`, `STALE`, `FAILED`, `EMPTY`). Open trades: `OK` is a provider-confirmed price; `STALE` is a stored price that no refresh could confirm (`priceAsOf` = its candle time), or, when no price is found at all, the persisted values kept unchanged (`priceAsOf` = the trade's `updatedAt`, approximate: the last row write); `FAILED`/`EMPTY` only when there is no price and no persisted price (`priceAsOf` null). Closed trades: both `null`. `POST`/`PUT` responses return the saved trade with both `null`. Known limit: `GET /journal/trades/stats` counts open trades of any `priceStatus` in its aggregates. Decision record `docs/product/decisions/2026-10-26-price-staleness.md`. |
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
| Ledger | `GET /portfolios/{portfolioId}/transactions` | List portfolio transactions; each includes the additive `originLocator` (`manual:<UUID>` or `manual:legacy:<id>` for MANUAL, possibly `null` for CSV). The frontend transaction history shows the source and the returned locator, or states when the locator is absent. |
| Ledger | `POST /portfolios/{portfolioId}/transactions` | Add a manual ledger transaction. `source` is `MANUAL` or omitted (`MANUAL`); `source=CSV` returns `422` with the standard error body ("CSV transactions are created only through imports") because CSV events must carry a `csv:` identity that only the import route produces (R-20) |
| Ledger | `DELETE /portfolios/{portfolioId}/transactions/{transactionId}` | Void a ledger entry (the row is retained with `voided_at` set and excluded from every read; `404` once voided or unknown). The void is validated under the per-portfolio ledger lock: when the remaining active events no longer replay (for example voiding a BUY a later SELL depends on) it returns `409` with the standard error body naming the symbol and changes nothing. The linked transaction journal record is deleted in the same transaction as the void, so both happen or neither does |
| Ledger | `GET /portfolios/{portfolioId}/holdings` | Derive current holdings from transactions |
| Portfolio State | `POST /portfolios/{portfolioId}/states` | Body `{"asOf":"YYYY-MM-DD"}`. Derives the state from active events and stored prices, persists it and returns it: `201` when the version is new, `200` when it already existed. `400` for a missing or invalid `asOf` or one after today (UTC date); `404` for an unknown portfolio. |
| Portfolio State | `GET /portfolios/{portfolioId}/states/{version}` | Replays a stored state from its stored event ids (voided events included) and valuation inputs, checks the replayed version equals the stored one, and returns it. `404` for an unknown portfolio or version; `409` with the standard error body when the replay differs. Response fields (both routes): `version`, `portfolioId`, `asOf`, `exposureStatus`, `sourceEventIds`, `positions[]` (`symbol`, `assetType`, `quantity`, `averageCost`, `costBasis`, `realizedPnl`, `currency`, `valuationStatus`, `price`, `priceDate`, `marketValue`, `weight`) and `assetTypeWeights` (object, keys sorted, empty unless `exposureStatus` is `COMPLETE`). Absent values are JSON `null`, never zero. |
| CSV Import | `POST /portfolios/{portfolioId}/imports` | Body is the CSV file, `Content-Type: text/csv`. Stages it and returns the batch (`201`); nothing enters the ledger. `400` rejects the whole file (empty or no data rows, over 1,048,576 bytes or 5,000 data rows, missing/unknown/duplicate header, invalid UTF-8, unterminated quote); `404` for an unknown portfolio; `415` for another content type. |
| CSV Import | `GET /portfolios/{portfolioId}/imports/{batchId}` | Returns the staged or accepted batch; `404` for an unknown portfolio or batch. |
| CSV Import | `POST /portfolios/{portfolioId}/imports/{batchId}/accept` | Inserts the `VALID` rows as `source=CSV` events in trade-date then row-number order and returns the batch with final row statuses (`200`); accepting an accepted batch returns it unchanged. `404` for an unknown portfolio or batch. Response fields (all three routes): `batchId`, `portfolioId`, `status` (`STAGED`, `ACCEPTED`), `fileSha256`, `createdAt`, `acceptedAt` (`null` until accepted), `counts` (`valid`, `invalid`, `duplicate`, `accepted`, `rejected`) and `rows[]` (`rowNumber`, `status`, `message`, `originLocator`, `transactionId`). Row `status` is `VALID`, `INVALID`, `DUPLICATE` (locator already in the ledger, voided events included), `ACCEPTED` or `REJECTED` (refused by the ledger, for example a sell above the holding). Absent values are JSON `null`. |

### CSV import schema v1

UTF-8 (an initial byte-order mark is ignored), comma separated, first row is the
header, RFC 4180 quoting (quoted fields, doubled quotes, commas inside quotes),
lines end in `\n` or `\r\n`, blank lines are skipped, decimal point `.`, dates
`yyyy-MM-dd`. Header names are case-insensitive and in any order: required
`trade_date`, `action`, `symbol`, `asset_type`, `quantity`, `price`, `currency`,
`fee`, `fx_rate_to_base`; optional `notes`. `action` and `asset_type` use the
`PortfolioTransactionAction` and `PortfolioAssetType` names, case-insensitively.
`trade_date`, `action`, `asset_type` and `currency` are required; an empty `fee` is
`0` and an empty `fx_rate_to_base` is `1`; every other value follows the
`PortfolioTransaction` rules, and a row that fails (including a wrong column count
or a number that does not fit the column) is staged `INVALID` with a message. A row's
`originLocator` is `csv:` plus the lower-case hex SHA-256 of the portfolio id, the
user id and the nine economic values (date, action, symbol, asset type, quantity,
price, currency, fee, fx rate) joined by `U+001F`, numbers as
`stripTrailingZeros().toPlainString()`, codes upper-case, an absent symbol empty;
the n-th identical row of a file gets `#n` (n >= 2). `rowNumber` counts non-blank
data rows from 1. Because the portfolio and user are part of the identity, the same
row imported into another portfolio is a new row (`VALID`), while reordering rows
within a portfolio gives the same locators. A request body over 1,048,576 bytes is
rejected with `400` while it is being read, not after it is fully buffered.

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
| Research | `GET /api/v1/research/financial-history/{symbol}` | Multi-year annual statement history (`FinancialHistoryResponse`: `symbol`, `status`, `currency`, `period_type`, `fiscal_year_ends`, `series`, `retrieved_at`); fiscal years ascending, series aligned to `fiscal_year_ends`, missing values are JSON `null` (never `0`); `EMPTY` is a 200 with empty lists; 503 when every statement read fails |
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
generic detail `<section> research failed` for unexpected errors. The Spring
research and technical adapters' `Optional`/list methods treat every non-2xx
response as empty evidence; their outcome-returning methods (`ProviderFetch`,
used by the watchlist research snapshot) map the status instead (see Partial
research).

Data-service error responses for provider rate limits (decision
`docs/product/decisions/2026-10-26-provider-rate-limit-status.md`):

| Status | Body | Header | Meaning |
|---|---|---|---|
| `429` | `{"detail": "Market data provider rate limited"}` | `Retry-After: <whole seconds, rounded up>` only when the provider gave a wait hint | An upstream provider (Yahoo or Tiingo, or Yahoo read directly by the fundamental, valuation and factor services) rate limited the request and no other provider returned data. Applies to every route, including the prices route, which answers `200 []` only when the chain is empty for other reasons |

The detail is a fixed sentence, never provider text. A rate-limited provider is
skipped in favor of the next one in the chain; the 429 is sent only when no
provider returned data. While a provider is blacklisted because rate limits
caused it (60 seconds after three failures, ruling R-1), the 429 is still sent
when no other provider has data, with `Retry-After` set to the remaining
blacklist time (at least 1 second); a provider blacklisted for any other reason
is skipped and the chain answers empty as before. The composite score route
(`/api/v1/research/composite/{symbol}`, ruling R-2) degrades per component: a
rate-limited component is marked `unavailable` with the reason code
`provider_rate_limited` in `breakdown_availability` and listed in
`unavailable_components`, and the rest are computed as before; the route answers
429 only when no component produced data and at least one was rate limited. Finnhub, FMP and FRED rate limits and the Finnhub earnings
route are not translated yet. The Spring backend does not read `Retry-After` yet.

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
bodies. These fields are **additive** — existing fields are unchanged. Spring
adapters other than the composite and agent-analysis ones still ignore them because
Jackson's default `FAIL_ON_UNKNOWN_PROPERTIES = false` drops unknown properties. The
composite adapter (`DataServiceResearchAdapter`) now consumes `breakdown_availability`
and `unavailable_components` (null when an older data-service omits them) and the
smart report exposes them as `sectionStatus` (see below). The agent-analysis adapter
(`DataServiceAgentAnalysisAdapter`) consumes `decision_availability` (absent from an
older data-service: unknown) and exposes it as `decision_status`: `available` becomes
`OK`; `unparseable`, `unavailable` and `insufficient` become `FAILED` with the reason
code unchanged; an absent or unknown status is `null`, never `OK`.

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

**Planning Finding 1 (PF-1), fixed 2026-10-23:** `composite_score_service` now
reads factor scores from `FactorAnalysisResponse.scores`, the valuation grade from
`ValuationResponse.metrics` and the earnings score from
`EarningsAnalysisResponse.metrics`, so provider-backed components are `available`.
The `*_not_mapped` reason codes remain only for an unexpected response shape.

**No neutral defaults (2026-10-23).** A breakdown component without evidence is
`null`, never the former neutral `50`. `overall_score` is the weighted average
of the non-null components only, with the weights renormalised:
fundamental .25, valuation .20, quality .15, growth .10, momentum .10, risk .10,
earnings .05, sentiment .05. When those components carry less than half of the
total weight, `overall_score`, `grade`, and `recommendation` are `null`. The
existing confidence cap (≤69 when fewer than half of the six inputs answered)
still applies. Spring maps these fields as nullable `Integer`/`String`, the
opportunity radar skips a `null` overall score without logging an error, and the
LLM context labels unknown values "unavailable".

**Smart report `sectionStatus` (additive, 2026-10-26).** `GET /reports/smart/{symbol}`
keeps every existing field and adds `sectionStatus`:
`{ "overall": <status|null>, "components": { "<component>": { "status": <status|null>, "reason": <string|null> } } }`.
Component keys are the data-service `breakdown_availability` keys unchanged
(`fundamental_score`, `valuation_score`, ... `sentiment_score`); `status` is a
`WatchlistResearchStatus` value and `reason` is the data-service reason code unchanged.
A component reported `available` whose score is null has `status` `null` (R-7).
`sectionStatus` is `null` when the composite carried no availability (older data-service
or a cache entry written before this field). Mapping and precedence are in
`domain-and-data.md`; decision record
`docs/product/decisions/2026-10-26-section-status-smart-report.md`.
The Stock Detail smart-report UI renders it as a per-component status pill and reason, a "Durum bilinmiyor" note when it is absent or `null`, and an incomplete-evidence note when the overall status is not `OK` (see `architecture.md`).

### Shared contract fixtures

`docs/contracts/fixtures/` holds representative Spring response bodies that both
test suites read. Backend `@WebMvcTest` classes assert that a real serialized
response has the same field-path set as the fixture; frontend Vitest parses each
fixture with a strict schema mirroring the types exported through
`frontend/src/api/client.ts`. Fixture values
are test data, not market data. Covered today: portfolio summary, performance,
enriched positions, the smart report, and the backend error body.

### Partial research

Watchlist and report aggregation preserve successful sections when another
provider fails. Watchlist sections expose one of `OK`, `STALE`, `EMPTY`, `FAILED`,
`RATE_LIMITED`, `INSUFFICIENT_DATA`, or `PENDING_REFRESH`, plus source/message data
where supported.

**Watchlist research-snapshot section status (2026-10-26).** For the
`technical`, `fundamentals`, `earnings` and `institutional` sections of
`GET /watchlists/{id}/research-snapshot`, the status comes from the outcome of the
data-service call, not from message text. Endpoint path, field names and the
seven status strings are unchanged; only which status is returned changes.

| Data-service result | Section status | Section message |
|---|---|---|
| 200 with data | `OK` | none |
| 200 with no body or no usable data, or 404 | `EMPTY` (no data exists) | `Provider returned no data` |
| 422 | `INSUFFICIENT_DATA` | `Insufficient history` |
| 429 | `RATE_LIMITED` | `Provider rate limited` |
| other 4xx, 5xx, I/O error, timeout, unreadable body | `FAILED` | `Provider request failed` |

`EMPTY` therefore means the provider answered that no data exists, `FAILED` means
the call itself failed, and the two are no longer confused. Messages are fixed
sentences, never raw provider text. `RATE_LIMITED` arises when the data-service
answers 429 for a provider rate limit (see the data-service error table) and from
the snapshot's own concurrency-queue timeout. The
technical section combines two calls (indicators and signal): data from either
gives `OK` with the other part null, so a failed half is hidden when the other
half has data and a 422 on the indicators call no longer fails the section; with
no data from either, the more severe outcome wins (`RATE_LIMITED`, `FAILED`,
`INSUFFICIENT_DATA`, `EMPTY`).

The circuit breaker is per section and shared across all symbols and requests:
3 provider-side failures open it for 60 seconds, during which that section reads
`STALE` for every symbol. Provider-side failures are `RATE_LIMITED` and `FAILED`
caused by a 5xx, I/O error, timeout, unreadable body or any other exception. A
`FAILED` caused by a 4xx other than 429 (for example 400 or 403 for one unknown
symbol) keeps the `FAILED` status but does not count, so one bad symbol cannot
disable the section for the others. `OK`, `EMPTY` and `INSUFFICIENT_DATA` never
count.

Behavior change: a failed data-service call now reads `FAILED` instead of `EMPTY`,
and a 422 (`INSUFFICIENT_DATA`) no longer counts toward the breaker. (The overall
status later gained `STALE`; see the `price` section note below.)
Decision record `docs/product/decisions/2026-10-26-provider-failure-status.md`.

**Watchlist research-snapshot `price` section status (2026-10-26).** The `price`
section status comes from how the newest price was obtained, not from whether a
price exists. Endpoint path, field names and the seven status strings are
unchanged; a `STALE` price section keeps its `data` (price, volume and the price's
own `timestamp`).

| Price lookup | Section status | Data | Section message |
|---|---|---|---|
| Provider returned a row for the symbol | `OK` | price | none |
| Stored price only, provider call threw | `STALE` | stored price | `Provider refresh failed; showing the last stored price` |
| Stored price only, provider returned nothing (or only other symbols) | `STALE` | stored price | `Provider returned no newer price; showing the last stored price` |
| No price, provider call threw | `FAILED` | null | `Provider request failed` |
| No price, provider returned nothing | `EMPTY` | null | `Provider returned no data` |

For `price`, `STALE` means a refresh was attempted and could not confirm the price
is current; no market-calendar logic applies, so a price that is current only
because the market is closed reads `STALE` when the provider returns nothing newer.
The per-row `overallStatus` is the worst section status in the order
`RATE_LIMITED`, `FAILED`, `STALE`, `INSUFFICIENT_DATA`, `OK`, `EMPTY`. Behavior
change (ruling R-1): `STALE` now takes part, so a row whose overall read `OK` (or
`EMPTY`) because of a `STALE` price, or of a section held `STALE` by an open circuit
breaker, now reads `STALE`; `STALE` ranks above `INSUFFICIENT_DATA`. The price
section has no circuit breaker. The "Sağlıklı" tile counts rows whose overall
status is `OK`, so rows with a `STALE` section no longer count as healthy. `OK` for
`price` means the provider returned at least one row for the symbol, even when the
stored price is newer than every returned row (the stored price is then shown); a
provider that serves old bars is not detected and reads `OK`. The detail panel
shows the price's own time ("Fiyat zamanı") beside the observation time.
Decision record `docs/product/decisions/2026-10-26-price-section-status.md`.

## Evidence Anchors

- `frontend/src/App.tsx`
- `frontend/src/api/client.ts`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/GlobalExceptionHandler.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/dto/AgentAnalysisResponseDto.java`
- `data-service/main.py`
- `data-service/app/routers/`
