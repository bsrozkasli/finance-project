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
- **R-15. Currencies are compared exactly, never case-folded** (corrects R-8.4). Why: Yahoo reports London stocks in
  `GBp` (pence). Upper-casing turned `GBp` into `GBP`, so a pence close would match a pound portfolio and be valued 100
  times too high; states are append-only, so a wrong state would be kept and keep passing replay. Decision: currency
  codes are only trimmed; `GBp`, `ZAc` and lower-case codes do not equal `GBP`, `ZAR`, and the position is
  `CURRENCY_MISMATCH`. The base and transaction currencies are already upper-cased by their models. No state existed
  outside development, so the derivation stays `pstate-v2`. Cost if wrong: a provider that returns a lower-case code
  for a major currency is reported as a mismatch (fail-closed) instead of valued.
- **R-16. Known limit: voiding is not validated against later events.** Voiding a BUY that a later SELL depends on makes
  `calculateHoldings` throw, so holdings and states return 400, manual additions 422 and every CSV row in that portfolio
  is `REJECTED`; the void also is not under the portfolio lock. Why not fixed now: validating the void changes the
  route's behavior and needs its own OQ-5 disposition (a new refusal status). Cost if wrong: a user can make a portfolio
  temporarily unusable by deleting an early BUY. Follow-up: validate after the void under the lock and make the
  journal delete and the void atomic. The sentence in `domain-and-data.md` that additions "cannot jointly oversell" is
  limited to additions.
- **R-17. Voiding is validated and serialized (closes R-16).** Why: voiding a BUY that a later SELL depends on made
  `calculateHoldings` throw, which left a portfolio unusable (holdings and states `400`, manual additions `422`, every CSV
  row `REJECTED`), and the void could race an addition. Decision (OQ-5 disposition: additive status on an existing
  route): `PortfolioLedgerService.voidTransaction` runs under the same per-portfolio lock as additions, replays the
  remaining active events, and refuses the void when that replay is invalid.
  1. `DELETE /portfolios/{portfolioId}/transactions/{transactionId}` keeps its path, `204` and `404`; it gains `409`
     with the standard error body and a message naming the symbol, when removing the event would leave the ledger
     invalid (for example a sell above the holding). No event is changed in that case.
  2. The linked journal delete runs inside the same lock transaction as the void, so both happen or neither does.
  3. Cost if wrong: a user cannot delete an early BUY until the later SELL is deleted first; that is the intended
     protection. Reverse: drop the check.
- **R-18. The ledger lock pins `READ COMMITTED`** and the code that locks is documented as depending on it. Why: the
  lock is only correct if a waiter sees the committed insert it waited for; under `REPEATABLE READ` it would not. Cost if
  wrong: none; this is the PostgreSQL default.
- **R-19. New code upper-cases with `Locale.ROOT`.** Why: `toUpperCase()` without a locale turns `i` into `İ` on a Turkish
  JVM, which would change symbols, currencies and CSV identities. Scope: the code added by this PR (CSV parser/service,
  state service); the same pattern elsewhere in the codebase is out of scope and noted as a follow-up. Cost if wrong:
  none.
- **R-20. `POST /portfolios/{portfolioId}/transactions` refuses `source=CSV` (closes R-11).** Why: CSV events must carry a
  `csv:` identity so a re-import is idempotent; the manual route cannot produce one. The frontend only displays `CSV`
  and never sends it, and no other consumer is visible in the repository. Decision (OQ-5 disposition: preserve path,
  method and DTO fields; one value of `source` is refused): `source=CSV` on this route returns `422` with the standard
  error body ("CSV transactions are created only through imports"); `MANUAL` and an omitted `source` behave as before.
  Cost if wrong: an external client that posted `source=CSV` now gets `422`; reverse by removing the check.
- **R-21. CSV acceptance performance target and approach.** Why: acceptance re-reads and re-validates every active event
  for each row (O(n²)), and was never measured at the 5,000-row limit. Decision: first measure a 5,000-row valid
  acceptance on real PostgreSQL and record the number. Target: at most 30 seconds on a developer machine. If the
  measurement misses the target, change acceptance to validate incrementally (hold the portfolio lock for a bounded chunk
  of rows, keep a running position state inside the chunk) while keeping every R-12 outcome, the per-row `ACCEPTED` /
  `DUPLICATE` / `REJECTED` results and the resumability. Cost if wrong: a larger transaction per chunk; chunk size is a
  constant that can be tuned.
- **R-22. The V12 in-place edit needs no local action.** Verified 2026-10-25: the local development database is at
  schema version 8, so the first V12 was never applied there. Anyone who applied the first V12 from an earlier push of
  this branch must drop the V12 tables and the V12 `flyway_schema_history` row; the branch was pushed only after that
  edit's successor commits, so no shared environment is known to have it.
- **R-23. Restore exercise is evidence, not a target.** Why: OQ-8 (recovery objectives, encryption, retention) is owned by
  the operations/security lead and is not delegated. Decision: add a repeatable restore proof (dump a PostgreSQL
  container holding ledger, voided events, states and import batches, restore into a fresh container, replay every stored
  state and compare versions) and document that it proves logical recoverability only. It sets no RPO/RTO, encryption or
  retention requirement; Task 3 acceptance stays open until OQ-8 records those. Cost if wrong: none.
- **R-24. Back-dated CSV rows must not fall back to a double replay per row.** Why: the chunked acceptance (R-21) is fast
  only for rows dated on or after the ledger's latest event; a historical file imported into a portfolio that already has
  newer events took the slow path for every row (two full replays per row), which can be slower than the original
  algorithm. Decision: for a back-dated row, validate by seeding positions as of the row's date, applying the row, then
  replaying only the later events, and update the chunk's running state without a second full re-seed. The target for a
  5,000-row back-dated file into a portfolio holding newer events is the same as R-21's append case, relaxed to 60
  seconds; the measured value is recorded. A randomized differential test compares the chunked outcome (statuses, cost
  basis, realized PnL) with the sequential `addTransaction` result. Cost if wrong: more code in the ledger service.
- **R-25. The 5,000-row timing test is opt-in.** Why: it is timing-based and adds about a minute to the CI suite. Decision:
  it runs only with `-Dcsv.perf=true` (JUnit `@EnabledIfSystemProperty`); correctness coverage stays in the default
  unit and Testcontainers tests, and a 1,000-row case with a generous bound stays in the default run. The measured numbers
  stay in the specification. Cost if wrong: a performance regression is caught only when the opt-in run is used.
- **R-18 addendum.** `PortfolioPositionController.addPosition` is `@Transactional`, so its ledger addition joins that outer
  transaction and the lock template's `READ COMMITTED` setting is not applied there. PostgreSQL's default isolation is
  also `READ COMMITTED` and the application does not change it, so the lock stays correct; a change of the default would
  need this path revisited.
- **R-26. Frontend handoff scope for the new EPIC-002 routes.** Decision: the frontend gets (1) a CSV import panel in the
  portfolio screen: choose a `.csv` file, show the staged batch (counts and a row table with status, message and
  identity), and an explicit accept button; (2) a Portfolio State panel: pick an as-of date (not in the future), create
  a state, and show its version, exposure status, positions with their valuation status, and the asset-type weights;
  (3) the transaction delete flow shows the backend's `409` message instead of a generic error. Rules: all calls go
  through the Spring API modules in `frontend/src/api` (never the data-service); the UI is Turkish like the rest of the
  screen; a weight, price or market value that is `null` is shown as "bilinmiyor", never as 0, and weights are shown
  only when the exposure status is `COMPLETE`; the state version is shown but is not an investment signal; response
  shapes are pinned by shared contract fixtures in `docs/contracts/fixtures/` with the backend `ContractFixtures` test
  and the frontend `contract.test.ts` schema in the same change. Out of scope: the integrated E2E against a live
  backend (not run locally, CI runs it), downloads/exports, and any use of a state version inside Fit or decisions.
  Cost if wrong: UI copy and layout adjustments only; no backend contract changes.
- **R-27. Unknown values render as `—` with an accessible label; the new panels are code-split** (corrects R-26).
  1. `docs/spec/current-system/architecture.md` already requires unknown financial values to render as `—`, never as 0.
     The specification outranks a decision record, so R-26's visible text "bilinmiyor" is replaced by `—`; the cell keeps
     the words "bilinmiyor" in its accessible name and tooltip so the meaning is not lost for assistive technology. The
     rule that a `null` is never shown as 0 and that weights appear only when the exposure status is `COMPLETE` is
     unchanged. Cost if wrong: copy only.
  2. The bundle budget (`check:bundle`, 700 KiB) had no headroom after the new panels. Decision: do not raise the budget;
     load the CSV import and Portfolio State panels lazily so they leave the main bundle. Cost if wrong: one extra
     request when a user opens those panels.
- **R-28. Test sensitivity is shown by mutation, not assumed.** The frontend panel tests and the backend fixture-shape
  tests were written without a recorded red run. Decision: for each rule that matters (null is not rendered as 0,
  weights hidden unless `COMPLETE`, future date blocked, upload sends the file body, fixture shape drift is detected),
  temporarily break the rule and confirm a test fails, then restore it. Cost if wrong: none.
- **R-29. The bundle budget rises from 700 KiB to 710 KiB, and the import hint is restored** (corrects R-27.2). Why: R-27.2
  assumed that lazy loading would take the new panels out of the budget, but `check:bundle` sums every chunk, so
  lazy loading only moved bytes (it added about 1.4 KiB). To stay under 700 KiB the implementer removed panel copy,
  including the hint that a staged import does not change the ledger until "Kabul et" is pressed. That hint prevents a
  user from believing an upload already changed their portfolio, so it is more important than the 10 KiB headroom.
  Decision: keep the lazy loading (the main page still loads less on first paint), restore the removed hint and the
  count tiles that carry meaning, and raise the budget by 10 KiB in the same change, recorded here. Cost if wrong: a
  slightly larger download; the budget remains a guard, and the next frontend change must again justify its size.
- **R-30. The backup/restore proof becomes opt-in, and the default CSV performance case shrinks** (corrects R-23's gating).
  Why: the single reused Surefire fork has a 120-second limit for the whole suite (`forkedProcessTimeoutInSeconds`), and
  the last green CI run spent about 73 seconds in the test phase; the restore proof (about 55 s) and the default
  1,000-row case (about 54 s for its class) were judged by class time, not against the suite budget, and together would
  probably break it. Decision: `PortfolioBackupRestoreTest` runs only with `-Dbackup.restore=true`; the default
  back-dated case drops to 300 rows with a generous bound; both opt-in commands are documented, and the documented
  opt-in runs say they take longer than the 120-second fork limit and must be run with the fork timeout lifted for
  that run (the pom hard-codes it, so the command line cannot lift it; they are run from a short-lived local copy of
  the configuration or in the background where Maven reports the timeout after the tests pass). The pull request's
  CI run is the evidence that the default suite fits. No CI workflow is edited here; adding a nightly step for the
  opt-in tests is a follow-up. Cost if wrong: the restore proof is no longer run on every build.
- **R-31. A CSV acceptance must refresh the portfolio screen's holdings.** Why: after an accepted import the positions
  table kept the quantities of the previous ledger until a reload, because only manual add and delete refreshed the
  application-level holdings. Decision: the import panel signals `onLedgerChanged` after a successful accept and the
  portfolio screen runs the same reloads as manual add and delete (investment portfolio and journal trades). Cost if
  wrong: one extra request after an accept.
- **R-32. Documentation corrections from the second final review.** (1) R-24 said a back-dated row replays "only the
  later events"; the code replays the row's own symbol (all of that symbol's events), which is financially equivalent
  because positions are independent per symbol; the ruling is read as the code does. A single-symbol 5,000-row
  back-dated file therefore costs more in memory than the 50-symbol measurement shows, and that case is recorded as
  unmeasured. (2) Measured figures are quoted once, with their conditions, in `domain-and-data.md`, and other notes link
  to it instead of restating them. (3) The frontend request type narrows `source` to `MANUAL` to match R-20.
  Cost if wrong: none.
