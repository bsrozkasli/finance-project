# Decisions: report a provider rate limit as HTTP 429 from the data-service

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent and
asked that every decision be recorded. This closes the D-5 item of the
[provider failure record](2026-10-26-provider-failure-status.md) ("the data-service returning 429"). Legal, data-rights,
policy and recovery decisions (OQ-1, OQ-2, OQ-3, OQ-8) are not taken here.

**Scope:** the FastAPI data-service answering HTTP 429 with `Retry-After` when an upstream market-data provider rate-limits
it. The Spring backend already maps 429 to `RATE_LIMITED` (`DataServiceOutcomes`) and needs no change.
**State:** Accepted 2026-10-26.

## Finding

A provider 429 never reaches the routers as an exception today. Every provider (`yahoo_provider`, `tiingo_provider`,
`finnhub_provider`, `fmp_provider`, `fred_provider`) catches its own errors and returns an empty value; the resolver tries the
next provider and, when the chain is exhausted, returns an empty result; the router then emits a 404 ("No historical data
found"), a 422, or a degraded body. Three services read Yahoo directly (`fundamental_analysis_service`, `valuation_service`,
`factor_analysis_service`) through helpers that swallow everything. So a rate-limited data-service is indistinguishable from a
symbol with no data, and the backend can never show `RATE_LIMITED`. `yfinance` 1.4.1 (installed in the repository
environment) exposes `yfinance.exceptions.YFRateLimitError`; the requirements file does not pin it.

## D-1. Typed error

`app/errors.py` gains `RateLimitedError(RuntimeError)` carrying `provider` (name or `None`) and `retry_after` (seconds as a
number, or `None`; clamped to 1 to 3600 when present). It is not a subclass of `InsufficientDataError` or
`DependencyUnavailableError`, so no existing handler can catch it by accident.

## D-2. Detection (one helper)

A small module `app/providers/rate_limit.py`:
1. `is_rate_limited(exc)`: true for `httpx.HTTPStatusError` with status 429; for `yfinance.exceptions.YFRateLimitError`
   (looked up with `getattr`, so an older yfinance without the class still works); for `finnhub.exceptions.FinnhubAPIException`
   with status 429 if the attribute exists; and, as a last resort, when the **exception's own message** contains
   "Too Many Requests". The text match never looks at response bodies or data.
2. `parse_retry_after(headers)`: whole seconds, or an HTTP date converted to a delta; `None` when absent or unparseable.

## D-3. Where it is raised

1. Yahoo (`get_ohlcv`, `get_asset_info`, `get_market_quote`) and Tiingo (`get_ohlcv`, `get_asset_info`) re-raise
   `RateLimitedError` before their generic swallow; `health_check` is unchanged. Finnhub, FMP and FRED are left for a later change
   (they do not feed the watchlist snapshot).
2. The three direct-Yahoo services' safe-read helpers re-raise `RateLimitedError`.
3. The resolver (`get_ohlcv`, `get_asset_info`, `get_market_quote`) remembers a `RateLimitedError` from a provider, still tries
   the next provider, still counts the failure toward the existing blacklist (three failures, 60 seconds), and **raises**
   `RateLimitedError` only when no provider returned data and at least one was rate limited. An exhausted chain without a rate
   limit still returns empty as before (existing behavior and tests are preserved).

## D-4. Translation (one handler)

One `@app.exception_handler(RateLimitedError)` in `main.py` returns **429** with body `{"detail": "Market data provider
rate limited"}` (a fixed sentence; no provider text) and, when `retry_after` is known, a `Retry-After` header with whole
seconds (rounded up). It covers every route, including the prices route: a rate-limited chain now answers 429 there instead of
`200 []` (a chain that is empty for other reasons still answers `200 []`). Cost if wrong: a client that treated every prices
failure as an empty list now sees 429 in the rate-limited case; the Spring price adapter swallows it as before.

## D-5. Backend and display

No backend or frontend change. The backend maps 429 to `RATE_LIMITED`, which counts toward the section circuit breaker
(provider fault); the watchlist already renders `RATE_LIMITED`. A visible consequence: a Yahoo rate limit can now open the
technical or fundamentals breaker (three failures, then `STALE` for 60 seconds), where before it read `EMPTY`. The backend
does not read `Retry-After` yet.

## D-6. Out of this change

Finnhub, FMP and FRED rate limits; reading `Retry-After` in the backend; the legacy backend adapters that swallow every error
(price, asset detail, metadata); pinning a `yfinance` version.

## Implementation rulings

Rulings made while coding are appended below as `R-n`.

- **R-1. The blacklist window still reports a rate limit** (corrects D-3.3). Why: the resolver blacklists a provider for 60
  seconds after three failures. A rate-limit failure that caused the blacklist would be skipped during the window and the
  chain would return empty, so the rate limit would read as "no data" again for a minute (prices `200 []`, technical `404`). The
  resolver records why each provider was blacklisted; a provider skipped because its blacklist came from rate limits counts as
  rate-limited, with the remaining blacklist time as its `retry_after`. A provider blacklisted for another reason is skipped as
  before. Cost if wrong: during the window the same empty result as before.
- **R-2. The composite score keeps degrading per component** (corrects the effect noted in D-4 for composite). Why: before this
  change a rate-limited component became "unavailable" inside a 200, and the other components stayed in the answer. Turning the
  whole route into a 429 makes the backend drop to its Finnhub fallback and loses that partial answer. A `RateLimitedError`
  raised while computing one component marks that component unavailable with the reason code `provider_rate_limited` (shown by
  the section status of the smart report) and the rest are computed as before; when every component is rate limited the
  route answers 429. Cost if wrong: a composite built from fewer components during a rate limit, labelled as such.
- **R-3. Interpretations accepted after review.** (1) When several providers are limited, the merged error uses the first
  limited provider and the largest known `retry_after`. (2) `parse_retry_after` ignores negative and non-integer values, treats
  a past HTTP date as 0, and only `RateLimitedError` clamps the final value. (3) The message fallback is a case-insensitive
  "too many requests" match on the exception message only. (4) Direct-Yahoo 429s carry no `Retry-After` (yfinance gives no
  headers). (5) The earnings route is covered only as a pass-through; a real Finnhub 429 is out of scope (D-6) and still ends
  as a 500. (6) Yahoo `get_financial_statements` and `get_news` still swallow rate limits (not in D-3).
- **R-4. "Every component rate limited" means no component produced data and at least one was rate limited.** Why: earnings
  and sentiment run through Finnhub and never raise `RateLimitedError`, so a strict "all components" reading could never
  fire. The blacklist cause is tracked per provider, not per operation, like the blacklist itself. A rate limit in the
  fundamental or risk component has no per-field reason code and is listed only in `unavailable_components`. Cost if wrong:
  a composite with a few limited components answers 200 where a strict reading would answer 429.
