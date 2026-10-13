# EPIC-010 SaaS Identity and Isolation Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Enforce account ownership across product stores and operations, then gate shared/paid activation.

**Architecture:** Spring authorizes the resolved account at every read/write boundary; browser/data-service claims are not authority. Migrations explicitly map isolated records to owners while preserving provenance and replay.

**Tech Stack:** Java 21, Spring Boot security, PostgreSQL/Flyway, Redis, JUnit 5, Testcontainers.
**Focused tests:** Task 1 AccountAccessServiceTest; Task 2 TenantMigrationServiceTest; Task 3 EntitlementServiceTest.

**Plan Set:** 10 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Status:** Deferred Post-V1; execution requires separate tenant architecture and stage approval.
**Depends On:** EPIC-001/002/004/008 lifecycle; OQ-1/2/5/6/8 and tenant threat model.
**Produces:** Account-scoped authorization, reviewed migration, subscription/entitlement gate and isolation evidence.
**Spec:** docs/product/epics/EPIC-010-saas-identity-and-isolation.md; docs/product/PRD.md §9.10.

## Locked Decisions

- Backend ownership is authoritative across storage, cache, jobs, logs, support, exports and artifacts.
- Ambiguous/unowned records are quarantined, never implicitly assigned.
- Paid activation waits for legal, rights, privacy, cost, gross-margin, security and recovery gates.

## Global Constraints

- No shared SaaS or paid release is implied by local default-user routes.
- Preserve immutable snapshots, ledger, decision replay and consent mapping during migration.
- OQ-5 governs every affected route/DTO; no cross-user training or shared credentials.

## Review Focus

- URL or claimed user ID cannot read another tenant's record (Task 1).
- Cache/job/log/export/support/model-artifact paths cannot leak another tenant (Task 1).
- Collision or ambiguous legacy owner fails migration (Task 2).
- Rollback preserves source provenance and replay IDs (Task 2).
- Missing budget, entitlement or approval blocks paid activation (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/AccountOwnership.java | Create | Explicit owner identity |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AccountAccessService.java | Create | Ownership decision |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create ownership/migration/entitlement ports | Store boundaries |
| backend/src/main/java/com/ozkaslibasar/financeproject/config/ | Modify security, cache and job context | Authenticated boundary |
| backend/src/main/resources/db/migration/ | Create next unused migration(s) | Owner keys and migration audit |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create tests | Cross-tenant negatives |

## Task 1: Enforce ownership across all paths

**Files:** Create AccountOwnership.java, AccountAccessService.java and tests; update repository/cache/job/support/export/artifact adapters and Spring security configuration.
**Interfaces:** Consumes authenticated account principal; produces authorization decision before every owned read/write; rejects browser/data-service supplied owner overrides.
**Acceptance Evidence:** Cross-tenant negative matrix covers routes, stores, Redis keys, jobs, logs, support, exports and model artifacts.

- [ ] Write failing two-tenant access and owner-spoof tests for every inventoried path.
- [ ] Run focused Maven/security tests and record exposed path.
- [ ] Implement account-scoped ports/adapters and authenticated boundary.
- [ ] Run full backend suite plus cross-runtime isolation fixtures.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Migrate isolated records with replay intact

**Files:** Create owner mapping/migration service, migration audit model/adapter and next unused Flyway migration; test migration and rollback fixtures.
**Interfaces:** Consumes explicit legacy owner/consent map from EPIC-008 and existing record IDs; produces mapped tenant ownership with preserved evidence/ledger/decision replay IDs.
**Acceptance Evidence:** Counts reconcile; collision, missing owner or mismatched consent aborts; rollback restores prior serving state without losing history.

- [ ] Write failing counts, ambiguity, collision, provenance and rollback tests.
- [ ] Run focused integration tests and confirm migration gap.
- [ ] Implement staged mapping, quarantine and reversible cutover.
- [ ] Run backend suite and OQ-8 recovery/rollback exercise.
- [ ] Commit scoped Task 2 files with feat(db) scope.

## Task 3: Gate entitlements and paid activation

**Files:** Create EntitlementService.java and tests; add subscription/support/cost adapters only under approved OQ-6 commercial design.
**Interfaces:** Consumes authenticated account, entitlement, OQ-1/2 legal/rights versions, OQ-6 price/budget/gross-margin floor and OQ-8 security/recovery gate; produces paid activation allow/deny.
**Acceptance Evidence:** Any missing, expired or mismatched gate denies activation; approved path retains auditable decision.

- [ ] Write failing missing-approval, over-budget, wrong-entitlement and cost tests.
- [ ] Run focused tests and confirm activation is not yet safely gated.
- [ ] Implement fail-closed entitlement/paid gate and audit record.
- [ ] Run backend suite, cross-tenant privacy and full release-gate checks.
- [ ] Commit scoped Task 3 files with feat(backend) scope.

## Plan Exit Criteria

- [ ] PRD-FR-052–054 and NFR-007 have complete negative isolation and migration proof.
- [ ] Post-V1 and OQ-1/2/5/6/8 artifacts are effective; absent gates keep SaaS/paid operation Deferred.

## Handoff to Release Review

Provide tenant matrix, migration reconciliation, legal/rights/consent, entitlement, cost and recovery records with commands, results, dates, environment and locators. A passing unit suite alone cannot authorize paid release.

## Self-Review

Coverage: Tasks 1–3 map all owned requirements. Verify every personal store and operational path against the tenant threat model before execution.
