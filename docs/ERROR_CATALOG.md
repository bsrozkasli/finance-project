# Error Catalog

This catalog documents the expected HTTP error behavior for backend and
data-service APIs. It is based on `SPEC.md` Section 7 and Section 8 plus the
current controller behavior under `backend/src/main/java/.../adapter/inbound/rest`.

`AUTH_SPEC.md` is not present in this repository revision, and production
authentication is not implemented yet. Auth errors below are therefore the
target contract for the future auth module, not current runtime behavior.

## Bolum 1 - Standard Error Schema

All new API errors should use the stable error response shape from `SPEC.md`
Section 8:

```json
{
  "timestamp": "2026-06-28T10:15:00Z",
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "Technical analysis requires at least 30 candles",
  "path": "/api/v1/technical/AAPL"
}
```

Rules:

- `timestamp` is UTC ISO-8601.
- `status` is the HTTP status code.
- `error` is the standard HTTP reason phrase.
- `message` is specific enough for users and logs, but must not expose secrets.
- `path` is the request path that failed.
- Existing controllers may currently rely on Spring Boot default error output;
  new handlers should preserve the shape above.

## Bolum 2 - Global HTTP Status Code Guide

| Status | Use when | Example scenario | Frontend behavior |
|---:|---|---|---|
| `200 OK` | Request succeeds, including safe degradation with empty or partial data | News provider fails and endpoint returns `[]`; report returns verified partial sections | Render data; show optional "partial data" notice only when the DTO exposes it |
| `201 Created` | New persisted resource is created | `POST /portfolio/positions`, `POST /watchlists`, `POST /journal/trades` | Add item to local state or refetch list |
| `204 No Content` | Delete/command succeeds with no response body | `DELETE /assets/AAPL`, `DELETE /watchlists/7`, cache eviction | Remove item locally or refetch; do not parse response body |
| `400 Bad Request` | Malformed JSON, invalid enum/date/number, missing required field, blank symbol/name where controller validates request shape | Invalid `JournalTradeType`, blank watchlist symbol, negative/invalid domain constructor input | Show field-level validation or inline form error |
| `401 Unauthorized` | Missing/expired/invalid access token after auth is implemented | Expired JWT on `/api/v1/me` | Try token refresh once; if it fails, route to login |
| `403 Forbidden` | Authenticated user lacks permission after auth/user scoping is implemented | User attempts to access another user's watchlist | Show permission error and keep current page stable |
| `404 Not Found` | Requested single resource does not exist | Unknown asset, portfolio position id, watchlist id, journal trade id, unregistered provider health endpoint | Show "not found"; do not break the dashboard |
| `409 Conflict` | Request conflicts with existing state or uniqueness constraints | Duplicate watchlist name, duplicate persisted price row, duplicate unique asset constraint | Show conflict message and suggest refresh |
| `422 Unprocessable Entity` | Request is syntactically valid but violates business rules | Technical analysis has fewer than 30 candles; impossible portfolio optimization constraints | Show business-rule validation near the relevant form/control |
| `429 Too Many Requests` | Provider/client/user rate limit is reached and cannot be degraded or served from cache | Non-cacheable Finnhub exhaustion | Read `Retry-After` if present; back off and offer retry |
| `502 Bad Gateway` | Upstream provider/data-service returns malformed or invalid payload | Provider returns malformed JSON or incompatible DTO | Show temporary upstream error; report telemetry |
| `503 Service Unavailable` | Required dependency is unavailable and no fallback can satisfy the request | data-service down for agent analysis, technical analysis, chat, optimization | Show service unavailable banner and allow retry |
| `500 Internal Server Error` | Unexpected bug or uncaught exception | Smart report use case throws and controller returns `500` | Show generic failure and log correlation details if available |

## Bolum 3 - Endpoint Error Catalog

Backend base path is `http://localhost:8080/api/v1`.

### Assets

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /assets` | `200` | No tracked assets | - | Returns `[]`, not `404` |
| `GET /assets` | `503` | Database unavailable | "Required dependency unavailable" | Current controller does not catch repository failures |
| `GET /assets/{symbol}` | `404` | Symbol is not tracked | "Asset not found" | Implemented with `ResponseStatusException` |
| `GET /assets/{symbol}` | `400` | Symbol path value cannot be parsed by routing or is malformed | Standard Spring validation message | Keep symbol normalization in backend |
| `POST /assets/batch` | `200` | Full or partial success | - | Blank symbols are skipped; Yahoo metadata failure falls back to minimal `STOCK` asset |
| `POST /assets/batch` | `200` | Empty or missing `symbols` array | - | Current behavior returns `[]` |
| `POST /assets/batch` | `409` | Persistence uniqueness conflict cannot be ignored | Duplicate asset constraint | Prefer idempotent behavior where possible |
| `DELETE /assets/{symbol}` | `204` | Delete command accepted | - | Current controller does not require existing asset |

### Prices

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /prices/{symbol}/latest` | `404` | No DB price and provider fetch returns no bars | "Price not found" | Current implementation tries data-service before failing |
| `GET /prices/{symbol}/latest` | `503` | DB and data-service are unavailable and no stale local price exists | "Price data unavailable" | Target contract; current adapter usually degrades to empty |
| `GET /prices/{symbol}/history?interval=&range=` | `200` | DB has data or lazy provider fetch succeeds | - | Returns list of candles |
| `GET /prices/{symbol}/history?interval=&range=` | `200` | DB miss and provider chain returns no data | - | Returns `[]`; do not fabricate candles |
| `GET /prices/{symbol}/history?interval=&range=` | `400` | Invalid query type or unsupported request syntax | Standard Spring validation message | Unknown range currently defaults to `1mo` |
| `GET /prices/{symbol}/history?interval=&range=` | `503` | Required data-service/provider chain is unavailable and endpoint cannot degrade | "Price data unavailable" | Use only when empty response is not acceptable |

### Technical

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /technical/{symbol}` | `200` | Technical indicators available | - | Cached by symbol/interval/range |
| `GET /technical/{symbol}` | `422` | Fewer than 30 candles are available | "Technical analysis requires at least 30 candles" | Required by SPEC/data-service rule |
| `GET /technical/{symbol}` | `503` | data-service/technical adapter returns empty | "Technical analysis unavailable for {symbol}" | Current backend behavior |
| `GET /technical/{symbol}/signals` | `200` | Signal summary available | - | Cached separately |
| `GET /technical/{symbol}/signals` | `422` | Fewer than 30 candles are available | "Technical analysis requires at least 30 candles" | Prefer 422 over misleading indicators |
| `GET /technical/{symbol}/signals` | `503` | Signal service unavailable | "Technical signals unavailable for {symbol}" | Current backend behavior |

### Agent Analysis

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /agent-analysis/{ticker}` | `200` | Cache hit or data-service/Azure analysis succeeds | - | `fromCache` indicates cache source |
| `GET /agent-analysis/{ticker}` | `503` | Cache miss and data-service/Azure fails | "Agent analysis unavailable for {ticker}" | Do not synthesize analysis text |
| `GET /agent-analysis/{ticker}` | `429` | Azure/data-service rate limit and no cached result | "Rate limit exceeded" | Prefer cached last successful result if contract allows |
| `DELETE /agent-analysis/{ticker}/cache` | `204` | Ticker cache evicted or absent | - | Idempotent command |
| `DELETE /agent-analysis/cache` | `204` | All agent-analysis cache entries evicted | - | Idempotent command |

### Portfolio

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /portfolio/positions` | `200` | No positions | - | Returns `[]` |
| `POST /portfolio/positions` | `201` | Position created | - | Domain constructor rejects invalid symbol/quantity/price |
| `POST /portfolio/positions` | `400` | Blank symbol, non-positive quantity, negative average cost, invalid date/body | Domain or Spring validation message | Current controller lets domain exceptions bubble unless handled globally |
| `PUT /portfolio/positions/{id}` | `404` | Position id not found for user | "Position not found: {id}" | Current behavior |
| `PUT /portfolio/positions/{id}` | `400` | Invalid request body | Domain or Spring validation message | Do not update partial invalid state |
| `DELETE /portfolio/positions/{id}` | `404` | Position id not found for user | "Position not found: {id}" | Current behavior |
| `DELETE /portfolio/positions/{id}` | `204` | Position deleted | - | No response body |
| `GET /portfolio/summary` | `200` | No positions or missing prices | - | Missing latest price falls back to average cost |
| `GET /portfolio/performance?period=&benchmark=` | `200` | Performance response available | - | Current implementation returns minimal series |
| `GET /portfolio/allocation` | `200` | Allocation response available | - | Empty portfolio returns empty slices |
| `GET /portfolio/positions/enriched` | `200` | Enriched positions available | - | Missing latest price falls back to average cost |
| `POST /portfolio/optimize` | `400` | Malformed body or invalid numeric values | Standard validation message | |
| `POST /portfolio/optimize` | `422` | Valid body but impossible constraints | "Invalid portfolio optimization constraints" | Target business-rule contract |
| `POST /portfolio/optimize` | `503` | data-service optimization unavailable | "Portfolio optimization service is unavailable" | Current backend behavior |
| `POST /portfolio/rebalance-check` | `400` | Malformed weights/threshold body | Standard validation message | |
| `POST /portfolio/rebalance-check` | `422` | Invalid target/current weights or threshold | "Invalid rebalance constraints" | Target business-rule contract |
| `POST /portfolio/rebalance-check` | `503` | data-service optimization unavailable | "Portfolio optimization service is unavailable" | Current backend behavior |

### Journal

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /journal/trades?page=&size=&sort=` | `200` | No trades | - | Returns empty page content |
| `GET /journal/trades?page=&size=&sort=` | `400` | Invalid numeric query parameter | Standard Spring validation message | Current code clamps negative page/size |
| `GET /journal/trades/stats` | `200` | No trades | - | Returns zeroed stats |
| `POST /journal/trades` | `201` | Trade created | - | |
| `POST /journal/trades` | `400` | Missing symbol/type/quantity/price, invalid enum/date, negative values | Domain or Spring validation message | Controller maps domain/null errors to 400 |
| `PUT /journal/trades/{id}` | `404` | Trade id not found for user | "Trade not found: {id}" | Current behavior |
| `PUT /journal/trades/{id}` | `400` | Invalid request body | Domain or Spring validation message | |
| `DELETE /journal/trades/{id}` | `404` | Trade id not found for user | "Trade not found: {id}" | Current behavior |
| `DELETE /journal/trades/{id}` | `204` | Trade deleted | - | No body |

### Watchlists

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /watchlists` | `200` | No watchlists | - | Returns `[]` |
| `POST /watchlists` | `201` | Watchlist created | - | |
| `POST /watchlists` | `400` | Missing/blank name | Domain message | Current controller maps `IllegalArgumentException` to 400 |
| `POST /watchlists` | `409` | Duplicate name where uniqueness is enforced | "Watchlist already exists" | Target contract |
| `POST /watchlists/{id}/symbols` | `404` | Watchlist id not found | "Watchlist not found: {id}" | Current behavior |
| `POST /watchlists/{id}/symbols` | `400` | Missing/blank symbol | "symbol is required" | Current behavior |
| `POST /watchlists/{id}/symbols` | `200` | Symbol already present | - | Idempotent; returns unchanged watchlist |
| `DELETE /watchlists/{id}/symbols/{symbol}` | `404` | Watchlist id not found | "Watchlist not found: {id}" | Current behavior |
| `DELETE /watchlists/{id}/symbols/{symbol}` | `204` | Symbol removed or was already absent | - | Idempotent removal |
| `DELETE /watchlists/{id}` | `404` | Watchlist id not found | "Watchlist not found: {id}" | Current behavior |
| `DELETE /watchlists/{id}` | `204` | Watchlist deleted | - | No body |

### Fundamentals

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /fundamentals/{symbol}` | `200` | Full or partial fundamentals available | - | Missing statements return empty series/null metric fields |
| `GET /fundamentals/{symbol}` | `200` | Provider unavailable but endpoint can degrade | - | Returns partial DTO; no fake fundamentals |
| `GET /fundamentals/{symbol}/ratios` | `200` | Ratios available or partially missing | - | Missing ratios are `null` |
| `GET /fundamentals/{symbol}/earnings?periods=` | `200` | Earnings available or missing | - | Missing earnings returns `[]`; `periods` minimum is clamped to 1 |
| `GET /fundamentals/{symbol}/insider` | `200` | Insider data available or unavailable | - | Finnhub adapter degrades to `[]` |
| `GET /fundamentals/{symbol}/institutional` | `200` | Institutional scores available or unavailable | - | Missing scores return `[]` |
| Fundamentals endpoints | `429` | Finnhub/provider rate limit and no degradation path for requested field | "Rate limit exceeded" | Prefer `200` partial where possible |
| Fundamentals endpoints | `503` | Required provider/data-service dependency unavailable and no partial response can satisfy request | "Fundamentals unavailable" | Use sparingly; partial data is preferred |

### News

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /news?category=&page=&size=&symbols=` | `200` | News found or no news | - | Returns page content; missing providers return `[]` |
| `GET /news?category=&page=&size=&symbols=` | `400` | Invalid numeric query value | Standard Spring validation message | Current code clamps negative page/size |
| `GET /news/portfolio` | `200` | Portfolio/watchlist symbols have news or no symbols | - | Returns `[]` when no symbols/news |
| `GET /news/{symbol}` | `200` | Finnhub news available or unavailable | - | Finnhub client returns `[]` on failure |
| News endpoints | `429` | Finnhub/Tiingo rate limit and no fallback/cached response | "Rate limit exceeded" | Prefer provider fallback before 429 |
| News endpoints | `503` | All required news providers unavailable and endpoint cannot degrade | "News unavailable" | Most news endpoints should degrade to `200 []` |

### Reports

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /reports/company/{symbol}` | `200` | Full or partial report assembled | - | Technical failures become `technical: null`; Finnhub sections may be empty/null |
| `GET /reports/company/{symbol}` | `429` | Required provider rate limit with no fallback | "Rate limit exceeded" | Prefer partial report where possible |
| `GET /reports/company/{symbol}` | `503` | Required report dependency unavailable and no partial report can satisfy request | "Company report unavailable" | Partial DTO is preferred |
| `GET /reports/smart/{symbol}` | `200` | Smart report generated | - | |
| `GET /reports/smart/{symbol}` | `500` | Smart report use case throws | Empty body in current controller | Should be migrated to standard error schema |
| `GET /reports/test` | `200` | Diagnostic endpoint reachable | - | No expected error beyond infrastructure failures |

### Backtest

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `GET /backtest/{symbol}` | `200` | Backtest result available | - | Backend proxies data-service result |
| `GET /backtest/{symbol}` | `422` | Insufficient or invalid historical data for strategy | "Backtest requires sufficient historical data" | Target data-service contract |
| `GET /backtest/{symbol}` | `503` | data-service unavailable | "Backtest service unavailable" | Use when no fallback exists |
| `GET /backtest/{symbol}` | `502` | data-service returns malformed backtest payload | "Invalid upstream response" | |

### Chat

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `POST /chat/ask` | `200` | Chat response generated | - | |
| `POST /chat/ask` | `400` | Missing `symbol` or `message`, malformed JSON | Standard validation message | |
| `POST /chat/ask` | `429` | Azure OpenAI/data-service rate limit | "Rate limit exceeded" | Do not retry aggressively |
| `POST /chat/ask` | `503` | Azure OpenAI not configured or data-service unavailable | "Chat service unavailable" | Data-service may report missing Azure config |
| `POST /chat/ask` | `502` | Malformed data-service/Azure response | "Invalid upstream response" | |

### Auth

Auth endpoints are not implemented in the current backend and `AUTH_SPEC.md` is
absent. The rows below are the target contract for future auth work.

| Endpoint | Status | Condition | message | Notes |
|---|---:|---|---|---|
| `POST /auth/register` | `201` | User registered | - | Future endpoint |
| `POST /auth/register` | `400` | Invalid email/password payload | "Invalid registration request" | |
| `POST /auth/register` | `409` | Email/user already exists | "User already exists" | |
| `POST /auth/login` | `200` | Credentials accepted | - | Returns access/refresh tokens |
| `POST /auth/login` | `400` | Malformed login body | "Invalid login request" | |
| `POST /auth/login` | `401` | Bad credentials | "Invalid credentials" | |
| `POST /auth/refresh` | `200` | Refresh token accepted | - | Returns new access token |
| `POST /auth/refresh` | `401` | Missing/expired/invalid refresh token | "Invalid refresh token" | |
| `POST /auth/logout` | `204` | Logout/revocation accepted | - | Idempotent |
| `GET /auth/me` | `200` | Authenticated user resolved | - | |
| `GET /auth/me` | `401` | Missing/expired/invalid access token | "Unauthorized" | |

## Bolum 4 - Provider Error Behavior

| Provider condition | Backend status | When to use | Notes |
|---|---:|---|---|
| Provider returns usable fallback value | `200` | Endpoint can return empty list, `null`, neutral value, or partial DTO | Preferred behavior for non-critical market data |
| Provider `429` and cached/fallback data exists | `200` | Cache or secondary provider satisfies the request | Include partial/cached marker when DTO supports it |
| Provider `429` and no fallback/cache exists | `429` | Request cannot be completed safely | Preserve or synthesize `Retry-After` when known |
| Provider timeout on non-critical section | `200` | Company reports, fundamentals, news can omit that section | Do not block the entire page |
| Provider timeout on required dependency | `503` | Technical, chat, optimization, agent analysis without cache | User can retry later |
| All providers down for optional collection | `200` | News, insider, recommendations, provider-backed lists | Return `[]` |
| All providers down for required price/analysis flow | `503` | No DB/cache/fallback data can satisfy the endpoint | "Price data unavailable" or specific service message |
| Provider returns malformed payload | `502` | Adapter cannot parse/validate upstream body | Log provider and symbol, not secrets |
| Missing provider API key for optional provider | `200` | Tiingo/Finnhub optional enrichment is skipped | Return empty/partial values |
| Missing Azure OpenAI configuration | `503` | Chat/agent/LLM endpoint explicitly requires Azure | Backend adapters return `Optional.empty()`; no synthetic text |

Provider-specific notes:

- Yahoo/yfinance failure returns `[]`, `null`, or empty fundamentals; it should
  not cause fake prices or metadata.
- Finnhub news/recommendation/insider failures should return `[]` where the
  endpoint can degrade. Sentiment may use a neutral default.
- Tiingo is optional; missing `TIINGO_API_KEY` means skip provider and continue.
- Azure OpenAI is optional globally but required for chat/agent/LLM insight
  success unless a cached prior response exists.

## Bolum 5 - Frontend Error Handling Guide

| Status | Frontend action |
|---:|---|
| `400` | Show form or request validation error. Keep entered values so the user can fix them. |
| `401` | Attempt token refresh once. If refresh fails, clear auth state and redirect to login. |
| `403` | Show a permission message. Do not retry automatically. |
| `404` | Show a scoped "not found" message. Do not crash the dashboard or clear unrelated panels. |
| `409` | Tell the user the resource changed or already exists. Offer refresh or rename/retry. |
| `422` | Treat as business validation. Highlight the relevant form/control and show the backend message. |
| `429` | Read `Retry-After` if present. Disable repeated retry until the backoff expires. |
| `502` | Show upstream/provider error. Log telemetry with endpoint and symbol/context. |
| `503` | Show "service temporarily unavailable" banner and allow manual retry. |
| `500` | Show generic error state and log telemetry. Avoid exposing stack traces. |

Frontend hooks should always expose `loading`, `error`, and data states
separately. A failed optional panel must not break the whole dashboard.
