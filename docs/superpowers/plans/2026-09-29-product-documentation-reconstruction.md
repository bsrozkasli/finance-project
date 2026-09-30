# Product Documentation Reconstruction Plan Set

**Goal:** Create an evidence-backed current-state baseline, finalize the canonical Product Requirements Document, map capability gaps, publish the approved epic catalog, and complete the `EPIC-000` verification stories without changing production behavior.

**Architecture:** This index replaces the former fourteen-task monolithic execution plan with seven dependency-ordered plans. Each child plan has an independently reviewable outcome, exact inputs and outputs, explicit verification, atomic commit boundaries, exit criteria, and a handoff contract.

**Tech Stack:** Markdown, Python 3.12 standard library, `unittest`, ripgrep, Git, Maven/JUnit 5, pytest, Vitest, ESLint, Vite/TypeScript

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

**Template:** `docs/superpowers/templates/implementation-plan-template.md`

## Plan Set Status

| Field | Value |
|---|---|
| Plan set | Product Documentation Reconstruction |
| Total plans | 7 |
| Overall status | In progress |
| Current executable plan | Plan 1 — Governance and Validation |
| Existing advanced draft | Plan 4 — `docs/product/PRD.md` and review artifacts |
| Execution rule | A plan may complete only after its exit criteria and handoff inputs are verified. |
| Product discussion language | Turkish |
| Product artifact language | English |

The existing PRD is an in-progress draft, not evidence that Plans 1-3 are complete. Plan 4 must resume and reconcile that draft after the governance, evidence, and baseline dependencies exist.

## Dependency Graph

```text
Plan 1: Governance and Validation
  -> Plan 2: Brownfield Evidence Audit
    -> Plan 3: Current-State Baseline
      -> Plan 4: PRD and Capability Gap Map
        -> Plan 5: EPIC-000 Verification Package
          -> Plan 6: Delivery Epic Catalog
            -> Plan 7: Publication and Final Validation
```

Plans execute in this order. A downstream draft may exist, but it cannot be finalized or marked complete until its predecessor handoff is satisfied.

## Child Plans

| Plan | File | Former tasks | Outcome | Status |
|---:|---|---:|---|---|
| 1 | [`2026-09-30-product-documentation-01-governance.md`](2026-09-30-product-documentation-01-governance.md) | 1-2 | Validator and normative authoring contract | Not started |
| 2 | [`2026-09-30-product-documentation-02-brownfield-evidence.md`](2026-09-30-product-documentation-02-brownfield-evidence.md) | 3-6 | Runtime evidence and legacy conflict ledger | Not started |
| 3 | [`2026-09-30-product-documentation-03-current-state-baseline.md`](2026-09-30-product-documentation-03-current-state-baseline.md) | 7 | Canonical evidence-backed current state | Not started |
| 4 | [`2026-09-30-product-documentation-04-prd-and-gap-map.md`](2026-09-30-product-documentation-04-prd-and-gap-map.md) | 8-9 | Final PRD and total capability gap map | In progress; blocked by Plans 1-3 |
| 5 | [`2026-09-30-product-documentation-05-epic-000-verification.md`](2026-09-30-product-documentation-05-epic-000-verification.md) | 10 | `EPIC-000` and six verification stories | Not started |
| 6 | [`2026-09-30-product-documentation-06-delivery-epics.md`](2026-09-30-product-documentation-06-delivery-epics.md) | 11-13 | `EPIC-001` through `EPIC-010` catalog | Not started |
| 7 | [`2026-09-30-product-documentation-07-publication.md`](2026-09-30-product-documentation-07-publication.md) | 14 | Indexes, complete validation, and handoff | Not started |

## Existing Work Preserved

| Artifact | State | Owning plan | Treatment |
|---|---|---:|---|
| `docs/product/PRD.md` | Uncommitted draft | 4 | Continue and reconcile; do not recreate or overwrite. |
| `docs/product/reconcile-foundation.md` | Review evidence | 4 | Consume and preserve with explicit finding dispositions. |
| `docs/product/reconcile-finance-risk.md` | Review evidence | 4 | Consume and preserve with explicit finding dispositions. |
| `docs/product/review-brownfield.md` | Review evidence | 4 | Consume; preserves the no-separate-Product-Brief decision. |
| `docs/product/review-finance.md` | Review evidence | 4 | Consume and resolve blocker/high finance findings. |
| `docs/product/review-rubric.md` | Review evidence | 4 | Consume and resolve readiness/security/measurement findings. |
| `docs/README.md` | Existing uncommitted edit | 7 | Inspect and continue; do not overwrite. |
| `data-service/external/TradingAgents` | User-owned dirty state | None | Never modify or stage. |

## Plan Set Locked Decisions

- Product artifacts are written in English; discussion and review with the product owner remain in Turkish.
- Code, tests, and executed verification outrank legacy documents.
- `SPEC.md` remains the implemented-system contract. Target requirements stay in the PRD until implementation and E3 verification.
- The approved foundation design performs the Product Brief function for this brownfield project; creating a duplicate brief is not a prerequisite.
- The PRD remains a target-product document and must not substitute for the current-state evidence or baseline.
- Every target requirement has one primary gap-map row and one owning epic.
- `EPIC-000` owns current-state verification. `EPIC-001` through `EPIC-010` own delivery outcomes.
- Detailed story files for `EPIC-001` through `EPIC-010` require separate epic-specific plans after this set passes complete validation.
- Provider failures, stale data, missing mandatory evidence, and insufficient evidence degrade explicitly; fake market data is forbidden.

## Global Constraints

- Do not modify production source, existing endpoint paths, DTO field names, applied migrations, fixed ports, provider priority, or provider-degradation behavior.
- Do not call live external financial APIs during documentation verification.
- E2/E3 claims require commit, path or endpoint, reviewer, date, environment, limitations, and reproducible locator.
- Preserve the sequential agent-analysis order and the rule that agents receive pre-calculated metrics rather than fetching data.
- Preserve and exclude `data-service/external/TradingAgents` from every commit.
- Use explicit staging paths and atomic Conventional Commits on the documentation branch.

## Shared Evidence and ID Contract

Evidence precedence:

```text
E3 Runtime Verified
E2 Implementation Verified
E1 Documented Claim
E0 Missing or Contradicted
```

Stable ID families:

```text
CAP-CUR-BE-NNN  backend current capability
CAP-CUR-DS-NNN  data-service current capability
CAP-CUR-FE-NNN  frontend current capability
CAP-CUR-XR-NNN  cross-runtime current capability
CAP-TGT-NNN     target capability
PRD-FR-NNN      functional requirement
PRD-NFR-NNN     non-functional requirement
EPIC-NNN        delivery epic
STORY-NNN-NN    story owned by an epic
DOC-CONFLICT-NNN legacy-document conflict
```

## Status Rules

| Status | Meaning |
|---|---|
| Not started | No task in the plan has passed its first acceptance gate. |
| In progress | At least one plan artifact exists, but exit criteria have not all passed. |
| Blocked | A named predecessor, decision, legal/data-rights gate, or failing verification prevents safe progress. |
| Complete | Every task, exit criterion, verification command, and atomic commit is evidenced. |

An existing file alone never implies `Complete`. Status updates must cite artifacts, commands, and commits.

## Plan-Set Review Focus

- Current behavior must not be inferred from the target PRD.
- PRD review findings must not be lost when the existing draft is resumed.
- Stable IDs and one-owner traceability must remain consistent across child-plan boundaries.
- A downstream plan must not erase a predecessor's limitations, conflicts, or deferred gates.
- Final validation must fail closed when any required artifact or reference is missing.

## Plan-Set Completion Evidence

Run after Plan 7:

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
python scripts/validate_product_docs.py --root docs/product --complete
git diff --check main...HEAD
git log --oneline main..HEAD
git status --short --branch
```

Expected: validator tests PASS, complete product-document validation exits `0`, no whitespace errors exist, commits are atomic, statuses reflect actual evidence, and the only unrelated working-tree entry is the pre-existing `data-service/external/TradingAgents` modification.

## Execution Handoff

Start with Plan 1. After each plan:

1. Review the child plan's exit criteria.
2. Record actual validation evidence and commit IDs.
3. Update this index status only when evidence supports the change.
4. Read the next plan's `Depends On` and `Handoff` sections before execution.
5. Stop rather than infer approval when a legal, data-rights, financial-policy, or contract decision remains open.

## Index Self-Review

**Coverage:** Former Tasks 1-14 map exactly once to Plans 1-7. Existing PRD/review work is preserved and assigned to Plan 4.

**Boundaries:** Each child plan has one independently reviewable outcome and a clear predecessor/successor contract.

**Naming:** Dates, filenames, plan numbers, artifact paths, ID families, and statuses are consistent across the index and child plans.

**Risk:** The index makes out-of-order draft work visible without treating it as completed dependency evidence.

**Proportion:** Execution detail lives in child plans; this file contains only plan-set coordination, shared invariants, status, and completion evidence.
