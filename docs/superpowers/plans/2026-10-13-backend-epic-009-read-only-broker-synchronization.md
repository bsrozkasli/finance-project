# EPIC-009 Read-Only Broker Synchronization Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Stage read-authorized broker data and reconcile it against the authoritative ledger without execution capability.

**Architecture:** A Spring outbound read-only port fetches broker records into staging; a pure reconciliation service proposes differences. Only explicit reviewed acceptance uses EPIC-002's ledger contract.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL/Flyway, JUnit 5, Testcontainers.
**Focused tests:** Task 1 BrokerImportServiceTest; Task 2 BrokerReconciliationServiceTest; Task 3 BrokerReadOnlyBoundaryTest.

**Plan Set:** 9 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Status:** Deferred Post-V1; execution requires separate stage and broker-rights approval.
**Depends On:** EPIC-001 identity, EPIC-002 ledger; broker agreement, read-scope threat review, OQ-5/8.
**Produces:** Staged broker import, reviewed ledger proposals, negative no-order-write proof.
**Spec:** docs/product/epics/EPIC-009-read-only-broker-synchronization.md; docs/product/PRD.md §9.9.

## Locked Decisions

- Broker records never replace Portfolio State or overwrite ledger events.
- No order scope, order endpoint, execution credential or broker write-back route exists.
- Conflicts require explicit resolution before reviewed ledger changes.

## Global Constraints

- Do not implement in Value MVP or without broker rights/security approval.
- Reuse EPIC-001 identity and EPIC-002 ledger invariants.
- Stage source, observation time, account mapping and import version; never fabricate missing history.

## Review Focus

- Partial history, splits, transfers and reversals cannot silently match (Task 1/2).
- Reordered duplicate imports cannot duplicate ledger events (Task 1/2).
- Cost-basis or identifier conflict remains staged until reviewed (Task 2).
- Disconnect/restart leaves ledger-derived state unchanged (Task 2).
- Credential, route and adapter tests prove no order-write path (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/BrokerReadPort.java | Create | Read-only boundary |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/BrokerReconciliationService.java | Create | Staging and proposals |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create import/conflict records | Provenance |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/ | Create broker read/persistence adapters | Least-scope access |
| backend/src/main/resources/db/migration/ | Create next unused migration | Staged imports and audit |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create tests | Reconciliation and negative security |

## Task 1: Stage validated broker records

**Files:** Create BrokerReadPort.java, BrokerImport.java, import adapter/entity/migration and tests.
**Interfaces:** Consumes read-authorized records and account/identity mapping; produces normalized staged rows with source/time/version, duplicate and validation state.
**Acceptance Evidence:** Invalid, conflicting and duplicate rows remain staged and create no ledger event.

- [ ] Write failing schema, identity, duplicate and partial-history tests.
- [ ] Run focused Maven tests and confirm no staging boundary.
- [ ] Implement read-only import adapter and durable staging.
- [ ] Run focused/full backend suite with stubbed broker boundary.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Reconcile through reviewed ledger proposals

**Files:** Create BrokerReconciliationService.java and tests; add OQ-5-approved review/accept REST mapping.
**Interfaces:** Consumes Task 1 staged rows and exact EPIC-002 ledger/state version; produces proposed match/conflict/resolution and accepts only reviewed changes through ledger service.
**Acceptance Evidence:** Conflicts, reordered data and disconnect leave holdings unchanged until approval; accepted proposal is idempotent.

- [ ] Write failing conflict, no-overwrite, acceptance and restart tests.
- [ ] Run focused tests and confirm unsafe/missing path.
- [ ] Implement comparison and reviewed ledger command with audit identity.
- [ ] Run backend suite and coordinated API consumer checks.
- [ ] Commit scoped Task 2 files with feat(backend) scope.

## Task 3: Prove absence of execution capability

**Files:** Test broker adapter/configuration, controller route registry and credential scopes; update security configuration only for least read privilege.
**Interfaces:** Consumes approved broker read-scope policy; produces negative evidence that no write scope/endpoint/credential exists.
**Acceptance Evidence:** Permission, route and credential tests reject order creation and write-back.

- [ ] Write failing negative scope/endpoint/security tests.
- [ ] Run focused tests and capture unauthorized capability if present.
- [ ] Restrict adapter and credentials to approved read scope.
- [ ] Run full backend/security suite and OQ-8 review.
- [ ] Commit scoped Task 3 files with test(backend) or feat(backend) scope.

## Plan Exit Criteria

- [ ] PRD-FR-050/051 have staging, reconciliation and negative execution proof.
- [ ] Post-V1, broker rights, OQ-5/8 and conflict policy are approved; otherwise remain Deferred.

## Handoff to EPIC-010

Provide account ownership of staged broker records and review audit; tenant migration cannot infer an owner from a broker symbol alone.

## Self-Review

Coverage: Tasks 1–3 map both owned FRs. Verify no latent order scope and no silent ledger overwrite before execution.
