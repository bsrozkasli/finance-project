# Product Documentation Plan 7 — Publication and Final Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a navigable product-documentation entry point and prove that the complete foundation is internally consistent, traceable, and ready for epic-specific planning.

**Architecture:** Create a product-level reading index, link it from the repository documentation index, then run complete-mode validation and repository hygiene checks. This plan changes navigation and completion evidence only; it does not repair substantive gaps by weakening rules.

**Tech Stack:** Markdown, Python `unittest`, product-document validator, Git

**Plan Set:** Plan 7 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Plans 1-6 complete and validated.

**Produces:** Product/repository indexes, final validation evidence, and a plan set ready for epic-specific planning.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- `docs/product/README.md` is the canonical product-document reading index; `docs/README.md` links to it without duplicating requirements.
- Detailed stories for `EPIC-001` through `EPIC-010` remain absent until separate epic-specific plans are approved.
- Complete-mode validator failures are fixed in their owning artifact or rule; validation is never weakened to obtain a green result.
- The pre-existing `data-service/external/TradingAgents` change remains unrelated, unstaged, and unmodified.

## Global Constraints

- Do not edit production code, runtime tests, endpoint contracts, migrations, ports, or provider behavior. Validator tests may change when a complete-mode rule is corrected.
- Do not claim plan completion when required artifacts, references, or verification evidence are missing.
- Use explicit paths for staging; never stage the whole worktree.
- Keep the product documentation in English and preserve stable IDs/links.
- Final evidence must report failures honestly and block handoff when validation is red.

## Review Focus

- An index link to a missing artifact must fail complete validation.
- Requirements must not be copied into indexes and allowed to drift from the PRD.
- Detailed stories for feature epics must not appear as if approved.
- A clean validator result with an accidentally staged unrelated change must not pass the hygiene gate.
- Plan-set completion status must agree with artifact and Git evidence.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/product/README.md` | Create or continue | Canonical product-document reading order, status, and navigation. |
| `docs/README.md` | Modify or continue | Repository-level link to the product documentation set. |
| `scripts/validate_product_docs.py` and its unit tests | Verify or correct | Fail complete mode on broken or absent canonical index navigation. |
| `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md` | Modify | Record final plan-set status and execution evidence. |
| `docs/product/**` | Verify | Complete artifact, ID, section, and reference set. |

---

## Task 1: Publish the Product-Documentation Indexes

**Files:**
- Create or continue: `docs/product/README.md`
- Modify or continue: `docs/README.md`
- Verify: every canonical product artifact.

**Interfaces:**
- Consumes: foundation design, baseline, PRD, gap map, evidence annexes, eleven epics, and six `EPIC-000` stories.
- Produces: canonical reading order and repository-level discovery.
- Preserves: requirements in their owning artifacts and intentional absence of detailed feature-epic stories.

**Acceptance Evidence:**
- Every canonical artifact is linked once in a clear reading order with status/purpose.
- Repository docs link to the product index without duplicating requirement text.

- [x] **Step 1: Confirm existing index state before editing**

Run: `Test-Path docs/product/README.md; Select-String -Path docs/README.md -Pattern 'Product Definition and Delivery'`

Expected: record whether either uncommitted index already exists; continue it rather than overwriting user work.

- [x] **Step 2: Create the product-document reading order**

List the foundation design, current baseline, PRD, gap map, evidence annexes, epic catalog, `EPIC-000` stories, status, and intended reading order. State that feature-epic stories require separate plans.

- [x] **Step 3: Update the repository documentation index**

Add or reconcile a `Product Definition and Delivery` section linking `docs/product/README.md`; do not copy requirements into the index.

- [x] **Step 4: Run incremental validation and commit indexes**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`.

```powershell
git add docs/product/README.md
# If docs/README.md has unrelated edits, stage only the reviewed Plan 7 link
# hunk with git apply --cached using an index-only patch.
git diff --cached -- docs/README.md
$expected = @('docs/product/README.md', 'docs/README.md')
$staged = @(git diff --cached --name-only)
$unexpected = @($staged | Where-Object { $_ -notin $expected })
$missing = @($expected | Where-Object { $_ -notin $staged })
if ($unexpected.Count -gt 0 -or $missing.Count -gt 0) { throw "Staged path mismatch" }
git diff --cached --check
git commit -m "docs(spec): index product requirements and delivery artifacts"
```

In this execution, the link hunk was staged with a reviewed index-only patch;
the concurrent `docs/README.md` migration was not included in `26b998f`.

---

## Task 2: Run Complete Validation and Close the Plan Set

**Files:**
- Verify or correct: `scripts/validate_product_docs.py` and `scripts/tests/test_validate_product_docs.py`
- Verify: every file under `docs/product/`
- Modify: `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`

**Interfaces:**
- Consumes: every output from Plans 1-7 and repository Git state.
- Produces: final validation results, accurate plan-set status, and handoff readiness.
- Preserves: validator strictness, atomic commit history, and unrelated working-tree state.

**Acceptance Evidence:**
- Validator unit tests pass and complete product-document validation exits `0`.
- Git hygiene checks show no whitespace errors or unintended staged files.
- Plan-set index status matches the actual artifacts and commits.

- [x] **Step 1: Run validator unit and complete-mode checks**

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
python scripts/validate_product_docs.py --root docs/product --complete
```

Expected: all tests PASS and complete validation exits `0` with no errors.

- [x] **Step 2: Run repository hygiene checks**

```powershell
git diff --check main...HEAD
git status --short --branch
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 0) { throw "Unexpected staged paths: $($staged -join ', ')" }
```

Expected: no committed whitespace errors or staged paths. The concurrent user
documentation migration and `data-service/external/TradingAgents` remain
unrelated, unstaged entries; the original only-TradingAgents expectation is
obsolete.

- [x] **Step 3: Update plan-set status and evidence**

Mark a child plan complete only when its exit criteria and commits exist. Record validation commands/results and keep any failed plan explicitly blocked or in progress.

- [x] **Step 4: Commit plan-set closure metadata**

```powershell
git add docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md
$expected = @('docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md')
$staged = @(git diff --cached --name-only)
$unexpected = @($staged | Where-Object { $_ -notin $expected })
$missing = @($expected | Where-Object { $_ -notin $staged })
if ($unexpected.Count -gt 0 -or $missing.Count -gt 0) { throw "Staged path mismatch" }
git diff --cached --check
git commit -m "docs(spec): record product foundation validation"
```

- [x] **Step 5: Perform final branch verification**

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
python scripts/validate_product_docs.py --root docs/product --complete
git diff --check main...HEAD
git log --oneline main..HEAD
git status --short --branch
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 0) { throw "Unexpected staged paths: $($staged -join ', ')" }
```

Expected: validation passes, commits are atomic, plan status is accurate, and
the unrelated documentation migration and `TradingAgents` remain unstaged.

## Plan Exit Criteria

- [x] Product and repository documentation indexes are complete and non-duplicative.
- [x] Validator unit tests and complete-mode validation pass.
- [x] All plan-set statuses are supported by artifact and Git evidence.
- [x] No unrelated files are staged or modified by this work.
- [x] Epic-specific story planning may begin from the approved catalog.

## Handoff to Epic-Specific Planning

- Inputs made available: foundation design, current baseline, finalized PRD, complete gap map, evidence annexes, eleven epics, and `EPIC-000` stories.
- Conditions later plans may assume: documentation contracts validate and each requirement has one primary epic owner.
- Open risks carried forward: explicit policy/legal/data-rights gates and each epic's own unresolved dependencies must be rechecked before stories become implementation-ready.

## Self-Review

**Spec coverage:** This plan owns navigation, complete validation, plan status, and epic-planning readiness; it adds no new product requirements.

**Step scan:** Index publication and final closure are separate review gates with explicit commands and commits.

**Type and name consistency:** Artifact paths, plan index path, validator commands, epic/story ranges, and status semantics match Plans 1-6.

**Review focus:** Missing links, copied requirements, premature feature stories, Git contamination, and inaccurate status are all checked.

**Proportion:** The plan defines final proof and handoff without duplicating the product-document contents.
