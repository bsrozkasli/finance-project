# Product Documentation Plan 1 — Governance and Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the machine-checkable authoring contract that every later product artifact must follow.

**Architecture:** A Python standard-library validator enforces stable IDs, required sections, evidence metadata, and cross-document references. A colocated authoring guide defines the human-readable contract; later plans consume both instead of redefining documentation rules.

**Tech Stack:** Markdown, Python 3.12 standard library, `unittest`, ripgrep, Git

**Plan Set:** Plan 1 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Approved foundation design and repository instructions only.

**Produces:** `scripts/validate_product_docs.py`, its unit tests, and `docs/product/CONTRIBUTING.md`.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- Evidence precedence is `E3 Runtime Verified` > `E2 Implementation Verified` > `E1 Documented Claim` > `E0 Missing or Contradicted`.
- Stable IDs are `CAP-CUR-BE-NNN`, `CAP-CUR-DS-NNN`, `CAP-CUR-FE-NNN`, `CAP-CUR-XR-NNN`, `CAP-TGT-NNN`, `PRD-FR-NNN`, `PRD-NFR-NNN`, `EPIC-NNN`, and `STORY-NNN-NN`.
- Normal validation checks artifacts that exist; `--complete` additionally enforces the full canonical artifact set.
- Product artifacts are English; product-owner discussion and review may remain Turkish.

## Global Constraints

- Do not modify production source, endpoints, DTOs, migrations, fixed ports, provider priority, or graceful-degradation behavior.
- `SPEC.md` remains the implemented-system contract; target requirements must not be represented there as implemented behavior.
- E2/E3 claims require commit, locator, reviewer, date, environment, limitations, and reproducible verification evidence.
- Never fabricate market data or call live external financial APIs during validation.
- Preserve and exclude the user's `data-service/external/TradingAgents` working-tree change from every commit.
- Work on the existing documentation branch and use explicit-path, atomic Conventional Commits.

## Review Focus

- Duplicate IDs or dangling references must fail validation in Task 1.
- E2/E3 evidence without a reproducible locator must fail validation in Task 1.
- Target requirements marked as implemented must fail validation in Task 1.
- A PRD without explicit degradation requirements must fail validation in Task 1.
- Policy artifacts must not be misclassified as capability evidence in Task 2.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `scripts/validate_product_docs.py` | Create | Validate artifact shape, IDs, evidence, and references. |
| `scripts/tests/test_validate_product_docs.py` | Create | Pin validator behavior and incremental/complete modes. |
| `docs/product/CONTRIBUTING.md` | Create | Define the normative product-document authoring contract. |

---

## Task 1: Build the Product-Document Validator

**Files:**
- Create: `scripts/validate_product_docs.py`
- Test: `scripts/tests/test_validate_product_docs.py`

**Interfaces:**
- Consumes: a `Path` pointing to `docs/product`.
- Produces: `ValidationError(code: str, path: Path, message: str)`, `extract_ids(text: str) -> set[str]`, `extract_references(text: str) -> set[str]`, `required_sections(path: Path) -> tuple[str, ...]`, `validate_product_docs(root: Path, complete: bool = False) -> list[ValidationError]`, and `main(argv: Sequence[str] | None = None) -> int`.
- Preserves: the validator remains standard-library-only and may run incrementally before all artifacts exist.

**Acceptance Evidence:**
- Tests cover duplicate IDs, required sections, unknown references, evidence locators, current/target separation, degradation, conflict disposition, complete mode, and a valid minimal document set.
- `python -m unittest discover -s scripts/tests -p "test_*.py" -v` exits `0` after implementation.

- [ ] **Step 1: Write the failing validator tests**

Add tests named `test_rejects_duplicate_ids`, `test_rejects_missing_required_story_heading`, `test_rejects_unknown_requirement_reference`, `test_rejects_e2_without_locator`, `test_rejects_target_requirement_marked_implemented`, `test_rejects_target_spec_without_degradation_requirement`, `test_rejects_conflict_without_disposition`, `test_complete_mode_requires_canonical_artifacts`, and `test_accepts_minimal_complete_document_set`.

- [ ] **Step 2: Run the tests and confirm the missing-module failure**

Run: `python -m unittest discover -s scripts/tests -p "test_*.py" -v`

Expected: FAIL because `scripts.validate_product_docs` does not exist.

- [ ] **Step 3: Implement the validator interfaces**

Recognize every locked ID family. Reject duplicate IDs, missing required sections, unknown references, E2/E3 records without locators, target requirements described as `Implemented`, PRDs without degradation requirements, conflicts without dispositions, and stories outside their owning epic directory. In `--complete` mode require the three canonical product artifacts, eleven epic files, six `EPIC-000` stories, and both documentation indexes.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `python -m unittest discover -s scripts/tests -p "test_*.py" -v`

Expected: all tests PASS.

- [ ] **Step 5: Commit atomically**

```powershell
git add scripts/validate_product_docs.py scripts/tests/test_validate_product_docs.py
git diff --cached --check
git commit -m "chore(agents): validate product documentation links"
```

---

## Task 2: Define Product-Documentation Authoring Rules

**Files:**
- Create: `docs/product/CONTRIBUTING.md`
- Verify: `scripts/validate_product_docs.py`

**Interfaces:**
- Consumes: the ID and evidence decisions in this plan and the approved foundation design.
- Produces: the normative artifact taxonomy, status model, required sections, and evidence contract used by Plans 2-7.
- Preserves: `SPEC.md` as the current implemented contract and the foundation design as the approved upstream product input.

**Acceptance Evidence:**
- The guide defines the role of every artifact class, every ID family, and every requirement status.
- The validator treats `CONTRIBUTING.md` as policy rather than capability evidence.

- [ ] **Step 1: Write the artifact taxonomy**

Define the exact roles of `SPEC.md`, foundation designs, `CURRENT_STATE_BASELINE.md`, `PRD.md`, `CAPABILITY_GAP_MAP.md`, evidence files, epics, stories, reviews, and README indexes.

- [ ] **Step 2: Define IDs, statuses, and evidence promotion**

Define requirement statuses as `Proposed`, `Approved`, `Implemented`, `Verified`, or `Deferred`; only E3 evidence may support `Verified`. Copy the locked ID families without aliases.

- [ ] **Step 3: Define required artifact sections**

Require evidence records to contain ID, Summary, Evidence Level, Contract, Evidence Locator, Verification, Limitations, and Legacy Claims. Require epic and story sections exactly as specified by the foundation design and validator tests.

- [ ] **Step 4: Validate the authoring rules**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; `CONTRIBUTING.md` is classified as a policy artifact.

- [ ] **Step 5: Commit atomically**

```powershell
git add docs/product/CONTRIBUTING.md
git diff --cached --check
git commit -m "docs(spec): define product documentation rules"
```

## Plan Exit Criteria

- [ ] Validator unit tests pass.
- [ ] Incremental validation exits `0` for the artifacts present at completion.
- [ ] The authoring contract defines all artifact types consumed by later plans.
- [ ] No production or user-owned files are staged.

## Handoff to Plan 2

- Inputs made available: validator CLI, validator test suite, ID families, evidence levels, and authoring rules.
- Conditions Plan 2 may assume: incremental validation accepts independently added evidence files and rejects unsupported E2/E3 claims.
- Open risk carried forward: complete mode cannot pass until Plans 3-7 publish the canonical artifacts.

## Self-Review

**Spec coverage:** This plan owns governance, validation, IDs, statuses, and evidence rules. Evidence collection and all product artifacts remain in Plans 2-7.

**Step scan:** Each task produces one independently reviewable contract with a focused validation command and explicit commit.

**Type and name consistency:** Validator signatures, ID families, status values, paths, and commands are consistent across both tasks.

**Review focus:** All five listed failure classes are assigned to validator tests or policy validation.

**Proportion:** The plan defines interfaces and assertions without transcribing the validator implementation.
