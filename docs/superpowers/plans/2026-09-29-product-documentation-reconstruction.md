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
| Overall status | Complete — product-documentation foundation, not feature delivery or release approval |
| Current executable plan | None in this seven-plan set; epic-specific planning is the next handoff |
| Existing advanced draft | Reconciled and committed by Plan 4; the PRD remains a target contract |
| Execution rule | A plan may complete only after its exit criteria and handoff inputs are verified. |
| Product discussion language | Turkish |
| Product artifact language | English |

The initial PRD draft was reconciled only after governance, evidence, and
baseline dependencies were established. Completion here means the documentation
chain validates; it does not promote target behavior into `SPEC.md` or approve
external, regulated, or paid release.

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

| Plan | File | Former tasks | Outcome | Status and evidence |
|---:|---|---:|---|---|
| 1 | [`2026-09-30-product-documentation-01-governance.md`](2026-09-30-product-documentation-01-governance.md) | 1-2 | Validator and normative authoring contract | Complete — `243ca06`, `10a99ba`, `532e2f2`; `CONTRIBUTING.md` and validator tests. |
| 2 | [`2026-09-30-product-documentation-02-brownfield-evidence.md`](2026-09-30-product-documentation-02-brownfield-evidence.md) | 3-6 | Runtime evidence and legacy conflict ledger | Complete — `d82aa7d`, `82b7836`, `1a5e3b5`, `e1171d5`; five evidence annexes. |
| 3 | [`2026-09-30-product-documentation-03-current-state-baseline.md`](2026-09-30-product-documentation-03-current-state-baseline.md) | 7 | Canonical evidence-backed current state | Complete — `bde81a7`, `42ed333`; baseline and verification result. |
| 4 | [`2026-09-30-product-documentation-04-prd-and-gap-map.md`](2026-09-30-product-documentation-04-prd-and-gap-map.md) | 8-9 | Final PRD and total capability gap map | Complete — `740ed63`, `2389a4d`, `2d26394`; target requirements and one-owner gap map. |
| 5 | [`2026-09-30-product-documentation-05-epic-000-verification.md`](2026-09-30-product-documentation-05-epic-000-verification.md) | 10 | `EPIC-000` and six verification stories | Complete — `a4ca4dc`, `93376ee`; current-state verification package. |
| 6 | [`2026-09-30-product-documentation-06-delivery-epics.md`](2026-09-30-product-documentation-06-delivery-epics.md) | 11-13 | `EPIC-001` through `EPIC-010` catalog | Complete — `068b2bf`, `8938b44`, `8cf1cdc`, `0cf4e78`, `4c35862`; delivery catalog and 26-test gate. |
| 7 | [`2026-09-30-product-documentation-07-publication.md`](2026-09-30-product-documentation-07-publication.md) | 14 | Indexes, complete validation, and handoff | Complete — `26b998f`, `23b71cd`, `fbe38cf`, `c12bbda`, and this review-close record; 30-test and complete-mode gate below. |

## Kickoff Work Preserved

These rows record how pre-existing work was handled, not a second source of
current product requirements.

| Artifact | Kickoff state | Owning plan | Final treatment |
|---|---|---:|---|
| `docs/product/PRD.md` | Uncommitted draft | 4 | Reconciled and committed as the canonical target PRD. |
| `docs/product/reconcile-foundation.md` | Review evidence | 4 | Preserved as a review input with finding dispositions. |
| `docs/product/reconcile-finance-risk.md` | Review evidence | 4 | Preserved as a finance/risk review input. |
| `docs/product/review-brownfield.md` | Review evidence | 4 | Preserved; no duplicate Product Brief was created. |
| `docs/product/review-finance.md` | Review evidence | 4 | Preserved with finance finding dispositions. |
| `docs/product/review-rubric.md` | Review evidence | 4 | Preserved with readiness/security/measurement findings. |
| `docs/README.md` | Existing uncommitted edit | 7 | Product-index link committed as a narrow hunk; concurrent user documentation migration remains unstaged. |
| `data-service/external/TradingAgents` | User-owned dirty state | None | Left unmodified and unstaged. |

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

Final branch checks run on 2026-10-02 (Europe/Istanbul):

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
python scripts/validate_product_docs.py --root docs/product --complete
git diff --check main...HEAD
git log --oneline main..HEAD
git status --short --branch
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 0) { throw "Unexpected staged paths: $($staged -join ', ')" }
```

| Check | Observed result |
|---|---|
| Validator unit suite | 30/30 passed, including missing/duplicate canonical navigation and broken inline/reference-style index links. |
| `--complete` product validation | Exit `0`; canonical baseline, PRD, gap map, five evidence annexes, eleven epics, six `EPIC-000` stories, and both indexes exist with valid governed references and canonical navigation. |
| Product index links | 32 unique targets resolved; no duplicate target or missing file. |
| `git diff --check main...HEAD` | Exit `0`; no committed whitespace errors. |
| Scoped stage | Exact-path checks enforced expected files before scoped commits; final stage is empty. `docs/README.md` contributed only the product-index hunk in `26b998f`. |
| Working tree | Concurrent user documentation migration and `data-service/external/TradingAgents` remain uncommitted and unstaged; the former makes the original “only TradingAgents dirty” expectation obsolete. |

These checks establish documentation consistency and readiness for separate
epic-specific story planning, not runtime feature completion or release
readiness. The baseline's Testcontainers skips and failing browser E2E scenarios
remain documented limitations. Legal, data-rights, evidence, and financial
policy gates remain open where the PRD and epics say so.

A read-only independent review found that complete mode had not required
canonical navigation or scanned reference-style links, and that the staged-path
check only listed names. The validator/test correction in `c12bbda` and the
nonzero staged-path commands in Plan 7 close those documentation-gate gaps.
The review did not judge financial content or runtime release readiness.

## Execution Handoff

The seven-plan documentation program is closed. Later work begins with a
separate epic-specific plan using the [product reading index](../../product/README.md),
the owning epic's proposed Story Plan, the PRD, and the gap map. Proposed
`STORY-001-xx` through `STORY-010-xx` proposed IDs are not approved detailed
stories.
Recheck the owning epic's unresolved legal, rights, evidence, financial-policy,
contract, and measurement gates before accepting implementation stories.

## Index Self-Review

**Coverage:** Former Tasks 1-14 map exactly once to Plans 1-7. Existing PRD/review work is preserved and assigned to Plan 4.

**Boundaries:** Each child plan has one independently reviewable outcome and a clear predecessor/successor contract.

**Naming:** Dates, filenames, plan numbers, artifact paths, ID families, and statuses are consistent across the index and child plans.

**Risk:** The catalog is planning evidence, not proof of delivered target
features. Concurrent user documentation edits remain outside this plan's
commits and must be reviewed separately.

**Proportion:** Execution detail lives in child plans; this file contains only plan-set coordination, shared invariants, status, and completion evidence.
