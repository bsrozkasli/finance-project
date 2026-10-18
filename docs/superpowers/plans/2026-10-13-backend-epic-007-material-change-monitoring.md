# EPIC-007 Material Change Monitoring Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Generate timely, auditable, low-noise evidence-change summaries and bounded alerts.

**Architecture:** A thin Spring scheduler compares retained evidence versions for holdings, decisions and shortlist entries. Pure classification/dedup services retain event history; generation and delivery switches are independent.

**Tech Stack:** Java 21, Spring Boot scheduling, PostgreSQL/Flyway, JUnit 5, Testcontainers.
**Focused tests:** Task 1 MaterialChangeServiceTest; Task 2 AlertDeduplicationServiceTest; Task 3 MaterialChangeDeliveryServiceTest.

**Plan Set:** 7 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Execution status (2026-10-15):** Blocked. EPIC-001/002/004/005 outputs and approved rights, OQ-7 event dictionary, and OQ-8 release/rollback evidence are absent.
**Depends On:** EPIC-001/002/004/005; approved rights, OQ-7 event dictionary, OQ-8 release/rollback.
**Produces:** MaterialChangeEvent, daily summary, deduplicated alert history and switches.
**Spec:** docs/product/epics/EPIC-007-material-change-monitoring.md; docs/product/PRD.md §9.7.

## Locked Decisions

- High priority is limited to earnings/filings, deterministic limit breaches, provider-confirmed corporate events and critical evidence staleness.
- Equivalent alerts are suppressed with explanation; underlying events remain retained.
- Independent generation/delivery disablement cannot interrupt core research.

## Global Constraints

- Classify only source-confirmed, time-qualified events; no ordinary-news escalation.
- Preserve notification routes until OQ-5 disposition and use new Flyway migrations.
- No alert process may rewrite evidence, ledger, shortlist or Decision Result history.

## Review Focus

- Delayed/unverified event cannot become high severity (Task 1).
- Same asset/event/evidence version yields one deliverable alert (Task 2).
- Dedup suppression retains auditable history/reason (Task 2).
- Generation-off and delivery-off each prevent their own stage after restart (Task 3).
- 24-hour clock starts from approved successful ingestion event (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/MaterialChangeService.java | Create | Evidence diff/classification |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AlertDeduplicationService.java | Create | Identity and suppression |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/MaterialChangeEvent.java | Create | Versioned event |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/scheduler/ | Create thin monitoring job | Generation trigger |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/ | Create event/summary adapters | History |
| backend/src/main/resources/db/migration/ | Create next unused migration | Event/dedup keys |

## Task 1: Detect and classify versioned changes

**Files:** Create MaterialChangeService.java, MaterialChangeEvent.java and tests; create thin scheduler adapter.
**Interfaces:** Consumes prior/new EPIC-001 evidence, EPIC-002 holdings, EPIC-004 decisions, EPIC-005 shortlist; produces event with both versions, observation time and approved class.
**Acceptance Evidence:** Each allowed class passes; ordinary news, stale/unverified events and unsupported classes fail high-priority gate.

- [ ] Write failing approved/forbidden-class and version-diff tests.
- [ ] Run focused Maven tests and confirm target detection gap.
- [ ] Implement pure comparison/classification and thin scheduled trigger.
- [ ] Run focused/full backend suite.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Deduplicate without erasing history

**Files:** Create AlertDeduplicationService.java, event port/adapter/entity/migration and tests.
**Interfaces:** Consumes asset/event/evidence-version key; produces deliver or suppressed-with-reason record and retained raw event.
**Acceptance Evidence:** Equivalent replay delivers once; measured duplicate rate remains below 2% on approved OQ-7 fixture.

- [ ] Write failing duplicate, reorder, concurrency and history-retention tests.
- [ ] Run focused tests and verify duplicate behavior fails.
- [ ] Implement idempotent key and suppression audit.
- [ ] Run focused/full backend persistence tests.
- [ ] Commit scoped Task 2 files with feat(db) scope.

## Task 3: Deliver daily summaries under independent switches

**Files:** Create MaterialChangeDeliveryService.java and tests; update notification adapter/configuration.
**Interfaces:** Consumes retained events and separate generation/delivery/provider/AI switches; produces daily summary with prior/new evidence and measured availability timestamp.
**Acceptance Evidence:** Eligible changes surface within OQ-7/8 approved 24-hour window; switch drills preserve history and research.

- [ ] Write failing timing, generation-off, delivery-off and restart tests.
- [ ] Run focused tests and confirm target switch/timing gap.
- [ ] Implement summary delivery and independent switch checks.
- [ ] Run backend suite, applicable notification smoke and OQ-8 rollback drill.
- [ ] Commit scoped Task 3 files with feat(backend) scope.

## Plan Exit Criteria

- [ ] PRD-FR-040–043 and NFR-010/012 have reproducible event, timing and switch evidence.
- [ ] Rights and OQ-7/8 records are approved; otherwise external alerting stays disabled.

## Handoff to Post-V1

Keep personalization switch independent for EPIC-008. Later broker/SaaS work must preserve event identity, history and tenant ownership.

## Self-Review

Coverage: Tasks 1–3 map owned requirements; verify no unsupported priority, retained suppression record, independent switches and approved clock definition.
