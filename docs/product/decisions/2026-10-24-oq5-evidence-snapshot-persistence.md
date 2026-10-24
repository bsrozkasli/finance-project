# OQ-5 proposal: evidence snapshot persistence

**Recorded:** 2026-10-24

**Decision input:** Proposed by the implementing agent for product-owner approval. The 2026-10-22 [OQ-5 decision](2026-10-22-oq5-unresolved-instrument-migration.md) records that the Backend Lead and Architecture Lead decisions were delegated to the implementing agent; OQ-5 is owned by those leads (PRD §OQ-5). OQ-2 (data governance and legal) and OQ-3 (Quant Research and Risk Lead) are outside that delegation.

**Scope:** EPIC-001 Task 2 persistence only (`ResearchEvidencePort` adapter and its Flyway migration).
**State:** Proposed. Nothing below is implemented until it is approved.

## Why OQ-5 applies only lightly

OQ-5 requires a preserve, version, coordinated-migration or retire disposition for each *legacy* route, DTO or persisted contract that changes. This slice changes none: it adds a table and an outbound adapter, and exposes no route, DTO field or response shape. Consumers of `/api/v1/*` and of existing tables are unaffected.

## Proposed disposition

1. **Contract.** No public route or DTO is added or changed. Snapshot ids are not yet visible on the wire. A versioned read contract needs its own OQ-5 disposition when a story authors it (EPIC-003 consumes snapshot ids).
2. **Migration.** `V9__research_evidence_snapshots.sql` (V8 is the latest on `main` and on every remote branch). Additive only; no existing table is altered. Two tables:
   - `research_evidence_snapshots`: `id` (stable text id), `symbol`, `revision` (>= 1), `supersedes_id` (nullable, self-reference), `created_at`; unique `(symbol, revision)`; unique `supersedes_id`, so a snapshot can be superseded once and revisions stay linear.
   - `research_evidence_fields`: snapshot id, field name, nullable `value`, `missingness`, `source`, `observed_at`, `retrieved_at`, `period`, `currency`, `normalization`, `freshness`, `conflicted`; unique `(snapshot_id, name)`. A check constraint keeps `value` NULL exactly when `missingness <> 'NONE'`, mirroring the domain invariant.
3. **Append-only.** The adapter only inserts and reads. No update or delete path exists in the port or the adapter, and the revision uniqueness constraints reject a conflicting concurrent revision at the database.
4. **Reversibility.** The migration only creates tables, so the inverse is dropping the two tables. No data is rewritten.
5. **Compatibility window.** None required; nothing existing reads these tables.
6. **Wiring.** The adapter is registered as a Spring bean and `ResearchEvidenceService` in `DomainConfig` once the adapter exists, so application start-up is not broken by a missing port bean.

## Tests required before acceptance

- Adapter integration test on real PostgreSQL (Testcontainers): save, read by id, latest by symbol, restart-style re-read in a new context returns the same version.
- Revision test: a second revision gets a new id and revision, and the first snapshot is byte-for-byte unchanged on re-read.
- Constraint tests: a missing field with a value, a duplicate field name, and a second revision superseding the same snapshot are all rejected by the database.
- `CoreSystemIntegrationTest` schema version moves from 8 to 9.

## Cost if wrong

If the shape of the retained evidence changes after OQ-3 fixes the field policy, a follow-up migration (V10+) adds columns; applied migrations are never edited. Field values are stored as text with their provenance, so no numeric precision or unit is asserted by the table.

## Limits

- **Unchanged and still open:** OQ-2 (point-in-time master and use-specific data rights), OQ-3 (field weights, thresholds, mandatory fields) and the other OQ-5 contracts (CSV lineage, PEG, agent replay and vocabulary).
- Retaining evidence does not authorize external display or redistribution; rights gating stays EPIC-001 Task 4.
