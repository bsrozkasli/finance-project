# Dark Council Frontend Implementation Plan

> **For agentic workers:** Execute inline in the current task branch; the user has approved the dark prototype and explicitly requested implementation. Preserve the pre-existing working tree. Scope commits separately only when requested.

**Goal:** Apply the approved dark research desk to the actual React frontend while preserving live API contracts and persistent user workflows.

**Architecture:** Shared design tokens and shell styles live in `frontend/src/index.css`. A routed `ResearchWorkspace` composes the existing chart with six evidence tabs. Financial/news requests use the Spring client and a cancellation-safe hook. Existing journal, portfolio, reports and watchlist flows keep their persistence and deep links.

**Tech Stack:** React, TypeScript, Tailwind, lightweight-charts, Vitest/MSW, Playwright.

**Spec:** `docs/design-council/2026-10-17/decisions.md`, `dark-theme.md`, `component-contract.md`; visual reference `docs/prototypes/mercek-design-council-dark.html`.

## Global Constraints

- Canvas `#0E1218`, panel `#171E27`, navigation `#10151C`, text `#E6EDF6`, helper `#A7B4C5`; cobalt actions and light blue selected/link states.
- Desktop navigation192px, header56px, page edge24px, panel gap16px, panel radius6px/control4px. Body14px, table13px, helper12px; mobile targets44px.
- Preserve all browser/API routes and previous user edits. No dependencies, endpoint changes, synthetic financial evidence, or prototype snapshot data in production.
- Financial source, unit/period limitations and unknown prices remain explicit. Actual journal/transaction writes retain their existing semantics.
- Source details: optional280px nonmodal only if viewport≥1440 and remaining data width≥900; otherwise modal with focus return.

## Review Focus

1. A saved symbol without price history remains searchable/researchable; never switches to another symbol's evidence.
2. Slow symbol A response after selecting B must not replace B's evidence.
3. Null financial series/period values stay unknown; do not label unknown currency as USD.
4. Mobile tabs/controls remain visible, usable and contained; source resize does not lose focus.
5. Search keyboard handling and actual persistent watchlist/journal actions remain intact.

## Tasks

### 1. Shell and tokens

- [ ] Add a failing search keyboard/label test; run it before implementation.
- [ ] Update `TopBar.tsx`, `LeftNav.tsx`, `App.tsx`, `index.css` for the approved shell, keyboard search, skip link and five mobile tasks.
- [ ] Run shell tests and routing tests; visually check desktop/mobile.

### 2. Research workspace

- [ ] Add failing MSW boundary tests for six tabs, unknown financials, source, switching symbol and independent provider failure.
- [ ] Add `hooks/useResearchEvidence.ts`, `components/research/ResearchWorkspace.tsx`, `ResearchFinancials.tsx`, `ResearchSources.tsx`, `ResearchAgentReport.tsx`; use existing `ChartWorkspace` for Graphic, existing backend report API for AI.
- [ ] Build annual table from reported series; no static Microsoft data. Preserve watchlist writes through App callbacks. Keep missing risk metrics explicit.
- [ ] Update routing to the composed workspace, keeping existing chart controls and deep links.
- [ ] Run focused tests, including stale-response regression.

### 3. Remaining pages and delivery

- [x] Apply shared surface/type/controls to watchlists, portfolio and persistent journal; remove duplicate oversized dashboard hero and prioritize portfolio.
- [x] Update E2E assertions for intentional labels/default research tab; add actual six-tab/source/search flow with boundary stubs.
- [x] Run `npm run lint`, `npm run test:coverage`, `npm run build`, `npm run e2e`; inspect rendered app on desktop/mobile.
- [x] Record exact evidence/limitations and update current-system frontend layout documentation.

## Execution record

- `uv` installed in `.cache/agent-tools/uv-env` (0.13.1). BMad project renderer and setup skill are absent; user authorized continuing with installation/venv alternatives. No raw BMad workflow was executed.
- Current design task branch reused because it contains the approved uncommitted designs and frontend work. Pre-implementation `frontend/src` and `e2e` snapshot stored under `.cache/dark-implementation/baseline`; unrelated edits remain untouched.
- Sections 1–2 and the six-tab/source/search E2E shipped with `ea41714` (PR #44).
- 2026-10-22, branch `feat/frontend-desk-completion`: section 3 completed — single Bugün heading with the portfolio-first summary, truthful news sources, in-drawer portfolio feedback, journal unknown-PnL fix, Turkish copy across watchlists/portfolio/journal/news. Evidence: lint, api-boundaries, coverage 25 files / 158 tests, build, bundle 686.5 KiB, `npm run e2e` 15 passed / 12 integrated skipped, zero horizontal overflow at 320 and 1440px on the five tasks. Limitations are recorded in `2026-10-15-frontend-stitch-ux-roadmap.md` (2026-10-22 record).
