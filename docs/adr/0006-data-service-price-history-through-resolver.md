# ADR-0006: Data-Service Price History Through the Provider Resolver

Date: 2026-10-13
Status: Proposed
Deciders: Development team

## Context

`MarketDataResolver` gives the data-service ordered provider fallback, health
tracking, blacklisting, and Prometheus metrics. The audit (`CAP-CUR-DS-004`,
`DOC-CONFLICT-001`) found that the technical/pattern router and the risk,
factor, valuation, fundamental, and portfolio services call yfinance directly,
bypassing all of that. The direct calls also hide two financial-semantics facts:
risk and factor use adjusted closes (`yf.download` defaults to
`auto_adjust=True` in yfinance 1.4.1), while technical analysis and portfolio
optimization use unadjusted closes.

## Decision

1. **D1** Every price-history read goes through `MarketDataResolver.get_ohlcv`:
   technical and pattern routes, risk analytics, factor momentum and
   low-volatility, portfolio optimize and efficient frontier.
2. **D2** `Ticker.info` and financial-statement DataFrames in the fundamental,
   factor (value, growth, quality, institutional), and valuation services remain
   direct yfinance reads until a later ADR extends `IMarketDataProvider`. Each
   call site carries a comment naming this ADR.
3. **D3** `portfolio_analytics_service.py` has no route or caller; it is not
   migrated. Removing it is a separate decision.
4. **D4** `get_ohlcv` takes `adjusted: bool = False`. Unadjusted bars remain the
   default for `/api/v1/prices` and technical/pattern routes. Risk and factor
   request adjusted bars, preserving their current numbers. Yahoo maps the flag
   to `auto_adjust`; Tiingo maps it to its `adj*` fields; Finnhub returns `[]`.
5. **D5** Portfolio optimization and the efficient frontier request adjusted
   closes, so splits and dividends no longer distort expected returns and
   covariance. This changes their numerical output.
6. **D6** A provider that cannot serve the requested interval returns `[]`.
   Tiingo is daily-only, so it never serves daily bars for intraday or weekly
   requests. Unadjusted Tiingo bars never fall back to `adjClose`.
7. **D7** Daily bars are indexed by session date: the UTC timestamp rounded to
   the nearest day, which recovers exchange-local dates between UTC−11 and
   UTC+11. Fixed-day lookbacks request the smallest covering provider period and
   trim to `[today − N days, today]`; portfolio excludes today to keep the
   former end-exclusive window.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep direct yfinance and document every exception | Leaves risk, factor, and portfolio without fallback, health, or metrics, and keeps the entry-point contract false. |
| Migrate `.info`/statements in the same change | Needs a much larger provider protocol and a field mapping per provider; it would block the price-history fix on an unrelated design. |
| Add `start`/`end` dates to the protocol | Tiingo and Yahoo both accept periods; a covering period plus trimming reaches the same window without a protocol-wide change. |
| Keep unadjusted closes for portfolio | Preserves today's numbers but keeps split/dividend distortion in optimizer inputs. |

## Consequences

### Positive

- Price-history analytics gain Tiingo fallback, provider health, blacklisting,
  and resolver metrics.
- Adjustment semantics become explicit and testable at every call site.
- Intraday and weekly requests can no longer be answered with daily bars.

### Negative / trade-offs

- Portfolio optimizer output changes for symbols with splits or dividends in the
  lookback (D5).
- Risk/factor windows move from `start=now−365d` to period `1y` trimmed to the
  same 365-day window; a boundary bar may differ.
- Session-date rounding is wrong for exchanges at UTC+12 or later (for example
  NZX daylight time).
- D2 call sites still bypass the resolver until a follow-up ADR.

## References

- `docs/product/evidence/data-service.md` (`CAP-CUR-DS-004`)
- `docs/product/evidence/legacy-document-conflicts.md` (`DOC-CONFLICT-001`)
- `docs/spec/current-system/architecture.md` (Data-Service Boundary)
- `docs/spec/current-system/operations.md` (Provider Responsibilities)
- `data-service/app/providers/market_data_resolver.py`
- `data-service/app/services/price_history.py`
