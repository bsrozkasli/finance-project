# Product Documentation Plan 3 — Current-State Baseline Implementation Plan

**Status:** Complete — see Plan 3 in [the plan-set table](2026-09-29-product-documentation-reconstruction.md#child-plans). Step checkboxes were not ticked during execution.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one canonical, evidence-backed description of what the brownfield product does today and where that evidence is incomplete or contradictory.

**Architecture:** Synthesize the runtime-specific evidence from Plan 2 without introducing target requirements. Every baseline statement resolves to a `CAP-CUR-*` record, exposes its strongest evidence level, and keeps limitations and unresolved conflicts visible.

**Tech Stack:** Markdown, Python product-document validator, Git

**Plan Set:** Plan 3 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Plan 2 brownfield evidence audit.

**Produces:** `docs/product/CURRENT_STATE_BASELINE.md`.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- The baseline describes current behavior only; it cannot prescribe target behavior or silently close gaps.
- Every capability summary links to one or more `CAP-CUR-*` evidence records and displays the strongest supported evidence level.
- E0 gaps and unresolved `DOC-CONFLICT-*` records remain explicit.
- A capability absent from verified evidence is not inferred from UI copy, comments, roadmaps, or the target PRD.

## Global Constraints

- Do not modify runtime evidence merely to make the baseline cleaner.
- Do not upgrade evidence levels without reproducible verification from Plan 2.
- Do not fabricate market behavior, provider availability, or implementation status.
- Preserve the distinction between implemented contracts in `SPEC.md` and target intent in the foundation design/PRD.
- Preserve and exclude the user's `data-service/external/TradingAgents` working-tree change.

## Review Focus

- A target capability appearing as current behavior must fail the target/current separation review.
- A baseline statement without a valid `CAP-CUR-*` reference must fail validation.
- A stronger baseline evidence level than its source record must be rejected.
- Provider degradation and missing-data limitations must remain visible in the relevant product area.
- Unresolved legacy conflicts must be linked rather than editorially resolved.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/product/CURRENT_STATE_BASELINE.md` | Create | Canonical current-state synthesis and verified limitations. |
| `docs/product/evidence/*.md` | Consume | Authoritative detailed evidence and conflict records. |

---

## Task 1: Publish the Current-State Baseline

**Files:**
- Create: `docs/product/CURRENT_STATE_BASELINE.md`
- Consume read-only: `docs/product/evidence/backend.md`
- Consume read-only: `docs/product/evidence/data-service.md`
- Consume read-only: `docs/product/evidence/frontend.md`
- Consume read-only: `docs/product/evidence/cross-runtime.md`
- Consume read-only: `docs/product/evidence/legacy-document-conflicts.md`

**Interfaces:**
- Consumes: every `CAP-CUR-*` and `DOC-CONFLICT-*` record from Plan 2.
- Produces: the canonical current-state summary consumed by Plan 4's gap map and Plan 5's verification epic.
- Preserves: the source evidence levels, locators, limitations, and conflict dispositions.

**Acceptance Evidence:**
- The baseline includes metadata/method, product-area capability summary, verified limitations, unresolved contradictions, and verification status.
- Every summarized capability resolves to source evidence and no target capability is represented as implemented.

- [ ] **Step 1: Confirm the baseline is absent or explicitly resume it**

Run: `Test-Path docs/product/CURRENT_STATE_BASELINE.md`

Expected: `False`, or an existing partial artifact whose last completed section and source evidence revision are recorded before continuation.

- [ ] **Step 2: Add audit metadata and method**

Record audited commit, audit period, evidence hierarchy, runtime versions, verification commands, known environment limits, and the current-behavior-only rule.

- [ ] **Step 3: Summarize current capabilities by product area**

Cover asset/market data, research, portfolio, discovery, decision support, monitoring, personalization, identity/SaaS, observability, and testing. Each row must link to `CAP-CUR-*`, show evidence level, and state material limitations.

- [ ] **Step 4: Add gaps and unresolved contradictions**

List E0 findings and unresolved `DOC-CONFLICT-*` records. Do not add remedies, target states, or epic ownership to this artifact.

- [ ] **Step 5: Run focused validation**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; all baseline capability references resolve and target/current separation checks pass.

- [ ] **Step 6: Commit atomically**

```powershell
git add docs/product/CURRENT_STATE_BASELINE.md
git diff --cached --check
git commit -m "docs(spec): publish verified current-state baseline"
```

## Plan Exit Criteria

- [ ] Every product area is represented or explicitly marked as lacking evidence.
- [ ] Every baseline statement is traceable to Plan 2 evidence.
- [ ] E0 gaps and unresolved conflicts remain visible.
- [ ] Incremental product-document validation exits `0`.
- [ ] No evidence, production, test, or user-owned files are staged.

## Handoff to Plan 4

- Inputs made available: canonical current-state product areas, `CAP-CUR-*` links, evidence levels, verified limitations, and unresolved conflicts.
- Conditions Plan 4 may assume: the baseline is the only current-state summary used for target gap comparison.
- Open risk carried forward: an unresolved conflict may block a target requirement or force its gap classification to remain `Verification` or `Deferred`.

## Self-Review

**Spec coverage:** The plan synthesizes every current product area required by the foundation without taking ownership of target requirements.

**Step scan:** One artifact is produced through metadata, synthesis, limitation, validation, and commit steps.

**Type and name consistency:** `CAP-CUR-*`, `DOC-CONFLICT-*`, evidence levels, and the baseline path match Plans 1-2.

**Review focus:** All five risks are covered by source-reference, evidence-level, or separation validation.

**Proportion:** The plan defines synthesis rules and proof without predicting baseline conclusions.
