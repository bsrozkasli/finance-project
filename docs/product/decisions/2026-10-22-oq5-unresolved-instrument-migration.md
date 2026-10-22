# OQ-5 decision: unresolved instrument type migration

**Recorded:** 2026-10-22

**Decision input:** On 2026-10-22 the product owner delegated the Backend/Architecture Lead decisions to the implementing agent: "sıradaki kararları sen ver ve adım adım kodla". OQ-5 is owned by the Backend Lead and the Architecture Lead (PRD §OQ-5). OQ-2 is owned by data governance and legal, so it is out of this delegation.

**Scope:** OQ-5 for the unresolved instrument type only (`PRD-FR-003`, EPIC-001 Task 1). This extends the [2026-10-15 identity decision](2026-10-15-instrument-identity-source-and-unresolved-type.md).
**State:** Closed for this contract. The other OQ-5 contract migrations remain open (see Limits).

## Decision

1. **Wire value.** `UNRESOLVED` is the asset `type` when no provider classification or trusted mapping establishes it. `type` stays a non-null string on `/api/v1/assets*` and watchlist research rows. A nullable `type` was rejected, because every consumer reads it as a string.
2. **Disposition per contract.**
   - **Preserve:** paths and field names.
   - **Additive value:** `UNRESOLVED` on the existing string field. No new version of the route is needed, because the field was never an enum on the wire.
   - **Coordinated migration:** persisted rows (V7) and the frontend display, changed together in one PR.
3. **Persisted rows (Phase 3).** `V7__relabel_unresolved_asset_types.sql` sets `type='UNRESOLVED'` where `type='STOCK' AND metadata_status='UNAVAILABLE'`.
   - **Why:** those rows carry no classification evidence. V4 defaulted every earlier row to `UNAVAILABLE`, so pre-V4 rows have no recorded evidence either. Asserting `STOCK` for them contradicts the 2026-10-15 decision.
   - **Untouched:** rows with `VERIFIED` or `PARTIAL` metadata, and non-STOCK rows.
4. **Reversibility.** `metadata_status` stays `UNAVAILABLE`, so relabelled rows remain identifiable. The inverse is recorded in the migration. Re-adding a symbol through `POST /api/v1/assets/batch` re-resolves it from the provider.
5. **Compatibility window.** None is required for in-repository consumers; all of them change in the same PR. No external client of `/api/v1/assets` is visible in the repository. That is an assumption, revisited if one is found.
6. **Display.** The frontend shows asset types in Turkish. `UNRESOLVED` and a missing type read "Tür bilinmiyor".

## Cost if wrong

A pre-V4 symbol that really is a stock shows "Tür bilinmiyor" until it is re-added. No price, valuation, ledger, or journal value changes. Eligibility is not affected: `UNRESOLVED` was already never eligible, and no eligibility consumer is wired yet.

## Evidence

- Consumer matrix: [oq5-unresolved-instrument-consumer-matrix.md](../evidence/oq5-unresolved-instrument-consumer-matrix.md).
- Tests:
  - `UnresolvedAssetTypeMigrationTest`: real PostgreSQL upgrade from V6.
  - `CoreSystemIntegrationTest`: schema at version 7.
  - Frontend `formatters.test.ts`, `useAppMarketData.test.tsx` and `ResearchWorkspace.test.tsx`.

## Limits

- **Other OQ-5 contracts stay open:** CSV lineage (`PRD-FR-012`), PEG (`PRD-FR-061`), and agent replay and vocabulary (`PRD-FR-027`, `PRD-FR-028`). Each needs its own disposition when its story is authored.
- **OQ-2 stays open:** a licensed point-in-time security master and use-specific data rights. EPIC-001 Task 1 eligibility keeps failing closed, and `SecurityMasterPort` has no adapter.
