# Product Documentation Plan 2 — Brownfield Evidence Audit Implementation Plan

**Status:** Complete — see Plan 2 in [the plan-set table](2026-09-29-product-documentation-reconstruction.md#child-plans). Step checkboxes were not ticked during execution.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible current-state evidence for each runtime and the contracts that connect them, without changing application behavior.

**Architecture:** Audit the backend, data-service, and frontend independently, then reconcile their shared flows and legacy-document contradictions. Every capability record uses the governance contract from Plan 1 and links to exact source, test, endpoint, or runtime evidence.

**Tech Stack:** Markdown, ripgrep, Git, Maven/JUnit 5, pytest, Vitest, ESLint, Vite/TypeScript, Python validator

**Plan Set:** Plan 2 of 7 in `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`.

**Depends On:** Plan 1 governance and validation.

**Produces:** Four evidence annexes plus the legacy-document conflict ledger.

**Spec:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`

## Locked Decisions

- Code, tests, and executed verification outrank legacy documents.
- A failed or unavailable verification remains a recorded limitation; it never becomes E3 evidence.
- Cross-runtime mismatches are recorded as E0 rather than silently reconciled.
- Archived claims are read through `docs/LEGACY_ARCHIVE_MANIFEST.md` and `git show 77fec5f:<relative-path>`; archived files are not restored.
- `data-service/external/TradingAgents` is read-only and excluded from every modification and commit.

## Global Constraints

- Do not change production code or tests during this evidence-only plan.
- Do not call live financial providers; use code inspection, existing tests, and controlled doubles.
- Do not fabricate evidence, metadata, market data, or successful verification.
- Record commit, path or endpoint, reviewer, date, environment, limitations, and reproducible locator for every E2/E3 claim.
- Preserve endpoint compatibility, provider degradation, persistence behavior, and fixed ports.

## Review Focus

- A controller, route, or page listed without its delegated service/hook must fail the owning task's evidence review.
- A provider failure path represented as success must remain a limitation or E0 claim.
- PEG must not be promoted beyond the evidence supported by source and tests.
- A frontend/backend/data-service mismatch must appear in cross-runtime evidence rather than be normalized in prose.
- Legacy authentication, product-universe, MongoDB, roadmap, or PEG contradictions must receive explicit dispositions.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/product/evidence/backend.md` | Create | Backend contracts, persistence, providers, cache, and tests. |
| `docs/product/evidence/data-service.md` | Create | Analytics, provider chains, models, agents, and tests. |
| `docs/product/evidence/frontend.md` | Create | Routes, views, hooks, API consumers, and tests. |
| `docs/product/evidence/cross-runtime.md` | Create | End-to-end contract and degradation traces. |
| `docs/product/evidence/legacy-document-conflicts.md` | Create | Explicit legacy-claim contradiction ledger. |

---

## Task 1: Audit Backend Capabilities

**Files:**
- Create: `docs/product/evidence/backend.md`
- Inspect read-only: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/`
- Inspect read-only: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/`
- Inspect read-only: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/`
- Inspect read-only: `backend/src/main/resources/db/migration/`
- Inspect read-only: `backend/src/test/java/com/ozkaslibasar/financeproject/`

**Interfaces:**
- Consumes: `docs/product/CONTRIBUTING.md` and the audited repository commit.
- Produces: `CAP-CUR-BE-NNN` records consumed by Plans 3 and 4.
- Preserves: hexagonal boundaries, endpoint contracts, migrations, provider fallback, and application state.

**Acceptance Evidence:**
- Each endpoint record names method, path, delegated use case/port, persistence, degradation, and closest test evidence.
- `./mvnw.cmd test` results are recorded honestly and the documentation validator exits `0`.

- [ ] **Step 1: Confirm the evidence artifact is absent or explicitly resume it**

Run: `Test-Path docs/product/evidence/backend.md`

Expected: `False`, or an existing partial artifact whose status and last completed record are documented before continuation.

- [ ] **Step 2: Record audit identity and inventory backend contracts**

Record commit, branch, reviewer, date, Java version, and environment. Inventory controllers, domain services, ports, persistence adapters, jobs, errors, caching, and migrations with `CAP-CUR-BE-NNN` records.

- [ ] **Step 3: Attach locators and run backend verification**

Run from `backend/`: `.\mvnw.cmd test`

Expected: exit `0` for E3 promotion; otherwise record the failure and retain affected records at E2 or lower.

- [ ] **Step 4: Validate and commit the backend audit**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; every E2/E3 backend record has a locator.

```powershell
git add docs/product/evidence/backend.md
git diff --cached --check
git commit -m "docs(backend): audit current backend capabilities"
```

---

## Task 2: Audit Data-Service Capabilities

**Files:**
- Create: `docs/product/evidence/data-service.md`
- Inspect read-only: `data-service/main.py`, `data-service/app/`, and `data-service/tests/`

**Interfaces:**
- Consumes: Plan 1 authoring rules and the audited repository commit.
- Produces: `CAP-CUR-DS-NNN` records consumed by Plans 3 and 4.
- Preserves: provider isolation, 30-candle minimum behavior, read-only analytics, agent input boundaries, and the user-owned submodule change.

**Acceptance Evidence:**
- Routes, Pydantic contracts, providers, analytics, portfolio metrics, PEG, and agent orchestration have exact Python locators.
- PEG is labeled according to actual evidence, including raw provider input, thresholds, weighting, and missing tests where applicable.

- [ ] **Step 1: Confirm the evidence artifact is absent or explicitly resume it**

Run: `Test-Path docs/product/evidence/data-service.md`

Expected: `False`, or a documented partial state.

- [ ] **Step 2: Record audit identity and inventory data-service contracts**

Record commit, branch, reviewer, date, Python version, environment, and the explicit `TradingAgents` modification exclusion. Create coherent `CAP-CUR-DS-NNN` records.

- [ ] **Step 3: Run data-service verification**

Run from `data-service/`: `python -m pytest`

Expected: exit `0` for directly tested E3 claims; unavailable compiled dependencies or failures remain documented limitations.

- [ ] **Step 4: Validate and commit the data-service audit**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`.

```powershell
git add docs/product/evidence/data-service.md
git diff --cached --check
git commit -m "docs(data-service): audit current analytics capabilities"
```

---

## Task 3: Audit Frontend Capabilities

**Files:**
- Create: `docs/product/evidence/frontend.md`
- Inspect read-only: `frontend/src/App.tsx`, `frontend/src/api/`, `frontend/src/hooks/`, `frontend/src/components/`, and frontend test files.

**Interfaces:**
- Consumes: Plan 1 authoring rules and the audited repository commit.
- Produces: `CAP-CUR-FE-NNN` records consumed by Plans 3 and 4.
- Preserves: router/API separation, API base URL, Vite proxy, and component-owned transient UI state.

**Acceptance Evidence:**
- Each route or workflow names its router entry, owning view, hook, API call/type, loading/error ownership, and closest test.
- Tests, lint, and build results are recorded without changing source or tests.

- [ ] **Step 1: Confirm the evidence artifact is absent or explicitly resume it**

Run: `Test-Path docs/product/evidence/frontend.md`

Expected: `False`, or a documented partial state.

- [ ] **Step 2: Record audit identity and inventory browser/API contracts**

Record commit, branch, reviewer, date, Node/npm versions, and environment. Cover routes, pages, hooks, charts, portfolio, watchlists, journal, research, news, reports, and settings.

- [ ] **Step 3: Run frontend verification**

Run from `frontend/`: `npm test`, `npm run lint`, and `npm run build`.

Expected: all exit `0` for directly tested E3 claims; failures remain evidence and do not authorize source edits.

- [ ] **Step 4: Validate and commit the frontend audit**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`.

```powershell
git add docs/product/evidence/frontend.md
git diff --cached --check
git commit -m "docs(frontend): audit current user workflows"
```

---

## Task 4: Audit Cross-Runtime Flows and Legacy Conflicts

**Files:**
- Create: `docs/product/evidence/cross-runtime.md`
- Create: `docs/product/evidence/legacy-document-conflicts.md`
- Inspect read-only: `SPEC.md`, `docs/LEGACY_ARCHIVE_MANIFEST.md`, `docs/FRONTEND_API.md`, `docs/architecture.md`, and `docs/adr/`
- Inspect from source commit `77fec5f`: `requirements.md`, `FRONTEND_ROADMAP.md`, `docs/AUTH_SPEC.md`, and `docs/SYSTEM_REFACTOR_ROADMAP.md`

**Interfaces:**
- Consumes: all three runtime evidence files from Tasks 1-3.
- Produces: `CAP-CUR-XR-NNN` and `DOC-CONFLICT-NNN` records consumed by Plans 3 and 4.
- Preserves: archived files in place and every unresolved mismatch as an explicit record.

**Acceptance Evidence:**
- Prices, technical analysis, agent analysis, portfolio, watchlists, news, macro/calendar, reports, caching, persistence, and degradation are traced across every participating layer.
- Every conflict records claim A, claim B, stronger evidence, disposition, and affected artifact.

- [ ] **Step 1: Trace primary cross-runtime flows**

For each flow cite frontend API/type, Spring endpoint/DTO, data-service route/model when present, persistence/cache behavior, provider fallback, and nearest tests.

- [ ] **Step 2: Build the legacy conflict ledger**

Assign `DOC-CONFLICT-NNN` IDs. Include authentication scope, product universe, MongoDB status, roadmap-versus-implementation, and PEG behavior with disposition `Retain`, `Correct Later`, `Historical`, or `Unresolved`.

- [ ] **Step 3: Validate cross-runtime evidence and conflicts**

Run: `python scripts/validate_product_docs.py --root docs/product`

Expected: exit `0`; no E2/E3 cross-runtime record lacks all-layer locators and no conflict lacks a disposition.

- [ ] **Step 4: Commit atomically**

```powershell
git add docs/product/evidence/cross-runtime.md docs/product/evidence/legacy-document-conflicts.md
git diff --cached --check
git commit -m "docs(spec): audit cross-runtime contracts and conflicts"
```

## Plan Exit Criteria

- [ ] All five evidence artifacts validate.
- [ ] Every E3 promotion names the exact passing verification evidence.
- [ ] Runtime or contract failures remain visible as limitations or E0 records.
- [ ] Production/test files and `TradingAgents` remain unstaged and unmodified.

## Handoff to Plan 3

- Inputs made available: all `CAP-CUR-*` records, all `DOC-CONFLICT-*` records, verification outputs, and known environment limitations.
- Conditions Plan 3 may assume: evidence files conform to the authoring contract and current-state claims are separated from target intent.
- Open risk carried forward: unresolved conflicts remain visible in the baseline and must not be resolved by editorial inference.

## Self-Review

**Spec coverage:** This plan covers all three runtimes, their primary flows, provider degradation, persistence/cache behavior, and legacy contradictions. Canonical synthesis belongs to Plan 3.

**Step scan:** Each runtime produces a separately reviewable evidence file; cross-runtime reconciliation starts only after all three exist.

**Type and name consistency:** Evidence ID prefixes, conflict IDs, validation commands, and artifact paths match Plan 1.

**Review focus:** Each listed failure mode has an owning audit or validation step.

**Proportion:** The plan states audit dimensions and proof requirements without pre-writing evidence conclusions.
