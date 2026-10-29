# Frontend Financial Trend Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show multi-year financial trends in the research view: revenue and net income, growth, profitability (ROE, ROA, net margin), debt/equity, debt vs cash, current ratio and cash flow, plus a current-value valuation snapshot (F/K, PD/DD, F/S, FD/FAVÖK, temettü verimi).

**Architecture:** `useResearchEvidence` also fetches `GET /fundamentals/{symbol}/history` (plan 02). A pure `trendModel` turns the response into chart series and display states; one generic `TrendChart` (recharts, lazy-loaded) renders every chart with an accessible data table; `FinancialTrendsPanel` composes the charts and the valuation snapshot into the Finansallar tab. The frontend never recomputes a financial figure; it only formats.

**Tech Stack:** React 19, TypeScript, `recharts` (already a dependency), Vitest + Testing Library + MSW, Playwright smoke.

**Spec:** `docs/product/decisions/2026-10-28-financial-trend-charts.md` (decisions 4-12); backend contract in `docs/superpowers/plans/2026-10-28-financial-trends-02-backend-history-endpoint.md`; `docs/spec/current-system/architecture.md` (frontend section: design tokens, accessibility).

## Global Constraints

- Work on a task branch off `main`, e.g. `git worktree add ../finance-project-fh-fe -b feat/financial-trend-charts main`. Leave the `fp-approve` working-tree changes (including `frontend/package-lock.json`) alone.
- Load the `dataviz` skill before writing chart code (series colours, axes, legend, tooltip rules). Reuse the existing series colours `#7fa6ff` and `#61bdb8` for the first two series; styles go in `frontend/src/index.css` under a `desk-trend-` prefix.
- UI copy is Turkish. Missing value renders `—`; a not-meaningful ratio renders `anlamlı değil`; never `0` for either.
- Charts have no good/bad colouring and no threshold lines (decision 7). Each chart states its basis in a caption.
- API calls go through the Spring backend only (`npm run check:api-boundaries` must pass). Funds (`isFund`) never fetch history.
- Wire shape (camelCase) from plan 02: `FinancialHistory { symbol, status: 'AVAILABLE'|'PARTIAL'|'EMPTY'|'UNAVAILABLE', currency: string|null, periodType: 'annual', retrievedAt: string|null, points: FinancialHistoryPoint[] }`; `FinancialHistoryPoint { fiscalYear: number, fiscalYearEnd: string, revenue, netIncome, operatingCashFlow, capitalExpenditure, freeCashFlow, totalAssets, totalLiabilities, totalEquity, totalDebt, cash, netDebt, debtToEquity, currentRatio, roe, roa, netMargin, fcfMargin, revenueGrowth, netIncomeGrowth: number|null, notMeaningful: string[] }`. `debtToEquity`/`currentRatio` are plain ratios shown as `1,50x`; `roe`, `roa`, `netMargin`, `fcfMargin`, growth are fractions shown as `%` (0.25 → `%25`). Points are ascending.
- No `any`; chart inputs are typed. Chart text is at least 12 px; layout works at 360 px width with no horizontal page scroll; controls keep the 44 px mobile minimum already in `index.css`.
- The research chunk stays inside the bundle budget: `FinancialTrendsPanel` is loaded with `React.lazy`. If `npm run check:bundle` fails anyway, stop and report; do not raise the budget.
- Tests never call a live backend (MSW handlers). Local checks: `npm test -- <path>` per task, then the full set in Task 5.
- Conventional Commits, scope `frontend` / `spec`; end each commit with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- A series with every value `null` shows "Bu gösterge için raporlanan veri yok", not a flat zero line; a single fiscal year renders a visible point or bar without crashing.
- `notMeaningful` (negative equity) and missing look different in both chart caption and data table; neither is plotted as zero.
- `UNAVAILABLE` shows a retry-oriented message ("Finansal geçmiş şu an alınamıyor"), `EMPTY` shows "Raporlanan dönem verisi bulunamadı"; the two are never conflated.
- Switching symbols never shows the previous symbol's history (stale-response guard in the hook).
- Net losses (negative bars) draw below the zero axis; no currency present reads "para birimi bildirilmedi" and no symbol is invented.
- The Finansallar table and the cash-flow chart show the same free-cash-flow number (the legacy `freeCashFlow` field is operating cash flow and must not be labelled "Serbest nakit akışı").

---

### Task 1: API types, client function and evidence hook

**Files:**
- Modify: `frontend/src/api/research.ts` (types + `fetchFinancialHistory`, next to `fetchFundamentals` ~line 177), `frontend/src/api/client.ts` (export, following however `fetchFundamentals` is exposed there)
- Modify: `frontend/src/hooks/useResearchEvidence.ts`
- Test: `frontend/src/hooks/hooks.test.tsx` (extend), `frontend/src/api/client.test.ts` (extend)

**Interfaces:**
- Produces: exported types `FinancialHistoryStatus`, `FinancialHistoryPoint`, `FinancialHistory` (shape above); `fetchFinancialHistory(symbol: string): Promise<FinancialHistory>` → `GET /fundamentals/${symbol}/history`; `useResearchEvidence` result gains `history: FinancialHistory | null`, and `failed` gains `'Finansal geçmiş'` when that request rejects.

- [ ] **Step 1: Write the failing tests.** `client.test.ts`: `fetchFinancialHistory('AAPL')` requests `/fundamentals/AAPL/history` and returns the body. `hooks.test.tsx` (MSW): `useResearchEvidence('AAPL', false)` exposes `history.points.length === 2` and a failing history route yields `history === null` with `failed` containing `'Finansal geçmiş'` while `fundamentals` still loads; `useResearchEvidence('FUND', true)` makes no history request; symbol change `AAPL → MSFT` never returns AAPL's history while MSFT loads. Add the history route to every existing MSW handler set that the research view mounts (grep tests using `useResearchEvidence`/`ResearchWorkspace`).
- [ ] **Step 2: Run to verify failure.** `npm test -- src/hooks/hooks.test.tsx src/api/client.test.ts` → FAIL.
- [ ] **Step 3: Implement** the types, `fetchFinancialHistory`, and add a fourth `Promise.allSettled` entry to the hook (skipped for funds), keeping the existing stale-symbol guard.
- [ ] **Step 4: Run to verify pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `feat(frontend): fetch multi-year financial history with research evidence`.

### Task 2: Pure trend model

**Files:**
- Create: `frontend/src/components/research/trends/trendModel.ts`
- Test: `frontend/src/components/research/trends/trendModel.test.ts`

**Interfaces:**
- Consumes: `FinancialHistory`, `FinancialHistoryPoint` (Task 1).
- Produces:
  - `type MetricKey = Exclude<keyof FinancialHistoryPoint, 'fiscalYear' | 'fiscalYearEnd' | 'notMeaningful'>`
  - `type CellState = 'value' | 'missing' | 'notMeaningful'`
  - `cellState(point: FinancialHistoryPoint, key: MetricKey): CellState`
  - `type Unit = 'ratio' | 'percent' | 'money'`
  - `formatCell(point, key, unit: Unit, currency: string | null): string` → `1,50x` / `%25` (tr-TR, one decimal for percent) / compact money with currency code when present (`391,0 Mr`-style via `Intl.NumberFormat('tr-TR', {notation:'compact'})`) / `—` / `anlamlı değil`
  - `chartRows(history: FinancialHistory, keys: MetricKey[]): Array<{year: number; end: string} & Partial<Record<MetricKey, number | null>>>` (missing and not-meaningful both `null`, so recharts leaves a gap)
  - `hasAnyValue(history: FinancialHistory, key: MetricKey): boolean`
  - `viewState(history: FinancialHistory | null, loading: boolean): 'loading' | 'unavailable' | 'empty' | 'ready'` (`null` history after loading counts as `'unavailable'`)

- [ ] **Step 1: Write the failing tests:** `cellState` returns `notMeaningful` only for keys in `point.notMeaningful`, `missing` for null otherwise, `value` for numbers including `0`; `formatCell` for `1.5`→`1,50x`, `0.25`→`%25,0`, `null`→`—`, not-meaningful→`anlamlı değil`, money with and without currency; `chartRows` keeps ascending order and maps both null states to `null`; `hasAnyValue` false for an all-null key and true when only one year has a value; `viewState` for `UNAVAILABLE`, `EMPTY`, `PARTIAL`/`AVAILABLE`, `null`, and loading.
- [ ] **Step 2: Run to verify failure.** `npm test -- src/components/research/trends/trendModel.test.ts` → FAIL.
- [ ] **Step 3: Implement** the module (no React imports).
- [ ] **Step 4: Run to verify pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `feat(frontend): add pure financial trend model`.

### Task 3: Generic accessible chart

**Files:**
- Create: `frontend/src/components/research/trends/TrendChart.tsx`
- Modify: `frontend/src/index.css` (`desk-trend-*` styles)
- Test: `frontend/src/components/research/trends/TrendChart.test.tsx`

**Interfaces:**
- Consumes: `FinancialHistory`, `MetricKey`, `Unit`, `chartRows`, `cellState`, `formatCell`, `hasAnyValue` (Task 2).
- Produces: `TrendChart(props: {title: string; basis: string; history: FinancialHistory; series: Array<{key: MetricKey; label: string}>; unit: Unit; kind: 'line' | 'bar'}): JSX.Element` — a `<figure>` with heading, legend, a recharts `ResponsiveContainer` chart (line with `connectNulls={false}` or grouped bars, zero axis visible when values are negative, tooltip showing the full `fiscalYearEnd` date), `basis` as `<figcaption>`, and a `<details>` "Veri tablosu" containing a real `<table>` (`FY{year}` columns, one row per series, cells from `formatCell`). When no series has a value it renders "Bu gösterge için raporlanan veri yok" instead of the chart. The figure carries an `aria-label` that lists year, label and formatted value per series.

- [ ] **Step 1: Write the failing tests** (Testing Library; recharts draws nothing in jsdom, so assert on heading, caption, table and messages): title and basis render; the data table has `FY2023`/`FY2024` headers and `1,50x` for a ratio series; a `null` year renders `—` and a not-meaningful year renders `anlamlı değil` in the table; an all-null series renders the empty message and no table; a single-year history renders without throwing; negative money renders with a minus sign; `aria-label` contains the formatted values.
- [ ] **Step 2: Run to verify failure.** `npm test -- src/components/research/trends/TrendChart.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `TrendChart` and its CSS (grid-ready card using existing `desk-panel` look; legend swatches match series colours; series colours from the `dataviz` palette).
- [ ] **Step 4: Run to verify pass.** Same command → PASS; also `npm run lint`.
- [ ] **Step 5: Commit.** `feat(frontend): add accessible financial trend chart`.

### Task 4: Trends panel and valuation snapshot

**Files:**
- Create: `frontend/src/components/research/trends/FinancialTrendsPanel.tsx`, `frontend/src/components/research/trends/ValuationSnapshot.tsx`
- Test: `frontend/src/components/research/trends/FinancialTrendsPanel.test.tsx`

**Interfaces:**
- Consumes: `TrendChart` (Task 3), `viewState` (Task 2), `FinancialRatios`, `FundamentalsData` (existing).
- Produces:
  - `FinancialTrendsPanel(props: {history: FinancialHistory | null; ratios: FinancialRatios | null; fundamentals: FundamentalsData | null; loading: boolean; isFund: boolean}): JSX.Element` (default export, for `React.lazy`). Renders: fund message when `isFund`; loading status; the four view states with the copy from Review Focus; otherwise `ValuationSnapshot` and seven `TrendChart`s in three groups — *Büyüme ve kârlılık* (Gelir ve net kâr [bar, money, `revenue`,`netIncome`]; Büyüme, yıllık [line, percent, `revenueGrowth`,`netIncomeGrowth`]; Kârlılık [line, percent, `roe`,`roa`,`netMargin`]), *Borçluluk ve likidite* (Borç / özsermaye [line, ratio, `debtToEquity`, basis "Toplam borç ÷ özkaynak, yıl sonu. Özkaynak ≤ 0 ise anlamlı değil."]; Borç ve nakit [bar, money, `totalDebt`,`cash`]; Cari oran [line, ratio, `currentRatio`]), *Nakit akışı* (Faaliyet nakit akışı, yatırım harcaması ve serbest nakit akışı [bar, money, `operatingCashFlow`,`capitalExpenditure`,`freeCashFlow`, basis "Serbest nakit akışı = faaliyet nakit akışı − yatırım harcaması"]). Shows a currency note: the reported `currency`, or "Para birimi bildirilmedi. Değerler dönüştürülmedi."
  - `ValuationSnapshot(props: {ratios: FinancialRatios | null; dividendYield: number | null | undefined}): JSX.Element` — tiles *Fiyat / kazanç (F/K)* `pe`, *PD/DD* `pb`, *Fiyat / satış* `ps`, *FD/FAVÖK* `evEbitda`, *Temettü verimi* (format exactly as `StockDetailModal.tsx` formats `dividendYield`; do not change that unit), each with the note "Güncel değer · geçmiş seri yok"; missing value `—`.

- [ ] **Step 1: Write the failing tests** with fixture histories: fund → fund message and no charts; `loading` → status "Finansal geçmiş yükleniyor…"; `UNAVAILABLE` → retry copy; `EMPTY` → "Raporlanan dönem verisi bulunamadı"; `PARTIAL` with negative equity → headings for all seven charts present and the D/E table cell says `anlamlı değil`; currency note shows `USD` or the missing-currency copy; valuation tiles show `—` for absent ratios and the "geçmiş seri yok" note; no element implies healthy/unhealthy (no threshold text).
- [ ] **Step 2: Run to verify failure.** `npm test -- src/components/research/trends/FinancialTrendsPanel.test.tsx` → FAIL.
- [ ] **Step 3: Implement** both components.
- [ ] **Step 4: Run to verify pass.** Same command → PASS.
- [ ] **Step 5: Commit.** `feat(frontend): add financial trends panel and valuation snapshot`.

### Task 5: Wire into the research view, migrate the table, verify

**Files:**
- Modify: `frontend/src/components/research/ResearchWorkspace.tsx` (Finansallar tab at ~line 198; overview chart at ~line 176; import `FinancialTrendsPanel` with `React.lazy` inside the existing `Suspense` pattern used for `ChartWorkspace`)
- Modify: `frontend/src/components/research/ResearchFinancials.tsx` (new prop `history: FinancialHistory | null`)
- Delete: `frontend/src/components/research/ResearchHistoryChart.tsx` (only used by `ResearchWorkspace`; confirm with grep, then replace the overview usage with one lazy `TrendChart` for `revenue`/`netIncome` fed by `evidence.history`, falling back to the existing empty message)
- Test: `frontend/src/components/research/ResearchWorkspace.test.tsx`, `frontend/src/components/research/ResearchFinancials.test.tsx` (create if absent), `frontend/e2e/smoke.spec.ts` (stub the history route)
- Modify: `docs/spec/current-system/architecture.md` (frontend section: trends panel ownership, lazy chunk, `desk-trend-*` styles)

**Interfaces:**
- Consumes: `FinancialTrendsPanel`, `useResearchEvidence().history` (Tasks 1, 4), `formatCell` (Task 2).
- Produces: `ResearchFinancials` rows when `history` is `AVAILABLE`/`PARTIAL`: *Toplam gelir*, *Net kâr*, *Faaliyet nakit akışı*, *Serbest nakit akışı* (from `history.freeCashFlow`), *Hisse başına kazanç (EPS)* (still from `fundamentals.eps`), years from history. When history is not usable it falls back to today's legacy series, but the legacy `freeCashFlow` row is relabelled *Faaliyet nakit akışı* because that field carries operating cash flow.

- [ ] **Step 1: Write the failing tests.** `ResearchWorkspace.test.tsx`: Finansallar tab shows the trends panel headings after the lazy chunk resolves, and a fund symbol shows no history request; overview shows the revenue/net-income chart title. `ResearchFinancials.test.tsx`: with history, the table has FY columns for all history years and a *Serbest nakit akışı* value equal to operating cash flow minus capex; with `UNAVAILABLE` history it falls back to the legacy series and the row is labelled *Faaliyet nakit akışı* (no row named *Serbest nakit akışı*).
- [ ] **Step 2: Run to verify failure.** `npm test -- src/components/research` → FAIL.
- [ ] **Step 3: Implement** the wiring, the table migration, the deletion, the e2e route stub and the architecture note.
- [ ] **Step 4: Full frontend verification** (`docs/agent/verification.md`): `npm run lint`, `npm run check:api-boundaries`, `npm run test:coverage`, `npm run build`, `npm run check:bundle`, `npm run e2e`. Expected: all pass; report any failure with its output instead of claiming completion.
- [ ] **Step 5: Commit.** `feat(frontend): show financial trends in the research view`, then `docs(spec): record trends panel ownership`.
