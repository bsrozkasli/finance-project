# Agent Context and Current-System Specification Design

**Status:** Approved and implemented on 2026-10-01

**Date:** 2026-09-30

**Scope:** Repository agent instructions, current-system specification, and their directly triggered reference documents

## 1. Intent

Make the repository easier and safer for AI coding agents by replacing repeated, always-loaded instructions with a small canonical `AGENTS.md` and a one-hop reference model. Restructure root `SPEC.md` into a lean contract for verified current behavior while keeping target product intent in `docs/product/PRD.md`.

The result must reduce context cost without weakening architecture, endpoint compatibility, data integrity, financial correctness, provider degradation, testing integrity, or Git governance.

## 2. Design Principles

1. A rule stays in `AGENTS.md` only when an agent must know it before it can identify which deeper document to read.
2. A detail moves behind a reference only when the trigger is observable from the task, such as changing an endpoint, migration, provider, or test.
3. References are one hop from `AGENTS.md` or `SPEC.md`; agents do not traverse documentation indexes to discover mandatory rules.
4. No rule or contract has two live owners.
5. Code and executable configuration remain the source for mechanically discoverable details; documents preserve decisions and cross-component contracts.
6. Root `SPEC.md` describes verified current behavior only. Product targets, roadmap, and deferred capabilities live in the PRD and delivery artifacts.
7. Existing human-authored rules are retained, rewritten, relocated, automated, or removed through an explicit ledger; brevity alone is never grounds for deletion.

## 3. Canonical Document Hierarchy

| Artifact | Single responsibility |
|---|---|
| `AGENTS.md` | Always-loaded operational rules and task-to-reference routing. |
| `SPEC.md` | Lean, verified current-system contract. |
| `docs/spec/current-system/architecture.md` | Runtime boundaries, ownership, cross-service flow, and architecture diagram. |
| `docs/spec/current-system/contracts.md` | Browser routes, API endpoints, response/error contracts, and compatibility rules. |
| `docs/spec/current-system/domain-and-data.md` | Domain invariants, persistence semantics, financial rules, and data relationships. |
| `docs/spec/current-system/operations.md` | Providers, degradation, caches, configuration, security, performance, logging, and observability. |
| `docs/agent/verification.md` | Runtime validation commands, test-only rules, smoke scenarios, bug reporting, and release evidence. |
| `docs/product/PRD.md` | Target product behavior and approved/deferred requirements. |
| `docs/product/CAPABILITY_GAP_MAP.md` | Current-to-target gaps and epic ownership after it is produced. |
| `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md` | Product-documentation execution plan set. |

Instruction priority remains:

```text
system/developer/tool safety
  > current user task
  > AGENTS.md
  > root SPEC.md and listed companions
  > other docs
  > code comments
```

When repository documents conflict, the safer rule for architecture, endpoint compatibility, data integrity, financial correctness, and provider degradation wins. An unresolved behavioral conflict stops the edit and requires user direction.

## 4. Minimal AGENTS.md

`AGENTS.md` becomes a managed block of approximately 30-50 lines. It contains no complete API catalog, environment-variable table, smoke-test matrix, response examples, repository tree, roadmap, or duplicated Definition of Done.

### 4.1 Required sections

```text
Finance Project Agent Instructions
  Canonical Sources
  Non-Negotiables
  Task References
  Verification
```

### 4.2 Non-negotiables retained at root

- Preserve backend hexagonal boundaries; domain code remains framework-free.
- Preserve endpoint paths and DTO fields unless every consumer changes together.
- The frontend uses the Spring backend for normal application flows and does not bypass it for the data-service.
- Never fabricate market, provider, analyst, research, or AI output.
- Provider failures degrade explicitly through empty, nullable, partial, stale, insufficient-data, or unavailable results.
- Agents consume pre-calculated metrics and never fetch hidden market data.
- Applied migrations are immutable; schema changes receive new migrations.
- Secrets and provider credentials never enter source control or frontend responses.
- Unrelated working-tree changes are preserved and excluded from scoped commits.
- Work happens on a task branch and reaches protected branches through a reviewed PR.

### 4.3 Task routing table

| Observable task trigger | Mandatory first reference |
|---|---|
| Architecture or runtime boundary | `docs/spec/current-system/architecture.md` |
| Endpoint, DTO, browser route, or response shape | `docs/spec/current-system/contracts.md` |
| Domain model, persistence, migration, or financial calculation | `docs/spec/current-system/domain-and-data.md` |
| Provider, cache, configuration, security, degradation, logging, or observability | `docs/spec/current-system/operations.md` |
| Tests, smoke scenarios, bug inventory, or release readiness | `docs/agent/verification.md` |
| Product scope or target behavior | `docs/product/PRD.md` |

The routing table is the only mandatory navigation layer. Companion documents do not require readers to discover another mandatory reference.

## 5. AGENTS.md Migration Ledger

| Existing content | Decision | Destination and reason |
|---|---|---|
| Instruction priority and conflict rule | Rewrite | Keep at root in shorter form; it changes behavior before task classification. |
| Project shape and full port table | Relocate | Runtime ownership goes to `architecture.md`; operational ports/config go to `operations.md`. |
| Backend, data-service, and frontend boundaries | Retain and rewrite | Keep only cross-component prohibitions at root; place complete boundaries in `architecture.md`. |
| Cross-service price, asset, agent, and degradation flows | Relocate with root invariant | Complete flows go to `architecture.md`; fake-data/degradation rules remain root-level. |
| Do-not-touch list | Retain and rewrite | Keep applied migrations, endpoint/DTO compatibility, fixed ports, and synchronized routing changes in root/task references. |
| Branch, commit, PR, and release policy | Retain and compress | Policy is not safely derivable from code or manifests. |
| Runtime test matrices and coverage expectations | Relocate | Move to `docs/agent/verification.md`, triggered by any test or verification task. |
| Ten smoke scenarios | Relocate | Move intact to `docs/agent/verification.md`, triggered by feature/release verification. |
| Definition of Done checklist | Relocate and deduplicate | Verification evidence lives in one document; root keeps only the obligation to run touched-runtime checks. |
| Environment-variable details | Relocate | Move to `operations.md`; root retains the secret-exposure prohibition. |
| Forbidden actions | Retain and deduplicate | Security, fake data, migrations, persistence, and domain annotations remain enforced without repeated sections. |
| Test-only scope, independent expected values, red-test integrity, mocking, ambiguity, and JSONL bug reporting | Relocate intact | Move to a dedicated section in `docs/agent/verification.md`; root routing makes it mandatory for test tasks. |
| “all 8 smoke scenarios” wording | Rewrite | The current catalog has ten scenarios; the new wording is “the full smoke catalog.” |
| Domain dependency restrictions enforced by `ArchitectureTest` | Automate plus root boundary | The test remains enforcement; root keeps the architectural intent so agents choose the right design before tests fail. |

No existing policy is deleted solely for size. Content leaves the always-loaded file only when its full rule is retained in a directly triggered destination or is already mechanically enforced.

## 6. Current-System SPEC.md Kernel

Root `SPEC.md` becomes a concise contract with BMad-compatible semantics, but it will not introduce a partial `.memlog.md` workflow. The repository does not contain the `_bmad/scripts` infrastructure required to make a derived memlog authoritative; adding that tooling is a separate decision.

### 6.1 Root shape

```text
Finance Project Current-System Contract
  Why
  Capabilities
  Constraints
  Non-goals
  Success Signal
  Assumptions
  Open Questions
  Companion Contracts
```

### 6.2 Stable current-system capabilities

| ID | Intent | Success boundary |
|---|---|---|
| `CAP-1` | Track assets and obtain real provider-backed market evidence. | Assets and real OHLCV data are returned or explicitly degraded; no synthetic values appear. |
| `CAP-2` | Maintain ledger-derived portfolio state and investment history. | Transactions persist, holdings derive deterministically, and invalid state transitions fail explicitly. |
| `CAP-3` | Research stocks and supported funds through technical, fundamental, risk, factor, news, and calendar evidence. | Each research section exposes real data, provenance/status, or an explicit unavailable/insufficient result. |
| `CAP-4` | Maintain persistent journal and watchlist workflows. | Entries and ordered symbols survive restart; aggregate research tolerates partial provider failure. |
| `CAP-5` | Produce deterministic and AI-assisted decision-support outputs. | Quantitative metrics remain authoritative; AI failure yields no synthetic narrative and never changes deterministic evidence. |
| `CAP-6` | Degrade safely across provider and runtime failures. | Required errors and partial responses preserve stable contracts and never fabricate market evidence. |
| `CAP-7` | Operate and verify the three-runtime system. | Touched-runtime checks and applicable smoke scenarios produce reproducible evidence. |

Capability IDs are stable once the new SPEC is accepted. New verified behavior receives the next unused ID; target-only capability IDs remain in the PRD.

### 6.3 Root constraints

- Backend domain code remains framework-free and reaches infrastructure through ports/adapters.
- Existing public contracts remain compatible unless all consumers migrate together.
- Data-service analytics are read-only unless an explicit persistence architecture is approved.
- Technical analysis rejects fewer than 30 candles; values requiring longer history remain unavailable rather than fabricated.
- Price history follows local persistence first, provider fallback, persistence of fetched rows, and cache behavior where configured.
- Agent analysis preserves metrics-only inputs and sequential analyst ordering.
- Provider, legal, data-rights, and missing-evidence limitations remain visible to consumers.

### 6.4 Non-goals

- Production multi-user authentication and tenant isolation.
- Brokerage execution, order routing, or write-back.
- Guaranteed real-time provider latency or completeness.
- Personalized financial advice guarantees.
- Target roadmap or unimplemented PRD behavior.

## 7. SPEC Content Routing

| Existing SPEC content | New owner |
|---|---|
| Project overview and current scope | Root kernel, compressed |
| Mermaid architecture diagram and runtime flow | `architecture.md` |
| Repository tree and agent instructions | Removed from SPEC; owned by code and `AGENTS.md` |
| Coding standards and development workflow | `AGENTS.md` or `verification.md` |
| Browser routes, endpoint tables, payload examples, HTTP errors | `contracts.md` |
| Domain models, relationships, persistence, and business rules | `domain-and-data.md` |
| Providers, configuration, performance, security, logging, observability | `operations.md` |
| Test commands and smoke scenarios | `verification.md` |
| Future Roadmap | Target PRD and delivery artifacts |

The malformed literal ``|`r`n|`` in the data-service endpoint table is corrected during extraction. Broken references to deleted `docs/FRONTEND_API.md`, `docs/ERROR_CATALOG.md`, and `docs/PROVIDER_GUIDE.md` are replaced by the new directly owned companions.

## 8. CLAUDE.md Strategy

`AGENTS.md` is the only canonical instruction source. Do not create a second full rule file.

A `CLAUDE.md` may be added later only when the active Claude Code harness is verified to load a minimal pointer/import reliably. Its allowed content is limited to directing Claude to `AGENTS.md`; no repository rule may be copied into both files.

## 9. Existing Deleted Documentation

The working tree currently shows several tracked `docs/*.md` files as deleted. This design does not silently restore, commit, or discard those changes.

During implementation:

1. Read the last tracked version of each deleted document.
2. Preserve every load-bearing current rule in the new canonical owner.
3. Archive legacy-only material under the existing recoverable archive structure when that matches the user's prior archive direction.
4. Restore `docs/LEGACY_ARCHIVE_MANIFEST.md`; it is the current archive index, not a legacy input.
5. Commit deletions or archive moves separately from the AGENTS/SPEC restructure so provenance remains reviewable.

## 10. Known Reconciliation Items

- `.github/workflows/ci.yml` uses Python 3.12 while `.github/workflows/data-service.yml` uses Python 3.11. The documentation records this mismatch as an open question; this documentation task does not silently change CI.
- MongoDB is configured and provisioned but no durable product ownership is established in the inspected implementation. Describe it as reserved/configured infrastructure, not an active persistence contract.
- Current asset metadata resolution is provider/data-service backed and records unavailable/partial status. Do not preserve stale FMP-first wording from a deleted support document.
- The full smoke catalog contains ten scenarios; do not retain the stale “all 8” statement.

## 11. Validation Strategy

### Structural validation

- `AGENTS.md` contains the managed markers and only the approved minimal sections.
- Every task-routing target exists and is one hop away.
- Root `SPEC.md` contains unique stable capability IDs and no target roadmap.
- Every companion is listed once and owns a non-overlapping content type.
- No live document references a deleted current document.
- No unresolved placeholder such as `TBD`, `TODO`, or template marker remains.

### Evidence validation

- Architecture statements resolve to source paths or enforcing tests.
- Contract catalogs resolve to controller/router/client definitions.
- Domain and persistence statements resolve to models, ports, adapters, migrations, or tests.
- Provider/configuration statements resolve to configuration and provider implementations.
- Verification commands resolve to manifests, wrappers, or CI workflows.

### Repository validation

```powershell
git diff --check
git status --short
```

Runtime test suites are not required merely for moving documentation. If contract verification exposes a disputed implementation claim, run the smallest relevant existing test or mark the claim unresolved rather than inventing a result.

## 12. Success Criteria

- `AGENTS.md` is short enough to remain useful as always-loaded context and contains no duplicated catalogs.
- Every relocated rule has one canonical owner and an observable task trigger.
- `SPEC.md` clearly distinguishes verified current behavior from target product intent.
- Current contracts remain discoverable without a multi-hop documentation search.
- No high-cost architecture, data-integrity, financial-correctness, provider-degradation, testing-integrity, or Git-governance rule is lost.
- Claude-specific compatibility, if later needed, adds a pointer rather than a second rule source.
