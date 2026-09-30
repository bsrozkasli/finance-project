# Product Documentation Plan 5 — EPIC-000 Verification Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the current-state verification epic and its complete six-story evidence package.

**Architecture:** `EPIC-000` packages the evidence work from Plans 2-3 into auditable product-delivery artifacts. The epic owns verification and documentation gaps only; feature behavior remains owned by `EPIC-001` through `EPIC-010`.

**Tech Stack:** Markdown, Python product-document validator, Git

**Plan Set:** Plan 5 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Plan 4 finalized PRD and capability gap map.

**Produces:** `EPIC-000` and six complete, evidence-linked story files.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- `EPIC-000` owns current-state verification, evidence, conflict reconciliation, and baseline publication—not new product behavior.
- The six stories are `STORY-000-01` through `STORY-000-06` in audit/dependency order.
- A story may be marked complete only when its referenced evidence artifact and validation result satisfy every acceptance criterion.
- Verification failures remain evidence; they are not hidden by weakening acceptance criteria or modifying production code.

## Global Constraints

- Use the epic and story sections mandated by `docs/product/CONTRIBUTING.md`.
- Keep current evidence separate from target requirements and delivery promises.
- Every acceptance criterion must point to a real artifact, command, ID, or reviewable outcome.
- Do not add implementation stories for `EPIC-001` through `EPIC-010` in this plan.
- Preserve and exclude the user's `data-service/external/TradingAgents` working-tree change.

## Review Focus

- A story marked complete without its artifact or passing validation must be rejected.
- A story that introduces feature behavior instead of verification must be moved to its feature epic.
- A current-state ID referenced without an owning evidence record must fail validation.
- Story order must preserve backend/data-service/frontend audits before cross-runtime reconciliation and baseline publication.
- Evidence limitations and unresolved conflicts must remain visible in story acceptance evidence.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/product/epics/EPIC-000-current-state-verification.md` | Create | Verification outcome, scope, risks, success evidence, and story order. |
| `docs/product/stories/EPIC-000/STORY-000-01-audit-backend-capabilities.md` | Create | Backend evidence story. |
| `docs/product/stories/EPIC-000/STORY-000-02-audit-data-service-capabilities.md` | Create | Data-service evidence story. |
| `docs/product/stories/EPIC-000/STORY-000-03-audit-frontend-capabilities.md` | Create | Frontend evidence story. |
| `docs/product/stories/EPIC-000/STORY-000-04-verify-cross-runtime-contracts.md` | Create | Cross-runtime contract story. |
| `docs/product/stories/EPIC-000/STORY-000-05-reconcile-legacy-document-claims.md` | Create | Legacy conflict story. |
| `docs/product/stories/EPIC-000/STORY-000-06-publish-current-state-baseline.md` | Create | Canonical baseline story. |

---

## Task 1: Define EPIC-000

**Files:**
- Create: `docs/product/epics/EPIC-000-current-state-verification.md`
- Consume read-only: current-state evidence, baseline, PRD, and gap map.

**Interfaces:**
- Consumes: `CAP-CUR-*`, `DOC-CONFLICT-*`, and gap rows classified as `Verification` or `Documentation` for current-state trust.
- Produces: the owning outcome, dependency order, risks, success evidence, and story plan for `STORY-000-01` through `STORY-000-06`.
- Preserves: feature gap ownership in `EPIC-001` through `EPIC-010`.

**Acceptance Evidence:**
- Every required epic section exists.
- The six-story order matches evidence dependencies and contains no feature implementation scope.

- [ ] **Step 1: Confirm the epic artifact is absent or explicitly resume it**

Run: `Test-Path docs/product/epics/EPIC-000-current-state-verification.md`

Expected: `False`, or a documented partial state.

- [ ] **Step 2: Write the independently reviewable epic outcome**

Populate Outcome, Problem, Scope, Out of Scope, Requirements, Dependencies, Risks, Success Evidence, and Story Plan. Link only requirements/gaps owned by current-state verification.

- [ ] **Step 3: Validate the epic**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; `EPIC-000` owns valid requirement/gap references and lists six unique stories.

- [ ] **Step 4: Commit atomically**

```powershell
git add docs/product/epics/EPIC-000-current-state-verification.md
git diff --cached --check
git commit -m "docs(spec): define current-state verification epic"
```

---

## Task 2: Write the Six EPIC-000 Stories

**Files:**
- Create: all six story files listed in File Structure.
- Consume read-only: `docs/product/epics/EPIC-000-current-state-verification.md`
- Consume read-only: evidence artifacts and `CURRENT_STATE_BASELINE.md`.

**Interfaces:**
- Consumes: the ordered story plan, actual evidence artifacts, validation commands, and current-state IDs.
- Produces: six independently reviewable stories with exact acceptance evidence and completion status.
- Preserves: truthful status—existing evidence may satisfy a story, but file creation alone does not.

**Acceptance Evidence:**
- Every story contains User Story, Business Value, Scope, Out of Scope, Preconditions, Acceptance Criteria, Data and Provenance, Degradation, Testing, Dependencies, Traceability, and Definition of Done.
- Each story links to `EPIC-000`, resides under its owning directory, and references only existing evidence IDs/artifacts.

- [ ] **Step 1: Write runtime audit stories `STORY-000-01` through `STORY-000-03`**

Point acceptance criteria to the backend, data-service, and frontend evidence files, their runtime verification commands, and the corresponding `CAP-CUR-*` records.

- [ ] **Step 2: Write reconciliation stories `STORY-000-04` and `STORY-000-05`**

Point acceptance criteria to cross-runtime flow coverage, contract mismatches, legacy-source retrieval, conflict IDs, and dispositions.

- [ ] **Step 3: Write baseline story `STORY-000-06`**

Require complete product-area coverage, evidence-level fidelity, explicit limitations/conflicts, and validator success.

- [ ] **Step 4: Validate ownership, traceability, and status**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; story IDs are unique, all reside under `EPIC-000`, and completion status agrees with actual artifacts/evidence.

- [ ] **Step 5: Commit atomically**

```powershell
git add docs/product/stories/EPIC-000
git diff --cached --check
git commit -m "docs(spec): define current-state verification stories"
```

## Plan Exit Criteria

- [ ] `EPIC-000` has all mandated sections and exactly six planned stories.
- [ ] All six story files validate and link to their actual evidence.
- [ ] No feature behavior is assigned to `EPIC-000`.
- [ ] Completion statuses match executed evidence rather than editorial judgment.

## Handoff to Plan 6

- Inputs made available: verified separation between foundation/evidence work and feature-delivery work, plus the complete `EPIC-000` package.
- Conditions Plan 6 may assume: all non-verification gap rows remain owned by `EPIC-001` through `EPIC-010`.
- Open risk carried forward: requirements blocked by legal, data-rights, or financial-policy decisions may have an epic owner but cannot receive implementation-ready stories yet.

## Self-Review

**Spec coverage:** The plan covers the complete `EPIC-000` outcome and all six approved evidence stories; feature epics remain in Plan 6.

**Step scan:** Epic definition and story production are separate reviewable tasks with independent commits.

**Type and name consistency:** Epic/story IDs, directory ownership, required sections, and evidence references match Plans 1-4.

**Review focus:** Each status, ownership, ordering, and evidence-fidelity risk has an explicit validation step.

**Proportion:** The plan fixes story contracts and proof without drafting story prose.
