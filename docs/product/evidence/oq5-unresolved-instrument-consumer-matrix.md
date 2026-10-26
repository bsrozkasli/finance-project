# OQ-5 Consumer Matrix — Unresolved Instrument Type

**Status:** Closed for the unresolved instrument type on 2026-10-22. See [the OQ-5 decision record](../decisions/2026-10-22-oq5-unresolved-instrument-migration.md). Drafted 2026-10-17 as a proposal; the disposition below is now decided and Phases 1–3 are implemented.

**Purpose:** The [2026-10-15 decision](../decisions/2026-10-15-instrument-identity-source-and-unresolved-type.md) approves removing the implicit `STOCK` classification of unresolved symbols but requires, before any public or persisted change, a route/DTO/consumer compatibility matrix and a coordinated migration. This file is that matrix for EPIC-001 Task 1 (`PRD-FR-001`–`003`).

## Audit Metadata

- Audit Commit: `378b05c` (Phases 1–2 on `main`); Phase 3 on branch `feat/oq5-relabel-unresolved-assets`
- Reviewer: Claude (Backend/Architecture decision delegated by the product owner on 2026-10-22)
- Review Date: 2026-10-22
- Environment: Windows; Spring Boot backend with Flyway on PostgreSQL 16 (Testcontainers in CI); React frontend with Vitest.
- Scope: Every route, DTO, persisted column, and frontend consumer of the asset `type` value for unresolved instruments.

## Evidence Records

### Where an unresolved type is manufactured today

| # | Location | Behavior | Evidence |
|---|---|---|---|
| P1 | `AssetResolutionService.resolve` | No mapping and no provider asset: returns `Asset(type=STOCK, metadataStatus=UNAVAILABLE)` | `AssetResolutionService.java:53-62` |
| P2 | `DataServiceAssetMetadataAdapter.inferType` | Type guessed from the words ETF/INDEX/CRYPTO in exchange or industry text; everything else is `STOCK` | `DataServiceAssetMetadataAdapter.java:56-67` |
| P3 | `YahooFinancePriceAdapter.inferAssetType` | Type guessed from the exchange name; null or unknown exchange is `STOCK` | `YahooFinancePriceAdapter.java:177-191` |
| P4 | `WatchlistResearchService.resolveMetadata` | Third fallback returns type `"STOCK"` with status `EMPTY` and no name | `WatchlistResearchService.java:130` |
| P5 | `Asset.type` domain invariant | `type` must be non-null, so absence cannot be represented | `Asset.java` constructor |
| P6 | Frontend display defaults | `StockDetailModal` shows `'STOCK'` when no sector is present | `StockDetailModal.tsx:155` |

P2 and P3 conflict with the decision ("do not infer a type from its ticker spelling"): they infer from exchange text, not the ticker, but the unmatched branch still asserts `STOCK` with no evidence.

### Consumer matrix

| Consumer | Runtime | Reads | Current handling of `STOCK`+`UNAVAILABLE` | Impact of a new `UNRESOLVED` value | Needed change |
|---|---|---|---|---|---|
| `POST /api/v1/assets/batch` | Spring | `Asset.type`, `metadataStatus` | Saves and returns the row; logs a warning when `UNAVAILABLE` | Response `type` becomes `"UNRESOLVED"` | Controller passes it through; contract note |
| `GET /api/v1/assets`, `GET /api/v1/assets/{symbol}` | Spring | persisted `assets.type` | Returns stored `STOCK` | Same field, new value | None if stored value changes |
| `AssetResponseDto.type` | Spring REST | free-form `String` | Documented example `STOCK`; no enum constraint | Compatible: not an enum on the wire | Document the new value in `contracts.md` and `openapi.yaml` |
| `assets` table | PostgreSQL | `type VARCHAR(20) NOT NULL`, `metadata_status VARCHAR(20) NOT NULL DEFAULT 'UNAVAILABLE'` | Existing unresolved rows are stored as `STOCK` | `UNRESOLVED` fits (10 chars); no column change | New Flyway migration to relabel existing ambiguous rows (see below) |
| `AssetPersistenceMapper` | Spring | enum names | `valueOf(String)` for status; type mapped through `AssetType` | An unknown enum name throws on read | Add the enum value before any row is written with it |
| `WatchlistResearchService` | Spring | `AssetMetadataPort`, `AssetRepositoryPort` | Emits `"STOCK"` with status `EMPTY` | Emit `"UNRESOLVED"` (string field) | One-line change plus test |
| `DataServiceAssetMetadataAdapter` | Spring | `/api/v1/assets/{symbol}/info` | Infers type, default `STOCK` | Return type unresolved when no provider classification exists | Adapter and `AssetMetadataPort.AssetMetadata` must allow it |
| `YahooFinancePriceAdapter` | Spring | exchange name | Infers type, default `STOCK` | Same | Same |
| Eligibility (EPIC-001 Task 1) | Spring domain | `InstrumentIdentity` | Does not exist yet | `UNRESOLVED` is never eligible | New `InstrumentEligibilityService` |
| Frontend `Asset.type` | React | `type: string` in `api/types.ts` | Rendered as text (`TopBar` search, `App.tsx` sector) | Displays "UNRESOLVED" as text; search still works | Add a labelled display for the value; no type change |
| Frontend `WatchlistResearch.metadataStatus` | React | `WatchlistResearchStatus` | Handles `OK/STALE/EMPTY/...` | No change | None |
| data-service | FastAPI | n/a | Does not own `AssetType` | None | None |
| `docs/openapi.yaml`, `docs/spec/current-system/contracts.md` | Docs | n/a | No enumerated type values | Add the value | Update in the same change |

### Persisted-data risk

Existing rows with `type='STOCK'` and `metadata_status='UNAVAILABLE'` were created by P1 and carry no classification evidence. Rows with `STOCK` and `VERIFIED` or `PARTIAL` are provider- or mapping-backed and stay as they are. A new migration (never an edit of V4) can relabel only the first group. Before running it, count the affected rows on the target database; the count is not known from the repository.

### Disposition (proposed 2026-10-17, decided 2026-10-22)

1. Add `AssetType.UNRESOLVED` (additive wire value, no schema change). Reject making `type` nullable: it breaks every consumer that assumes a string.
2. Phase 1, additive and behavior-preserving for verified rows: introduce the enum value, the eligibility service, and P1/P4 returning `UNRESOLVED`. Update `contracts.md` and `openapi.yaml`, and add the frontend label.
3. Phase 2: remove the `STOCK` defaults in P2 and P3 so they return unresolved without provider evidence.
4. Phase 3: Flyway migration relabelling `STOCK`+`UNAVAILABLE` rows, after the row count is reviewed.
5. Acceptance: a test per consumer above shows `UNRESOLVED` is carried unchanged and never counted as an eligible stock or ETF.

### Rulings (2026-10-17, delegated by the owner)

- Wire value is `UNRESOLVED`; `type` stays non-null and a string.
- Phase 1 implemented: `AssetType.UNRESOLVED`, `AssetResolutionService` and the `WatchlistResearchService` fallback return it; round-trip persistence proven by `AssetRepositoryAdapterTest`.
- Stored `STOCK`+`UNAVAILABLE` rows are left as recorded. Relabelling needs a reviewed row count first (Phase 3, not started).
- Phase 2 implemented (2026-10-17): data-service `AssetInfo.quote_type` (additive, yfinance `quoteType` only); `AssetType.fromQuoteType`; `DataServiceAssetMetadataAdapter` and `YahooFinancePriceAdapter` classify only from the provider type and no longer guess from exchange or industry text. Tests: `AssetTypeTest`, `DataServiceAssetMetadataTypeTest`, `YahooFinanceAssetInfoTest`, data-service `test_assets_endpoint.py`.
- Consequence: a symbol whose provider returns no type is now `UNRESOLVED` instead of `STOCK`. Finnhub and Tiingo asset info do not supply a type, so they classify nothing until a source is added.
- Documented in `docs/spec/current-system/contracts.md`; `openapi.yaml` does not enumerate asset types and needs no change.
- Frontend: `StockDetailModal` no longer defaults its header to `STOCK` when no stock data exists; it shows "Type unavailable" (test `does not claim a STOCK type when no stock data is available`). `UNRESOLVED` from the API displays as text.
- Not started: Phase 3 row relabelling and the eligibility service (waits on OQ-2/OQ-3).
- No external client of `/api/v1/assets` is visible in the repository; this cannot be proven from code.

## Decisions (2026-10-22)

The three open items from the 2026-10-17 draft are answered:

- **Wire value:** `UNRESOLVED` stays. `type` remains a non-null string.
- **Phase 3:** implemented as `V7__relabel_unresolved_asset_types.sql`. Only `type='STOCK' AND metadata_status='UNAVAILABLE'` rows change. V4 gave every pre-V4 row `UNAVAILABLE`, so those rows have no recorded classification evidence either and are relabelled too. The change is reversible, because `metadata_status` stays `UNAVAILABLE`; the migration comment carries the inverse statement. Re-adding a symbol through `POST /api/v1/assets/batch` re-resolves it from the provider. Verified by `UnresolvedAssetTypeMigrationTest`, a real PostgreSQL upgrade from V6.
- **External clients:** none are visible in the repository, and the value is additive on a string field. This is recorded as an assumption, not a proof. If an external consumer appears, its owner gets the same `UNRESOLVED` semantics and the inverse statement above.
- **Frontend:** asset types are shown in Turkish. `UNRESOLVED` and a missing type both read "Tür bilinmiyor"; the raw value is never shown (`assetTypeLabel`).

## Limitations

- This closes OQ-5 only for the unresolved instrument type (`PRD-FR-003`). The other OQ-5 contract migrations stay open until their stories are authored: CSV lineage (`PRD-FR-012`), PEG (`PRD-FR-061`), and agent replay and decision vocabulary (`PRD-FR-027`, `PRD-FR-028`).
- Eligibility still fails closed. `InstrumentEligibilityService` has no `SecurityMasterPort` adapter, because OQ-2 (licensed point-in-time master and use rights) is a data-governance and legal decision and remains open.
- The number of rows V7 changes on a deployed database is not known from the repository. It is logged by Flyway as the affected-row count of the update.

## Note (2026-10-26)

`WatchlistResearchService` was removed on 2026-10-26. It was unused: no production code or configuration referenced it and only its own test did. Its third `STOCK` metadata fallback (path P4 and the matching consumer row above) went with it. The rows above are kept as the record of the audit state. See `docs/product/decisions/2026-10-26-remove-dead-watchlist-service.md`.
