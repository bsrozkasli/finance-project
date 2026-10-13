# EPIC-005 Explainable Discovery Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replay deterministic screens and persist an explainable shortlist without candidate-wide AI runs.

**Architecture:** Spring screens EPIC-001's eligible point-in-time universe using versioned rules and evidence; the shortlist stores the originating screen. Full research delegates to EPIC-003 only for an explicit selection.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL/Flyway, JUnit 5, Testcontainers.
**Focused tests:** Task 1 DiscoveryScreenServiceTest; Task 2 ShortlistServiceTest; Task 3 SelectedResearchGateTest.

**Plan Set:** 5 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Depends On:** EPIC-001/003; OQ-2 rights, OQ-6 cost, OQ-7 measurement and OQ-8 stage gates.
**Produces:** ScreenRun and persistent ShortlistEntry contracts for EPIC-007.
**Spec:** docs/product/epics/EPIC-005-explainable-discovery.md; docs/product/PRD.md §9.5.

## Locked Decisions

- Screen authority is deterministic and runs before optional AI.
- Every returned match has rule/evidence reasons and a frozen universe/rule/snapshot version.
- Costly research requires an explicit user-selected candidate and request.

## Global Constraints

- Only licensed eligible point-in-time instruments enter the screen.
- Missing/rights-denied evidence is exposed or excluded by an approved rule, never zero-filled.
- Keep Spring as the browser-facing API and use OQ-5 for changed DTOs.

## Review Focus

- Delisted/reclassified symbols do not replay as current constituents (Task 1).
- Rights-denied or stale inputs cannot silently qualify (Task 1).
- Returned candidates cannot lack reasons (Task 1).
- Restart retains shortlist annotation and origin screen (Task 2).
- Batch screen invokes zero costly AI requests (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/DiscoveryScreenService.java | Create | Deterministic screen |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create ScreenRun/ShortlistEntry | Replay and selection identity |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create screen/shortlist ports | Persistence |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/ | Create adapters/entities | Durable runs and shortlist |
| backend/src/main/resources/db/migration/ | Create next unused migration | Screen/shortlist schema |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create tests | Replay, persistence, AI negative proof |

## Task 1: Replay eligible deterministic screens

**Files:** Create DiscoveryScreenService.java, ScreenRun.java and test; add OQ-5-approved REST adapter.
**Interfaces:** Consumes EPIC-001 universe/snapshot/rights and approved rule version; produces ordered candidates with match and evidence reasons plus exclusions/missingness record.
**Acceptance Evidence:** Frozen inputs yield identical candidates/reasons, including delisted, stale and rights-denied fixtures.

- [ ] Write failing replay, eligibility, missingness and reason tests.
- [ ] Run focused Maven tests and confirm target contract failure.
- [ ] Implement pure rules and retained screen-run identity.
- [ ] Run focused/full backend suite and affected API consumer checks.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Persist shortlist origin

**Files:** Create ShortlistEntry.java, shortlist port/adapter/entity and migration; test ShortlistServiceTest.java and restart fixture.
**Interfaces:** Consumes selected ScreenRun/candidate and annotation; produces add/remove/list behavior preserving origin screen version.
**Acceptance Evidence:** Restart retains ordered entries, annotations and origin; research launch resolves the selected candidate.

- [ ] Write failing add/remove/annotation/restart tests.
- [ ] Run focused tests and confirm missing persistence behavior.
- [ ] Implement shortlist service and persistence through ports.
- [ ] Run focused/full backend suite and frontend contract checks.
- [ ] Commit scoped Task 2 files with feat(backend) scope.

## Task 3: Gate expensive research

**Files:** Create domain/service/SelectedResearchGate.java and test; modify agent/research orchestration only through approved API contract.
**Interfaces:** Consumes explicit request, selected candidate, OQ-2 model-input rights and OQ-6 cost budget; produces allow/deny and invocation audit ID.
**Acceptance Evidence:** Every costly invocation maps to one request/selection; screen-only flow invokes none.

- [ ] Write failing negative batch-AI and absent-selection tests.
- [ ] Run focused tests to expose ungated invocation.
- [ ] Implement gate and cost/audit event before AI boundary.
- [ ] Run full backend suite, stubbed AI check and OQ-7 activation measurement fixture.
- [ ] Commit scoped Task 3 files with feat(backend) scope.

## Plan Exit Criteria

- [ ] PRD-FR-032–035 have replay, persistence and cost-gate evidence.
- [ ] OQ-2/6/7/8 gates are recorded before external promotion.

## Handoff to EPIC-006/007

Provide selected candidate, ScreenRun and ShortlistEntry IDs. AI consumes only explicit selection; monitoring consumes retained shortlist membership.

## Self-Review

Coverage: Tasks 1–3 map every owned FR. Verify point-in-time identity, reason completeness, restart and no-batch-AI fixtures against the epic.
