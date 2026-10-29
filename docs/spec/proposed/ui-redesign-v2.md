# Target Spec: UI Redesign v2 (frontend screens and backend needs)

**Status:** Proposed target. **Not** verified current behavior. `SPEC.md` and
`docs/spec/current-system/` keep describing what is implemented; nothing here
may be cited as implemented until a story promotes it (PRD §7.2).

**Source design:** `docs/prototypes/finance-ui-v2/` (nine `.dc.html` artboards
plus `canvas.json`, authored by the product owner in the design canvas on
2026-10-29). Every number in the design is sample data and every `HSx` ticker is
a placeholder.

**Machine-readable contract:** [`ui-redesign-v2.openapi.yaml`](ui-redesign-v2.openapi.yaml)
(OpenAPI 3.0.3, proposed endpoints only). `docs/openapi.yaml` stays the
generated artifact of the *implemented* controllers and is not edited by hand.

**Decisions:** [`2026-10-29-ui-redesign-v2.md`](../../product/decisions/2026-10-29-ui-redesign-v2.md).

## 1. Cross-cutting rules

| # | Rule |
|---|---|
| X-1 | Every new endpoint lives under `/api/v1`, is additive, and changes no existing path or DTO field (AGENTS.md; OQ-5 *preserve*). |
| X-2 | Every analytic response carries `status` (`AVAILABLE`, `PARTIAL`, `EMPTY`, `UNAVAILABLE`), `asOf` (UTC instant) and, where money appears, `currency`. Missing evidence is `null` or an empty collection plus a status, never `0`, a cost-based estimate, or a synthetic value (AGENTS.md; same wire convention as the financial-trends decision, rule 10). |
| X-3 | A frontend screen renders an explicit unavailable/empty/partial state for every panel. When an endpoint is not implemented (404/501) or fails (5xx), the panel shows "Veri alınamadı" and the rest of the screen keeps working. No screen may ship sample numbers as live data. |
| X-4 | Controllers stay thin; every calculation below lives in a framework-free domain service registered in `DomainConfig.java` and reaches prices, ledger and calendar data through ports. Frontend never re-derives a financial figure; it formats what the API returns. |
| X-5 | Market scope: `market` query parameter, values `BIST`, `US`, `ALL` (default `ALL`). The market of an instrument comes from the instrument identity (decision 2026-10-15), never from a symbol-suffix guess in the controller. Amounts are reported in the instrument/portfolio base currency with an explicit `currency`; no silent FX conversion. |
| X-6 | Returns are **time-weighted**, chain-linked from daily valuations, with external cash flows applied at the start of the day they occur, so deposits and withdrawals do not count as performance. `1D/1W/1M/3M/6M/1Y/YTD` windows are calendar-anchored to the last available trading date. |
| X-7 | All lists are bounded: `limit` (default 50, max 200) and `offset`. The 100-portfolio overview is paged server-side. |
| X-8 | Informational outputs only. No endpoint creates, routes or schedules an order (PRD §3.4). Rebalance and stop outputs are *suggestions and distances*, never instructions. |
| X-9 | UI copy is Turkish (`lang="tr"`), numbers formatted `tr-TR` in the browser. API values are canonical (`.` decimal, ISO dates, enum codes in English). |
| X-10 | Design tokens: the design is a **dark theme** (page `#0E1015`, panels `#12141A`, accent blue `#2563EB` / link `#60A5FA`, font Plus Jakarta Sans), 44 px touch targets, AA contrast. These replace the values in `docs/design-council/2026-10-17/dark-theme.md` for the v2 screens; that document stays as history. Tokens live in `frontend/src/index.css`; component ownership stays in `docs/spec/current-system/architecture.md`. |

## 2. Screen map

Browser route paths are preserved (`contracts.md` §Frontend Browser Routes);
only the screen titles change, and `/compare` is added.

| Design artboard | Route | Screen title (TR) | Replaces / extends |
|---|---|---|---|
| `Main.dc.html` | `/dashboard` | Panel | `DashboardHome` |
| `Compare.dc.html` | `/compare` (new) | Karşılaştırma | new |
| `News.dc.html` | `/news`, `/news/:symbol` | Haberler | `NewsFeedView` |
| `Watchlist.dc.html` | `/watchlist` | İzleme Listeleri | `WatchlistsView` |
| `Workspace.dc.html` | `/workspace`, `/workspace/:symbol` | Şirket Analizi | `ChartWorkspace` + research workspace |
| `Reports.dc.html` | `/reports`, `/reports/:symbol` | Raporlar | `AiReportsView` |
| `Portfolio.dc.html` | `/portfolio`, `/portfolio/:portfolioId` | Portföylerim | `PortfolioManagerView` |
| `Journal.dc.html` | `/journal` | İşlem Ekle (+ Karar günlüğü) | `TradingJournalView` |
| `Transactions.dc.html` | `/transactions` | Kazanç Analizi | transaction ledger view |

Shell (all screens): left navigation in four groups (Genel: Panel,
Karşılaştırma · Piyasa: Haberler, İzleme Listeleri · Hisseler: Şirket Analizi,
Raporlar · Portföy: Portföylerim, İşlem Ekle, Kazanç Analizi), top bar with
symbol search (`E` existing asset search), market toggle `BIST | ABD`
(`market` filter, X-5), notification bell with unread badge
(`E GET /notifications/unread`) and a profile initial. There is no
authentication in the Value MVP (SaaS identity is `CAP-TGT-010`, deferred), so
the profile chip is a static local label. Brand text in the design is
"Finans Paneli"; the current app brand "mercek" is kept until the product owner
decides otherwise (UI2-Q9).

## 3. Screen requirements

`E` = existing endpoint (see `contracts.md`), `N` = new endpoint in the OpenAPI
file, `E+` = existing endpoint with additive fields/parameters.

### 3.1 Panel (`/dashboard`)

| Section | Content | Source |
|---|---|---|
| Portfolio selector + pinned portfolios | Pick one portfolio or "Toplam"; pinned portfolios with value | `N GET /portfolios/overview?pinned=true`, `N PUT /portfolios/{id}/pin` |
| KPI row | Value, day change, unrealized P&L, realized P&L, cash; each with sub-label | `N GET /portfolios/{id}/summary` (E `GET /portfolio/summary` for the aggregate while it exists) |
| Performance and benchmark | Indexed series (start = 100), toggles for BIST 100, S&P 500, Altın, USD/TRY, 1H/1A/3A/6A/1Y, alpha vs BIST 100 | `E GET /portfolio/performance/comparison`; `N GET /benchmarks` |
| Return heatmap | Rows = portfolios and benchmarks, columns 1G/1H/1A/3A/1Y | `N GET /returns/heatmap` |
| Calendar | Central-bank decisions, macro reports, holdings' earnings dates; filters Tümü/Merkez bankası/Bilanço/Makro; importance; days left | `E+ GET /calendar` (new `category`, `importance`, `portfolioId`, `from`, `to`; new response fields) |
| Upcoming stops | Nearest stop-loss / take-profit levels across pinned portfolios, distance bar | `N GET /stop-levels/upcoming` |
| Allocation by portfolio | Donut over pinned portfolios | `N GET /portfolios/overview` |
| Sector allocation | Includes cash | `N GET /portfolios/{id}/allocation?by=SECTOR` |
| Monthly returns | Last 12 months, % | `N GET /portfolios/{id}/monthly-returns` |
| Holdings treemap | Size = position value, colour = day change, cash excluded | `N GET /portfolios/{id}/holdings/analysis` |
| Positions and weights | Sector, qty, price, value, weight, weight Δ 1A, 1G/1H/1A, P&L; sortable | `N GET /portfolios/{id}/holdings/analysis` |
| Position composition over time | Stacked area, last 6 months, top 5 + others, value or weight % | `N GET /portfolios/{id}/composition-history` |

### 3.2 Karşılaştırma (`/compare`)

Two selectable entities A and B, each a portfolio, "Toplam portföy" or a
benchmark (`ComparableRef`). Period 1A/3A/6A/1Y. Swap button.

| Section | Source |
|---|---|
| KPIs: A return, B return, difference, correlation | `N GET /comparison/metrics` |
| Relative performance (start = 100) | `E GET /portfolio/performance/comparison` |
| Risk/return metrics table with "better side" highlight | `N GET /comparison/metrics` |
| Sector weights, A vs B (diverging bars) | `N GET /portfolios/{id}/allocation?by=SECTOR` (benchmarks: `N GET /benchmarks/{id}/allocation`, may be `UNAVAILABLE`) |
| Risk/return map (volatility × return) | `N GET /comparison/risk-return` |
| Monthly returns A and B | `N GET /portfolios/{id}/monthly-returns` |
| Correlation matrix, last 1Y daily returns | `N GET /comparison/correlation-matrix` |

Metric definitions (X-6 applies): annualised volatility = stdev(daily
returns) × √252; Sharpe = (annualised return − risk-free) / volatility, with the
risk-free rate **returned in the response** (`riskFreeRate`, `riskFreeSource`)
and `null` Sharpe when no rate is configured; max drawdown = worst
peak-to-trough on the cumulative series; beta = cov(daily r, benchmark r) /
var(benchmark r) against BIST 100; positive-day ratio = days with r > 0 / days.
"Better side" is computed server-side (`better: A|B|NONE`) so the UI does not
encode finance logic; beta has no better side.

### 3.3 Haberler (`/news`)

| Feature | Source |
|---|---|
| Category filter: Jeopolitik, Makro, Sektör, Şirket (counts) | `E+ GET /news` (new `category` values, `counts`) |
| Scope: Tüm haberler / Portföyümü etkileyen; impact: Tümü / Yüksek | `E+ GET /news` (`scope=PORTFOLIO`, `impact`, `q`) |
| Per item: impact level, affected tickers with direction, "in my portfolio" flag, topics | `E+ GET /news` (additive `impact`, `affected[]`, `topics[]`) |
| Portfolio impact panel (24 h): news count, affected holdings, net effect per holding | `N GET /news/portfolio-impact` |
| Sector impact map (net, negative ← → positive) | `N GET /news/sector-impact` |
| Trending topics | `N GET /news/topics` |

**Provenance rule.** Impact level, direction and sector effect are *derived*,
so each item carries `impactSource` = `PROVIDER` \| `RULE` \| `MODEL` and a
`classifierVersion`. Until a rule set or approved model exists (OQ-4-style
policy), the API returns `impact: null`, `affected: []` and the UI shows the
headline without an effect badge. Direction is never inferred by the frontend.
AI-produced classifications stay behind the AI attachment constraints in PRD
§6.3 (sourced, labelled, optional).

### 3.4 İzleme Listeleri (`/watchlist`)

| Feature | Source |
|---|---|
| Multiple lists with counts; create, rename, delete, edit symbols | `E GET/POST/DELETE /watchlists`, `E POST/DELETE …/symbols`, `N PUT /watchlists/{id}` (rename, reorder) |
| List averages, breadth (up/down today), best/worst 1A | `N GET /watchlists/{id}/performance` |
| Table: price, 1G 1H 1A 3A 6A 1Y, 3-month sparkline, F/K, volume; sort, search | `N GET /watchlists/{id}/performance` (+ `E GET …/research-snapshot` for fundamentals) |
| Heatmap view (tile = ticker, colour = selected window) | same payload |

### 3.5 Şirket Analizi (`/workspace/:symbol`)

| Section | Source |
|---|---|
| Header: price, day change, market cap, 52-week range, add to watchlist, generate report | `E GET /assets/{symbol}/detail`, `E POST /watchlists/{id}/symbols` |
| Price chart with period tabs | `E GET /prices/{symbol}/history` |
| Valuation and profitability vs sector average, with "cheaper/more expensive than sector" badge | `N GET /companies/{symbol}/analysis` |
| Ratio history, last 9 quarters, dashed sector line | `N GET /companies/{symbol}/ratio-history` |
| Financial health score 0–100 with component bars | `N GET /companies/{symbol}/analysis` |
| Revenue / net income / net margin, last 12 quarters | `N GET /companies/{symbol}/quarterly-trend` |
| Statements (income, balance, cash flow), last 5 quarters, YoY | `N GET /companies/{symbol}/statements` |
| Peers comparison | `N GET /companies/{symbol}/peers` |

**Data gap (blocking).** The financial-trends decision (2026-10-28) deliberately
ships *annual* history only, with no sector data and no historical multiples,
because no provider path supplies them. Quarterly series, sector averages, peer
sets and historical ratios therefore have **no data source today**. These
endpoints are specified so the UI and contract can be built, but every one of
them must return `status: UNAVAILABLE` (never an estimate) until a provider
path is approved under OQ-2 (data rights). Health score components and weights
need a versioned policy (OQ-4 pattern) before any score is returned; until then
`healthScore` is `null` with `policyVersion: null`.

### 3.6 Raporlar (`/reports`)

Templates: Performans, Gerçekleşen K/Z dökümü, Temettü, Hisse analiz. Scope =
all portfolios or one; period Ekim 2026 / 3. çeyrek / 2026 YB; preview in page;
download PDF / Excel; e-mail; schedule; history.

| Feature | Source |
|---|---|
| Template catalogue | `N GET /report-templates` |
| Preview data: summary KPIs, value bridge, sector contribution, risk and trade summary | `N GET /report-runs/performance` |
| Realized P&L statement for a calendar year (average-cost method, matching the ledger) with holding period | `N GET /report-runs/realized-pnl` |
| Dividend income statement and net-by-year chart | `N GET /report-runs/dividends` |
| Generate / download / e-mail / history | `N POST /report-runs`, `N GET /report-runs/{id}`, `N GET /report-runs/{id}/download`, `N POST /report-runs/{id}/email`, `N GET /report-runs` |
| Scheduled delivery | `N GET/POST/DELETE /report-schedules` |

Rules:

- **Value bridge** reconciles exactly: `start + Σ(position contributions) + netFlow = end`. Any rounding residual is returned as an explicit `rounding` step; the endpoint returns `PARTIAL` rather than hiding a gap.
- **Realized P&L** uses the ledger's average-cost rule (`domain-and-data.md`); the response states `costMethod: AVERAGE_COST`. FIFO is not offered.
- **Dividends** use ledger `DIVIDEND` transactions. Withholding tax is shown **only when recorded on the transaction** (`withholding`); the design's "örnek %15" is a placeholder, so the API never assumes a rate. A dividend without a recorded withholding has `net: null`.
- The realized P&L and dividend reports are an aid for preparing a tax filing and carry a fixed disclaimer field (`disclaimer`): not tax advice. Jurisdiction-specific disclosure duties stay with OQ-1 (qualified counsel); this feature is not released externally before that gate.
- E-mail and scheduled delivery need an outbound mail provider and stored recipient address (personal data); both are gated on a separate infrastructure decision. Until then `POST …/email` and `POST /report-schedules` return `501` with `code: DELIVERY_NOT_CONFIGURED`, and the UI hides the controls when `GET /report-templates` reports `delivery.email=false`.
- PDF/Excel are rendered server-side from the same data object as the preview so a download can never disagree with the screen.

### 3.7 Portföylerim (`/portfolio`, `/portfolio/:portfolioId`)

| Section | Source |
|---|---|
| Carousel/list of up to 100 portfolios with name, position count, day change, return, risk level; star to pin; filters Tümü / Sabitlenmiş / Kritik riskli | `N GET /portfolios/overview`, `N PUT /portfolios/{id}/pin` |
| "Tüm portföyler" aggregate card incl. count of critical-risk portfolios | `N GET /portfolios/overview` (`aggregate`) |
| KPI row | `N GET /portfolios/{id}/summary` |
| Company allocation donut (incl. cash) | `N GET /portfolios/{id}/allocation?by=HOLDING` |
| Gain status: unrealized P&L per position, winners / losers / net | `N GET /portfolios/{id}/gains` |
| Risk alerts with severity filter (Kritik / Uyarı / Bilgi) | `N GET /portfolios/{id}/risk-alerts` |
| Sector allocation with limit marker | `N GET /portfolios/{id}/allocation?by=SECTOR` |
| Stop status | `N GET /portfolios/{id}/stop-levels`; `N PUT/DELETE /portfolios/{id}/positions/{symbol}/stop-levels` |
| Rebalance (target weights, deviation, suggestion); edit targets | `N GET/PUT /portfolios/{id}/target-weights`, `N GET /portfolios/{id}/rebalance-suggestions` |
| Positions table | `N GET /portfolios/{id}/holdings/analysis` |
| Create / rename / delete portfolio | `E POST/PUT/DELETE /portfolios` |

**Rule set (defaults, all returned in the response so the UI can print the
limit it is comparing against; per-portfolio override is a later policy
feature):**

| Rule | Default | Severity |
|---|---|---|
| Stop breached (price ≤ stop for a long position) while position open | distance ≤ 0 | `CRITICAL` |
| Stop breach risk | distance < 3 % | `WARNING` |
| Single-holding concentration | weight > 25 % | `WARNING` |
| Sector concentration | sector weight > 45 % | `WARNING` |
| Deep loss | unrealized loss worse than −20 % of cost | `WARNING` |
| High beta | portfolio beta > 1.3 | `WARNING` |
| Low cash | cash weight < 3 % | `INFO` |
| Idle cash | cash weight > 18 % (target 5 %) | `INFO` |
| Upcoming earnings | holding reports within 7 days | `INFO` |

Alerts sort `CRITICAL` → `WARNING` → `INFO`. A holding with no price yields no
price-derived alert and the response lists it under `skipped[]` with the reason
(missing evidence is not a pass).

**Stop status buckets (single definition; replaces two inconsistent sets in the
design):** distance `d = |price − level| / price`. `BREACHED` d ≤ 0 (price past
the level), `AT_RISK` d < 3 %, `NEAR` d < 7 %, `SAFE` otherwise, `NA` when the
price is unavailable. The Panel's "Çok yakın / Yakın / Güvenli" labels map to
`AT_RISK / NEAR / SAFE`.

**Portfolio risk level** (`riskScore` 0–100, `riskLevel` `LOW` < 30,
`MEDIUM` < 60, `HIGH` ≥ 60): proposed deterministic composite
`min(100, 40·critical + 15·warning + 3·info)` over the alert counts. The design
shows only the thresholds; this formula is a proposal recorded in the decision
file and must be confirmed (OQ-4 pattern) before it drives any label other than
the filter chip "Kritik riskli".

**Rebalance.** Target weights are stored per portfolio (`target-weights`);
default policy is equal weight across holdings with a 5 % cash target. A
suggestion is emitted when `|current − target| > 5 percentage points`:
`INCREASE` or `REDUCE` plus the weight gap and the **notional amount to close
it**. No quantity is computed and no order is created (X-8). The existing
`POST /portfolio/rebalance-check` proxy is untouched.

### 3.8 İşlem Ekle (`/journal`)

Three input modes feeding the existing ledger (`CAP-TGT-002`: manual entry and
staged CSV import are in Value-MVP scope).

| Mode | Behaviour | Source |
|---|---|---|
| Hızlı form | Portfolio, side AL/SAT, ticker, qty, price (last price shown), date, optional fee, optional note; live total; Enter submits; "recent tickers" chips | `E POST /portfolios/{id}/transactions` (additive optional `note`), `E GET /prices/{symbol}/latest` |
| Toplu metin | One transaction per line: `YÖN TICKER ADET FİYAT [TARİH] [PORTFÖY]`; default portfolio for lines without one; per-row validation preview; valid rows saved, invalid rows left for correction | `N POST /transactions/parse` (dry run), then `E POST` per accepted row via `N POST /transactions/bulk` |
| CSV / ekstre | Upload `.csv`/`.xlsx` (≤ 5 000 rows), auto-detected column mapping (editable), duplicate detection, preview, import into a target portfolio, undo | `N POST /transactions/imports` (preview), `N POST /transactions/imports/{id}/commit`, `N POST /transactions/imports/{id}/undo`, `N GET /transactions/import-template` |
| Son eklenenler | Session list with "Geri al" | `N GET /transactions/recent`, existing `E DELETE …/transactions/{id}` |
| Karar günlüğü | Notes attached to transactions, with outcome | `N GET /journal/decisions` (reads existing `journal/trades` plus notes) |

Parse grammar (server is the authority, the UI only shows the result): side
`AL|SAT|BUY|SELL` (case-insensitive, `tr` locale); qty and price accept `,` as
decimal and `.` as thousands separator; date `dd.MM.yyyy` or ISO, default =
today; trailing text after date is the portfolio name (case-insensitive exact
match, unknown name → row error `PORTFOLIO_NOT_FOUND`). Row statuses:
`VALID`, `DUPLICATE`, `INVALID` with a machine `code` (`SIDE_INVALID`,
`TICKER_NOT_FOUND`, `QUANTITY_INVALID`, `PRICE_INVALID`, `PORTFOLIO_NOT_FOUND`,
`SELL_EXCEEDS_HOLDING`, `DATE_INVALID`). **Duplicate key:** portfolio + date +
side + symbol + quantity + price, against the batch and the existing ledger;
duplicates are skipped, never silently merged.

Import is *staged* (preview writes nothing). `commit` is atomic per batch and
records an `importBatchId` on every created transaction so `undo` removes
exactly that batch, only while no later transaction depends on it (otherwise
`409 IMPORT_NOT_UNDOABLE`). Existing ledger invariants (SELL ≤ holding, symbol
required, etc. in `domain-and-data.md`) apply unchanged.

### 3.9 Kazanç Analizi (`/transactions`)

Scope: all portfolios or one. Period: this month / 3 months / YTD / 12 months /
all time.

| Section | Source |
|---|---|
| Period cards: gain amount, %, vs BIST 100, split realized / unrealized / dividend | `N GET /analytics/earnings/summary` |
| Monthly gain (bars) + cumulative (line), best/worst month | `N GET /analytics/earnings/monthly` |
| Gain sources (realized price gain, unrealized, dividends, fees) | `N GET /analytics/earnings/sources` |
| Yearly summary: start value, net flow, gain, return (time-weighted), BIST 100, difference | `N GET /analytics/earnings/yearly` |
| Top winners / losers by contribution | `N GET /analytics/earnings/contributors` |
| Gain by portfolio (rank, value, gain, return, BIST difference; sortable, paged); row click scopes to that portfolio | `N GET /analytics/earnings/by-portfolio` |
| Recent transactions with realized P&L on sells | `E GET /portfolios/{id}/transactions` plus `N GET /transactions/recent` |

Identity: gain = ending value − starting value − net contributed capital.
`gain = realized + unrealized + dividends − fees`, and the response must
satisfy that identity exactly (any residual is reported, `status: PARTIAL`).

## 4. Open questions and gates

| ID | Question | Blocks |
|---|---|---|
| UI2-Q1 | Provider path for quarterly statements, sector averages, peers and historical multiples (OQ-2). | §3.5 data; endpoints return `UNAVAILABLE` meanwhile. |
| UI2-Q2 | Versioned policy for financial health score components and weights (OQ-4 pattern). | `healthScore`. |
| UI2-Q3 | News impact classifier: rule set vs approved model, provenance and data rights. | News `impact`, `affected`, sector map. |
| UI2-Q4 | Mail provider and consent/storage of recipient address. | Report e-mail and schedules. |
| UI2-Q5 | Counsel review (OQ-1) of the realized-P&L and dividend statements before any external use. | External release of those two templates. |
| UI2-Q6 | Confirm the proposed `riskScore` composite and default thresholds. | `riskLevel` beyond the filter chip. |
| UI2-Q7 | Multi-portfolio at scale (100 portfolios): PRD §3.3 says one portfolio for Value MVP and requires a separately approved decision. The 2026-10-29 decision records the product owner's request; the PRD scope table is updated by the same change. | Nothing further, but PRD owner should confirm. |
| UI2-Q9 | Brand name: design says "Finans Paneli", the app says "mercek". | Logo/title text only. |
| UI2-Q8 | Benchmark data (BIST 100, S&P 500, gold, USD/TRY) provider and licence (OQ-2). `GET /benchmarks` lists only benchmarks with an approved source. | Benchmark overlays. |

## 5. Delivery slices

Each slice is independently testable with provider stubs and mergeable alone
(no live provider calls in tests, AGENTS.md).

| Slice | Backend | Frontend |
|---|---|---|
| S0 | none | Design tokens, shell (nav, market toggle), retitled screens, `/compare` route, per-panel unavailable states (X-3) |
| S1 | Portfolio overview, pin, summary, allocation, gains, monthly returns, holdings analysis, composition history | Panel + Portföylerim sections that read them |
| S2 | Stop levels, risk alerts, target weights, rebalance suggestions | Stops, alerts, rebalance panels |
| S3 | Comparison metrics, correlation, risk-return, returns heatmap, benchmarks | Karşılaştırma + Panel heatmap |
| S4 | Earnings analytics (summary, monthly, sources, yearly, contributors, by-portfolio) | Kazanç Analizi |
| S5 | Transactions parse/bulk/import/undo/recent, journal decisions | İşlem Ekle |
| S6 | Calendar and news additions, watchlist performance | Panel calendar, Haberler, İzleme Listeleri |
| S7 | Report runs (data endpoints, PDF/Excel), templates | Raporlar |
| S8 | Company analysis endpoints (blocked on UI2-Q1/Q2) | Şirket Analizi sections |

Contract-test duty (`docs/agent/verification.md`): each new response DTO gets a
fixture in `docs/contracts/fixtures/`, a backend `ContractFixtures.assertSameShape`
assertion and a frontend `contract.test.ts` schema in the same change.
