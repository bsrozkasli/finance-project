# EPIC-004 Investment Quality and Portfolio Fit Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Produce a deterministic, replayable Decision Result that separates standalone quality from marginal Portfolio Fit.

**Architecture:** FastAPI supplies versioned pure asset analytics; Spring owns explicit policy, Fit, evidence/legal gates, labels, persistence and the authoritative API. Narrative is a separate optional attachment.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL/Flyway, JUnit 5, Testcontainers; FastAPI contract fixtures.
**Focused tests:** Task 1 InvestmentQualityServiceTest; Task 2 PortfolioFitServiceTest; Task 3 DecisionPolicyServiceTest; Task 4 DecisionReplayServiceTest.

**Plan Set:** 4 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Depends On:** EPIC-001 evidence, EPIC-002 Portfolio State, EPIC-003 research; OQ-1/3/4/5.
**Produces:** InvestmentQuality, PortfolioFit, UserPolicy, DecisionResult and DecisionCard versions for later epics.
**Spec:** docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md; docs/product/PRD.md §9.4.

## Locked Decisions

- Investment Quality is independent of portfolio state; Fit uses the exact Portfolio State version.
- Backend hard limits, evidence and legal gates outrank analytics, AI and learned preferences.
- Watch - Insufficient Evidence suppresses directional outlook, expected return, action-oriented Fit and weight.

## Global Constraints

- No external policy-conditioned label/weight before effective OQ-1 approval.
- OQ-4 owns formula/threshold values; do not derive them from current agent decision/confidence fields.
- Preserve legacy routes/DTOs until OQ-5 all-consumer migration.

## Review Focus

- A portfolio change cannot alter standalone quality (Task 1).
- A hard cap or missing User Policy cannot yield Add (Task 2/3).
- Owned/unowned illegal label combinations fail (Task 3).
- Wrong jurisdiction, expired approval or insufficient evidence suppresses output (Task 3).
- Provider/policy/AI changes do not rewrite retained structured results (Task 4).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create quality, Fit, policy and decision records | Immutable typed results |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/ | Create Quality, Fit and Decision services | Pure authoritative rules |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/port/outbound/ | Create policy/result persistence ports | Versioned boundaries |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/ | Create adapters/entities | Retained replay data |
| backend/src/main/resources/db/migration/ | Create next unused migration(s) | Policy/result/card schema |
| backend/src/test/java/com/ozkaslibasar/financeproject/ | Create focused tests | Independent values and replay |

## Task 1: Separate Investment Quality

**Files:** Create InvestmentQuality.java, InvestmentQualityService.java and test; extend DataServiceResearchAdapter contract for versioned pure stock/ETF analytics.

**Interfaces:** Consumes EPIC-003 snapshot/horizon/metric version; produces standalone quality ID and applicable asset-model version, with no Portfolio State input.

**Acceptance Evidence:** Same snapshot/horizon returns identical quality across distinct portfolio fixtures; independent OQ-4 formula values cover missingness/rounding.

- [ ] Write failing portfolio-independence and independently calculated value tests.
- [ ] Run focused Maven tests and confirm missing service/contract failure.
- [ ] Implement quality mapping/gates and FastAPI contract adaptation.
- [ ] Run focused/full backend and affected data-service tests.
- [ ] Commit scoped Task 1 files with feat(backend) scope.

## Task 2: Compute marginal Portfolio Fit

**Files:** Create UserPolicy.java, PortfolioFit.java, PortfolioFitService.java and tests; add versioned policy persistence and migration.

**Interfaces:** Consumes Task 1 quality, exact EPIC-002 Portfolio State ID, approved OQ-4 Fit policy and explicit user risk/horizon/cap/exclusion inputs; produces separate marginal effects and hard-block reason.

**Acceptance Evidence:** Concentration, diversification, correlation, sector/factor overlap, liquidity and drawdown boundaries each show their effect; missing/inconsistent policy suppresses action Fit.

- [ ] Write failing independent hard-cap, missing-policy and state-version tests.
- [ ] Run focused Maven tests and confirm target Fit contract failure.
- [ ] Implement versioned policy and marginal Fit through pure domain service/ports.
- [ ] Run focused/full backend and persistence restart tests.
- [ ] Commit scoped Task 2 files with feat(backend) scope.

## Task 3: Enforce decision and legal gates

**Files:** Create DecisionPolicyService.java, DecisionResult.java, LegalApprovalRecord.java and tests; add OQ-5-approved REST mapping.

**Interfaces:** Consumes Tasks 1–2, EPIC-001 Evidence Strength and effective legal/disclosure versions; produces Add/Hold/Reduce/Avoid/Watch with separate horizon outlooks, valuation zone, support/risk, weight or suppression reason.

**Acceptance Evidence:** Owned/unowned table rejects invalid labels; every mandatory failure yields Watch - Insufficient Evidence; expired/revoked/wrong-jurisdiction approval denies external labels/weights.

- [ ] Write failing ownership, evidence, legal, hard-limit and no-leak contract tests.
- [ ] Run focused tests and capture failure.
- [ ] Implement deterministic gate order and thin REST mapping; do not use agent DTO as authority.
- [ ] Run focused/full backend and coordinated frontend/API checks.
- [ ] Commit scoped Task 3 files with feat(backend) scope.

## Task 4: Retain replayable results and cards

**Files:** Create DecisionCard.java, DecisionResultPort.java and persistence adapter/entity/migration; test DecisionReplayServiceTest.java and repository integration test.

**Interfaces:** Consumes full snapshot, analytics, state, user policy, benchmark, Fit, decision-policy, optional model ID or none, legal/disclosure versions; produces immutable replay key, result hash, thesis/counter-thesis and quantitative invalidation thresholds.

**Acceptance Evidence:** Byte-equivalent structured replay after provider/policy changes; AI on/off/regeneration leaves hash unchanged; frozen point-in-time outcome suite covers bias, costs and regimes.

- [ ] Write failing complete-key, mismatch, restart, AI-independence and threshold tests.
- [ ] Run focused tests and confirm replay gaps.
- [ ] Implement append-only result/card persistence and reconstruction.
- [ ] Run backend suite, cross-runtime contract tests and independent OQ-4 outcome fixtures.
- [ ] Commit scoped Task 4 files with feat(db) or feat(backend) scope.

## Plan Exit Criteria

- [ ] PRD-FR-024–031/055/065/066/071 and owned NFRs have reproducible evidence.
- [ ] OQ-1/3/4/5 records are effective; without them external directional output remains suppressed.
- [ ] Full replay key and Decision Result hash are available to EPIC-006/007.

## Handoff to EPIC-005/006/007

Provide immutable Decision Result/Card IDs, gate outcome and evidence references. Discovery cannot invent scoring; narrative and monitoring cannot alter the structured result.

## Self-Review

Coverage: Tasks 1–4 map PRD-FR-024–031/055/065/066/071 and NFR-003/004/009/014/018. Recheck policy versions, OQ-5 consumers, legal expiry and replay-key completeness before execution.
