# Product Documentation Authoring Contract

This guide is the normative authoring contract for the evidence-driven product
documentation set. It defines how current behavior, target intent, evidence,
delivery ownership, and unresolved conflicts are recorded. It does not change
runtime behavior or promote target requirements into the implemented-system
contract.

## Artifact Taxonomy

Each artifact has one owner and one meaning:

| Artifact | Role |
|---|---|
| `SPEC.md` | Canonical contract for behavior that is implemented and verified. |
| `docs/superpowers/specs/YYYY-MM-DD-*-design.md` | Reviewed foundation or feature-design record that precedes canonical delivery artifacts. |
| `docs/product/CURRENT_STATE_BASELINE.md` | Evidence-backed inventory of what exists now, including limitations and contradictions. |
| `docs/product/PRD.md` | Canonical target-product requirements; it must not claim that target behavior is implemented. |
| `docs/product/CAPABILITY_GAP_MAP.md` | Traceability from current evidence to target requirements, gap class, and delivery ownership. |
| `docs/product/evidence/*.md` | Detailed current-state evidence and explicit legacy-conflict records. |
| `docs/product/epics/EPIC-NNN-*.md` | One user-outcome epic with scope, dependencies, risks, evidence, and story-plan boundaries. |
| `docs/product/stories/EPIC-NNN/STORY-NNN-NN-*.md` | One testable story owned by the matching epic directory. |
| `docs/product/review-*.md` and `docs/product/reconcile-*.md` | Review or reconciliation input; these are not capability evidence. |
| `docs/product/README.md` and `docs/README.md` | Navigation indexes only; they must not redefine requirements. |
| `CONTRIBUTING.md` | This policy artifact; policy text is not capability evidence. |

The word `spec` is reserved for a normative contract or requirement set.
The word `design` identifies a reviewed solution or foundation decision.
`Epic` and `story` appear as delivery terms only in artifacts carrying their
stable identifiers.

## Stable IDs and Statuses

Use these identifier families exactly; do not invent aliases or change the
prefix to fit a local naming preference:

| Family | Meaning |
|---|---|
| `CAP-CUR-BE-NNN` | Current backend capability evidence. |
| `CAP-CUR-DS-NNN` | Current data-service capability evidence. |
| `CAP-CUR-FE-NNN` | Current frontend capability evidence. |
| `CAP-CUR-XR-NNN` | Current cross-runtime capability evidence. |
| `CAP-TGT-NNN` | Target product capability. |
| `PRD-FR-NNN` | Atomic functional requirement. |
| `PRD-NFR-NNN` | Atomic non-functional requirement. |
| `EPIC-NNN` | User-outcome epic. |
| `STORY-NNN-NN` | Testable story owned by an epic. |
| `DOC-CONFLICT-NNN` | Explicit contradiction or unresolved legacy-document conflict. |

`NNN` and `NN` are zero-padded decimal numbers. An ID is declared once in its
own artifact and is referenced verbatim everywhere else. Duplicate declarations
and references to an undeclared ID fail validation.

Requirement status is one of:

| Status | Meaning |
|---|---|
| `Proposed` | Candidate intent that has not passed product approval. |
| `Approved` | Accepted target scope; it is not evidence of implementation. |
| `Implemented` | The target behavior has been delivered in the implementation contract and has a recorded promotion decision. |
| `Verified` | The behavior has passing E3 runtime or test evidence for the stated contract. |
| `Deferred` | Intentionally outside the current delivery phase or blocked by an explicit gate. |

`Implemented` and `Verified` are claims about delivered behavior, not about
future design. A target requirement may not be described as implemented in
the PRD without the corresponding implementation and verification evidence.
Only E3 evidence supports `Verified`. A review, roadmap, comment, or passing
prose inspection cannot silently promote a claim to E3.

## Evidence Contract

Evidence levels are ordered from strongest to weakest:

1. `E3 - Runtime Verified`: observed through a passing test or executed scenario.
2. `E2 - Implementation Verified`: code and contract inspected but not executed.
3. `E1 - Documented Claim`: supported only by existing documentation.
4. `E0 - Missing or Contradicted`: absent, incomplete, or inconsistent with stronger evidence.

Every current-state capability record must include these fields:

- `ID`
- `Summary`
- `Evidence Level`
- `Contract`
- `Evidence Locator`
- `Verification`
- `Limitations`
- `Legacy Claims`

An E2 or E3 record additionally names the repository commit, exact file path
and symbol or endpoint, reviewer, review date, environment, and a reproducible
locator. An E3 locator includes the exact command or smoke scenario, relevant
result, execution date, and environment. A failed or unavailable command is a
limitation and does not become E3 evidence.

Evidence must remain reproducible without live financial providers. Automated
checks use stubs, fakes, or wire-level mocks at I/O boundaries and never call
Yahoo Finance/yfinance, Tiingo, Finnhub, FMP, FRED, Azure OpenAI, or another
live external financial provider. No missing market value, metadata, news,
analysis, or model output may be replaced with a fabricated value.

## Required Artifact Sections

The validator checks the sections required by each artifact class. Keep these
headings stable so later plans can link to a predictable contract.

Evidence records contain `ID`, `Summary`, `Evidence Level`, `Contract`,
`Evidence Locator`, `Verification`, `Limitations`, and `Legacy Claims`; their
artifact also contains `Audit Metadata` and `Evidence Records` sections.

`CURRENT_STATE_BASELINE.md` contains `Method`, `Capability Inventory`, and
`Limitations`. `CAPABILITY_GAP_MAP.md` contains `Gap Map` and `Traceability`.

Each epic contains:

- `Outcome`
- `Problem`
- `Scope`
- `Out of Scope`
- `Requirements`
- `Dependencies`
- `Risks`
- `Success Evidence`
- `Story Plan`

Each story contains:

- `User Story`
- `Business Value`
- `Scope`
- `Out of Scope`
- `Preconditions`
- `Acceptance Criteria`
- `Data and Provenance`
- `Degradation`
- `Testing`
- `Dependencies`
- `Traceability`
- `Definition of Done`

Acceptance criteria point to a real artifact, command, stable ID, or reviewable
outcome. A story file must live under the directory of its owning epic and its
identifier must match that directory.

## Current and Target Separation

`SPEC.md` remains the implemented-system kernel. The current baseline and its
evidence annexes describe what the repository proves today; they do not infer
capabilities from target prose, UI copy, comments, or roadmaps. The PRD and gap
map describe target intent and its distance from current evidence. A target
capability may enter `SPEC.md` only after implementation and E3 verification.

Conflicts are recorded, not silently resolved. Every `DOC-CONFLICT-NNN` record
contains the competing claims, stronger evidence, affected artifact, and an
explicit disposition such as `Retain`, `Correct Later`, `Historical`, or
`Unresolved`.

## Degradation and Financial Integrity

Every provider-backed section exposes one of:

`OK`, `STALE`, `EMPTY`, `FAILED`, `RATE_LIMITED`, `INSUFFICIENT_DATA`, or
`PENDING_REFRESH`.

Partial provider failure preserves valid sections. Missing, stale, conflicted,
or unavailable evidence is represented explicitly; it is never zero-filled,
neutralized, or silently presented as current. When minimum evidence is not
met, the product records `Watch - Insufficient Evidence` and identifies the
blocking gaps and reevaluation conditions.

## Authoring Workflow

1. Read `AGENTS.md`, the routed current-system reference, the relevant design,
   and this contract before editing.
2. Establish current evidence before writing target claims. Record the commit,
   locator, reviewer, date, environment, limitations, and verification result.
3. Keep documents in English. Product-owner discussion and review may remain
   Turkish outside the canonical artifacts.
4. Run incremental validation while adding artifacts:

   ```powershell
   python scripts/validate_product_docs.py --root docs/product
   ```

5. Run complete validation only after the canonical artifact set is present:

   ```powershell
   python scripts/validate_product_docs.py --root docs/product --complete
   ```

6. Run the applicable runtime checks from `docs/agent/verification.md`. Never
   weaken a requirement or delete an evidence limitation to obtain a green
   result.
7. Stage explicit paths only. Use one self-consistent Conventional Commit and
   leave unrelated working-tree changes, including the `TradingAgents`
   submodule change, unstaged and unmodified.

The validator is intentionally incremental: it validates artifacts that exist
without requiring later-plan outputs. `--complete` additionally requires the
canonical baseline, PRD, gap map, eleven epic files, six `EPIC-000` stories,
and both documentation indexes.
