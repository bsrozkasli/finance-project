# Product Documentation Plan 4 — PRD and Capability Gap Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the canonical target-product requirements and map every requirement to verified current evidence, one gap class, and one owning epic.

**Architecture:** Continue the existing PRD draft rather than recreating it, reconcile all foundation and independent review findings, and preserve its explicit current/target boundary. Build the gap map only after the PRD passes review so epic ownership derives from approved requirements rather than draft prose.

**Tech Stack:** Markdown, Python product-document validator, Git

**Plan Set:** Plan 4 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Plan 3 current-state baseline and the approved foundation design.

**Produces:** Finalized `docs/product/PRD.md` and `docs/product/CAPABILITY_GAP_MAP.md`.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- The approved foundation design performs the upstream Product Brief function; no separate Product Brief is required for this brownfield workflow.
- Preserve the PRD metadata fields in this order: `stepsCompleted`, `workflowComplete`, `completedAt`, `inputDocuments`, `workflowType`, `briefCount`, `researchCount`, `brainstormingCount`, `projectDocsCount`, `classification`.
- Preserve the requested top-level section order: Executive Summary; Success Criteria; Product Scope; User Journeys; Innovation & Novel Patterns; Developer Tool Specific Requirements; Development Roadmap & Risk; Risk Mitigation; Functional Requirements; Non-Functional Requirements; Testing Strategy; Delivery Phases (Post-V1); References.
- Target capabilities remain `CAP-TGT-001` through `CAP-TGT-010`; requirements use atomic `PRD-FR-NNN` and `PRD-NFR-NNN` statements.
- The gap map uses exactly `None`, `Verification`, `Documentation`, `Behavior`, `Data`, `Architecture`, `Compliance`, or `Deferred`.
- A target requirement may enter root `SPEC.md` only after implementation and E3 verification.

## Global Constraints

- Do not overwrite or discard the existing PRD draft or its review/reconciliation artifacts.
- Do not claim target behavior is currently implemented; current evidence comes only from Plan 3.
- Deterministic analytics and `DecisionResult` remain authoritative; AI narrative is optional and cannot change the result.
- Stocks and ETFs retain separate evidence/valuation models; PEG is gated by eligibility, provenance, quality, and deterministic policy.
- Missing mandatory evidence fails closed; provider failure never produces synthetic output.
- Preserve the user's `data-service/external/TradingAgents` change and exclude it from commits.

## Review Focus

- Unresolved blocker/high findings from the five review files must prevent `workflowComplete: true`.
- Portfolio Fit, Decision Result, PEG, labels, transitions, and invalidation thresholds must match the approved foundation semantics.
- Open questions must identify owner, approver, due milestone, required evidence, affected requirements, and blocked release stage.
- Success metrics and stage gates must define population, start event, window, sample floor, owner, and release consequence.
- Every PRD requirement must appear exactly once as a primary gap-map row with one epic owner.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/product/PRD.md` | Modify | Canonical target product, requirements, risks, testing, and release gates. |
| `docs/product/reconcile-foundation.md` | Consume | Foundation fidelity findings. |
| `docs/product/reconcile-finance-risk.md` | Consume | Finance, PEG, portfolio, and risk findings. |
| `docs/product/review-brownfield.md` | Consume | Brownfield readiness and Product Brief decision. |
| `docs/product/review-finance.md` | Consume | Adversarial finance/risk findings. |
| `docs/product/review-rubric.md` | Consume | Quality, stage-gate, security, and operational findings. |
| `docs/product/CAPABILITY_GAP_MAP.md` | Create | Requirement-to-current-state-to-epic traceability. |

---

## Task 1: Reconcile and Finalize the Canonical PRD

**Files:**
- Modify: `docs/product/PRD.md`
- Consume read-only: the five review/reconciliation files listed in File Structure.
- Consume read-only: `docs/product/CURRENT_STATE_BASELINE.md`
- Consume read-only: the approved foundation design.

**Interfaces:**
- Consumes: approved foundation decisions, current-state boundary, and every blocker/high review finding.
- Produces: approved `CAP-TGT-*`, `PRD-FR-*`, and `PRD-NFR-*` requirements for gap mapping.
- Preserves: requested metadata/section ordering, source counts, references, explicit assumptions, and the current/target separation.

**Acceptance Evidence:**
- Every blocker/high finding has an explicit `Resolved`, `Accepted Risk`, or `Deferred` disposition with an artifact locator.
- `workflowComplete` becomes `true` and `completedAt` receives a date only after all completion gates pass.
- The PRD validator exits `0` and no target requirement is marked implemented without E3 evidence.

- [ ] **Step 1: Record the existing draft state**

Run: `Test-Path docs/product/PRD.md`

Expected: `True`. Record current metadata, ID counts, unresolved questions, and the review files being reconciled; do not recreate the document.

- [ ] **Step 2: Build and resolve the review disposition checklist**

Cover every blocker/high finding from `reconcile-foundation.md`, `reconcile-finance-risk.md`, `review-brownfield.md`, `review-finance.md`, and `review-rubric.md`. Each resolution must cite the changed PRD section and affected IDs.

- [ ] **Step 3: Complete target capabilities and functional requirements**

Ensure atomic SHALL statements cover persona, U.S. stock/eligible ETF universe, medium and long horizons, Evidence Snapshot, stock/ETF separation, PEG eligibility/quality, authoritative Decision Result fields, Portfolio Fit, deterministic labels/transitions, discovery, AI degradation, monitoring, personal policy, alerts, deletion, and deferred capabilities.

- [ ] **Step 4: Complete non-functional, testing, and release requirements**

Cover provenance, deterministic replay, privacy, legal/data-rights gates, performance, cost, feature flags, financial fixtures, provider failures, security/access for external evaluation, backup/restore, incident response, RTO/RPO, stage-gate metrics, and release blockers.

- [ ] **Step 5: Close metadata only after validation**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; all review dispositions are traceable and all mandatory PRD requirements validate. Then set `workflowComplete: true`, set `completedAt`, and add the completion step to `stepsCompleted`.

- [ ] **Step 6: Commit the finalized PRD and its review evidence**

```powershell
git add docs/product/PRD.md docs/product/reconcile-foundation.md docs/product/reconcile-finance-risk.md docs/product/review-brownfield.md docs/product/review-finance.md docs/product/review-rubric.md
git diff --cached --check
git commit -m "docs(spec): finalize investment platform requirements"
```

---

## Task 2: Build the Capability Gap Map

**Files:**
- Create: `docs/product/CAPABILITY_GAP_MAP.md`
- Consume read-only: `docs/product/CURRENT_STATE_BASELINE.md`
- Consume read-only: `docs/product/PRD.md`
- Consume read-only: `docs/product/evidence/legacy-document-conflicts.md`

**Interfaces:**
- Consumes: all `CAP-CUR-*`, `CAP-TGT-*`, `PRD-FR-*`, `PRD-NFR-*`, and relevant `DOC-CONFLICT-*` IDs.
- Produces: one primary traceability row per requirement with gap class, gap statement, dependency, acceptance evidence, and owning epic.
- Preserves: unresolved evidence limitations, legal/data-rights gates, and deferred status.

**Acceptance Evidence:**
- Every PRD requirement appears exactly once as a primary row.
- Every row resolves to one target capability and one epic owner, including deferred requirements.
- The gap map exposes rather than hides contradictions and verification limitations.

- [ ] **Step 1: Define the gap-map schema and classifications**

Each row must contain target capability, requirement ID, current capability/evidence or `None`, exact gap class, gap statement, owning epic, dependency, risk/conflict reference, and required acceptance evidence.

- [ ] **Step 2: Map every target requirement**

Use only Plan 3 evidence for the current side. Assign exactly one primary row and epic owner per `PRD-FR-*` and `PRD-NFR-*` ID; do not infer implementation from target prose.

- [ ] **Step 3: Add conflict, provider, legal, and test-risk references**

Link affected rows to `DOC-CONFLICT-*`, provider/data-rights risks, legal gates, and known verification limitations.

- [ ] **Step 4: Validate total traceability**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; every PRD requirement occurs once as a primary row and resolves to one epic.

- [ ] **Step 5: Commit atomically**

```powershell
git add docs/product/CAPABILITY_GAP_MAP.md
git diff --cached --check
git commit -m "docs(spec): map current capabilities to target gaps"
```

## Plan Exit Criteria

- [ ] All blocker/high PRD review findings have explicit dispositions.
- [ ] PRD metadata accurately reflects completion and source counts.
- [ ] Every requirement is atomic, testable, and classified as target behavior.
- [ ] Every requirement has exactly one primary gap-map row and epic owner.
- [ ] Incremental product-document validation exits `0`.

## Handoff to Plan 5

- Inputs made available: finalized target requirements, approved/deferred statuses, complete gap rows, current evidence links, and epic ownership.
- Conditions Plan 5 may assume: `EPIC-000` owns verification/documentation gaps needed to establish current-state trust; feature gaps remain owned by `EPIC-001` through `EPIC-010`.
- Open risks carried forward: decisions explicitly gated by law, data rights, or unresolved policy remain blocking/deferred and cannot be converted into implementation-ready stories.

## Self-Review

**Spec coverage:** This plan covers the canonical PRD, every approved target capability, functional/NFR requirements, testing, risks, post-V1 scope, and total gap mapping.

**Step scan:** PRD finalization and gap mapping are separate review gates; the second cannot start from an unreconciled draft.

**Type and name consistency:** Metadata fields, top-level sections, ID families, gap classes, status values, and epic IDs are fixed across tasks.

**Review focus:** All five risks are covered by review disposition, PRD validation, or one-row-per-requirement validation.

**Proportion:** The plan specifies required semantics and evidence without reproducing the PRD prose.
