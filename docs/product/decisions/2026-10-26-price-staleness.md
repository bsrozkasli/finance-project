# Decisions: price staleness on the journal, the portfolio dashboard and the latest-price endpoint (fifth slice of the section status contract)

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent
and asked that every decision be recorded. This continues the [price section](2026-10-26-price-section-status.md) record
(D-4: "the other consumers of `getFreshLatest`"). Legal, data-rights, policy and recovery decisions (OQ-1, OQ-2, OQ-3,
OQ-8) are not taken here.

**Scope:** `PRD-FR-007` for three consumers of `PriceRefreshService.getFreshLatest`: the trade journal (first, this change),
the portfolio dashboard and the latest-price endpoint (later changes, decided here so they share one vocabulary).
**State:** Accepted 2026-10-26.

## Finding

`getFreshLatest` returns the stored price when the provider refresh fails, so each consumer can present an unconfirmed
price as current. The journal is the most visible: `TradingJournalView` draws profit/loss and return from the response;
`JournalTradeService` computes them from the price; a price chosen at create time (sent by the frontend, or looked up) is
persisted as `current_price`, `market_value`, `pnl` and `return_pct`; and when no live price is found on a later read, those
persisted values are shown as current. Nothing in the response says when the price is from or whether it was confirmed.
The dashboard's headline value is mostly computed in the frontend from market data, so its API fields matter less on screen;
`GET /prices/{symbol}/latest` has no production frontend caller.

## D-1. Shared vocabulary (this change)

1. A domain enum `PriceStatus` with `OK`, `STALE`, `FAILED`, `EMPTY` and a single mapping from the lookup origin
   (`FRESH`→`OK`; `STORED_REFRESH_FAILED` and `STORED_REFRESH_EMPTY`→`STALE`; `NONE_REFRESH_FAILED`→`FAILED`;
   `NONE_REFRESH_EMPTY`→`EMPTY`). The watchlist price section uses the same mapping, so the two cannot drift apart.
2. `priceAsOf` is the time of the candle of the price that was used (not the time of the request); `null` when no price.

Cost if wrong: a rename of two nullable additive fields.

## D-2. Trade journal (this change)

1. `JournalTrade` (the record serialized by `GET/POST/PUT /api/v1/journal/trades`) gains the nullable fields `priceAsOf`
   and `priceStatus`, appended after the existing ones. Every existing field keeps its name, type and meaning. A
   convenience constructor with the old signature keeps current callers working.
2. **Open trade, on read:** the service uses the lookup. `OK`: recompute from the fresh price (as today), `priceStatus=OK`,
   `priceAsOf` = the candle time. `STALE` (a stored price after a failed or empty refresh): recompute from that stored price
   (it is a real recorded price with its own time), `priceStatus=STALE`, `priceAsOf` = the candle time.
3. **Open trade with no price at all** (`FAILED` or `EMPTY` lookup): the persisted `current_price`, `market_value`, `pnl` and
   `return_pct` are still returned unchanged (they are existing fields), but `priceStatus=STALE` and `priceAsOf` = the
   trade's `updatedAt` (the last time the row, and therefore the persisted price, was written; documented as approximate).
   They are never reported as `OK`. If the trade has no persisted price either, `priceStatus` is the lookup's status
   (`FAILED` or `EMPTY`) and `priceAsOf` is `null`.
4. **Closed trades:** both new fields are `null`; their stored values are final and are not relabelled.
5. **Create and update:** unchanged. A price supplied by the request is used as given; otherwise an open trade takes the
   lookup's price. No new column or migration: the status is derived on read for open trades, which are recomputed on every
   read anyway.
6. **Stats:** `GET /journal/trades/stats` keeps its shape and uses the same enriched trades. Open trades whose status is not
   `OK` still count in its aggregates; this is recorded as a known limit rather than changing the aggregate contract here.

Cost if wrong: a stale open trade still shows its numbers; the new fields tell the client how to label them.

## D-3. Frontend (journal)

The trade table keeps its columns. A row whose `priceStatus` is not `OK` shows a visible "Eski fiyat" pill with the price
time (`priceAsOf`) next to the profit/loss, and a `null`/unknown status shows nothing extra (older cached responses). A
price status of `FAILED` or `EMPTY` shows "Fiyat yok". The pill is not an investment signal and the numbers are never
recoloured or recomputed in the browser. A missing value stays `—`.

## D-4. Later changes (decided now, not built now)

1. **Portfolio dashboard:** `PositionValuation`, `EnrichedPosition` and `PortfolioPositionPerformance` gain nullable
   `priceAsOf` and `priceStatus`; `PortfolioSummary` gains `pricingStatus` (the worst of its positions: `FAILED` > `STALE` >
   `EMPTY` > `OK`). `pricingComplete` keeps its meaning. History-only endpoints are not changed. Shared fixtures and the
   frontend schemas change in the same pull request.
2. **Latest-price endpoint:** `PriceResponseDto` gains `priceAsOf` and `priceStatus`; only `OK` answers are cached in
   `latestPriceCache`, so a stale answer is not remembered for its 30 seconds.

## Implementation rulings

Rulings made while coding are appended below as `R-n`.

- **R-1. `POST` and `PUT` responses carry `priceAsOf` and `priceStatus` as `null`.** Why: the saved trade is returned as
  written, not enriched (D-2.5 leaves create and update unchanged); the next list read enriches it, so the label appears
  then. A `null` means unknown and the frontend shows nothing for it. Cost if wrong: a just-created trade shows no label
  until the next read.
- **R-2. `priceAsOf` for a persisted price is the trade's `updatedAt` converted with the JVM default time zone.** Why:
  Hibernate fills `updatedAt` (a local date-time) from the same JVM clock and zone, so the conversion round-trips on one
  server; no `hibernate.jdbc.time_zone` or `user.timezone` setting exists. A trade with no `updatedAt` gets a `null` time.
  If the server zone is changed after rows were written, the time shifts. The value is documented as approximate. Cost if
  wrong: a displaced time on the "Eski fiyat" pill for such rows.
- **R-3. Known limits accepted after review.** (1) Stale open trades still count in the journal statistics. (2) The adapter
  read path has no dedicated test (`JournalTradeRepositoryAdapterTest` matched no test class); the convenience constructor
  covers it by construction. (3) Tests build `JournalTrade` with 25 positional arguments, which is brittle if the record
  grows again. (4) The frontend duplicates the 10-line time formatter of the watchlist screen. Cost if wrong: small
  maintenance debts, no behavior.
