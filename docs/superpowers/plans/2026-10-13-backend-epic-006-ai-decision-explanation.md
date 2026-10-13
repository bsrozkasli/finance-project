# EPIC-006 AI Decision Explanation Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Attach grounded optional AI explanations to an unchanged deterministic Decision Result.

**Architecture:** Spring builds a prepared-metrics/evidence request for the existing sequential FastAPI analysts, validates the response, and persists a separate NarrativeAttachment. An independent disable switch and budget gate protect the core.

**Tech Stack:** Java 21, Spring Boot, Redis/PostgreSQL, JUnit 5; FastAPI/Pydantic contract tests.
**Focused tests:** Task 1 NarrativeInputAssemblerTest; Task 2 NarrativeAttachmentServiceTest; Task 3 AiInvocationGateTest.

**Plan Set:** 6 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Depends On:** EPIC-001/004/005; OQ-2 model-input rights, OQ-5 contract, OQ-6 budget, OQ-7 measurement.
**Produces:** Versioned NarrativeAttachment, explicit failure status, cost ledger.
**Spec:** docs/product/epics/EPIC-006-ai-decision-explanation.md; docs/product/PRD.md §9.6.

## Locked Decisions

- Agent input contains prepared metrics and immutable evidence references, no hidden provider fetch.
- Narrative cannot change facts, labels, limits, weights or Decision Result hash.
- Timeout/refusal/malformed/unsupported/outage yields unavailable or invalid attachment status.

## Global Constraints

- Preserve documented sequential analyst order and current agent route compatibility via OQ-5.
- Keep model and licensed-data costs separate; no synthetic claims/citations.
- Deterministic research works with AI disabled.

## Review Focus

- Prompt input cannot contain an unlicensed or unfrozen provider fact (Task 1).
- Unsupported factual claim fails validation (Task 2).
- Refusal/timeout/regeneration cannot mutate result hash (Task 2).
- AI disable switch leaves deterministic API useful (Task 3).
- Cost cap denial occurs before model invocation (Task 3).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/NarrativeAttachment.java | Create | Optional status/version |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/NarrativeAttachmentService.java | Create | Grounding and invariance |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create attachment/cost ports | Persistence/budget |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceAgentAnalysisAdapter.java | Modify | Prepared input/output mapping |
| backend/src/main/resources/db/migration/ | Create next unused migration | Attachment/cost history |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create tests | Adversarial/failure fixtures |

## Task 1: Restrict agent input

**Files:** Create NarrativeInputAssembler.java and test; modify DataServiceAgentAnalysisAdapter.java.
**Interfaces:** Consumes EPIC-004 Decision Result and EPIC-001 approved snapshot references; produces typed prepared metrics/reference payload for sequential FastAPI analysts.
**Acceptance Evidence:** Raw provider access and unsupported or unlicensed fields are absent from wire payload.

- [ ] Write failing adapter contract test for prepared-only input.
- [ ] Run focused tests and confirm old payload violates target fixture.
- [ ] Implement assembler/adapter mapping without changing analyst order.
- [ ] Run backend and affected FastAPI contract suites.
- [ ] Commit scoped Task 1 files with feat(agents) scope.

## Task 2: Validate and retain optional narrative

**Files:** Create NarrativeAttachment.java, NarrativeAttachmentService.java, port/adapter/migration and test.
**Interfaces:** Consumes Task 1 response plus evidence references; produces sourced claims or invalid/unavailable status, stored separately from Decision Result.
**Acceptance Evidence:** Unsourced claims fail; timeout/refusal/malformed/regeneration retain identical result hash and usable deterministic research.

- [ ] Write failing adversarial grounding and result-hash tests.
- [ ] Run focused tests and confirm failure.
- [ ] Implement schema/source validation and append-only attachment revisions.
- [ ] Run focused/full backend and FastAPI failure suites.
- [ ] Commit scoped Task 2 files with feat(agents) scope.

## Task 3: Enforce disable and cost budget

**Files:** Create AiInvocationGate.java, cost port/adapter and test; add independent AI configuration switch.
**Interfaces:** Consumes explicit EPIC-005 selection, OQ-6 monthly budget, model/data cost entries; produces allow/deny before invocation and separately accounted usage.
**Acceptance Evidence:** Disabled/over-budget run makes no LLM call; per-user model and licensed-data costs reconcile.

- [ ] Write failing switch, budget and separate-cost tests.
- [ ] Run focused tests and confirm ungated call.
- [ ] Implement gate and privacy-safe telemetry.
- [ ] Run backend suite and OQ-7 pilot measurement fixture.
- [ ] Commit scoped Task 3 files with feat(agents) scope.

## Plan Exit Criteria

- [ ] PRD-FR-036–039 and NFR-013 have source, failure, hash and cost proof.
- [ ] OQ-2/5/6/7 are effective; narrative remains optional under every failure.

## Handoff to EPIC-007

Monitoring may reference narrative status but derives event authority from evidence/decisions, never prose.

## Self-Review

Coverage: Tasks 1–3 map owned requirements; verify prepared-only input, independent attachment identity, failure status and budget-before-call ordering.
