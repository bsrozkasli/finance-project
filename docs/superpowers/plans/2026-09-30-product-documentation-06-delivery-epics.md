# Product Documentation Plan 6 — Delivery Epic Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define `EPIC-001` through `EPIC-010` as traceable user outcomes with explicit phase, dependency, risk, success-evidence, and later story-planning boundaries.

**Architecture:** Build epics in dependency order from finalized PRD requirements and gap ownership. Each epic owns a non-overlapping outcome and a proposed story plan, while detailed story files remain deferred to separate epic-specific planning.

**Tech Stack:** Markdown, Python product-document validator, Git

**Plan Set:** Plan 6 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Plan 5 EPIC-000 verification package and Plan 4 gap ownership.

**Produces:** The ten delivery epic files for trusted core, Value MVP, personalization, broker synchronization, and SaaS scale.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- Phase 1 dependency order is `EPIC-001 -> EPIC-002 -> EPIC-003 -> EPIC-004`.
- Phase 2 Value MVP contains `EPIC-005` through `EPIC-007`.
- `EPIC-008` is post-V1 bounded personalization; `EPIC-009` and `EPIC-010` remain explicitly deferred from Value MVP.
- `EPIC-009` is read-only broker synchronization; execution, order routing, and write-back are out of scope.
- Detailed story files for these epics require separate, epic-specific plans after catalog review.

## Global Constraints

- Each PRD/gap row has one primary epic owner; do not duplicate requirement ownership.
- Epic files describe outcomes and acceptance evidence, not implementation status.
- Deterministic analytics remain authoritative; AI explanations and personalization are bounded attachments/policy inputs.
- Preserve graceful degradation, provenance, financial-correctness, legal, and data-rights gates.
- Preserve and exclude the user's `data-service/external/TradingAgents` working-tree change.

## Review Focus

- Duplicate requirement ownership across epics must fail traceability validation.
- A deferred capability represented as Value-MVP scope must be rejected.
- AI or personalization that can override deterministic safety policy must remain out of scope.
- A story-plan entry without a unique proposed ID, outcome, or dependency must be rejected.
- An epic with success language but no reproducible acceptance evidence must remain incomplete.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/product/epics/EPIC-001-trusted-market-evidence.md` | Create | Trusted, provenance-rich market evidence. |
| `docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md` | Create | Ledger-derived holdings and portfolio state. |
| `docs/product/epics/EPIC-003-end-to-end-asset-research.md` | Create | Connected stock/ETF research workflow. |
| `docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md` | Create | Deterministic investment quality and marginal portfolio fit. |
| `docs/product/epics/EPIC-005-explainable-discovery.md` | Create | Deterministic universe screening and shortlist explanations. |
| `docs/product/epics/EPIC-006-ai-decision-explanation.md` | Create | Optional grounded narrative attached to authoritative decisions. |
| `docs/product/epics/EPIC-007-material-change-monitoring.md` | Create | Low-noise thesis and portfolio monitoring. |
| `docs/product/epics/EPIC-008-personal-investment-policy.md` | Create | Consented, bounded personal policy learning. |
| `docs/product/epics/EPIC-009-read-only-broker-synchronization.md` | Create | Staged, validated, read-only broker reconciliation. |
| `docs/product/epics/EPIC-010-saas-identity-and-isolation.md` | Create | Deferred identity, isolation, subscription, and SaaS operations. |

---

## Task 1: Define Trusted-Core Epics

**Files:**
- Create: `docs/product/epics/EPIC-001-trusted-market-evidence.md`
- Create: `docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md`
- Create: `docs/product/epics/EPIC-003-end-to-end-asset-research.md`
- Create: `docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md`
- Consume read-only: `docs/product/PRD.md` and `docs/product/CAPABILITY_GAP_MAP.md`.

**Interfaces:**
- Consumes: requirements and gap rows owned by `EPIC-001` through `EPIC-004`.
- Produces: Phase 1 boundaries and ordered proposed story IDs/outcomes/dependencies.
- Preserves: dependency order and non-overlapping primary ownership.

**Acceptance Evidence:**
- Every required epic section is populated and every Phase 1 gap row has exactly one owner.
- Story Plan sections propose unique story IDs but create no story files.

- [ ] **Step 1: Confirm the four epic artifacts are absent or explicitly resume them**

Run: `Get-ChildItem docs/product/epics/EPIC-00[1-4]-*.md -ErrorAction SilentlyContinue`

Expected: no files, or documented partial states for each returned file.

- [ ] **Step 2: Write the four independent user outcomes**

Populate Outcome, Problem, Scope, Out of Scope, Requirements, Dependencies, Risks, Success Evidence, and Story Plan for each epic while preserving `001 -> 002 -> 003 -> 004`.

- [ ] **Step 3: Add proposed story-plan entries**

For each epic list unique story IDs, one-sentence outcomes, dependencies, and the reason detailed stories wait for a separate epic plan.

- [ ] **Step 4: Validate and commit Phase 1 epics**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; every Phase 1 row has one owner.

```powershell
git add docs/product/epics/EPIC-001-trusted-market-evidence.md docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md docs/product/epics/EPIC-003-end-to-end-asset-research.md docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md
git diff --cached --check
git commit -m "docs(spec): define trusted-core epics"
```

---

## Task 2: Define Value-MVP Epics

**Files:**
- Create: `docs/product/epics/EPIC-005-explainable-discovery.md`
- Create: `docs/product/epics/EPIC-006-ai-decision-explanation.md`
- Create: `docs/product/epics/EPIC-007-material-change-monitoring.md`

**Interfaces:**
- Consumes: requirements and gap rows owned by `EPIC-005` through `EPIC-007`, plus trusted-core outputs.
- Produces: Phase 2 outcome boundaries and proposed story plans.
- Preserves: deterministic discovery/decision authority and bounded AI/monitoring behavior.

**Acceptance Evidence:**
- Discovery defines universe/data-rights/cost boundaries; AI explanation defines outage/invalid-response behavior; monitoring defines event priority, deduplication, timeliness, usefulness, and disable fallback.
- Every Value-MVP gap row has exactly one owner.

- [ ] **Step 1: Write the explainable-discovery epic**

Define the point-in-time U.S. stock/eligible ETF universe, deterministic screen, shortlist, explanations, batch-cost boundary, survivorship controls, and data-rights evidence.

- [ ] **Step 2: Write the AI-decision-explanation epic**

Keep `DecisionResult` authoritative and `NarrativeAttachment` optional. Require provenance, counter-thesis, cost, outage, and invalid-response evidence.

- [ ] **Step 3: Write the material-change-monitoring epic**

Define daily summaries, high-priority events, duplicate suppression, 24-hour delivery, usefulness measurement, and alert-disable fallback.

- [ ] **Step 4: Validate and commit Phase 2 epics**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`.

```powershell
git add docs/product/epics/EPIC-005-explainable-discovery.md docs/product/epics/EPIC-006-ai-decision-explanation.md docs/product/epics/EPIC-007-material-change-monitoring.md
git diff --cached --check
git commit -m "docs(spec): define value-mvp epics"
```

---

## Task 3: Define Personalization and Deferred-Scale Epics

**Files:**
- Create: `docs/product/epics/EPIC-008-personal-investment-policy.md`
- Create: `docs/product/epics/EPIC-009-read-only-broker-synchronization.md`
- Create: `docs/product/epics/EPIC-010-saas-identity-and-isolation.md`

**Interfaces:**
- Consumes: requirements and gap rows owned by `EPIC-008` through `EPIC-010`.
- Produces: Phase 3/4 outcomes and proposed story plans with explicit deferred gates.
- Preserves: consent, deterministic enforcement, deletion, read-only broker scope, tenant isolation, and Value-MVP exclusions.

**Acceptance Evidence:**
- `EPIC-008` includes shadow gates and fallback; `EPIC-009` excludes execution/write-back; `EPIC-010` includes isolation, legal/data-rights, deletion/retention, and gross-margin gates.
- All `EPIC-009` and `EPIC-010` requirements remain `Deferred` from Value MVP.

- [ ] **Step 1: Write the personal-investment-policy epic**

Include explicit policy, consented event capture, pairwise ranker, bounded calibrator, shadow evaluation, deterministic backend enforcement, deletion, legal review, and fallback.

- [ ] **Step 2: Write the read-only broker-synchronization epic**

Limit scope to staging, validation, deduplication, reconciliation, and ledger-derived holdings; exclude execution and write-back.

- [ ] **Step 3: Write the SaaS identity/isolation epic**

Include account ownership, tenant isolation, subscriptions/pricing, legal/data rights, model-artifact ownership, deletion/retention, and gross-margin gates.

- [ ] **Step 4: Validate and commit Phase 3/4 epics**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; deferred status and unique ownership are preserved.

```powershell
git add docs/product/epics/EPIC-008-personal-investment-policy.md docs/product/epics/EPIC-009-read-only-broker-synchronization.md docs/product/epics/EPIC-010-saas-identity-and-isolation.md
git diff --cached --check
git commit -m "docs(spec): define personalization and scale epics"
```

## Plan Exit Criteria

- [ ] All ten delivery epics exist with required sections.
- [ ] Every non-verification PRD/gap row has exactly one primary epic owner.
- [ ] Phase/dependency/deferred boundaries match the approved foundation.
- [ ] Each Story Plan uses unique proposed IDs and clearly defers detailed story creation.
- [ ] Incremental product-document validation exits `0`.

## Handoff to Plan 7

- Inputs made available: the complete eleven-epic catalog, `EPIC-000` stories, phases, dependencies, risks, and proposed story plans.
- Conditions Plan 7 may assume: the catalog is traceable and detailed stories for `EPIC-001` through `EPIC-010` are intentionally absent.
- Open risk carried forward: epic-specific story plans require separate approval and must re-check any unresolved policy/legal gates.

## Self-Review

**Spec coverage:** All ten target delivery outcomes and their approved phases are owned; detailed feature stories remain intentionally out of scope.

**Step scan:** Trusted core, Value MVP, and deferred scale are independent review gates with atomic commits.

**Type and name consistency:** Epic IDs, filenames, phase ordering, statuses, gap ownership, and Story Plan conventions match Plans 4-5.

**Review focus:** Unique ownership, deferred scope, deterministic authority, story-plan identity, and acceptance evidence are explicitly validated.

**Proportion:** The plan fixes epic boundaries and proof without pre-writing epic content or implementation stories.
