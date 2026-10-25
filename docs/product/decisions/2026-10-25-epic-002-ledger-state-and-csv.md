# Decisions: ledger immutability, exposures, Portfolio State persistence, CSV import

**Recorded:** 2026-10-25

**Decision input:** On 2026-10-25 the product owner delegated these decisions to the implementing agent and asked
that every decision be recorded: "kararları sen al ve bunları not al her karar not alınmalı". This extends the
2026-10-22 delegation of the Backend/Architecture Lead decisions (OQ-5). The agent does not take legal or licensing
decisions (OQ-1, OQ-2) under this delegation; nothing below grants external display or redistribution rights.

**Scope:** EPIC-002 (Transaction Ledger and Portfolio State) Tasks 2 and 3 (`PRD-FR-011`–`015`), building on the Portfolio State derivation in PR #70.
**State:** Accepted 2026-10-25. Implementation rulings made while coding are appended under
[Implementation rulings](#implementation-rulings).

Each decision states what it costs if wrong and how to reverse it.

## D-1. Ledger events are voided, never deleted

**Problem:** `DELETE /portfolios/{portfolioId}/transactions/{transactionId}` physically deletes the row, so a Portfolio
State version that cited it can no longer be reproduced (`PRD-FR-014`, `PRD-FR-015`).

**Decision:**
1. A new migration adds `portfolio_transactions.voided_at` (nullable timestamp with time zone). Deleting through the
   route sets `voided_at`; the row stays.
2. **Preserve:** the route path, method, `204` response and `404` for an unknown or already voided transaction. The
   linked journal record is still deleted, as today; the journal is not part of ledger replay.
3. Every current read (`GET .../transactions`, `GET .../holdings`, dashboard, news, management checks) excludes voided
   events, so no consumer sees a change. `PortfolioTransactionPort.findByPortfolioIdAndUserId` keeps its name and
   returns only active events. A new port method reads events by id including voided ones, for replay.
4. A voided event's `(source, origin_locator)` stays reserved: re-importing the same CSV row reports it as a duplicate
   instead of recreating it.
5. The domain has no physical delete of a single ledger event any more; the port method is removed.

**Not changed:** deleting a whole portfolio still cascades (`ON DELETE CASCADE`) and is still refused while active
holdings exist. That remains a known limit on replay.

**Cost if wrong:** a later need for true erasure (for example a privacy request) needs an explicit purge path.
**Reverse:** stop setting `voided_at` and restore the delete; voided rows are identifiable by `voided_at IS NOT NULL`.

## D-2. Exposure method v1

**Problem:** PRD defines Portfolio State as holdings, cost basis, realized activity and exposures, but no exposure
formula exists, and the repository has no valuation FX data.

**Decision:** exposures are computed only from retained real prices, and fail closed otherwise.
1. **Price:** for each open position, the latest stored close (`PriceRepositoryPort`) whose timestamp date is on or
   before the state's `asOf`. Nothing is fetched from providers while deriving a state.
2. **Currency:** the price currency is the stored `Asset.currency` for the symbol. A position is valued only when that
   currency, the position's transaction currency and the portfolio base currency are all equal. No FX conversion is
   invented.
3. **Per-position status:** `PRICED` (price at most 7 calendar days older than `asOf`), `STALE_PRICE` (older; value
   shown but flagged), `NO_PRICE`, `CURRENCY_UNKNOWN` (no asset or no currency), `CURRENCY_MISMATCH`. Market value is
   `quantity × close` and exists only for `PRICED` and `STALE_PRICE`.
4. **Weights:** each priced position's weight is its market value over the sum of all open positions' market values,
   and per-asset-type weights sum those. Weights are computed only when every open position is `PRICED`; otherwise
   the state's exposure status is `PARTIAL` and every weight is absent. A `STALE_PRICE` position also makes it
   `PARTIAL`. With no open positions the status is `EMPTY`.
5. **Rounding:** market values keep full `BigDecimal` precision; weights are divided at 10 decimal places, `HALF_UP`.
6. **Version:** the valuation inputs (symbol, close, price date, price currency, status) are part of the state, so the
   derivation becomes `pstate-v2` and its hash covers them. A replayed state uses its stored inputs, not today's prices.

**Cost if wrong:** the 7-day window and the all-or-nothing weights are policy choices; a different window or partial
weights change states and versions (a new derivation version, never a rewrite of stored states).
**Reverse:** a new derivation version with a new method; stored `pstate-v2` states still replay.

## D-3. Portfolio State persistence and routes (OQ-5 disposition: additive)

**Decision:**
1. A new migration adds append-only tables for states (version, portfolio, user, as-of date, exposure status,
   created time), their source event ids, and their valuation inputs. `(portfolio_id, version)` is unique; saving an
   existing version returns the stored one (idempotent), and nothing is ever updated or deleted.
2. **New routes, additive:**
   - `POST /api/v1/portfolios/{portfolioId}/states` with body `{"asOf": "YYYY-MM-DD"}` derives the state from active
     events and current stored prices, persists it, and returns it: `201` when new, `200` when that version already
     existed. `asOf` after today returns `400`. Unknown portfolio returns `404`.
   - `GET /api/v1/portfolios/{portfolioId}/states/{version}` replays a stored state from its stored event ids
     (including events voided since) and stored valuation inputs, checks that the replayed hash equals the stored
     version, and returns it. Unknown version returns `404`. A hash mismatch returns `409` with the standard error
     body; it means the ledger changed in a way D-1 should prevent.
3. **Response fields:** `version`, `portfolioId`, `asOf`, `exposureStatus`, `sourceEventIds`, and `positions[]` with
   `symbol`, `assetType`, `quantity`, `averageCost`, `costBasis`, `realizedPnl`, `currency`, `valuationStatus`,
   `price`, `priceDate`, `marketValue`, `weight`; plus `assetTypeWeights` (object, empty when `PARTIAL`). Absent values
   are JSON `null`, never zero.
4. No existing route or DTO changes. The frontend has no consumer yet; that is a later handoff.

**Cost if wrong:** additive routes can be versioned or retired without touching existing consumers.
**Reverse:** remove the routes; the tables are additive and can be dropped by a later migration.

## D-4. CSV import schema v1, staging and idempotency

**Decision:**
1. **Format:** UTF-8, comma-separated, first row is the header, decimal point `.`, dates `yyyy-MM-dd`, at most 1 MB and
   5,000 data rows. Header names, case-insensitive, in any order: `trade_date`, `action`, `symbol`, `asset_type`,
   `quantity`, `price`, `currency`, `fee`, `fx_rate_to_base`; optional `notes`. Unknown or missing required headers
   reject the whole file with `400`.
2. **Row validation:** values follow the existing `PortfolioTransaction` rules; nothing is defaulted from the file
   except what the model already defaults. Empty `fee` is `0` and empty `fx_rate_to_base` is `1`, as the manual form
   does. A row that fails is `INVALID` with a message and stays staged.
3. **Row identity:** `origin_locator = "csv:" + sha256(normalized row)`, where the normalized row is the canonical
   values of the nine economic columns (numbers without trailing zeros, upper-case codes). The n-th identical row in a
   file gets `#n` appended (n ≥ 2). The same rows in any order therefore produce the same identities.
4. **Staging:** a new migration adds import batches (portfolio, user, file SHA-256, created time, status) and rows
   (row number, raw line, parsed values, locator, status, message). Statuses: `VALID`, `INVALID`, `DUPLICATE` (locator
   already in the ledger, including a voided event), `ACCEPTED`, `REJECTED` (valid as a row but refused by the ledger,
   such as a sell above the holding).
5. **Acceptance:** accepting a batch inserts its `VALID` rows as `source=CSV` events in trade-date then row-number
   order through `PortfolioLedgerService`. The `(source, origin_locator)` unique constraint makes concurrent or
   repeated acceptance create one event per identity; a constraint conflict marks the row `DUPLICATE`. Accepting an
   accepted batch again changes nothing and returns the same result. Invalid rows never enter the ledger.
6. **Routes, additive:** `POST /api/v1/portfolios/{portfolioId}/imports` (`Content-Type: text/csv`, body is the file)
   returns the staged batch with row statuses (`201`); `GET .../imports/{batchId}` returns it;
   `POST .../imports/{batchId}/accept` accepts it and returns the batch with final row statuses (`200`).
7. Frontend upload UI is a later handoff.

**Cost if wrong:** schema v1 is strict; a broker export format needs a mapping step or a v2 schema.
**Reverse:** routes and tables are additive; accepted events are ordinary voidable ledger events.

## D-5. Order and delivery

Implemented in this order, each with tests first: D-1, D-2 (domain), D-3, D-4. Each step updates
`docs/spec/current-system/*.md`. Coding is done by Sonnet subagents, reviewed per task and as a whole branch. All of
it is stacked on PR #70.

## D-6. Out of this delegation

OQ-1 and OQ-2 (legal and data rights), OQ-3 (stock/ETF evidence policy) and OQ-8 (backup/restore targets) are not
decided here. Backup/restore of these tables is therefore unproven; EPIC-002 Task 3 acceptance still needs OQ-8.

## Implementation rulings

Rulings made during implementation are appended here as `R-n` with the decision, why, and what it costs if wrong.

- **R-1 (2026-10-25). Migration numbers V10, V11, V12; V9 stays reserved for PR #68.** Why: #68 already ships V9 and
  is not merged; Flyway `out-of-order` is enabled in both the application and test profiles, so either PR can merge
  first. Cost if wrong: if `out-of-order` were disabled in an environment, the later-merged V9 would fail validation
  there; the fix is enabling it or renumbering before that environment migrates.
