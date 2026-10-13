# EPIC-008 Personal Investment Policy Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Retain consented Decision Events and enforce bounded personal-policy proposals without weakening deterministic rules.

**Architecture:** Spring owns consent, personal events/artifacts, validation, transitions, fallback and deletion. FastAPI may run stateless ranking/training; every artifact is user-scoped and backend-persisted.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL/Flyway, Redis, JUnit 5; FastAPI contract tests.
**Focused tests:** Task 1 LearningConsentServiceTest; Task 2 PersonalPolicyGateTest; Task 3 PersonalDataLifecycleServiceTest.

**Plan Set:** 8 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Status:** Deferred Post-V1; execution requires separate stage approval.
**Depends On:** EPIC-001/004/007, consent/retention schema, OQ-1/3/4/7.
**Produces:** DecisionEvent, PersonalPolicyAdjustment, artifact lifecycle, explicit-policy fallback.
**Spec:** docs/product/epics/EPIC-008-personal-investment-policy.md; docs/product/PRD.md §9.8.

## Locked Decisions

- Only post-consent explicit choices are labels; passive clicks, model-self-labels and cross-user data are excluded.
- FastAPI proposes soft adjustments; Spring alone enforces evidence, legal, transition and cap rules.
- Withdrawal/reset/deletion restores explicit-policy behavior and keeps core research usable.

## Global Constraints

- Do not start implementation before Post-V1 approval and personal-store inventory.
- Keep historical versions replayable except data covered by approved deletion/hold policy.
- Never raise deterministic/explicit weight caps or change Watch - Insufficient Evidence.

## Review Focus

- Pre-consent, passive and synthetic labels are rejected (Task 1).
- 19/20 and 29/30 decisions, eight-week/four-week shadow/three-month maturity boundaries fail closed (Task 2).
- Unlisted transition or cap increase is rejected (Task 2).
- Withdrawal/drift/timeout returns the explicit-policy result (Task 2).
- Deletion reaches caches, exports, backups and replay keys (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create consent/event/adjustment records | Versioned personal data |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/ | Create consent, proposal gate, lifecycle services | Backend authority |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create personal store/artifact ports | User-scoped I/O |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/ | Create adapters/entities | Events and artifacts |
| backend/src/main/resources/db/migration/ | Create next unused migration | Consent/event/artifact schema |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create tests | Consent, transition, erasure proof |

## Task 1: Capture complete consented Decision Events

**Files:** Create DecisionEvent.java, LearningConsentService.java, event port/adapter/migration and tests.
**Interfaces:** Consumes explicit consent and EPIC-004 Decision Result, snapshot/state/policy IDs plus all shown/rejected alternatives; produces point-in-time event eligible for learning only after consent.
**Acceptance Evidence:** Pre-consent/passive/self/cross-user labels are excluded; export lists every retained alternative and source.

- [ ] Write failing consent, alternative-completeness and invalid-label tests.
- [ ] Run focused Maven tests and confirm missing event contract.
- [ ] Implement consented append-only event capture through ports.
- [ ] Run focused/full backend and persistence restart tests.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Validate bounded model proposals

**Files:** Create PersonalPolicyAdjustment.java, PersonalPolicyGate.java and tests; add artifact port/adapter and FastAPI contract mapping.
**Interfaces:** Consumes versioned proposal, history/shadow/maturity record, EPIC-001 Evidence Strength and EPIC-004 base result; produces only allowed transition/soft cap reduction or unchanged explicit-policy result.
**Acceptance Evidence:** Threshold boundaries and every allowed/unlisted transition pass property fixtures; zero hard-policy violations and approval required; timeout/drift/reset withdraw influence.

- [ ] Write failing threshold, transition, hard-cap, insufficiency and fallback tests.
- [ ] Run focused tests and confirm current model has no authority gate.
- [ ] Implement proposal validation/persistence; keep training/inference stateless in FastAPI.
- [ ] Run backend/pytest suites and independent shadow-control fixtures.
- [ ] Commit scoped runtime changes atomically.

## Task 3: Provide rights, deletion and legal holds

**Files:** Create PersonalDataLifecycleService.java and tests; update every inventoried personal store/cache/export/backup adapter.
**Interfaces:** Consumes user withdrawal/correction/reset/delete request and approved retention decision; produces export, new corrected version or non-identifying deletion receipt.
**Acceptance Evidence:** Store-by-store erasure and replay termination; backup cryptographic expiry within 30 days or isolated approved hold with duty-end erasure.

- [ ] Write failing cross-store export/deletion, backup and hold tests from the inventory.
- [ ] Run focused tests and document which stores still retain data.
- [ ] Implement versioned correction, reset, withdrawal and erasure orchestration.
- [ ] Run backend suite, privacy fixtures and OQ-7 control comparison.
- [ ] Commit scoped Task 3 files with feat(backend) scope.

## Plan Exit Criteria

- [ ] PRD-FR-044–049/067–070 and NFR-006 have consent, guardrail, fallback and deletion proof.
- [ ] Post-V1, OQ-1/3/4/7 and retention approvals are recorded; otherwise remain Deferred.

## Handoff to EPIC-010

Provide user-scoped event/artifact inventory, consent and deletion mapping for tenant migration. No learned influence is assumed in V1.

## Self-Review

Coverage: Tasks 1–3 map all owned requirements. Verify exact threshold fixtures, allowed transitions, backup expiry and store inventory against the epic before execution.
