# Decision: remove the unused WatchlistResearchService

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent and
asked that every decision be recorded. Follow-up D-5 of the [provider failure record](2026-10-26-provider-failure-status.md).

**State:** Accepted 2026-10-26.

## Finding

`WatchlistResearchService` (domain service) is registered nowhere (`DomainConfig` does not build it) and no production code
references it. Only its own test does. The watchlist snapshot is built by `WatchlistResearchSnapshotUseCase`, which is the
canonical implementation. The old class has a different overall-status rule (any `OK` section makes the overall `OK`) and an
untyped string status model, and the OQ-5 consumer matrix records that it can still emit type `STOCK` as a third metadata
fallback. Code that nothing runs but that disagrees with the live code on status rules is a hazard for the next reader.

## Decision

1. Delete `WatchlistResearchService` and `WatchlistResearchServiceTest`. Nothing else changes.
2. Before deleting, confirm by search that no main source, test, configuration, frontend file or documentation instruction
   depends on it. Historical evidence documents under `docs/product/evidence/` that name the class are kept as written (they
   record the state of the system at their audit date); one dated note is added to the OQ-5 consumer matrix saying the class
   was removed on 2026-10-26 and the third `STOCK` fallback path went with it.
3. The behavior covered by its test (string statuses, the old overall rule) is not carried over: the use case's own tests
   cover the live behavior.

Cost if wrong: if a reader later needs the old behavior it is in git history. Reverse by reverting the commit.
