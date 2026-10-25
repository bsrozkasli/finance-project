# EPIC-001 Trusted Market Evidence Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deliver backend-owned eligible identity, immutable evidence, explicit quality/status, and rights-gated external use.

**Architecture:** Spring assembles and persists evidence through domain ports; provider normalization remains in FastAPI/adapters. Keep current price routes compatible and add versioned contracts only after OQ-5.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL/Flyway, JUnit 5, Testcontainers.
**Focused tests:** Task 1 InstrumentEligibilityServiceTest; Task 2 ResearchEvidenceServiceTest and ResearchEvidenceRepositoryAdapterTest; Task 3 EvidenceStrengthServiceTest; Task 4 DataRightsApprovalServiceTest; Task 5 IsolatedEvaluationAccessTest.

**Plan Set:** 1 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Execution status (2026-10-15):** In progress. `510982c` prevents missing provider composite scores from becoming fabricated `50` values and makes the frontend display them as unavailable. This does not satisfy any full task exit criterion: the OQ-2/3/5/8 closure records are absent.
**Verification progress (2026-10-17):** PRD-FR-010 cross-runtime evidence on branch `feat/backend-epic-001` (includes `510982c`), all with boundary stubs: data-service `pytest` 161 passed, 1 xfailed (C0a availability and failure-path suites); backend full suite 463 passed, 0 skipped with Testcontainers active, including `DataServiceFailureSemanticsTest` (price, metadata, research, agent adapters return absent/empty on 5xx, malformed, or incomplete bodies) and `SmartReportUseCaseTest`; frontend `StockDetailModal.test.tsx` (unavailable score display), `npm run lint`, `npm run test:coverage` (101 passed, 16 files) and `npm run build` green. Verification slice only; no Task 1-5 exit criterion is claimed.
**Task 1 progress (2026-10-17):** domain slice done: `InstrumentIdentity`, `SecurityMasterPort`, `InstrumentEligibilityService` (fail-closed; `InstrumentEligibilityServiceTest` 14 tests; backend suite 499 passed, 0 skipped). Not done: a `SecurityMasterPort` adapter and Spring bean wiring (OQ-2 must name the point-in-time master), and consuming eligibility from `AssetResolutionService`/REST (OQ-5 migration). Task 1 is therefore not accepted.
**Internal research slice (2026-10-23):** `CURRENT_OBSERVATION` now remains in the returned identity with source and retrieval time, but cannot make a stock or ETF eligible at any evaluation instant. A focused regression failed before the change; the final eligibility and architecture run passed 19 tests with no skips. Product-document validation passed in complete mode. The full backend run reported 539 tests, 0 failures and 24 Docker-dependent skips, but exceeded the required 120-second command limit and is not a passing full-suite gate. This is a domain-only safety rule; no provider data is retained, no security-master adapter or public eligibility consumer is added, and Task 1 remains blocked by OQ-2.
**Internal snapshot model slice (2026-10-23):** A pure domain `ResearchEvidenceService` creates in-memory revisions from supplied identity and fields. It preserves raw values or explicit missingness, source/retrieval/observation times, and period/currency/normalization/conflict notes where supplied. A revision has a new ID and links to its predecessor without altering it. Tests first failed for the absent model, repeated periods/sources, and impossible observation-after-retrieval time order, then passed after implementation. Focused model/architecture checks: 10 passed, 0 skipped. Backend full suite: 547 tests, 0 failures/errors, 24 Docker-dependent skips; product-document complete validation passed. This is preparation for Task 2, not Task 2 acceptance: it has no persistence/restart proof, provider ingestion, API or rights approval. OQ-2 and OQ-3 still gate retained evaluation and the approved field schema.
**Task 2 progress (2026-10-24):** domain slice done: `EvidenceField`, `ResearchEvidenceSnapshot`, `ResearchEvidencePort`, `ResearchEvidenceService` (`ResearchEvidenceServiceTest` 12 tests; red run failed to compile before implementation). Revising appends a new id and revision and leaves the prior snapshot replayable; a missing field never holds a value. Backend suite run in groups because the 120-second fork limit is exceeded with Docker active: 555 run, 0 failures, 0 skipped. Persistence slice (2026-10-24, [decision](../../product/decisions/2026-10-24-oq5-evidence-snapshot-persistence.md)): `V9__research_evidence_snapshots.sql`, `ResearchEvidenceRepositoryAdapter` and the `DomainConfig` bean; `ResearchEvidenceRepositoryAdapterTest` (6 tests, real PostgreSQL) and `DomainConfigWiringTest`; backend suite in groups 562 run, 0 failures, 0 skipped. Not done: a process-restart replay test, and Task 3 onward consumers of snapshot ids. Task 2 acceptance still needs the restart replay evidence.
**Decision update (2026-10-15):** The product owner selected `yfinance` for initial metadata observations and approved removing the unresolved-symbol `STOCK` fallback; see [the decision record](../../product/decisions/2026-10-15-instrument-identity-source-and-unresolved-type.md). Task 1 still needs point-in-time classification and use-rights evidence under OQ-2 plus a full OQ-5 consumer migration before acceptance.
**Depends On:** EPIC-000 baseline; OQ-2/3/5 closure for affected tasks.
**Produces:** InstrumentIdentity, ResearchEvidenceSnapshot, EvidenceStrength, section statuses, DataRightsApproval binding.
**Spec:** docs/product/epics/EPIC-001-trusted-market-evidence.md; docs/product/PRD.md §9.1.

## Locked Decisions

- No unresolved instrument becomes STOCK by default; stock and ETF eligibility use the licensed point-in-time master.
- Mandatory failure or critical conflict yields Insufficient; valid sections survive other section failures.
- External display needs effective dataset/use-specific rights; API availability alone grants none.

## Global Constraints

- Keep domain framework-free and public routes/DTOs compatible until OQ-5 migration.
- Add new Flyway migrations for persistence; preserve DB-first price loading.
- Never synthesize market evidence or call live providers in tests.

## Review Focus

- Delisted/reclassified symbols and unresolved ETF type fail closed (Task 1).
- Stale mandatory fields and low-weight optional coverage cannot mask Insufficient (Task 3).
- Partial, empty, rate-limited, and failed providers preserve only real evidence (Task 3).
- Expired/revoked/wrong-use rights suppress external output (Task 4).
- Snapshot revision never rewrites a retained evaluation (Task 2).
- Unauthenticated or unaccountable access cannot enter isolated evaluation (Task 5).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create focused identity, evidence, status, rights models | Immutable domain contracts |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/ | Create eligibility, snapshot, strength services | Pure rules |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create security-master/evidence/rights ports | I/O boundary |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/ | Create provider/persistence adapters | Licensed lookup and durable versions |
| backend/src/main/java/com/ozkaslibasar/financeproject/config/ | Verify/modify isolated access and telemetry | Security gate |
| backend/src/main/resources/db/migration/ | Create next unused migration(s) | Snapshot/rights schema |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create focused domain, adapter, and REST tests | Independent fixtures |

## Task 1: Classify eligible instruments

**Files:** Create domain/model/InstrumentIdentity.java, domain/port/outbound/SecurityMasterPort.java, domain/service/InstrumentEligibilityService.java; modify domain/service/AssetResolutionService.java; test domain/service/InstrumentEligibilityServiceTest.java and AssetResolutionServiceTest.java (all under backend/src).

**Interfaces:** Consumes symbol and evaluation instant; produces versioned identity, classification, source, and eligibility reason for Tasks 2–4. OQ-2 names the licensed master; OQ-5 disposes current STOCK/UNAVAILABLE compatibility.

**Acceptance Evidence:** Point-in-time fixtures cover supported stock/ETF and excluded, delisted, reclassified, unresolved instruments.

- [ ] Write tests asserting unresolved type never becomes eligible STOCK and supported types resolve at the fixture date.
- [ ] Run focused Maven tests; confirm the new eligibility assertion fails.
- [ ] Implement SecurityMasterPort and eligibility service; adapt asset resolution only within the approved OQ-5 contract.
- [ ] Run focused tests and .\mvnw.cmd test from backend/; record skips.
- [ ] Commit only Task 1 code/tests with feat(backend) scope.

## Task 2: Retain immutable evidence versions

**Files:** Create domain/model/ResearchEvidenceSnapshot.java, domain/port/outbound/ResearchEvidencePort.java, domain/service/ResearchEvidenceService.java and matching persistence entity/adapter; create the next unused Flyway migration; test ResearchEvidenceServiceTest.java and repository integration test.

**Interfaces:** Consumes Task 1 identity plus field values with source, observed/retrieved time, period, currency, normalization, freshness, conflict, and missingness; produces immutable snapshot ID/revision for later epics.

**Acceptance Evidence:** Restart/replay resolves the same version; revising creates a new ID and preserves prior fields.

- [ ] Write failing revision, provenance-completeness, and restart fixtures.
- [ ] Run focused service/repository tests; confirm failure before implementation.
- [ ] Implement snapshot assembly, append-only persistence, migration, and DomainConfig wiring.
- [ ] Run focused tests and full backend suite with Testcontainers active; report any skips.
- [ ] Commit only Task 2 files with feat(db) or feat(backend) scope.

## Task 3: Compute quality and preserve partial evidence

**Files:** Create domain/service/EvidenceStrengthService.java and its test; modify relevant research/price adapters and REST DTOs only per OQ-5; add cross-runtime stub fixtures.

**Interfaces:** Consumes Task 2 snapshot and approved OQ-3 stock/ETF policy; produces High/Medium/Low/Insufficient plus OK, STALE, EMPTY, FAILED, RATE_LIMITED, INSUFFICIENT_DATA, PENDING_REFRESH section states.

**Acceptance Evidence:** 90%/75% weighted thresholds, mandatory/critical gates, and all seven statuses; PRD-FR-010 wire fixtures prove no fabricated fields.

The PRD-FR-010 partial/failure wire fixtures may be run as a Ready verification slice before OQ-3; policy implementation still waits for OQ-3.

- [ ] Write failing policy-boundary and provider failure/partial contract tests.
- [ ] Run focused tests; confirm the target contract is absent.
- [ ] Implement deterministic quality/status mapping and preserve successful sections.
- [ ] Run focused tests, backend suite, and affected FastAPI/frontend contract checks.
- [ ] Commit scoped code/tests/contract changes with feat(backend) scope.

## Task 4: Gate rights and isolated evaluation

**Files:** Create domain/model/DataRightsApproval.java and domain/port/outbound/DataRightsApprovalPort.java; add backend persistence/gate tests, telemetry and security checks at outbound rendering boundary.

**Interfaces:** Consumes snapshot dataset/use/audience/territory and approved OQ-2 record; produces allow/deny plus recorded approval version. OQ-8 owns invitation/security/incident proof.

**Acceptance Evidence:** Wrong use, expiry, revocation, and missing delay label deny display; no secret or personal field leaks in telemetry.

- [ ] Write failing rights and no-leak fixtures.
- [ ] Run focused tests and capture expected denial mismatch.
- [ ] Implement rights lookup/binding and bounded telemetry; keep objective internal research usable.
- [ ] Run backend suite and applicable S1/S2/S3 smoke; retain OQ-8 exercise locators.
- [ ] Commit scoped Task 4 files with feat(backend) scope.

## Task 5: Prove isolated evaluation controls

**Files:** Create IsolatedEvaluationAccessTest.java; modify backend security/configuration and operations evidence only under approved OQ-8 design.

**Interfaces:** Consumes OQ-8 named access, secret, incident, rollback and recovery controls; produces denial/audit and dated exercise locators before invitations.

**Acceptance Evidence:** Unauthenticated access denied; individually attributable access audited; TLS/storage/secrets, vulnerability, backup/restore and history-safe rollback checks recorded.

- [ ] Write failing unauthenticated-denial and access-audit tests.
- [ ] Run focused tests and record the missing control.
- [ ] Implement approved isolated-access controls and privacy-safe telemetry.
- [ ] Run full backend/security checks and OQ-8 incident/recovery exercises.
- [ ] Commit scoped Task 5 code and evidence with feat(backend) scope.

## Plan Exit Criteria

- [ ] All five task fixtures and fresh backend checks pass without unexplained skips.
- [ ] EPIC-002/003 consume stable identity and snapshot IDs; external rights gates have approved records.
- [ ] OQ-2/3/5/8 and cross-runtime acceptance evidence are linked; otherwise keep the relevant slice Blocked.

## Handoff to EPIC-002/003

Provide immutable identity/snapshot/status/rights contracts and migration IDs. FastAPI must return source-aware normalized values; React must render status without manufacturing defaults. Benchmark, portfolio, and decision policies remain with later epics.

## Self-Review

Coverage: PRD-FR-001–010/072 and NFR-001/002/005/008/016/019/020/022/023 map to Tasks 1–5. Verify paths, policy versions, boundary fixtures, and OQ gates against the epic/gap map before execution; this plan adds no unapproved policy values.
