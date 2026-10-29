# OQ-5 decision: evidence snapshot persistence

**Recorded:** 2026-10-24

**Decision input:** Proposed by the implementing agent; approved by the product owner on 2026-10-24 ("onaylıyorum"). The 2026-10-22 [OQ-5 decision](2026-10-22-oq5-unresolved-instrument-migration.md) records that the Backend Lead and Architecture Lead decisions were delegated to the implementing agent; OQ-5 is owned by those leads (PRD §OQ-5). OQ-2 (data governance and legal) and OQ-3 (Quant Research and Risk Lead) are outside that delegation.

**Scope:** EPIC-001 Task 2 persistence only (`ResearchEvidencePort` adapter and its Flyway migration).
**State:** Accepted 2026-10-24 and implemented on `feat/evidence-snapshot-domain` (V9, `ResearchEvidenceRepositoryAdapter`, `DomainConfig` bean).

## Why OQ-5 applies only lightly

OQ-5 requires a preserve, version, coordinated-migration or retire disposition for each *legacy* route, DTO or persisted contract that changes. This slice changes none: it adds a table and an outbound adapter, and exposes no route, DTO field or response shape. Consumers of `/api/v1/*` and of existing tables are unaffected.

## Disposition

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

## Implementation notes

- `research_evidence_fields.position` preserves field order so a re-read equals the saved snapshot. It is an addition to the proposal.
- `save` rejects an existing id in the adapter (`IllegalStateException`); the database enforces the rest.
- Timestamps are `TIMESTAMP WITH TIME ZONE` (microsecond precision); callers should not rely on nanosecond `Instant` round-trips.
- The re-read test runs in the same Spring context against committed rows (each read is its own transaction). A true process-restart test is not claimed.

## Limits

- **Unchanged and still open:** OQ-2 (point-in-time master and use-specific data rights), OQ-3 (field weights, thresholds, mandatory fields) and the other OQ-5 contracts (CSV lineage, PEG, agent replay and vocabulary).
- Retaining evidence does not authorize external display or redistribution; rights gating stays EPIC-001 Task 4.

## Amendment (2026-10-25): identity-bound snapshot shape

**Why:** `main` merged a separate in-memory snapshot model (#63, `7c0a9b3`) after this branch was cut. Both
defined `ResearchEvidenceSnapshot`, with different shapes. The implementing agent proposed adopting `main`'s
identity-bound shape and keeping this decision's append-only persistence; the product owner told it to proceed
on 2026-10-25. This stays within the delegated Backend/Architecture Lead scope: still additive, no route, DTO or
existing table changes.

**What changes in V9** (never applied outside this branch; the local development database is at V8):

- `research_evidence_snapshots.id` and `previous_id` (was `supersedes_id`) are `UUID`; `revision` is `BIGINT`.
- The snapshot row stores the captured `InstrumentIdentity`: `asset_type`, `listing_status`,
  `classification_basis`, `identity_source`, `identity_retrieved_at` (which cannot follow `captured_at`).
  `created_at` is now `captured_at`.
- `research_evidence_fields` uses `raw_value`, a nullable typed `missing_reason` and `conflict_note` (text)
  in place of `value`, `missingness` and `conflicted`. The check is now value-xor-missing-reason; new checks
  require an observation time for a present value and forbid an observation after its retrieval.
- **Unique `(snapshot_id, name)` is dropped.** `main`'s model retains several periods and conflicting sources
  for one field name. Choosing among them is a conflict priority that OQ-3 owns.

**Tests:** `ResearchEvidenceRepositoryAdapterTest` replaces the duplicate-name test with one that retains
several periods and sources and adds the two observation-time constraint tests. A mutation that removed both
new checks failed exactly those two tests. `ResearchEvidenceRestartReplayTest` closes the recording
application context and replays every version from a new one on the same database. It runs in one JVM, so it
is a context restart, not a new OS process.
