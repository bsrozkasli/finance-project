# Current-System Domain and Data Contract

**Status:** Verified brownfield baseline

**Last verified:** 2026-10-01

This document owns domain invariants, financial-calculation boundaries,
persistence semantics, and relational data ownership.

## Domain Boundary

Domain models and services are pure Java. Constructors/record compact
constructors enforce invariants before adapters persist or expose an object.
Infrastructure is accessed through outbound ports; controllers do not replace
ports with in-memory state.

## Core Invariants

### Assets

- `Asset.symbol` is required, non-blank, trimmed, and normalized to uppercase.
- `name`, `type`, and `metadataStatus` are required.
- `providerSymbol` defaults to the canonical symbol and is normalized.
- Metadata state is explicit: `VERIFIED`, `PARTIAL`, or `UNAVAILABLE` according
  to provider/mapping evidence. Missing evidence is not fabricated.
- The internal instrument-eligibility domain rule returns current provider
  observations with their source and retrieval time for research, but a
  `CURRENT_OBSERVATION` never proves point-in-time stock/ETF eligibility.
  Only a point-in-time master classification can pass that gate; no master
  adapter or public eligibility consumer is wired yet.
- The internal `ResearchEvidenceService` records immutable evidence revisions
  from caller-supplied fields, bound to the `InstrumentIdentity` they were
  captured for, and retains them append-only through `ResearchEvidencePort`
  (V9). A field has a raw value or a typed missing reason, never both, plus
  source, retrieval time and freshness; present values also require
  observation time, which cannot follow retrieval. A field name may repeat for
  different periods or sources. Revisions receive a new UUID and retain the
  previous ID; only the latest revision of a symbol can be revised. No
  provider fetch, public endpoint, quality grade, or external-use permission
  is attached to this research model.

### Price history

- Symbol, OHLCV values, and timestamp are required.
- High must be greater than or equal to low.
- Open, high, low, close, and volume cannot be negative.
- The relational uniqueness boundary is `(asset_id, price_timestamp)` in
  `price_history`.
- Provider rows whose symbol does not match the requested symbol are rejected
  before persistence.

### Portfolio transactions and holdings

- A transaction requires a portfolio and action. Missing values default to
  `assetType=OTHER`, `currency=USD`, `fee=0`, `fxRateToBase=1`,
  `tradeDate=today`, `source=MANUAL`, and `userId=default`. Quantity and price
  default to zero only for actions that do not require them; required null values
  are rejected before a default can apply.
- Currency is trimmed, uppercased, and checked only for a three-character length;
  the current model does not validate membership in the ISO 4217 code set.
- Fee must be non-negative and the FX rate must be positive after defaults apply.
- BUY, SELL, and MANUAL_VALUATION require positive quantity. BUY, SELL, and
  MANUAL_VALUATION require a non-negative price.
- Symbol is required for BUY, SELL, DIVIDEND, and MANUAL_VALUATION.
- BUY increases quantity and base-currency cost basis including fees.
- SELL cannot exceed the current holding. It removes average cost, subtracts
  fees from proceeds, and records realized PnL.
- A fully sold holding is removed from the derived positive-holdings view and
  its cost basis becomes zero; historical transactions remain the ledger.
- DIVIDEND and FEE actions affect realized PnL without fabricating a holding.
  A FEE without a symbol (allowed, since FEE does not require one) reaches no
  position and therefore no realized PnL; portfolio-level cash is not modelled.
- A MANUAL transaction gets an `origin_locator` of `manual:<UUID>` once, at
  creation; persistence never rewrites it (`updatable=false`). V8 gives existing
  manual rows `manual:legacy:<row-id>`, which names only their known persisted
  origin. A database check requires a `manual:` locator for MANUAL rows, and
  `(source, origin_locator)` is unique. Every CSV event created by the CSV import
  (V12) carries a `csv:<sha256 hex>` locator, with `#<n>` appended for the n-th
  identical row of a file (n >= 2); the hash covers the portfolio id, the user id and the nine economic columns
  (R-10), so it is independent of row order and of the notes but differs per
  portfolio. A `source=CSV` event posted through
  the manual transaction route has no import lineage and may still have a `NULL`
  locator.
- A ledger event is never physically deleted. `DELETE .../transactions/{id}` sets
  the nullable `voided_at` once; the row, its id and its `(source, origin_locator)`
  stay (the locator remains reserved). `findByPortfolioIdAndUserId`,
  `findByIdAndPortfolioIdAndUserId`, holdings and `PortfolioStateService.stateAt`
  see only events with `voided_at IS NULL`; `findByIdsIncludingVoided` returns
  events active or voided for replaying stored states. `voidedAt` is not exposed
  in route responses and is not part of the state version.
  `PortfolioLedgerService.voidTransaction` (R-17) runs under the same
  `PortfolioLedgerLockPort.withPortfolioLock` as additions: it reads the active
  events, replays the remaining ones (without the target), and throws
  `LedgerInconsistencyException` (route `409`) when that replay is invalid, changing
  nothing; an id that is not active throws `NoSuchElementException` (route `404`).
  Otherwise the same-transaction work (the linked journal delete) runs and then the
  event is voided, in one transaction. The lock transaction is pinned to
  `READ COMMITTED` (R-18) because a waiter must see the committed insert or void it
  waited for; do not change that isolation level.
  `PortfolioPositionController.addPosition` is `@Transactional`, so its ledger
  addition joins that outer transaction and the template's `READ COMMITTED` setting
  is not applied there; PostgreSQL's default is also `READ COMMITTED` and the
  application does not change it, so the lock stays correct, but a change of the
  default would need that path revisited (R-18 addendum).
- The internal `PortfolioStateService` derives a `PortfolioState` from accepted
  ledger events (each has an id and belongs to the requested portfolio and
  user) traded on or before an as-of date. It lists every traded symbol,
  including positions closed back to zero (`CLOSED`, never valued), with
  quantity, cost basis and realized PnL, plus the source event ids, the
  portfolio base currency, an `exposureStatus` and the `valuationInputs` used.
  Exposures (decision D-2) use only retained prices: the latest stored close on
  or before the as-of date, with the stored `Asset.currency` as price currency;
  nothing is fetched from providers. An open position is valued only when the
  price, position and base currencies are equal (no FX conversion). Currencies
  are compared exactly (R-15): the price currency is only trimmed, never
  case-folded, so a provider's `GBp` or `ZAc` (pence, cents) or a lower-case code
  is a `CURRENCY_MISMATCH` against `GBP`, `ZAR` or `USD`, and the stored valuation
  input keeps the provider's exact case. State responses write decimals without
  trailing zeros or exponent notation, so create and replay bodies match. Its status,
  checked in this order, is `CURRENCY_UNKNOWN` (no asset or blank currency),
  `CURRENCY_MISMATCH`, `NO_PRICE`, `STALE_PRICE` (close older than 7 calendar
  days; exactly 7 is current) or `PRICED`. Market value is quantity x close for
  `PRICED` and `STALE_PRICE` only. Weights exist only when every open position
  is `PRICED` (`COMPLETE`): market value over the total, and per
  `PortfolioAssetType` sums, divided at 10 decimals `HALF_UP`. Any other open
  status (or a zero total) gives `PARTIAL` with every weight null and an empty
  `assetTypeWeights`; no open positions gives `EMPTY`. The version is
  `pstate-v2:` and a SHA-256 over the portfolio, user, as-of date, base
  currency, each event's economic and lineage fields in id order and, per
  position in symbol order, its valuation status, close, price date and price
  currency (numbers without trailing zeros); notes, timestamps and `voidedAt`
  are excluded. `project` with explicit `ValuationInput`s and a base currency
  reproduces a state without reading prices; the price-port path builds those
  inputs and delegates to it. `stateAt` reads the base currency through
  `PortfolioPort`. Because transactions are voided and never deleted, and
  `findByIdsIncludingVoided` returns voided events, a version stays
  reproducible from its stored event ids and valuation inputs after a later void.
- CSV imports are staged in two tables (V12) behind `PortfolioCsvImportPort`:
  `portfolio_csv_imports` (portfolio, user, file SHA-256, status `STAGED` or
  `ACCEPTED`, created and accepted times; cascade with the portfolio) and
  `portfolio_csv_import_rows` (batch, row number, raw line, nullable locator, status
  `VALID`, `INVALID`, `DUPLICATE`, `ACCEPTED` or `REJECTED`, message, the parsed
  values as columns, nullable accepted transaction id; unique `(batch_id,
  row_number)`). Staging marks a row `DUPLICATE` when
  `PortfolioTransactionPort.existsBySourceAndOriginLocator` finds its locator in the
  ledger, voided events included. Acceptance runs `PortfolioCsvImportService.accept`
  without an outer transaction: the `VALID` rows, in trade-date then row-number
  order, are accepted in chunks of 200 (R-21, `ACCEPT_CHUNK_SIZE`). A chunk runs
  `PortfolioLedgerService.inLedgerChunk` under the portfolio lock: the active ledger is
  read once, each row is validated by `LedgerChunk.add` against running positions
  (the same `applyTransaction` rules as `addTransaction`), and the chunk's ledger
  inserts and row outcomes commit together; a chunk that fails rolls back whole and
  its rows stay `VALID`. Positions are independent per symbol, so the view keeps each
  symbol's events in replay order. A row dated on or after its symbol's latest event is
  applied to the running position; a back-dated row (R-24) replays only that symbol's
  events with the new row in its place, with the same `applyTransaction` rules, and the
  replayed position replaces the running one (no second full re-seed). A randomized
  differential test (`PortfolioLedgerChunkDifferentialTest`, fixed seed, 300 sequences
  of BUY/SELL/DIVIDEND/FEE incl. back-dated, same-date and oversell attempts) checks the
  accept/reject decisions and final quantity, cost basis and realized PnL equal
  sequential `addTransaction`. Rows whose locator already exists are settled after the
  chunk commits. Measured on real PostgreSQL (developer machine, 5,000 valid rows
  alternating BUY/SELL over 50 symbols, `PortfolioCsvImportPerformanceTest`): appended
  rows accept 191 s with the original per-row replay, 23.5 s chunked (a later run on a
  busier machine gave 31.2 s; target 30 s); a back-dated historical file into a
  portfolio already holding 50 newer events accepts in 46.8 s with the first chunked
  version (full replay twice per row) and 27.2 s with the per-symbol replay (target
  60 s); staging 16-23 s. The 5,000-row cases are opt-in: `.\mvnw.cmd
  "-Dtest=PortfolioCsvImportPerformanceTest" "-Dcsv.perf=true" test` from `backend\`
  (several minutes; run it outside a 120 s limit); a 1,000-row back-dated case with a
  60 s bound runs by default. Every ledger
  addition (manual and CSV) runs its read, validation and save inside
  `PortfolioLedgerLockPort.withPortfolioLock` (R-13): one transaction that first
  locks the portfolio row (`SELECT ... FOR UPDATE`), so additions to one portfolio
  are serialized, and so are voids (below), so concurrent additions and voids cannot
  jointly oversell or leave an unreplayable ledger. Under that lock a CSV event whose
  locator already exists throws `DuplicateOriginLocatorException`. A ledger
  `IllegalArgumentException` marks the row `REJECTED`. When the locator already
  exists, the service looks up the active event: if there is one in this portfolio
  and no other row has recorded it, the row is recorded `ACCEPTED` with that event's
  id (this repairs an interrupted accept and a concurrent accept of the same batch;
  `portfolio_csv_import_rows.transaction_id` is unique, so a claim is exclusive);
  if another row owns it, or only a voided event exists, the row is `DUPLICATE`. A
  row outcome is written only while the row is still `VALID`, and a refused write is
  re-read rather than assumed. Accepting an `ACCEPTED` batch returns it unchanged,
  and an interrupted acceptance leaves a `STAGED` batch that resumes. `INVALID`
  rows never reach the ledger.
- Portfolio States are persisted append-only through `PortfolioStatePort`
  (V11): `portfolio_states` (version, portfolio, user, as-of date, base
  currency, exposure status, created time; unique `(portfolio_id, version)`,
  cascade with the portfolio), `portfolio_state_events` (state id, transaction
  id; no foreign key to transactions so voided events stay referenced) and
  `portfolio_state_valuations` (symbol, nullable close, price date and price
  currency). `saveIfAbsent` inserts with `ON CONFLICT DO NOTHING` and returns the
  stored row and whether it was created; nothing is updated or deleted.
  `PortfolioStateService.create` derives a state with `stateAt` and stores it;
  `replay` loads the stored row, reads its events with `findByIdsIncludingVoided`,
  re-projects with the stored inputs and base currency, and compares the
  replayed version string with the stored one (never record equality, because a
  database round-trip changes numeric scale). A missing event or a different
  version throws `PortfolioStateMismatchException` (`409`).
- Journal records may link to a portfolio/transaction, but journal decision
  history is not implicitly deleted when a position is sold.

### Journal and watchlists

- Journal trades persist through `JournalTradePort`; controllers do not keep
  authoritative journal state in memory.
- A journal trade's `purchasePrice` is historical transaction evidence. An
  unavailable current market price remains `null`; the domain never substitutes
  purchase price for `currentPrice`, `marketValue`, `pnl`, or `returnPct`.
- Open trades may be enriched at read time with one fresh provider price per
  symbol. If refresh fails or returns no evidence, the trade remains present with
  nullable price-derived values. Journal statistics exclude unpriced trades from
  return aggregates and expose `null` when no priced trade supports the result.
- Watchlists persist through `WatchlistPort`; ordered normalized symbols survive
  restart through `watchlist_symbols`.
- Research snapshot requests default to `limit=25`, cap at `limit=50`, require
  non-negative offset, and may filter comma-separated viewport symbols.
- Partial research keeps successful sections and exposes per-section evidence
  status rather than turning the whole row into invented or misleading data.

### Technical, valuation, and research metrics

- Technical analysis requires at least 30 candles. Fewer candles produce an
  explicit 422 response through the route layer.
- Indicators with longer lookbacks remain nullable until sufficient history
  exists; `sma200` is not fabricated from a shorter series.
- Quantitative calculations are deterministic for identical inputs and belong
  in domain/data-service analytics, not controllers or LLM prompts.
- PEG is a current nullable valuation metric. `ValuationService` reads provider
  `pegRatio`, scores it only when present, and leaves PEG `null` when evidence is
  missing. PEG complements rather than replaces earnings quality, leverage, cash
  flow, risk, and other growth evidence.
- The current aggregate valuation algorithm returns `FAIR` when every ratio is
  absent. That default is a known semantic gap, not positive fair-value evidence;
  consumers must inspect the nullable metrics until the contract is corrected.
- AI summaries interpret prepared metrics. Deterministic values remain the
  authoritative evidence and are not overwritten by narrative output.

## Persistence Ownership

### Flyway-managed schema

Applied migrations are immutable.

| Migration | Owned schema |
|---|---|
| `V1__initial_schema.sql` | `assets`, `price_history`, `financial_statements` and their uniqueness constraints |
| `V2__agent_analysis_history.sql` | `agent_analysis_history` and ticker/time index |
| `V2_1__create_agent_analysis_history.sql` | Deliberate no-op retained to avoid a historical Flyway version collision |
| `V2_2__create_journal_trade_schema.sql` | Idempotent pre-V3 journal schema repair, applied out of order where needed |
| `V3__portfolio_transaction_ledger.sql` | `portfolios`, `portfolio_transactions`, ledger indexes, and journal link columns |
| `V4__symbol_mapping_and_asset_metadata.sql` | Asset metadata columns, `symbol_mapping`, indexes, and the DRAM manual override |
| `V5__complete_persistence_schema.sql` | `fundamental_snapshots`, `portfolio_positions`, `journal_trades`, `journal_trade_tags`, `watchlists`, `watchlist_symbols`, `opportunity_notifications`, and later `financial_statements` columns |
| `V6__allow_unknown_journal_market_values.sql` | Allows journal current/derived market values to remain `NULL` when current price evidence is unavailable |
| `V7__relabel_unresolved_asset_types.sql` | Relabels `assets` rows stored as `STOCK` with `UNAVAILABLE` metadata as `UNRESOLVED` (OQ-5) |
| `V8__manual_transaction_origin_locator.sql` | Adds `portfolio_transactions.origin_locator`, backfills `manual:legacy:<id>`, adds the manual-locator check and `(source, origin_locator)` uniqueness |
| `V9__research_evidence_snapshots.sql` | `research_evidence_snapshots` (with the captured instrument identity) and `research_evidence_fields`: append-only evidence versions with linear revision uniqueness, a value-xor-missing-reason check, and observation-time checks; no route reads them yet |
| `V10__void_portfolio_transactions.sql` | Adds nullable `portfolio_transactions.voided_at`; inverse is dropping the column |
| `V11__portfolio_states.sql` | `portfolio_states`, `portfolio_state_events`, `portfolio_state_valuations`: append-only Portfolio States with unique `(portfolio_id, version)`; the event table has no foreign key to transactions; inverse is dropping the three tables |
| `V12__portfolio_csv_imports.sql` | `portfolio_csv_imports` and `portfolio_csv_import_rows`: CSV import staging with parsed values as columns; both cascade with the portfolio; inverse is dropping the two tables |

`price_history` is the canonical singular table name used by both migration and
entity mapping.

### Schema ownership

Flyway owns schema creation and upgrades; JPA runs with
`spring.jpa.hibernate.ddl-auto=validate`, so a startup fails when an entity and
the migrated schema disagree. Databases created earlier by Hibernate are
baselined at version 4 (`FLYWAY_BASELINE_ON_MIGRATE`) and brought forward by
`V5`, whose statements are idempotent. New schema changes require a new Flyway
migration plus matching entity, adapter, and repository tests; never edit an
applied migration.

## Entity Relationships

| Relationship | Current implementation | Delete/cascade semantics |
|---|---|---|
| Asset to price history | `price_history.asset_id` is a logical symbol reference; `PriceEntity` has no JPA `@ManyToOne` | Do not assume cascade. Asset deletion needs an explicit price-row policy. |
| Watchlist to symbols | Eager ordered `@ElementCollection` in `watchlist_symbols` | Symbols are owned values and are replaced/removed with the watchlist collection. |
| Journal trade to tags | Eager ordered `@ElementCollection` in `journal_trade_tags` | Tags are owned values removed with the trade. |
| Portfolio to transactions | `portfolio_transactions.portfolio_id` foreign key | Database `ON DELETE CASCADE`; application rejects portfolio deletion while active holdings exist. |
| Portfolio position to asset | Position stores a symbol without a required JPA asset association | Do not assume asset cascade. |
| Symbol mapping to asset | Mapping uses canonical/provider/provider-symbol fields, not an asset foreign key | Mapping lifecycle is adapter-controlled; uniqueness is per canonical/provider/provider-symbol tuple. |
| Analysis history to ticker | Append-style rows use a logical ticker and JSON payload | No automatic asset cascade or retention policy is implemented. |

## Data-Type Rules

- Monetary and financial arithmetic in the backend uses `BigDecimal`, not binary
  floating point.
- Database precision and scale declared by entities/migrations must be preserved
  when adding fields.
- Timestamps crossing service boundaries use ISO-8601; market/provider timestamps
  are normalized before domain construction.
- Symbols are normalized consistently at write/orchestration boundaries.
- Empty, null, insufficient, partial, stale, and unavailable are distinct data
  states. Consumers must not collapse them into zero unless the domain model
  explicitly defines zero as the value.

## Data Derivation Boundaries

- Portfolio holdings are derived from ordered transactions, not maintained as a
  second mutable source of truth.
- Portfolio summary/performance uses persisted positions or ledger holdings plus
  refreshed real prices. Missing history yields empty points or nullable returns.
- Journal statistics derive from persisted trades. Open trades may be enriched
  with a latest real price at read time; closed trades are not silently rewritten.
- Watchlist research aggregates independently degradable price, technical,
  fundamental, earnings, and institutional sections.
- Agent-analysis history stores successful output for audit. Redis is an
  acceleration layer, not the durable history source.

## Evidence Anchors

- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/`
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PortfolioLedgerService.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshService.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/WatchlistResearchSnapshotUseCase.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/entity/`
- `backend/src/main/resources/db/migration/`
- `data-service/app/services/technical_analysis_service.py`
- `data-service/app/services/valuation_service.py`
