# Frontend Current-State Evidence

## Audit Metadata

- Audit Commit: `82b7836`
- Branch: `docs/evidence-driven-product-design`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Node/npm workspace with installed dependencies; Vite 8.0.12; Vitest 4.1.10; Playwright E2E configured for Chromium desktop/tablet/mobile.
- Scope: React routes, API client, hooks/components, Spring boundary, UI degradation, unit/coverage/lint/build/E2E evidence.

## Evidence Records

### CAP-CUR-FE-001 — React route and shell surface

- Summary: The frontend mounts `BrowserRouter` and exposes dashboard, workspace/chart, watchlist, news, reports, journal/transactions, portfolio, and portfolio-detail routes. `/charts` and `/portfolios` redirect to current routes; unknown routes redirect to `/dashboard`.
- Evidence Level: E2
- Commit: `82b7836`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; React 19.2.6; react-router-dom 7.18.1.
- Contract: Browser routes are client-owned and are not the `/api/v1` backend contract; navigated views compose backend-backed hooks and API client functions.
- Evidence Locator: `frontend/src/main.tsx:1-19`; `frontend/src/App.tsx:537-639`; `frontend/src/components/LeftNav.tsx:25-31`.
- Verification: Source inspection plus `App.routes.test.tsx`, shell-control tests, and mocked E2E route navigation definition in `frontend/e2e/smoke.spec.ts:108-126`.
- Limitations: The E2E route smoke did not complete because dashboard data shape caused a component exception before navigation assertions; route declarations themselves remain source-verified.
- Legacy Claims: Legacy route lists should use `App.tsx` as the current browser-route source of truth.

| Browser route | Current owner |
| --- | --- |
| `/`, `/charts`, `/portfolios`, `*` | Redirects to `/dashboard`, `/workspace`, `/portfolio`, or `/dashboard`. |
| `/dashboard` | `DashboardHome`. |
| `/workspace`, `/workspace/:symbol` | `ChartWorkspace`. |
| `/watchlist` | `WatchlistsView`. |
| `/news`, `/news/:symbol` | `NewsFeedView`. |
| `/reports`, `/reports/:symbol` | `AiReportsView`. |
| `/journal`, `/transactions` | `TradingJournalView`. |
| `/portfolio`, `/portfolio/:portfolioId` | `PortfolioRoute` and portfolio management views. |

### CAP-CUR-FE-002 — API client and Spring backend boundary

- Summary: The primary frontend API client is a shared Axios instance with absolute base URL `http://localhost:8080/api/v1`. It centralizes assets, prices, news, analyst, technical, portfolio, journal, watchlist, fundamentals, macro/calendar, and notification calls. Hooks and components normally import this client rather than calling the data-service directly.
- Evidence Level: E2
- Commit: `82b7836`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Axios 1.16.0; Vite dev proxy configured for `/api` to Spring at `http://localhost:8080`.
- Contract: Normal application flows use Spring `/api/v1`; the Vite proxy is a development convenience and does not change the absolute Axios base URL.
- Evidence Locator: `frontend/src/api/client.ts:1-5,11-181,339-512,575-605,734-767,845-959`; `frontend/vite.config.ts:10-19`; imports from `frontend/src/hooks/*.ts`.
- Verification: Source inventory reproduced with `rg -n "apiClient\\.|fetch[A-Z]" frontend/src/api frontend/src/hooks frontend/src/components`; API client tests exercise request methods and base URL.
- Limitations: The frontend has no runtime environment switch for the API base URL in the inspected client; deployments outside localhost require build/source configuration changes or an equivalent network setup.
- Legacy Claims: Claims that the browser directly calls FastAPI/data-service are not supported by the primary client inventory; the separate AI report call is recorded in `CAP-CUR-FE-004`.

### CAP-CUR-FE-003 — Hook, component, and data-flow ownership

- Summary: Hooks own asynchronous fetching/loading/error state for assets, prices, technical analysis, analyst ratings, reports, agent analysis, portfolio, journal, notifications, watchlists, and watchlist research. Components consume these hooks or API functions and render loading/empty/error states.
- Evidence Level: E2
- Commit: `82b7836`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; React Testing Library/Vitest test environment.
- Contract: API response types are declared in `frontend/src/api/client.ts` and `frontend/src/api/types.ts`; no frontend code was changed during this audit.
- Evidence Locator: `frontend/src/hooks/` (`useAssets.ts`, `useAssetPrice.ts`, `useTechnicalAnalysis.ts`, `useAnalystRatings.ts`, `useCompanyReport.ts`, `useSmartReport.ts`, `useAgentAnalysis.ts`, `useInvestmentPortfolio.ts`, `useJournalTrades.ts`, `useNotifications.ts`, `useWatchlists.ts`, `useWatchlistResearch*.ts`); representative component usage in `frontend/src/App.tsx` and `frontend/src/components/DashboardHome.tsx`.
- Verification: Source inspection plus `frontend/src/hooks/hooks.test.tsx`, component tests, and all 100 passing Vitest tests.
- Limitations: Coverage shows several hooks with zero or low direct unit coverage (`useAgentAnalysis`, `useAnalystRatings`, `useCompanyReport`, `useJournalLedger`, `usePortfolioPositions`), even though API/client and broader component tests pass.
- Legacy Claims: Presence of a hook or TypeScript type does not prove that a backend endpoint is populated or that provider freshness is available to the UI.

### CAP-CUR-FE-004 — AI report boundary discrepancy

- Summary: `AiReportsView` sends a direct browser `fetch` to `/api/gemini/portfolio-report`, outside the shared Axios `/api/v1` client. The current backend controller inventory contains no `/api/gemini` mapping, while Spring exposes `/api/v1/reports/smart/{symbol}` and `/api/v1/chat/ask` for related AI/report capabilities.
- Evidence Level: E2
- Commit: `82b7836`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; React/Vite development server and Spring controller source at the audited commit.
- Contract: This is an observed cross-runtime/API boundary mismatch requiring later reconciliation; this task does not redirect or remove the call.
- Evidence Locator: `frontend/src/components/AiReportsView.tsx:142-160`; backend mapping inventory from `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/*Controller.java`; `frontend/src/api/client.ts:180-181` and `useSmartReport.ts:50`.
- Verification: `rg -n "fetch\\(|gemini|portfolio-report" frontend/src`; `rg -n "gemini|portfolio-report|@RequestMapping|@.*Mapping" backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest`.
- Limitations: A development server/proxy or untracked server route outside the inspected backend could theoretically handle the relative path; no such route is present in the audited repository source.
- Legacy Claims: “All AI report traffic goes through Spring `/api/v1`” is contradicted by the direct Gemini call and must remain unresolved until an owner decides the canonical route.

### CAP-CUR-FE-005 — UI degradation and fallback behavior

- Summary: App-level market context uses `Promise.allSettled` and maps failed news/calendar requests to empty arrays. Dashboard macro/portfolio comparison/position-performance paths catch failures and show empty/error state. Several hooks reset data to null/empty and expose an error string when backend calls fail.
- Evidence Level: E2
- Commit: `82b7836`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; browser UI source and mocked network tests.
- Contract: Provider/backend failure must remain visible as empty, null, loading, or error UI; the frontend does not synthesize financial values in these paths.
- Evidence Locator: `frontend/src/App.tsx:265-291`; `frontend/src/components/DashboardHome.tsx:50-80,325-353`; `frontend/src/hooks/useAssets.ts`; `useTechnicalAnalysis.ts`; `useSmartReport.ts`; `useAgentAnalysis.ts`.
- Verification: Source inspection plus failure handlers in `hooks.test.tsx`, component tests, and mocked E2E network fixtures.
- Limitations: Degradation is not uniform: some failures are rendered as empty lists, some as null sections, some as an error message, and some can surface as a component exception when the response shape is not the expected object.
- Legacy Claims: UI availability or a rendered card must not be documented as evidence that its provider data is fresh or complete.

### CAP-CUR-FE-006 — Frontend API/DTO coupling

- Summary: The frontend declares DTO-shaped interfaces for price history, portfolio summaries/comparisons, research/fundamental data, market events, news, journal, watchlists, and agent analysis. API functions use these types but do not perform runtime schema validation before rendering.
- Evidence Level: E2
- Commit: `82b7836`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; TypeScript 6.0.2; Axios response typing.
- Contract: Compile-time interfaces document expected JSON shape; backend endpoint/field changes require coordinated consumer changes.
- Evidence Locator: `frontend/src/api/client.ts:80-337,614-843`; `frontend/src/api/types.ts:1-15`; component types in `frontend/src/types.ts`.
- Verification: `npm run build` compiled TypeScript successfully; API client tests cover representative response mapping and request parameters.
- Limitations: TypeScript generics do not validate runtime payloads. The E2E `undefined.filter` failure demonstrates that a syntactically successful HTTP response with an unexpected shape can still break rendering.
- Legacy Claims: Type definitions alone do not prove response compatibility across backend, data-service, and frontend.

### CAP-CUR-FE-007 — Frontend verification evidence

- Summary: Unit tests, coverage, lint, and production build passed. The required mocked E2E suite exposed a current dashboard smoke failure and was not green.
- Evidence Level: E3
- Commit: `82b7836`
- Evidence Locator: `frontend/npm test`; `frontend/npm run test:coverage`; `frontend/npm run lint`; `frontend/npm run build`; `frontend/npm run e2e`.
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Vitest 4.1.10; Vite 8.0.12; Playwright Chromium desktop/tablet/mobile.
- Contract: E2E runs with the repository’s mocked network fixtures when `E2E_INTEGRATED` is not set; integrated backend E2E was not requested/enabled by this run.
- Verification: `npm test`: 15 files, 100 tests passed. `npm run test:coverage`: 15 files, 100 tests passed; 66.91% statements, 53.73% branches, 66.92% functions, 68.49% lines. `npm run lint`: exit 0 with no diagnostics. `npm run build`: TypeScript/Vite build succeeded; Vite emitted a chunk-size warning for the 666.83 kB JS chunk. `npm run e2e`: 6 passed, 6 failed, 9 skipped.
- Limitations: The six E2E failures are the three browser projects for two smoke tests. The primary failure is `frontend/src/components/DashboardHome.tsx:381` (`comparisonSeries.filter` on undefined) after the mocked `/portfolio/performance/comparison` response falls through to `[]`; shell-action tests then timeout because the component tree is recreated. Integrated E2E was skipped because `E2E_INTEGRATED=true` was not set and no live backend smoke was run.
- Legacy Claims: Frontend unit/build success must not be reported as routed smoke readiness while the current E2E smoke suite remains red.

## Limitations

- This evidence task did not change frontend production or test code.
- Primary frontend API calls target Spring `http://localhost:8080/api/v1`; the direct Gemini relative call remains an unresolved boundary exception.
- `npm run lint`, unit tests, coverage, and build passed; E2E is not green and its failure is recorded above.
- No live financial providers were called by frontend tests; API responses were mocked through MSW or Playwright route fixtures.
- Integrated E2E requiring backend/Postgres/Redis was not run; current evidence is mocked-browser evidence plus local compile/test output.
