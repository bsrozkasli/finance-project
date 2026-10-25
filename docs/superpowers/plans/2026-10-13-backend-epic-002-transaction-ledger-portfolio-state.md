# EPIC-002 Transaction Ledger and Portfolio State Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make manual/CSV transactions traceable and replay an exact versioned Portfolio State.

**Architecture:** Extend Spring's existing ledger and persistence ports; stage imports before acceptance. Holdings remain derived from immutable accepted transactions, never from FastAPI or browser state.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL/Flyway, JUnit 5, Testcontainers.
**Focused tests:** Task 1 PortfolioLedgerServiceTest; Task 2 PortfolioCsvImportServiceTest; Task 3 PortfolioStateServiceTest and PortfolioStateRepositoryAdapterTest.

**Plan Set:** 2 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Execution status (2026-10-15):** Blocked for full delivery. The PRD-FR-011/014 verification slices may proceed against the available product contract; EPIC-001 stable identity and the OQ-5/OQ-8 CSV, state, and recovery decisions are absent.
**Verification progress (2026-10-17):** PRD-FR-011 fixture `PortfolioTransactionLineageTest` (stable id, MANUAL source, holdings after commit and readback) and PRD-FR-014 holdings/basis/realized replay fixture `PortfolioLedgerReplayTest` pass with Testcontainers active; no production change was needed. At that date, exposure replay and the origin-locator field were not covered (no exposure model exists; Task 3 remains Blocked).
**Lineage update (2026-10-23):** Manual `originLocator` is now persisted through V8 and covered by `PortfolioTransactionLineagePersistenceTest` and the POST controller test. A shared GET response fixture now pins the backend JSON shape and frontend parser. The frontend transaction history displays the existing response's source and locator and marks an absent locator explicitly; no backend route or DTO field changed in this slice. Task 1 still depends on EPIC-001 stable identity, and CSV/state/recovery tasks remain gated by their named decisions.
**Verification re-run (2026-10-24):** `.\mvnw.cmd -Dtest="PortfolioTransactionLineageTest,PortfolioLedgerReplayTest" test` from `backend/` with Docker active: 2 run, 0 failures, 0 skipped (BUILD SUCCESS). Local Docker 29 needed `api.version=1.44` in `~/.docker-java.properties` for Testcontainers 1.20.6; no repository change. Scope unchanged: exposure replay remains uncovered and Task 3 stays Blocked; the origin locator is covered separately by the 2026-10-23 lineage update.
**Task 3 preparation (2026-10-25):** `PortfolioState`, `PortfolioStateService` (`project` and `stateAt`) and `PortfolioLedgerService.calculatePositions` derive positions, cost basis, realized activity (closed positions kept) and source event ids from accepted events, named by a content-addressed `pstate-v1` version; `DomainConfig` registers the service. `PortfolioStateServiceTest` (11 tests) failed to compile before implementation. Reordered and rescaled events give the same version; an added or changed event gives a new one, and the prior events still replay the prior state. Removing scale normalization, id ordering, or the price field from the hash each failed one test. `PortfolioStateRestartReplayTest` derives the same state and version from a new application context on the same PostgreSQL (same JVM, not a new process). Portfolio, wiring and architecture tests: 153 passed, 0 skipped. Not done: exposures (no formula or price evidence contract), state persistence and a state route (OQ-5), and OQ-8 backup/restore. Events can still be deleted through the transaction port, so a version is detectable but not guaranteed reproducible. Story order puts CSV staging (STORY-002-02) first, so this is preparation; Task 3 is not accepted.
**Depends On:** EPIC-001 identity; approved CSV/state contract and OQ-5/8 decisions where applicable.
**Produces:** Source-linked ledger events, staged idempotent CSV import, versioned Portfolio State and recovery evidence.
**Spec:** docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md; docs/product/PRD.md §9.2.

## Locked Decisions

- Accepted ledger events remain the source of holdings, basis, realized activity, and exposures.
- Invalid/conflicting CSV rows stay staged; repeated imports cannot duplicate accepted events.
- Downstream Fit/Decision Result names the exact Portfolio State version.

## Global Constraints

- Preserve current /api/v1/portfolios routes and DTO fields until OQ-5 disposition.
- New tables/constraints use a new Flyway migration, never edits to V1–V4.
- Do not transfer portfolio persistence to the data-service.

## Review Focus

- Restart preserves manual source lineage and identifiers (Task 1).
- Reordered/repeated CSV rows and concurrent acceptance do not duplicate events (Task 2).
- Corrections do not rewrite earlier state versions (Task 3).
- Missing provider prices do not invent exposures (Task 3).
- Backup/restore reproduces ledger and decision links within approved OQ-8 bounds (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PortfolioLedgerService.java | Modify | Accepted-event invariants and replay |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create CSV staging and Portfolio State models | Versioned domain values |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create staging/state ports | Persistence boundary |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioManagementController.java | Modify | Thin import/accept contract |
| backend/src/main/resources/db/migration/ | Create next unused migration | Unique import/event/state constraints |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Modify/create focused tests | Restart, replay, concurrency |

## Task 1: Prove manual event lineage

**Files:** Modify PortfolioLedgerService.java, PortfolioTransaction.java, portfolio adapter as needed; test domain/service/PortfolioLedgerServiceTest.java and adapter/inbound/rest/PortfolioManagementControllerTest.java.

**Interfaces:** Consumes EPIC-001 identity and existing POST /api/v1/portfolios/{portfolioId}/transactions; produces accepted event ID, source and origin locator without changing existing fields.

**Acceptance Evidence:** PRD-FR-011 persistence/restart fixture traces each manual event to its source.

The PRD-FR-011 verification fixture is Ready and may run before the blocked CSV/state contract decisions.

- [ ] Add failing test for stable ID, source lineage, and restart readback.
- [ ] Run focused Maven tests and record expected failure.
- [ ] Add only missing lineage behavior through ledger/persistence ports.
- [ ] Run focused and full backend tests; record Testcontainers skips.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Stage and reconcile CSV idempotently

**Files:** Create domain/service/PortfolioCsvImportService.java, staging model/port, persistence adapter/entity, and next unused migration; add controller DTO/route only after OQ-5; test PortfolioCsvImportServiceTest.java and persistence/controller tests.

**Interfaces:** Consumes approved CSV schema, source file/row identity, EPIC-001 instrument identity; produces staged batch with validation/conflict status and explicit acceptance result.

**Acceptance Evidence:** Bad rows stay staged; same or reordered import and concurrent accept create one ledger event per source identity.

- [ ] Add failing invalid-row, duplicate, conflict, re-import, and concurrency fixtures.
- [ ] Run focused tests and confirm staging/idempotency gaps.
- [ ] Implement normalized staging, reviewed acceptance, and database uniqueness in the new migration.
- [ ] Run focused/full backend suite and coordinated API consumer checks.
- [ ] Commit scoped Task 2 files with feat(backend) scope.

## Task 3: Replay Portfolio State and prove recovery

**Files:** Create domain/model/PortfolioState.java, domain/service/PortfolioStateService.java, domain/port/outbound/PortfolioStatePort.java and persistence adapter; test PortfolioStateServiceTest.java and restart/restore integration fixtures.

**Interfaces:** Consumes accepted ordered ledger events; produces immutable state ID, holdings, basis, realized activity, exposures, and source-event/version references for EPIC-004.

**Acceptance Evidence:** Reordered read, restart and restore reproduce the same state/hash; correction yields a new version; unavailable prices remain explicit.

The PRD-FR-014 ledger replay fixture is Ready; new state IDs and the recovery target still wait for their named contracts/OQ-8.

- [ ] Add failing replay, correction, missing-price, and restore fixtures.
- [ ] Run focused tests; verify missing version/replay behavior fails.
- [ ] Implement deterministic projection and state persistence through ports; document OQ-8 approved recovery procedure.
- [ ] Run full backend suite and timed encrypted backup/restore exercise before external evaluation.
- [ ] Commit scoped Task 3 files and recovery evidence with feat(backend) scope.

## Progress Note (2026-10-25)

Exists now on `feat/epic-002-ledger-state-csv`: validated and serialized ledger void (`409` when the remaining events do
not replay; journal delete in the same transaction, R-17), exposures and persisted Portfolio States with replay, CSV
staging and acceptance with row identity, and the per-portfolio ledger lock pinned to `READ COMMITTED` (R-13, R-18).
New code upper-cases with `Locale.ROOT` (R-19).

Still open: OQ-8 recovery targets and the timed backup/restore exercise; frontend handoff for the void `409` and the import/state routes.

Closed: R-21 (accept performance: 5,000 valid rows took 191 s with per-row replay and 23.5 s with chunked incremental
validation, against the 30 s target); R-11 (the manual route posting `source=CSV` without import lineage) by R-20; that value now returns `422`.

## Plan Exit Criteria

- [ ] PRD-FR-011/014 Ready verification and FR-012/013/015 implementation have fresh evidence.
- [ ] OQ-5 CSV/state DTO decision and OQ-8 recovery targets are recorded; otherwise affected tasks stay Blocked.
- [ ] Fit/Decision consumers can resolve an exact immutable Portfolio State version.

## Handoff to EPIC-003/004

Provide stable instrument mapping, event lineage and Portfolio State ID; research remains snapshot-owned by EPIC-001/003. FastAPI may calculate read-only analytics but cannot mutate portfolio state.

## Self-Review

Coverage: PRD-FR-011–015 and PRD-NFR-021 map to Tasks 1–3. Check import identity, state version, migration allocation, and approved recovery thresholds before execution.
