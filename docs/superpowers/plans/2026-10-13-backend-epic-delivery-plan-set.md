# Backend Epic Delivery Plan Set

**Status:** Draft implementation plans; no feature delivery or release approval is claimed.

**Goal:** Turn the approved EPIC-001 through EPIC-010 catalog into small, dependency-ordered Spring backend work packages.

**Spec:** docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md; docs/product/PRD.md; docs/product/CAPABILITY_GAP_MAP.md.

## Order and Plan Files

| Phase | Plan | Entry condition |
|---|---|---|
| V1 foundation | [EPIC-001 trusted evidence](2026-10-13-backend-epic-001-trusted-market-evidence.md) | EPIC-000 evidence; OQ-2/3/5 decisions for affected slices |
| V1 foundation | [EPIC-002 portfolio state](2026-10-13-backend-epic-002-transaction-ledger-portfolio-state.md) | EPIC-001 identity; CSV/state contract; OQ-8 for recovery |
| V1 foundation | [EPIC-003 asset research](2026-10-13-backend-epic-003-end-to-end-asset-research.md) | EPIC-001 snapshot; OQ-2/3/4/5 |
| V1 foundation | [EPIC-004 quality and Fit](2026-10-13-backend-epic-004-investment-quality-and-portfolio-fit.md) | EPIC-001–003; OQ-1/3/4/5 |
| Value MVP | [EPIC-005 discovery](2026-10-13-backend-epic-005-explainable-discovery.md) | EPIC-001/003; OQ-2/6 |
| Value MVP | [EPIC-006 AI explanation](2026-10-13-backend-epic-006-ai-decision-explanation.md) | EPIC-001/004/005; OQ-2/6 |
| Value MVP | [EPIC-007 monitoring](2026-10-13-backend-epic-007-material-change-monitoring.md) | EPIC-001/002/004/005; OQ-7/8 |
| Post-V1, deferred | [EPIC-008 personal policy](2026-10-13-backend-epic-008-personal-investment-policy.md) | Separate Post-V1 approval; OQ-1/3/4/7 |
| Post-V1, deferred | [EPIC-009 broker read sync](2026-10-13-backend-epic-009-read-only-broker-synchronization.md) | Separate Post-V1 approval and broker rights |
| Post-V1, deferred | [EPIC-010 SaaS isolation](2026-10-13-backend-epic-010-saas-identity-and-isolation.md) | Separate Post-V1 approval; tenant/legal/economic gates |

## Execution Contract

- Each child is a backend slice, not a claim that the full cross-runtime epic is finished. FastAPI analytics and React contracts are explicit handoffs.
- Before implementation, check the named OQ closure record and current gap-map readiness. A blocked or deferred task does not become executable merely because this plan exists.
- Preserve AGENTS.md, SPEC.md, current-system companions, ADRs, and the verification contract. Public route/DTO changes need OQ-5 disposition and all-consumer migration.
- Each task follows test fail, smallest implementation, focused pass, full touched-runtime checks, applicable smoke scenarios, and an atomic scoped Conventional Commit. New schema needs a new Flyway migration; never edit an applied migration.
- For a task's named focused Java test, run .\mvnw.cmd -Dtest=<TestClassName> test from backend/; the red run must fail for the intended behavior. Then run .\mvnw.cmd test. Run python -m pytest from data-service/ and the required frontend commands in docs/agent/verification.md when those runtimes change.
- Do not call live financial providers in automated tests or invent missing values. Keep unrelated worktree changes, including TradingAgents, unstaged.

## First Safe Slice

The gap map marks only PRD-FR-010 (provider partial/failure proof), PRD-FR-011 (manual-ledger lineage/restart proof), and PRD-FR-014 (ledger replay proof) Ready. These can be verified while OQ-2/3/4/5/8 closures are prepared; no directional decision or external display is implied.

## Exit and Handoff

The set is planning-complete when each child maps its epic requirements to owned tasks, names its gates and tests, and keeps deferred scope deferred. Execution completion requires fresh runtime and cross-runtime evidence under docs/agent/verification.md; the documentation validator alone is insufficient.
