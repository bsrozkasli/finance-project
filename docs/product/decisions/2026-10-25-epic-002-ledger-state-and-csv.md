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
- **R-2. `PortfolioStateService` also takes `PortfolioPort`.** Why: `stateAt` needs the portfolio base currency (D-2
  item 2). Cost if wrong: one constructor argument.
- **R-3. "After today" for `asOf` uses the UTC date.** Why: it does not depend on the server time zone and matches the
  UTC timestamps stored for prices. Cost if wrong: near midnight, a user far from UTC gets `400` one day early or late.
- **R-4. The state hash excludes `voidedAt`, notes and timestamps.** Why: a stored state must still replay after one of
  its events is voided (D-1, D-3). Cost if wrong: none known; voiding stays visible through the active reads.
- **R-5. CSV duplicate detection uses `PortfolioTransactionPort.existsBySourceAndOriginLocator`, counting voided
  rows.** Why: D-1 item 4 keeps a voided event's locator reserved. Cost if wrong: a rename.
- **R-6. Restart replay tests must pass datasource settings with the highest precedence.**
  `SpringApplicationBuilder.properties(...)` sets default properties, so `application-test.yml`'s `jdbc:tc:` URL
  overrode them and both restart tests (Portfolio State in PR #70, research evidence already on `main` from #68) ran on
  a Testcontainers-JDBC database that disappears when the first context closes. They passed only when another Spring
  test kept that database open; run alone, the Portfolio State test failed. Decision: fix both in PR #70 by passing the
  settings as command-line arguments and asserting the context's datasource URL is the test container's. Cost if wrong:
  PR #70 touches one evidence test outside its topic.
- **R-7. `voidedAt` stays out of existing JSON through a Jackson mix-in in the adapter layer** (Task 1). Why: the domain
  record is serialized directly as the transaction response, D-1 forbids new fields there, and the domain must stay
  framework-free. Cost if wrong: an `ObjectMapper` created outside Spring Boot would expose `voidedAt`.
- **R-8. Exposure details not fixed by D-2** (Task 2, accepted by the controller). Why: each keeps the derivation
  deterministic and fail-closed. Cost if wrong: a new derivation version.
  1. The base currency is part of the `pstate-v2` hash header, so the same events under two base currencies never share
     a version.
  2. State positions are sorted by symbol (they were in ledger order), matching the hash order.
  3. Valuation inputs hold one entry per open position. A found price and date stay in the input even when the status is
     `CURRENCY_UNKNOWN` or `CURRENCY_MISMATCH`, so a replay shows what was found; the position's price, date and market
     value are null for every status except `PRICED` and `STALE_PRICE`.
  4. Currencies are trimmed and upper-cased before comparison; a blank price currency is treated as unknown.
  5. Replay from explicit inputs treats an open position without an input as all-null (`CURRENCY_UNKNOWN`), ignores
     inputs for symbols that are not open, and rejects duplicate inputs or an input dated after `asOf`.
  6. A position whose transaction currency is missing is `CURRENCY_MISMATCH`.
  7. The `pstate-v1` four-argument `project` is removed; it had no production caller.
- **R-9. Portfolio State persistence details not fixed by D-3** (Task 3). Why: each keeps replay exact or follows an
  existing pattern. Cost if wrong: small schema or API adjustments before any consumer exists.
  1. `base_currency` is `VARCHAR(3)` and stored `price_currency` is `VARCHAR(10)` (not `CHAR(3)`): `CHAR` pads values,
     which would change the replayed hash, and `assets.currency` is already `VARCHAR(10)`.
  2. Saving returns the stored row and whether it was created; `POST` maps that to `201` or `200`.
  3. A replay that cannot find one of its stored source events, or cannot re-project them, is a `409` mismatch.
  4. The unknown-portfolio `404` is checked in the controller before the service is called.
  5. A UTC `Clock` bean is added so the "after today" check (R-3) is testable with a fixed clock.
  6. State rows cascade with their portfolio, matching the existing portfolio-deletion cascade (D-1 "Not changed").
  7. `created_at` is set by the database.
  8. The response has no `baseCurrency` field, because D-3 lists the fields exactly; the base currency is stored and used
     for replay.
- **R-10. The CSV row identity also covers the portfolio and the user** (corrects D-4 item 3). Why: D-4 hashed only the
  row, but V8's `(source, origin_locator)` unique index spans every portfolio, so the same trade imported into a second
  portfolio would be reported `DUPLICATE` and refused. Reordering rows within one portfolio still yields the same
  identities. Cost if wrong: none known; no CSV data existed when this was decided.
- **R-11. `POST /portfolios/{portfolioId}/transactions` keeps accepting `source=CSV` without a locator.** Why: it is an
  existing contract and D-1 preserves existing routes; closing it needs its own OQ-5 disposition. Cost if wrong: events
  posted that way are not idempotent and can duplicate an imported row.
- **R-12. CSV parsing details not fixed by D-4** (Task 4). Why: each refuses ambiguous input rather than guessing.
  Cost if wrong: a stricter or looser parser, without effect on accepted ledger events.
  1. `rowNumber` counts non-blank data rows (a quoted field may span lines), from 1.
  2. A header without data rows, or a repeated header name, rejects the file.
  3. `trade_date`, `action`, `asset_type` and `currency` must be present in the row; otherwise the model would default
     them (today, `OTHER`, `USD`), which would invent data. Empty `symbol`, `quantity` and `price` are passed as absent
     so the model applies its per-action rules.
  4. A row with the wrong number of columns is `INVALID`; the rest of the file still stages.
  5. Values that cannot fit the ledger columns (symbol over 32 characters, notes over 1,000, numbers beyond
     `NUMERIC(24,8)` or `NUMERIC(24,10)` for the FX rate) make the row `INVALID` instead of failing at acceptance.
  6. Fields are trimmed and a leading UTF-8 byte-order mark is ignored. A quote inside an unquoted field is data. Text
     after a closing quote, an unterminated quote, or invalid UTF-8 rejects the file.
  7. The identity uses the values after model construction; `notes` are not part of it.
  8. An unknown batch, a batch of another portfolio, and an unknown portfolio all return `404`; a body that is not
     `text/csv` returns `415`.
  9. Acceptance checks the ledger for the identity before inserting, and still relies on the unique index for races.
  10. A staged row's link to its accepted event is cleared if that event's row disappears (only possible through
      portfolio deletion).
- **R-13. Ledger additions are serialized per portfolio.** Why: `PortfolioLedgerService.addTransaction` reads active
  events, validates (for example, no sell above the holding) and saves without a lock, so two concurrent additions to
  the same portfolio (two CSV batches, or a batch and a manual entry) can both pass and oversell a position. CSV
  acceptance makes that race likely. Decision: the check and the insert run under a per-portfolio lock provided through
  a port (the domain stays framework-free), for the manual and the CSV paths alike. Cost if wrong: additions to one
  portfolio wait for each other; additions to different portfolios do not.
- **R-14. An upload is rejected once it exceeds 1,048,576 bytes while being read**, not after the whole body is in
  memory. Why: D-4's size limit must also bound memory. Cost if wrong: none.
