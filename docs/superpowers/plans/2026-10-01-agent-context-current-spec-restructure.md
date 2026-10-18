# Agent Context and Current-System Spec Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated and stale repository guidance with a minimal `AGENTS.md`, a lean current-system `SPEC.md`, directly routed companion contracts, and recoverable legacy-document navigation.

**Architecture:** `AGENTS.md` remains the small always-loaded policy and routing layer. `SPEC.md` becomes the verified current-system kernel, while architecture, contracts, domain/data, operations, and verification details have one canonical owner each. Product targets remain in `docs/product/PRD.md`; historical documents remain recoverable through the archive manifest.

**Tech Stack:** Markdown, PowerShell structural checks, Git

**Spec:** `docs/superpowers/specs/2026-09-30-agent-context-and-current-spec-design.md`

## Global Constraints

- Documentation is English; user collaboration remains Turkish.
- Preserve unrelated working-tree changes, including `docs/product/`, the product-foundation design, and the `data-service/external/TradingAgents` submodule state.
- Describe verified current behavior only; target behavior belongs in `docs/product/PRD.md`.
- Do not fabricate contracts, providers, data flows, test evidence, or runtime behavior.
- No load-bearing rule may disappear: retain, rewrite, relocate, automate, or archive it with a named owner.
- Keep mandatory references one hop from `AGENTS.md` or `SPEC.md`.
- Do not commit during this run; `bmad-project-context` requires the user to review the resulting diff first.

## Review Focus

- A reader following any AGENTS task trigger reaches an existing canonical document in one hop.
- Current and target behavior cannot be confused between `SPEC.md` and `docs/product/PRD.md`.
- Deleted legacy guides leave no broken live references and remain recoverable through the manifest.
- Stale owner names and endpoint paths are not copied into the new documents.
- Existing dirty worktree content outside this documentation restructure remains untouched.

---

### Task 1: Minimal Agent Context

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/agent/verification.md`

**Interfaces:**
- Consumes: approved AGENTS proposal and migration ledger in the conversation; current repository commands and CI workflows.
- Produces: managed AGENTS block and the canonical verification/test/release contract used by later tasks.

- [x] **Step 1: Verify the current duplication and stale statements**

Run: `rg -n "PriceIngestionUseCase|AgentAnalysisUseCase.*Redis|Dashboard\.tsx|all 8 smoke|## 7\. Smoke tests|## 11\. Permanent rules" AGENTS.md`

Expected: stale or duplicated material is found before the rewrite.

- [x] **Step 2: Replace AGENTS.md with the approved managed block**

Keep policy, task routing, high-cost cross-component conventions, and provenance only.

- [x] **Step 3: Create the verification companion**

Preserve runtime commands, coverage expectations, ten smoke scenarios, test-only scope, independent expected-value rules, mocking discipline, ambiguity handling, JSONL bug reporting, CI caveats, and release evidence.

- [x] **Step 4: Verify task routing and rule preservation**

Run: `rg -n "docs/spec/current-system|docs/agent/verification.md|Never fabricate|Applied Flyway" AGENTS.md docs/agent/verification.md`

Expected: every route and root hard stop is present; all ten smoke IDs occur exactly once in the canonical verification document.

### Task 2: Current-System Contract and Companions

**Files:**
- Replace: `SPEC.md`
- Create: `docs/spec/current-system/architecture.md`
- Create: `docs/spec/current-system/contracts.md`
- Create: `docs/spec/current-system/domain-and-data.md`
- Create: `docs/spec/current-system/operations.md`

**Interfaces:**
- Consumes: current controllers, routers, models, migrations, configuration, ADRs, existing SPEC, and Task 1 routing paths.
- Produces: `CAP-1` through `CAP-7`, a lean kernel, and four non-overlapping current-system companions.

- [x] **Step 1: Confirm the companion paths do not yet exist and capture stale SPEC evidence**

Run: `rg -n "/api/v1/analysis/|price_histories|Future Roadmap|\|`r`n\|" SPEC.md`

Expected: stale endpoint/table/roadmap or malformed-table evidence is found.

- [x] **Step 2: Write the SPEC kernel**

Use the approved Why, capabilities, constraints, non-goals, success signal, assumptions, open questions, and companion list. Keep stable IDs `CAP-1` through `CAP-7`.

- [x] **Step 3: Extract verified architecture and contract catalogs**

Document three-runtime ownership, hexagonal boundaries, price/asset/agent flows, browser/backend/data-service routes, DTO compatibility, and the five-field backend error shape. Include `POST /api/v1/prices/batch-history` and direct data-service `/api/v1/*` analysis paths.

- [x] **Step 4: Extract verified domain/data and operations contracts**

Distinguish Flyway-managed tables from JPA `ddl-auto: update`; use `price_history`; include portfolio and symbol-mapping migrations. Document provider degradation, caches, configuration, security, observability, fixed ports, and configured-but-unused MongoDB.

- [x] **Step 5: Verify kernel/companion separation**

Run: `rg -n "Future Roadmap|/api/v1/analysis/|price_histories|ANTHROPIC_API_KEY|\|`r`n\|" SPEC.md docs/spec/current-system`

Expected: no stale terms; each companion exists and is listed once by `SPEC.md`.

### Task 3: Navigation, ADR, README, and Archive Reconciliation

**Files:**
- Modify: `docs/README.md`
- Restore and modify: `docs/LEGACY_ARCHIVE_MANIFEST.md`
- Modify: `README.md`
- Modify: `docs/adr/0001-hexagonal-architecture.md`
- Modify: `docs/adr/0002-three-runtime-monorepo.md`
- Modify: `docs/adr/0003-redis-agent-analysis-cache.md`
- Modify: `docs/adr/0004-sequential-agent-order.md`
- Modify: `docs/adr/0005-db-first-lazy-price-loading.md`
- Preserve as deleted after migration: the remaining tracked legacy `docs/*.md` guides already deleted in the worktree.

**Interfaces:**
- Consumes: canonical paths from Tasks 1-2 and the existing `archive/legacy-docs-2026-09-29/` structure.
- Produces: working navigation, semantic ADR links, corrected README provider text, and a live archive manifest covering retired guides.

- [x] **Step 1: Restore the live archive manifest from HEAD**

Use its tracked content as the baseline; append the newly retired guide inventory and recovery semantics without moving or deleting unrelated archive content.

- [x] **Step 2: Replace broken documentation-index links**

Point `docs/README.md` directly to `SPEC.md`, its companions, verification, PRD, ADRs, plans, designs, and archive manifest.

- [x] **Step 3: Correct root README stale provider and link statements**

Replace Anthropic/`ANTHROPIC_API_KEY` claims with verified Azure OpenAI configuration and remove local `file:///` contribution links or point them to existing repository documents.

- [x] **Step 4: Replace numbered ADR references with semantic canonical paths**

ADRs must not depend on unstable `SPEC.md` or `AGENTS.md` section numbers.

- [x] **Step 5: Verify no live document references retired current guides**

Run: `rg -n "docs/(FRONTEND_API|ERROR_CATALOG|PROVIDER_GUIDE|architecture|AGENT_WORKFLOW|BACKEND_RULES|CODING_STANDARDS|DATA_SERVICE_RULES|FRONTEND_RULES|TESTING_PROTOCOL|ERROR_FIX_PROTOCOL|KNOWN_ISSUES|OBSERVABILITY)\.md|file:///|ANTHROPIC_API_KEY" AGENTS.md SPEC.md README.md docs -g '*.md'`

Expected: no live canonical reference remains, except explicit historical filenames in the archive manifest.

### Task 4: Structural and Preservation Verification

**Files:**
- Verify all files changed by Tasks 1-3.

**Interfaces:**
- Consumes: every output from Tasks 1-3.
- Produces: fresh structural evidence and a scoped diff ready for user review.

- [x] **Step 1: Validate required files and managed markers**

Run a PowerShell check that all routed paths exist, AGENTS markers are balanced, CAP IDs are unique, S1-S10 each occur once in verification, and no placeholder (`TBD`, `TODO`, template marker) remains in canonical docs.

- [x] **Step 2: Validate links and stale terminology**

Run targeted `rg` checks for retired paths, stale owners, stale endpoints, incorrect table names, Anthropic configuration, and numbered ADR links.

- [x] **Step 3: Validate Git hygiene**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors; unrelated pre-existing changes remain present and untouched.

- [x] **Step 4: Review the complete documentation diff**

Use a fresh reviewer against the approved design, implementation plan, ledger decisions, and scoped diff. Fix Important/Critical documentation defects once, then repeat structural verification.
