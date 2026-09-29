# Product Documentation Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an evidence-backed current-state baseline, a canonical target product specification, a capability gap map, the approved epic catalog, and the complete `EPIC-000` story package without changing production behavior.

**Architecture:** Treat code, tests, and executed verification as stronger evidence than legacy documentation. Keep current-state evidence, target requirements, gaps, delivery epics, and stories in separate artifacts connected by stable IDs and validated by a small standard-library Python checker. This plan completes the documentation foundation and `EPIC-000`; each feature epic receives its own later story-writing and implementation plan after the gap map is reviewed.

**Tech Stack:** Markdown, Python 3.12 standard library, `unittest`, ripgrep, Git, Maven/JUnit 5, pytest, Vitest, ESLint, Vite/TypeScript

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Global Constraints

- All product artifacts created by this plan SHALL be written in English; discussion and review with the product owner remain in Turkish.
- Do not modify production source code, existing endpoint paths, DTO fields, applied migrations, fixed ports, provider priority, or degradation behavior.
- `SPEC.md` remains the implemented-system contract; target requirements SHALL NOT be written there as implemented behavior.
- Evidence precedence is `E3 Runtime Verified` > `E2 Implementation Verified` > `E1 Documented Claim` > `E0 Missing or Contradicted`.
- Every E2/E3 claim SHALL include the commit, path or endpoint, reviewer, date, environment, limitations, and a reproducible evidence locator.
- Never call live external financial APIs during verification; use existing tests and controlled provider doubles.
- Never introduce or document fake market data as a fallback.
- Preserve the user's existing `data-service/external/TradingAgents` modification and exclude it from every commit.
- Work only on a documentation branch and use atomic Conventional Commits.
- `EPIC-001` through `EPIC-010` receive reviewed epic definitions in this plan, but their detailed story files require separate epic-specific plans after the capability gap map is approved.

## Review Focus

- A target capability accidentally described as current behavior: Task 1 adds a validator rule, and Tasks 7-9 separate current, target, and gap artifacts.
- A capability marked E2/E3 without a reproducible locator: Task 1 validates required evidence fields; Tasks 3-7 populate them.
- Duplicate IDs or broken requirement-to-gap-to-epic links: Task 1 validates uniqueness and references; Tasks 9-14 run the checker.
- Provider failure, stale data, or insufficient evidence omitted from a requirement: Task 8 defines cross-cutting degradation requirements and Task 9 maps them.
- A legacy document contradiction silently resolved: Task 6 records conflicts explicitly and Task 7 references their disposition.

---

## Planned File Structure

### Validation tooling

- Create `scripts/validate_product_docs.py`: validates artifact names, required headings, unique IDs, and cross-document references.
- Create `scripts/tests/test_validate_product_docs.py`: standard-library unit tests for the validator.

### Product documentation rules and evidence

- Create `docs/product/CONTRIBUTING.md`: naming, evidence, ID, status, and required-section rules.
- Create `docs/product/evidence/backend.md`: backend endpoint, domain, persistence, provider, and test evidence.
- Create `docs/product/evidence/data-service.md`: FastAPI route, analytics, provider, agent, and test evidence.
- Create `docs/product/evidence/frontend.md`: route, hook, API consumer, view, and test evidence.
- Create `docs/product/evidence/cross-runtime.md`: contract and end-to-end flow evidence.
- Create `docs/product/evidence/legacy-document-conflicts.md`: unresolved and resolved legacy-document contradictions.

### Canonical product artifacts

- Create `docs/product/CURRENT_STATE_BASELINE.md`.
- Create `docs/product/TARGET_PRODUCT_SPEC.md`.
- Create `docs/product/CAPABILITY_GAP_MAP.md`.
- Create `docs/product/README.md`.
- Modify `docs/README.md` to link the product documentation set.

### Epic artifacts

- Create `docs/product/epics/EPIC-000-current-state-verification.md`.
- Create `docs/product/epics/EPIC-001-trusted-market-evidence.md`.
- Create `docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md`.
- Create `docs/product/epics/EPIC-003-end-to-end-asset-research.md`.
- Create `docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md`.
- Create `docs/product/epics/EPIC-005-explainable-discovery.md`.
- Create `docs/product/epics/EPIC-006-ai-decision-explanation.md`.
- Create `docs/product/epics/EPIC-007-material-change-monitoring.md`.
- Create `docs/product/epics/EPIC-008-personal-investment-policy.md`.
- Create `docs/product/epics/EPIC-009-read-only-broker-synchronization.md`.
- Create `docs/product/epics/EPIC-010-saas-identity-and-isolation.md`.

### EPIC-000 story artifacts

- Create `docs/product/stories/EPIC-000/STORY-000-01-audit-backend-capabilities.md`.
- Create `docs/product/stories/EPIC-000/STORY-000-02-audit-data-service-capabilities.md`.
- Create `docs/product/stories/EPIC-000/STORY-000-03-audit-frontend-capabilities.md`.
- Create `docs/product/stories/EPIC-000/STORY-000-04-verify-cross-runtime-contracts.md`.
- Create `docs/product/stories/EPIC-000/STORY-000-05-reconcile-legacy-document-claims.md`.
- Create `docs/product/stories/EPIC-000/STORY-000-06-publish-current-state-baseline.md`.

---

### Task 1: Build the Product-Document Validator

**Files:**
- Create: `scripts/validate_product_docs.py`
- Create: `scripts/tests/test_validate_product_docs.py`

**Interfaces:**
- Consumes: a `Path` pointing to `docs/product`.
- Produces: `ValidationError(code: str, path: Path, message: str)`, `validate_product_docs(root: Path, complete: bool = False) -> list[ValidationError]`, and `main(argv: Sequence[str] | None = None) -> int`.

- [ ] **Step 1: Write failing validator tests**

Create `scripts/tests/test_validate_product_docs.py` with `unittest.TestCase` tests that build temporary Markdown fixtures and assert:

```python
def test_rejects_duplicate_ids(self):
    self.assertIn("DUPLICATE_ID", error_codes)

def test_rejects_missing_required_story_heading(self):
    self.assertIn("MISSING_SECTION", error_codes)

def test_rejects_unknown_requirement_reference(self):
    self.assertIn("UNKNOWN_REFERENCE", error_codes)

def test_rejects_e2_without_locator(self):
    self.assertIn("MISSING_EVIDENCE_LOCATOR", error_codes)

def test_rejects_target_requirement_marked_implemented(self):
    self.assertIn("TARGET_MARKED_IMPLEMENTED", error_codes)

def test_rejects_target_spec_without_degradation_requirement(self):
    self.assertIn("MISSING_DEGRADATION_REQUIREMENT", error_codes)

def test_rejects_conflict_without_disposition(self):
    self.assertIn("MISSING_CONFLICT_DISPOSITION", error_codes)

def test_complete_mode_requires_canonical_artifacts(self):
    self.assertIn("MISSING_CANONICAL_ARTIFACT", error_codes)

def test_accepts_minimal_complete_document_set(self):
    self.assertEqual([], errors)
```

- [ ] **Step 2: Run the validator tests and confirm the missing-module failure**

Run from the repository root:

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
```

Expected: FAIL because `scripts.validate_product_docs` does not exist.

- [ ] **Step 3: Implement the validator interfaces**

Implement `ValidationError`, `extract_ids(text: str) -> set[str]`, `extract_references(text: str) -> set[str]`, `required_sections(path: Path) -> tuple[str, ...]`, `validate_product_docs(root: Path, complete: bool = False) -> list[ValidationError]`, and `main(...) -> int` in `scripts/validate_product_docs.py`.

The validator SHALL recognize `PRD-FR-NNN`, `PRD-NFR-NNN`, `CAP-CUR-XX-NNN`, `CAP-TGT-NNN`, `EPIC-NNN`, and `STORY-NNN-NN`. It SHALL reject duplicate IDs, missing required sections, references to unknown IDs, E2/E3 evidence without locators, target requirements described as `Implemented`, a target spec without degradation requirements, conflict records without dispositions, and story files outside their owning epic directory. Normal mode SHALL validate only artifacts that exist so tasks can run incrementally. `--complete` SHALL additionally require the three canonical artifacts, all eleven epic files, all six EPIC-000 stories, and both documentation indexes.

- [ ] **Step 4: Run validator tests**

Run:

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the validator**

```powershell
git add scripts/validate_product_docs.py scripts/tests/test_validate_product_docs.py
git commit -m "chore(agents): validate product documentation links"
```

---

### Task 2: Define Product-Documentation Authoring Rules

**Files:**
- Create: `docs/product/CONTRIBUTING.md`

**Interfaces:**
- Consumes: naming and evidence rules from the foundation design.
- Produces: the normative authoring contract used by Tasks 3-14 and the validator.

- [ ] **Step 1: Write the artifact taxonomy**

Document the exact roles of `SPEC.md`, foundation designs, `CURRENT_STATE_BASELINE.md`, `TARGET_PRODUCT_SPEC.md`, `CAPABILITY_GAP_MAP.md`, epic files, story files, and README indexes.

- [ ] **Step 2: Define IDs and statuses**

Require:

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
```

Define requirement statuses as `Proposed`, `Approved`, `Implemented`, `Verified`, or `Deferred`; only E3 evidence may support `Verified`.

- [ ] **Step 3: Define required artifact sections**

Require the exact sections the validator checks:

- Evidence record: ID, Summary, Evidence Level, Contract, Evidence Locator, Verification, Limitations, Legacy Claims.
- Epic: Outcome, Problem, Scope, Out of Scope, Requirements, Dependencies, Risks, Success Evidence, Story Plan.
- Story: User Story, Business Value, Scope, Out of Scope, Preconditions, Acceptance Criteria, Data and Provenance, Degradation, Testing, Dependencies, Traceability, Definition of Done.

- [ ] **Step 4: Validate the authoring rules**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; `CONTRIBUTING.md` is treated as a policy artifact rather than a capability artifact.

- [ ] **Step 5: Commit the authoring rules**

```powershell
git add docs/product/CONTRIBUTING.md
git commit -m "docs(spec): define product documentation rules"
```

---

### Task 3: Audit Backend Capabilities

**Files:**
- Create: `docs/product/evidence/backend.md`
- Inspect read-only: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/`
- Inspect read-only: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/`
- Inspect read-only: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/`
- Inspect read-only: `backend/src/main/resources/db/migration/`
- Inspect read-only: `backend/src/test/java/com/ozkaslibasar/financeproject/`

**Interfaces:**
- Consumes: `docs/product/CONTRIBUTING.md` and repository code/tests at the audited commit.
- Produces: `CAP-CUR-BE-NNN` records used by the baseline and gap map.

- [ ] **Step 1: Record the audit identity**

Record commit hash, branch, reviewer, date, Java version, and Windows environment at the top of `backend.md`.

- [ ] **Step 2: Inventory backend contracts**

Use `rg` to inventory controller mappings, domain services, outbound ports, persistence adapters, scheduled jobs, error handling, cache behavior, and migrations. Create one `CAP-CUR-BE-NNN` record per coherent user-visible or architectural capability.

- [ ] **Step 3: Attach E2 locators**

Each inspected capability SHALL cite exact repository paths and Java symbols. Endpoint capabilities SHALL state method, path, delegated service/port, persistence behavior, and provider degradation behavior.

- [ ] **Step 4: Run backend verification**

Run from `backend/`:

```powershell
.\mvnw.cmd test
```

Expected: exit `0`. Promote only directly exercised capabilities to E3 and record the relevant test class or executed scenario. If a test fails, retain the failure as evidence and do not upgrade the affected capability.

- [ ] **Step 5: Validate the backend evidence**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; every E2/E3 backend record has a locator.

- [ ] **Step 6: Commit the backend audit**

```powershell
git add docs/product/evidence/backend.md
git commit -m "docs(backend): audit current backend capabilities"
```

---

### Task 4: Audit Data-Service Capabilities

**Files:**
- Create: `docs/product/evidence/data-service.md`
- Inspect read-only: `data-service/main.py`
- Inspect read-only: `data-service/app/routers/`
- Inspect read-only: `data-service/app/services/`
- Inspect read-only: `data-service/app/providers/`
- Inspect read-only: `data-service/app/models/`
- Inspect read-only: `data-service/app/trading_agents/metrics_trading_graph.py`
- Inspect read-only: `data-service/tests/`

**Interfaces:**
- Consumes: authoring rules and the audited repository commit.
- Produces: `CAP-CUR-DS-NNN` records used by the baseline and gap map.

- [ ] **Step 1: Record the audit identity**

Record commit hash, branch, reviewer, date, Python version, environment, and the explicit exclusion of `data-service/external/TradingAgents` from audit modifications.

- [ ] **Step 2: Inventory data-service contracts**

Inventory FastAPI routes, Pydantic contracts, provider chains, analytics services, technical minimum-candle behavior, portfolio analytics, valuation/PEG behavior, agent orchestration, and graceful degradation.

- [ ] **Step 3: Attach E2 locators and known limitations**

Each record SHALL cite exact Python module and symbol. PEG SHALL be recorded as an E2 preliminary implementation with raw provider input, fixed thresholds, equal weighting, and missing dedicated tests unless stronger evidence is found.

- [ ] **Step 4: Run data-service verification**

Run from `data-service/` using the repository environment:

```powershell
python -m pytest
```

Expected: exit `0`. Promote only directly exercised behavior to E3. Record unavailable compiled dependencies or environment failures as limitations rather than hiding them.

- [ ] **Step 5: Validate the data-service evidence**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`.

- [ ] **Step 6: Commit the data-service audit**

```powershell
git add docs/product/evidence/data-service.md
git commit -m "docs(data-service): audit current analytics capabilities"
```

---

### Task 5: Audit Frontend Capabilities

**Files:**
- Create: `docs/product/evidence/frontend.md`
- Inspect read-only: `frontend/src/App.tsx`
- Inspect read-only: `frontend/src/api/client.ts`
- Inspect read-only: `frontend/src/api/types.ts`
- Inspect read-only: `frontend/src/hooks/`
- Inspect read-only: `frontend/src/components/`
- Inspect read-only: `frontend/src/**/*.test.ts`
- Inspect read-only: `frontend/src/**/*.test.tsx`

**Interfaces:**
- Consumes: authoring rules and the audited repository commit.
- Produces: `CAP-CUR-FE-NNN` records used by the baseline and gap map.

- [ ] **Step 1: Record the audit identity**

Record commit hash, branch, reviewer, date, Node/npm versions, and environment.

- [ ] **Step 2: Inventory browser and API contracts**

Inventory React Router paths, page/view composition, hooks, API methods and types, loading/error ownership, charts, portfolio flows, watchlists, journal, news, reports, and current personalization/settings behavior.

- [ ] **Step 3: Attach E2 locators**

Each route and feature record SHALL cite its route definition, owning component, hook, API call, and nearest test evidence.

- [ ] **Step 4: Run frontend verification**

Run from `frontend/`:

```powershell
npm test
npm run lint
npm run build
```

Expected: all commands exit `0`. Promote directly exercised routes and behaviors to E3; retain failures as evidence without editing source or tests.

- [ ] **Step 5: Validate the frontend evidence**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`.

- [ ] **Step 6: Commit the frontend audit**

```powershell
git add docs/product/evidence/frontend.md
git commit -m "docs(frontend): audit current user workflows"
```

---

### Task 6: Audit Cross-Runtime Flows and Legacy-Document Conflicts

**Files:**
- Create: `docs/product/evidence/cross-runtime.md`
- Create: `docs/product/evidence/legacy-document-conflicts.md`
- Inspect read-only: `SPEC.md`
- Inspect read-only: `docs/LEGACY_ARCHIVE_MANIFEST.md`
- Inspect from source commit `77fec5f`: `requirements.md`
- Inspect from source commit `77fec5f`: `FRONTEND_ROADMAP.md`
- Inspect from source commit `77fec5f`: `docs/AUTH_SPEC.md`
- Inspect read-only: `docs/FRONTEND_API.md`
- Inspect read-only: `docs/architecture.md`
- Inspect from source commit `77fec5f`: `docs/SYSTEM_REFACTOR_ROADMAP.md`
- Inspect read-only: `docs/adr/`

**Interfaces:**
- Consumes: Tasks 3-5 evidence files.
- Produces: `CAP-CUR-XR-NNN` records and explicit conflict records used by the baseline.

- [ ] **Step 1: Trace the primary runtime flows**

Document frontend-to-backend-to-data-service flows for prices, technical analysis, agent analysis, portfolio ledger/holdings, watchlist research, news, macro/calendar, reports, and provider degradation.

- [ ] **Step 2: Verify contract alignment**

For each flow, cite frontend API method/type, Spring endpoint/DTO, data-service route/model when present, persistence/cache behavior, and nearest test evidence. Record mismatches as E0 rather than resolving them in prose.

- [ ] **Step 3: Build the legacy conflict ledger**

Assign each contradiction a `DOC-CONFLICT-NNN` ID and record claim A, claim B,
stronger evidence, disposition (`Retain`, `Correct Later`, `Historical`, or
`Unresolved`), and affected artifact. Use
`docs/LEGACY_ARCHIVE_MANIFEST.md` as the archive index and read archived claims
with `git show 77fec5f:<relative-path>`. Include at minimum authentication
scope, product universe, MongoDB status, roadmap-vs-implementation, and PEG
behavior.

- [ ] **Step 4: Validate cross-runtime evidence and conflicts**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; no E2/E3 cross-runtime claim lacks all-layer locators.

- [ ] **Step 5: Commit the cross-runtime audit**

```powershell
git add docs/product/evidence/cross-runtime.md docs/product/evidence/legacy-document-conflicts.md
git commit -m "docs(spec): audit cross-runtime contracts and conflicts"
```

---

### Task 7: Publish the Current-State Baseline

**Files:**
- Create: `docs/product/CURRENT_STATE_BASELINE.md`
- Consume read-only: `docs/product/evidence/backend.md`
- Consume read-only: `docs/product/evidence/data-service.md`
- Consume read-only: `docs/product/evidence/frontend.md`
- Consume read-only: `docs/product/evidence/cross-runtime.md`
- Consume read-only: `docs/product/evidence/legacy-document-conflicts.md`

**Interfaces:**
- Consumes: every `CAP-CUR-*` and `DOC-CONFLICT-*` record.
- Produces: the canonical current-state summary consumed by the target gap map.

- [ ] **Step 1: Add baseline metadata and method**

State audited commit, audit period, evidence hierarchy, runtime versions, verification commands, known environmental limits, and the rule that this file describes current behavior only.

- [ ] **Step 2: Summarize capabilities by product area**

Cover asset/market data, research, portfolio, discovery, decision support, monitoring, personalization, identity/SaaS, observability, and testing. Each summary row SHALL link to its `CAP-CUR-*` evidence record and expose the strongest evidence level.

- [ ] **Step 3: Add verified limitations and contradictions**

List E0 gaps and unresolved `DOC-CONFLICT-*` records without proposing target behavior in the baseline.

- [ ] **Step 4: Validate the baseline**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; every baseline capability resolves to evidence.

- [ ] **Step 5: Commit the baseline**

```powershell
git add docs/product/CURRENT_STATE_BASELINE.md
git commit -m "docs(spec): publish verified current-state baseline"
```

---

### Task 8: Write the Canonical Target Product Specification

**Files:**
- Create: `docs/product/TARGET_PRODUCT_SPEC.md`
- Consume read-only: `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

**Interfaces:**
- Consumes: approved foundation decisions.
- Produces: `CAP-TGT-NNN`, `PRD-FR-NNN`, and `PRD-NFR-NNN` requirements consumed by the gap map and epics.

- [ ] **Step 1: Define target capabilities**

Create `CAP-TGT-001` through `CAP-TGT-010` aligned with the approved epic outcomes: trusted evidence, ledger portfolio state, end-to-end research, decision/portfolio fit, discovery, AI explanation, monitoring, personal policy, broker synchronization, and SaaS identity/isolation.

- [ ] **Step 2: Write functional requirements**

Translate the foundation into atomic `PRD-FR-NNN` SHALL statements. Cover user persona, U.S. stock/ETF universe, time horizons, Value MVP workflow, Evidence Snapshot, stock/ETF separation, PEG, DecisionResult/NarrativeAttachment, labels, portfolio fit, degradation, personal policy, alerts, deletion, and deferred capabilities.

- [ ] **Step 3: Write non-functional requirements**

Create `PRD-NFR-NNN` requirements for provenance, deterministic replay, evidence strength, privacy, legal/data-rights gates, performance targets, cost measurement, feature flags, testing, and release blockers.

- [ ] **Step 4: Add explicit exclusions and promotion rules**

State that target requirements are not current implementation claims and may enter root `SPEC.md` only after implementation and E3 verification.

- [ ] **Step 5: Validate the target specification**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; every requirement has one target capability and an approved/deferred status.

- [ ] **Step 6: Commit the target specification**

```powershell
git add docs/product/TARGET_PRODUCT_SPEC.md
git commit -m "docs(spec): define target investment platform requirements"
```

---

### Task 9: Build the Capability Gap Map

**Files:**
- Create: `docs/product/CAPABILITY_GAP_MAP.md`
- Consume read-only: `docs/product/CURRENT_STATE_BASELINE.md`
- Consume read-only: `docs/product/TARGET_PRODUCT_SPEC.md`

**Interfaces:**
- Consumes: all `CAP-CUR-*`, `CAP-TGT-*`, `PRD-FR-*`, and `PRD-NFR-*` IDs.
- Produces: one traceability row per target requirement with gap class and owning epic.

- [ ] **Step 1: Define gap classifications**

Use exactly `None`, `Verification`, `Documentation`, `Behavior`, `Data`, `Architecture`, `Compliance`, or `Deferred`.

- [ ] **Step 2: Map every target requirement**

Each row SHALL contain target capability, requirement ID, current capability/evidence or `None`, gap class, gap statement, owning epic, dependency, and required acceptance evidence.

- [ ] **Step 3: Add contradiction and risk references**

Link affected rows to `DOC-CONFLICT-*`, provider/data-rights risks, legal gates, and known test limitations.

- [ ] **Step 4: Validate total traceability**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; every `PRD-*` requirement appears exactly once as a primary gap-map row and resolves to one epic.

- [ ] **Step 5: Commit the gap map**

```powershell
git add docs/product/CAPABILITY_GAP_MAP.md
git commit -m "docs(spec): map current capabilities to target gaps"
```

---

### Task 10: Define EPIC-000 and Its Complete Story Package

**Files:**
- Create: `docs/product/epics/EPIC-000-current-state-verification.md`
- Create: `docs/product/stories/EPIC-000/STORY-000-01-audit-backend-capabilities.md`
- Create: `docs/product/stories/EPIC-000/STORY-000-02-audit-data-service-capabilities.md`
- Create: `docs/product/stories/EPIC-000/STORY-000-03-audit-frontend-capabilities.md`
- Create: `docs/product/stories/EPIC-000/STORY-000-04-verify-cross-runtime-contracts.md`
- Create: `docs/product/stories/EPIC-000/STORY-000-05-reconcile-legacy-document-claims.md`
- Create: `docs/product/stories/EPIC-000/STORY-000-06-publish-current-state-baseline.md`

**Interfaces:**
- Consumes: current-state evidence, baseline, and gap-map verification gaps.
- Produces: the only complete story package in this foundation plan.

- [ ] **Step 1: Write EPIC-000**

Define the user outcome, evidence problem, scope, exclusions, requirements, dependencies, risks, success evidence, and the six-story delivery order.

- [ ] **Step 2: Write the six user stories**

Each story SHALL use the required story sections and include acceptance criteria that point to its actual evidence file, validation command, and current-state IDs. Mark stories complete only when the referenced artifacts and evidence already satisfy their criteria.

- [ ] **Step 3: Validate epic/story ownership**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; every story ID is unique, resides under `EPIC-000`, and links back to `EPIC-000` and its capability evidence.

- [ ] **Step 4: Commit EPIC-000**

```powershell
git add docs/product/epics/EPIC-000-current-state-verification.md docs/product/stories/EPIC-000
git commit -m "docs(spec): define current-state verification stories"
```

---

### Task 11: Define Trusted-Core Epics

**Files:**
- Create: `docs/product/epics/EPIC-001-trusted-market-evidence.md`
- Create: `docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md`
- Create: `docs/product/epics/EPIC-003-end-to-end-asset-research.md`
- Create: `docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md`

**Interfaces:**
- Consumes: target requirements and gap rows owned by `EPIC-001` through `EPIC-004`.
- Produces: Phase 1 epic boundaries and ordered story-plan entries for later epic-specific planning.

- [ ] **Step 1: Write each epic as an independently reviewable user outcome**

Populate every required epic section. Preserve the dependency order `EPIC-001 -> EPIC-002 -> EPIC-003 -> EPIC-004` without duplicating requirement ownership.

- [ ] **Step 2: Add story-plan entries without creating story files**

For each epic, list proposed story IDs, one-sentence outcomes, dependencies, and the reason detailed story files wait for a separate epic-specific plan. Do not invent implementation status.

- [ ] **Step 3: Validate trusted-core traceability**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; each Phase 1 gap row has exactly one epic owner.

- [ ] **Step 4: Commit trusted-core epics**

```powershell
git add docs/product/epics/EPIC-001-trusted-market-evidence.md docs/product/epics/EPIC-002-transaction-ledger-portfolio-state.md docs/product/epics/EPIC-003-end-to-end-asset-research.md docs/product/epics/EPIC-004-investment-quality-and-portfolio-fit.md
git commit -m "docs(spec): define trusted-core epics"
```

---

### Task 12: Define Value-MVP Epics

**Files:**
- Create: `docs/product/epics/EPIC-005-explainable-discovery.md`
- Create: `docs/product/epics/EPIC-006-ai-decision-explanation.md`
- Create: `docs/product/epics/EPIC-007-material-change-monitoring.md`

**Interfaces:**
- Consumes: target requirements and gap rows owned by `EPIC-005` through `EPIC-007`.
- Produces: Phase 2 epic boundaries and ordered story-plan entries.

- [ ] **Step 1: Write the discovery epic**

Define the limited point-in-time U.S. stock/ETF universe, deterministic screen, shortlist, explanation, batch-cost boundary, and survivorship/data-rights acceptance evidence.

- [ ] **Step 2: Write the AI-explanation epic**

Keep `DecisionResult` authoritative and `NarrativeAttachment` optional. Include outage, invalid-response, provenance, counter-thesis, and cost acceptance evidence.

- [ ] **Step 3: Write the monitoring epic**

Define daily summaries, high-priority event classes, duplicate suppression, 24-hour delivery, usefulness measurement, and alert-disable fallback.

- [ ] **Step 4: Validate Value-MVP traceability**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`.

- [ ] **Step 5: Commit Value-MVP epics**

```powershell
git add docs/product/epics/EPIC-005-explainable-discovery.md docs/product/epics/EPIC-006-ai-decision-explanation.md docs/product/epics/EPIC-007-material-change-monitoring.md
git commit -m "docs(spec): define value-mvp epics"
```

---

### Task 13: Define Personalization and Deferred-Scale Epics

**Files:**
- Create: `docs/product/epics/EPIC-008-personal-investment-policy.md`
- Create: `docs/product/epics/EPIC-009-read-only-broker-synchronization.md`
- Create: `docs/product/epics/EPIC-010-saas-identity-and-isolation.md`

**Interfaces:**
- Consumes: target requirements and gap rows owned by `EPIC-008` through `EPIC-010`.
- Produces: Phase 3/4 epic boundaries, with `EPIC-009` and `EPIC-010` explicitly deferred from the Value MVP.

- [ ] **Step 1: Write the personal-policy epic**

Include explicit policy, consented event capture, pairwise ranker, bounded policy calibrator, shadow gates, deterministic backend enforcement, deletion, legal review, and fallback acceptance evidence.

- [ ] **Step 2: Write the broker-synchronization epic**

Limit scope to read-only synchronization using staging, validation, deduplication, reconciliation, and ledger-derived holdings. Keep execution and write-back out of scope.

- [ ] **Step 3: Write the SaaS identity/isolation epic**

Include account ownership, tenant isolation, subscriptions/pricing, legal/data rights, model-artifact ownership, deletion/retention, and gross-margin gates. Preserve the rule that this epic is not part of the Value MVP.

- [ ] **Step 4: Validate Phase 3/4 traceability and deferred status**

Run:

```powershell
python scripts/validate_product_docs.py --root docs/product
```

Expected: exit `0`; every `EPIC-009` and `EPIC-010` requirement is marked `Deferred` from the Value MVP.

- [ ] **Step 5: Commit personalization and scale epics**

```powershell
git add docs/product/epics/EPIC-008-personal-investment-policy.md docs/product/epics/EPIC-009-read-only-broker-synchronization.md docs/product/epics/EPIC-010-saas-identity-and-isolation.md
git commit -m "docs(spec): define personalization and scale epics"
```

---

### Task 14: Publish the Product-Documentation Index and Final Evidence

**Files:**
- Create: `docs/product/README.md`
- Modify: `docs/README.md`
- Verify: every file under `docs/product/`

**Interfaces:**
- Consumes: all artifacts from Tasks 1-13.
- Produces: navigable documentation indexes and a fully validated documentation foundation ready for epic-specific planning.

- [ ] **Step 1: Create the product-documentation index**

List the foundation design, current baseline, target spec, gap map, evidence annexes, epic catalog, EPIC-000 stories, status, and intended reading order. State that detailed stories for `EPIC-001` through `EPIC-010` require separate plans.

- [ ] **Step 2: Update the repository documentation index**

Add a `Product Definition and Delivery` section to `docs/README.md` linking `docs/product/README.md`. Do not duplicate requirements in the index.

- [ ] **Step 3: Run product-document validation**

Run:

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
python scripts/validate_product_docs.py --root docs/product --complete
```

Expected: all unit tests PASS and product-document validation exits `0` with no errors.

- [ ] **Step 4: Run repository hygiene checks**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only intended documentation/validator changes are present; `data-service/external/TradingAgents` remains unstaged and unchanged by this work.

- [ ] **Step 5: Commit the indexes**

```powershell
git add docs/product/README.md docs/README.md
git commit -m "docs(spec): index product requirements and delivery artifacts"
```

- [ ] **Step 6: Perform final branch verification**

Run:

```powershell
python -m unittest discover -s scripts/tests -p "test_*.py" -v
python scripts/validate_product_docs.py --root docs/product --complete
git diff --check main...HEAD
git log --oneline main..HEAD
git status --short --branch
```

Expected: validator tests PASS, documentation validation exits `0`, the branch diff is clean, commits are atomic, and the only unrelated working-tree entry is the pre-existing `data-service/external/TradingAgents` modification.
