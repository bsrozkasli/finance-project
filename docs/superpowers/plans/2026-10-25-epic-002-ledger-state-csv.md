# EPIC-002 Ledger Immutability, Exposures, State Persistence and CSV Import Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Implement decisions D-1 to D-4 of
[the 2026-10-25 EPIC-002 decision record](../../product/decisions/2026-10-25-epic-002-ledger-state-and-csv.md).

**Spec:** that decision record (binding), `SPEC.md`, `docs/spec/current-system/*.md`, `docs/product/PRD.md`
(`PRD-FR-011`–`015`), `docs/agent/verification.md`.

**Base:** branch `feat/epic-002-ledger-state-csv`, stacked on PR #70 (`PortfolioStateService`, `PortfolioState`,
`PortfolioLedgerService.calculatePositions`).

## Global Constraints

- Java 17 (no Java 21 APIs). Spring Boot 3.4, JUnit 5, AssertJ, Mockito, Testcontainers (`@Testcontainers(disabledWithoutDocker = true)`), PostgreSQL 16.
- Domain code under `domain/` stays framework-free (no Spring, Jakarta, Lombok `@Data/@Getter/@Setter`); `ArchitectureTest` enforces it. Register domain services in `config/DomainConfig.java` and cover each new bean in `DomainConfigWiringTest`.
- Controllers stay thin; logic lives in domain services.
- Migrations: Task 1 uses `V10__…`, Task 3 `V11__…`, Task 4 `V12__…`. V9 is reserved by PR #68 (`out-of-order` is enabled). Never edit an existing migration. Each migration header states its inverse. Update `CoreSystemIntegrationTest`'s expected latest version.
- Preserve every existing route path, method, status code and DTO field. New routes are additive under `/api/v1`.
- Errors use the existing `ErrorResponse` body through `GlobalExceptionHandler` / `ResponseStatusException`.
- Never fabricate data: absent values are `null`, never `0`; no provider calls while deriving or importing.
- TDD: write the tests first and run them red before implementing; report the red failure.
- **Every command must finish within 120 s.** Run Maven from PowerShell only, wrapped:
  `node ..\scripts\run-with-timeout.cjs 120000 .\mvnw.cmd "-Dtest=A,B" test` from `backend/`. Never run the full suite
  (it exceeds 120 s locally; CI runs it). Maven does not run from Git Bash.
- Docs: update `docs/spec/current-system/contracts.md` and/or `domain-and-data.md` for what the task changes, and run
  `node scripts/run-with-timeout.cjs 120000 python scripts/validate_product_docs.py --complete` from the repo root.
- Commits: Conventional Commits (`feat(backend)`, `feat(db)`, `test(backend)`, `docs(spec)`), atomic, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the repository attribution line). Do not push. Do not touch unrelated files.
- Fixture data is synthetic; never call live providers in tests.

## Task 1: Void ledger events instead of deleting them (D-1)

**Files:** `V10__void_portfolio_transactions.sql`; `PortfolioTransaction` (add nullable `Instant voidedAt` as the last
component, keeping the existing 16- and 17-argument constructors working with `voidedAt = null`);
`PortfolioTransactionEntity`; `PortfolioTransactionJpaRepository`; `PortfolioTransactionRepositoryAdapter`;
`PortfolioTransactionPort`; `PortfolioManagementController.deleteTransaction`; `PortfolioStateService.stateAt` (only
active events). Tests: `PortfolioManagementControllerTest`, a new `PortfolioTransactionVoidPersistenceTest`
(Testcontainers), `PortfolioLedgerServiceTest` / `PortfolioStateServiceTest` as needed, `CoreSystemIntegrationTest`.

**Requirements:**
1. `V10` adds `portfolio_transactions.voided_at TIMESTAMP WITH TIME ZONE NULL`. Inverse: drop the column.
2. Port changes:
   - `findByPortfolioIdAndUserId` returns only events with `voided_at IS NULL` (all current callers keep their behavior).
   - `findByIdAndPortfolioIdAndUserId` returns only an active event (so the route's `404` for an already voided event works).
   - New `void voidByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId, Instant voidedAt)` sets
     `voided_at` once; voiding an already voided or unknown event changes nothing.
   - New `List<PortfolioTransaction> findByIdsIncludingVoided(Long portfolioId, String userId, Collection<Long> ids)`.
   - Remove `deleteByIdAndPortfolioIdAndUserId` from the port, the adapter and the JPA repository (no physical delete
     of a single event remains). Update the in-memory test ports that implement the port.
3. The controller's `DELETE …/transactions/{transactionId}` keeps path, `204`, and `404` for unknown or voided ids, still
   deletes the linked journal record, and voids instead of deleting. Use the current instant.
4. `PortfolioStateService.stateAt` already reads `findByPortfolioIdAndUserId`, so it now ignores voided events; keep
   `project` unchanged.
5. Tests (red first):
   - controller: delete returns `204`, calls void (not delete) and the journal delete; second delete returns `404`.
   - persistence (real PostgreSQL): after voiding, the row still exists with `voided_at` set; holdings and
     `findByPortfolioIdAndUserId` exclude it; `findByIdsIncludingVoided` returns it; its `(source, origin_locator)`
     stays unique (inserting another MANUAL event with the same locator fails).
   - `CoreSystemIntegrationTest` latest version becomes `10`.
6. Docs: `contracts.md` DELETE row says it voids (row retained, excluded from all reads) and the journal record is
   still deleted; `domain-and-data.md` describes `voided_at` and adds the V10 row to the migration table.

## Task 2: Exposure valuation in Portfolio State (D-2)

**Files:** `domain/model/PortfolioState` (add `exposureStatus`, `assetTypeWeights`; positions become a new
`PortfolioStatePosition` record), new `domain/model/PositionValuationStatus`, `domain/model/ExposureStatus`,
`domain/model/ValuationInput`; `PortfolioStateService` (constructor gains `PriceRepositoryPort` and
`AssetRepositoryPort`, plus portfolio base currency input); `DomainConfig`; tests `PortfolioStateServiceTest`,
`DomainConfigWiringTest`, `PortfolioStateRestartReplayTest`.

**Requirements:** implement D-2 exactly.
1. `PortfolioStatePosition(symbol, assetType, quantity, averageCost, costBasis, realizedPnl, currency, valuationStatus,
   price, priceDate, marketValue, weight)`. Closed positions (quantity 0) keep their realized activity and have
   valuation status `CLOSED`, null price/marketValue/weight, and do not count as open positions.
2. `PositionValuationStatus`: `PRICED`, `STALE_PRICE`, `NO_PRICE`, `CURRENCY_UNKNOWN`, `CURRENCY_MISMATCH`, `CLOSED`.
   `ExposureStatus`: `COMPLETE`, `PARTIAL`, `EMPTY`.
3. Price: latest `PriceHistory` for the symbol whose `timestamp.toLocalDate()` is on or before `asOf`
   (use `findByAssetIdAndPeriod(symbol, Instant.EPOCH, end of asOf day UTC)` and take the latest). Price currency =
   `AssetRepositoryPort.findBySymbol(symbol).currency()`; missing asset or null/blank currency → `CURRENCY_UNKNOWN`.
   Valued only if price currency, position currency and portfolio base currency are equal; otherwise
   `CURRENCY_MISMATCH`. `STALE_PRICE` when `asOf - priceDate > 7` days (exactly 7 is `PRICED`). Order of checks:
   currency unknown → mismatch → no price → stale → priced. Market value = `quantity × close` for `PRICED` and
   `STALE_PRICE` only.
4. Weights: only when every open position is `PRICED` → `COMPLETE`; weight = marketValue / sum of open market values,
   `divide(total, 10, RoundingMode.HALF_UP)`; `assetTypeWeights` maps `PortfolioAssetType` name → sum of weights
   computed as (sum of that type's market values) / total at the same scale. Any other open status → `PARTIAL`, all
   weights null, `assetTypeWeights` empty. No open positions → `EMPTY`, empty map. If the total market value is zero,
   treat it as `PARTIAL`.
5. Derivation `pstate-v2`. The hash additionally covers, per position in symbol order: symbol, valuation status,
   close (no trailing zeros), price date, price currency. `ValuationInput(symbol, close, priceDate, priceCurrency)`
   lists the inputs used; `project` gains an overload that takes explicit valuation inputs and the base currency (used
   by Task 3 replay), and the price-port path builds those inputs then calls it. Keep it pure apart from port reads.
6. `stateAt(portfolioId, userId, asOf)` reads the portfolio base currency through `PortfolioPort`
   (`findByIdAndUserId`); unknown portfolio → `IllegalArgumentException`.
7. Tests (red first, synthetic fixtures with exact expected values): each valuation status; the 7-day boundary;
   `COMPLETE` weights (e.g. 600 and 400 → 0.6000000000 and 0.4000000000, asset-type map); `PARTIAL` nulls all weights;
   `EMPTY`; closed position; replay from explicit inputs equals the price-port result; a changed close changes the
   version; reordered events still give the same version. Update the restart replay test to seed an asset and prices.
8. Docs: `domain-and-data.md` Portfolio State bullet describes valuation, statuses and `pstate-v2`.

## Task 3: Persist Portfolio States and add state routes (D-3)

**Files:** `V11__portfolio_states.sql`; new domain port `PortfolioStatePort`; persistence entities/repositories/adapter;
`PortfolioStateService` (create-and-persist, replay-by-version); new controller `PortfolioStateController` with request
and response DTOs; tests: `PortfolioStateServiceTest`, new `PortfolioStateRepositoryAdapterTest` (Testcontainers), new
`PortfolioStateControllerTest` (`@WebMvcTest`), `DomainConfigWiringTest`, `CoreSystemIntegrationTest`.

**Requirements:** implement D-3 exactly.
1. `V11`: `portfolio_states(id BIGSERIAL PK, portfolio_id FK portfolios ON DELETE CASCADE, user_id, version VARCHAR(80),
   as_of DATE, base_currency CHAR(3), exposure_status VARCHAR(16), created_at TIMESTAMPTZ, UNIQUE(portfolio_id, version))`;
   `portfolio_state_events(state_id FK, transaction_id BIGINT, PRIMARY KEY(state_id, transaction_id))` (no FK to
   transactions, so voided events stay referenced); `portfolio_state_valuations(state_id FK, symbol, close NUMERIC(24,8)
   NULL, price_date DATE NULL, price_currency CHAR(3) NULL, PRIMARY KEY(state_id, symbol))`. Insert-only adapter.
2. `PortfolioStatePort`: `Optional<StoredPortfolioState> findByVersion(portfolioId, userId, version)` and
   `StoredPortfolioState saveIfAbsent(StoredPortfolioState)` returning the stored row (existing or new) and whether it
   was created. `StoredPortfolioState(version, portfolioId, userId, asOf, baseCurrency, exposureStatus, eventIds,
   valuationInputs, createdAt)`.
3. Service: `create(portfolioId, userId, asOf)` derives via Task 2 and stores; `replay(portfolioId, userId, version)`
   loads the stored row, reads its events with `findByIdsIncludingVoided`, re-projects with the stored inputs and base
   currency, and throws a dedicated `PortfolioStateMismatchException` (domain) when the replayed version differs.
4. Controller: `POST /api/v1/portfolios/{portfolioId}/states` body `{"asOf":"YYYY-MM-DD"}` → `201` new / `200`
   existing; missing/invalid `asOf` → `400`; `asOf` after today → `400`; unknown portfolio → `404`.
   `GET /api/v1/portfolios/{portfolioId}/states/{version}` → `200`; unknown → `404`; mismatch → `409`. Response fields
   exactly as D-3 item 3; `null` for absent values; `assetTypeWeights` an object. Use the `DEFAULT_USER` convention of
   `PortfolioManagementController`.
5. Tests (red first): service create/replay/mismatch with in-memory ports; adapter round-trip, idempotent save,
   unique constraint, a voided event still replays; controller statuses and JSON field names/nulls;
   `CoreSystemIntegrationTest` latest version `11`.
6. Docs: `contracts.md` rows for both routes; `domain-and-data.md` tables and V11 row.

## Task 4: CSV import staging and acceptance (D-4)

**Files:** `V12__portfolio_csv_imports.sql`; domain: `PortfolioCsvImportService`, `CsvImportBatch`, `CsvImportRow`,
`CsvImportRowStatus`, `CsvImportBatchStatus`, port `PortfolioCsvImportPort`; persistence entities/repositories/adapter;
controller `PortfolioImportController`; tests: `PortfolioCsvImportServiceTest`, `PortfolioCsvImportRepositoryAdapterTest`
(Testcontainers, includes a concurrent-accept test), `PortfolioImportControllerTest`, `DomainConfigWiringTest`,
`CoreSystemIntegrationTest`.

**Requirements:** implement D-4 exactly.
1. Parser: hand-written, RFC 4180 quoting (quoted fields, doubled quotes, commas inside quotes), `\n` or `\r\n`; header
   case-insensitive, any order; required headers `trade_date, action, symbol, asset_type, quantity, price, currency,
   fee, fx_rate_to_base`, optional `notes`; missing/unknown header, empty file, > 1,048,576 bytes or > 5,000 data rows →
   reject the whole file (`IllegalArgumentException` → `400`). Blank lines are skipped.
2. Row → `PortfolioTransaction` with `source=CSV`, `id=null`; empty `fee` → `0`, empty `fx_rate_to_base` → `1`;
   enums parsed case-insensitively; any parse or model-validation failure → `INVALID` with a message; never default
   other columns.
3. Locator: `"csv:" + lowercase hex sha256` of the nine economic values joined by `\u001f`, numbers via
   `stripTrailingZeros().toPlainString()`, codes upper-case, symbol trimmed upper-case (empty for none), date ISO;
   the n-th identical row gets `#n` (n ≥ 2). Reordering the same rows yields the same set of locators.
4. Staging: batch (id, portfolio, user, file sha256, status `STAGED` | `ACCEPTED`, created/accepted times) and rows (batch,
   row number, raw line, locator nullable, status, message, parsed values as columns, accepted transaction id
   nullable). On staging, a `VALID` row whose locator already exists in the ledger (active or voided) is `DUPLICATE`.
   This needs a port method that checks `(source, origin_locator)` existence including voided rows.
5. Accept: in trade-date then row-number order, each `VALID` row goes through `PortfolioLedgerService.addTransaction`;
   success → `ACCEPTED` with the transaction id; ledger `IllegalArgumentException` → `REJECTED` with the message;
   unique-constraint conflict → `DUPLICATE`. Batch becomes `ACCEPTED`; accepting it again returns it unchanged.
   Two concurrent accepts of two batches with the same rows create one ledger event per locator.
6. Routes: `POST /api/v1/portfolios/{portfolioId}/imports` consumes `text/csv` → `201` with the batch;
   `GET …/imports/{batchId}` → `200` / `404`; `POST …/imports/{batchId}/accept` → `200`. Unknown portfolio → `404`.
   Response: `batchId, portfolioId, status, fileSha256, createdAt, acceptedAt, counts{valid,invalid,duplicate,accepted,
   rejected}, rows[{rowNumber, status, message, originLocator, transactionId}]`.
7. Tests (red first): parser cases (quoting, header order/case, missing header, limits); locator determinism and `#n`;
   invalid rows staged; duplicate against ledger and voided event; acceptance order and rejection (oversell);
   idempotent re-accept; reordered re-import yields all `DUPLICATE`; concurrent accept (real PostgreSQL); controller
   statuses and fields; `CoreSystemIntegrationTest` latest version `12`.
8. Docs: `contracts.md` rows for the three routes and the CSV schema v1; `domain-and-data.md` staging tables, V12 row,
   and that CSV rows now always carry a `csv:` locator.
