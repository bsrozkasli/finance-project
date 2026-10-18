# OQ-5 Consumer Matrix — Unresolved Instrument Type

**Status:** Evidence artifact and proposal, drafted 2026-10-17. Nothing here is a decision; the disposition in the last section needs owner approval.

**Purpose:** The [2026-10-15 decision](../decisions/2026-10-15-instrument-identity-source-and-unresolved-type.md) approves removing the implicit `STOCK` classification of unresolved symbols but requires, before any public or persisted change, a route/DTO/consumer compatibility matrix and a coordinated migration. This file is that matrix for EPIC-001 Task 1 (`PRD-FR-001`–`003`).

## Where an unresolved type is manufactured today

| # | Location | Behavior | Evidence |
|---|---|---|---|
| P1 | `AssetResolutionService.resolve` | No mapping and no provider asset: returns `Asset(type=STOCK, metadataStatus=UNAVAILABLE)` | `AssetResolutionService.java:53-62` |
| P2 | `DataServiceAssetMetadataAdapter.inferType` | Type guessed from the words ETF/INDEX/CRYPTO in exchange or industry text; everything else is `STOCK` | `DataServiceAssetMetadataAdapter.java:56-67` |
| P3 | `YahooFinancePriceAdapter.inferAssetType` | Type guessed from the exchange name; null or unknown exchange is `STOCK` | `YahooFinancePriceAdapter.java:177-191` |
| P4 | `WatchlistResearchService.resolveMetadata` | Third fallback returns type `"STOCK"` with status `EMPTY` and no name | `WatchlistResearchService.java:130` |
| P5 | `Asset.type` domain invariant | `type` must be non-null, so absence cannot be represented | `Asset.java` constructor |
| P6 | Frontend display defaults | `StockDetailModal` shows `'STOCK'` when no sector is present | `StockDetailModal.tsx:155` |

P2 and P3 conflict with the decision ("do not infer a type from its ticker spelling"): they infer from exchange text, not the ticker, but the unmatched branch still asserts `STOCK` with no evidence.

## Consumer matrix

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

## Persisted-data risk

Existing rows with `type='STOCK'` and `metadata_status='UNAVAILABLE'` were created by P1 and carry no classification evidence. Rows with `STOCK` and `VERIFIED` or `PARTIAL` are provider- or mapping-backed and stay as they are. A new migration (never an edit of V4) can relabel only the first group. Before running it, count the affected rows on the target database; the count is not known from the repository.

## Proposed disposition (needs owner approval)

1. Add `AssetType.UNRESOLVED` (additive wire value, no schema change). Reject making `type` nullable: it breaks every consumer that assumes a string.
2. Phase 1, additive and behavior-preserving for verified rows: introduce the enum value, the eligibility service, and P1/P4 returning `UNRESOLVED`. Update `contracts.md` and `openapi.yaml`, and add the frontend label.
3. Phase 2: remove the `STOCK` defaults in P2 and P3 so they return unresolved without provider evidence.
4. Phase 3: Flyway migration relabelling `STOCK`+`UNAVAILABLE` rows, after the row count is reviewed.
5. Acceptance: a test per consumer above shows `UNRESOLVED` is carried unchanged and never counted as an eligible stock or ETF.

## Open items the owner must answer

- Is the wire value `UNRESOLVED` acceptable, or is another name required?
- May Phase 3 relabel stored rows, or must they stay as recorded?
- Do external clients outside this repository read `/api/v1/assets` `type`? The repository shows none; this cannot be verified from code.
