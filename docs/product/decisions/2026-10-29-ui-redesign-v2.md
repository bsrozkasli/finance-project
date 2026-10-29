# Decision: UI redesign v2 and its backend contract

**Recorded:** 2026-10-29

**Decision input:** The product owner designed nine screens in the design canvas (`docs/prototypes/finance-ui-v2/`) and asked for them to be applied to the web app, with a spec/OpenAPI document for the backend work and the documentation updated. Detail choices were left to the implementing agent and are recorded here so they can be reviewed or reversed. OQ-1 (jurisdiction/legal) and OQ-2 (data rights) are outside this delegation; nothing here approves a provider, a data licence or an external release.

**Scope:** frontend screens, a proposed additive backend contract, documentation. **State:** Proposed. No backend behavior in this decision is implemented.

## Findings

1. The design is a product expansion, not a reskin. Against `PRD.md` §3.3/§3.4 it adds: many portfolios (the design shows 100), pinned portfolios, stop-loss/take-profit levels, rule-based risk alerts, target weights and rebalance gaps, benchmark comparison, a returns heatmap, a calendar panel, news impact, quarterly company analysis with sector averages and peers, PDF/Excel/e-mail reports with a realized-P&L statement, bulk text and CSV transaction entry with undo, and an earnings (gain) analysis.
2. Existing endpoints already cover part of it: `GET /portfolio/performance/comparison`, `GET /calendar*`, `GET /news*`, ledger transactions and holdings, watchlists, price history, asset detail. Everything else is new.
3. The design contains sample numbers and `HSx` placeholder tickers; none are product data.
4. Two internal inconsistencies in the design: stop distance buckets differ between Panel (3.5 % / 8 %) and Portföylerim (3 % / 7 %); and the design's tax-style statement assumes a 15 % withholding rate labelled "örnek" (example).
5. The 2026-10-28 financial-trends decision deliberately stops at annual statements with no sector data, because no provider path exists. The design needs quarterly series, sector averages, peers and historical multiples.

## Decisions

1. **Treat the design as the target UI and the requirements document as the contract.** `docs/spec/proposed/ui-redesign-v2.md` (requirements) and `ui-redesign-v2.openapi.yaml` (proposed endpoints, validated OpenAPI 3.0.3) are the source for backend and frontend work. `SPEC.md` and `docs/spec/current-system/` are untouched because they describe verified behavior only; they change per slice when a slice ships (PRD §7.2).
2. **PRD scope change is explicit.** The product owner's request supersedes the "one portfolio in the initial Value MVP" line for this work. PRD §3.3 gets a pointer to this decision; multi-portfolio ledger semantics (cash accounting, per-portfolio targets and stops) are specified in the requirements document. The PRD owner should still confirm (UI2-Q7). Order creation, routing and automatic rebalancing stay out of scope: rebalance output is a gap and a notional amount, never a quantity or an order.
3. **Everything is additive.** No existing path or DTO field changes (AGENTS.md; OQ-5 *preserve*). Where the design needs more from an existing resource, a new sibling path is proposed (`/calendar/events`, `/news/items`) rather than altering `/calendar` or `/news`, so existing consumers and fixtures are not disturbed. Browser route paths are preserved; only titles change and `/compare` is added.
4. **Sample data never ships as live data.** Every new panel must render explicit `UNAVAILABLE`/`EMPTY`/`PARTIAL` states. The frontend consumes the new endpoints through typed clients and shows "Veri alınamadı" when an endpoint is missing (404/501) or fails, so frontend slices can merge before backend slices without fabricating numbers. Tests use boundary stubs only (no live providers).
5. **Single stop-status definition:** `BREACHED` (distance ≤ 0), `AT_RISK` (< 3 %), `NEAR` (< 7 %), `SAFE`, `NA` without a price. The Panel's wording maps onto these. Thresholds are returned in the response.
6. **Risk alert rules and defaults** (concentration 25 %, sector 45 %, deep loss −20 %, beta 1.3, cash < 3 % / > 18 % with a 5 % target, earnings within 7 days, stop breach critical) are taken from the design's own logic and returned with each alert (`observed`, `limit`). A holding without a price is listed under `skipped` and is never treated as passing.
7. **`riskScore` is proposed, not designed:** `min(100, 40·critical + 15·warning + 3·info)`, `LOW < 30`, `MEDIUM < 60`, `HIGH ≥ 60`. The design shows only the thresholds. This formula is an agent proposal; until the product owner confirms it (UI2-Q6) it drives only the "Kritik riskli" filter and a displayed badge, nothing else. Reversal costs one domain service and its tests.
8. **Time-weighted returns, cash flows at start of day,** for every return, comparison and yearly figure. Realized P&L uses the ledger's existing average-cost rule; FIFO is not offered.
9. **Withholding tax is never assumed.** The dividend statement shows withholding only when recorded on the ledger transaction; otherwise `net` is `null`. The realized-P&L and dividend statements carry a fixed "not tax advice" disclaimer and are not released externally before the counsel review in OQ-1 (UI2-Q5).
10. **Derived news impact needs provenance.** `impact`, `affected` and the sector map carry `source` (`PROVIDER`/`RULE`/`MODEL`) and a classifier version, and are empty until a classifier is approved (UI2-Q3). The frontend never infers direction.
11. **Company-analysis data is a recorded gap, not a build item.** The endpoints are specified so the screen and contract can be built, but quarterly series, sector averages, peers and historical ratios answer `status: UNAVAILABLE` until a provider path is approved (UI2-Q1, OQ-2). `healthScore` stays `null` until a versioned policy exists (UI2-Q2). Historical multiples are never reconstructed from today's price.
12. **E-mail and scheduled reports are gated.** They need a mail provider and storage of a recipient address (personal data). Until a separate infrastructure decision exists these endpoints answer `501 DELIVERY_NOT_CONFIGURED` and the UI hides the controls when `GET /report-templates` reports `delivery.email=false`. PDF/Excel render from the same frozen data object as the preview.
13. **Imports are staged and undoable.** Preview and parse write nothing; commit is atomic per batch and tags every created transaction with `importBatchId`; undo removes exactly that batch and answers `409 IMPORT_NOT_UNDOABLE` if a later transaction depends on it. Duplicates (portfolio + date + side + symbol + quantity + price) are skipped, never merged. Existing ledger invariants apply unchanged.
14. **Market scope** is a `market` filter (`ALL`/`BIST`/`US`) resolved from instrument identity (decision 2026-10-15), not from a ticker suffix. No FX conversion; every monetary response states its `currency`.
15. **Design snapshot is stored in the repo** under `docs/prototypes/finance-ui-v2/` as reference only. It is not runtime code and its numbers are not evidence.
16. **Delivery in slices S0–S8** (requirements §5), each independently testable and mergeable; the first frontend slice (S0) ships the design system, shell, retitled screens and `/compare` without depending on any backend slice.

17. **Bundle budget raised** to 880 KiB raw / 275 KiB gzipped (main was at 725 / 230 after financial trends) (`frontend/scripts/check-bundle-size.cjs`). The budget counts every chunk including lazy routes; measured total after the nine screens merged with financial trends is 867.6 KiB raw / 271.6 KiB gzipped. All new panels are lazy, hand-written SVG (no new chart library), and the first-load `index` chunk is unchanged in kind (~265 KiB raw). Cost if wrong: the gate is one constant; if the product owner prefers a smaller budget, the heaviest lazy chunks (`PortfolioManagerView`, `TradingJournalView`, `DashboardHome`) are the places to trim.

18. **GitHub Pages publishes the real frontend with no backend** (product owner's choice on 2026-10-29). `.github/workflows/pages.yml` builds with `VITE_BASE_PATH=/<repo>/`, copies `index.html` to `404.html` for deep links, and deploys only from `main` (reviewed PR). Without the repository variable `PAGES_API_BASE_URL` the API base points at a same-origin path that answers 404, so no request reaches `localhost` and every data panel shows its explicit unavailable state; a banner states that no backend is attached. The repository is public, so the page is public: it contains no secrets and no data, only the built UI. Setting `PAGES_API_BASE_URL` to an https backend with CORS for the Pages origin turns it into a live deployment (a backend exposed publicly needs its own security review first, since the Value MVP has no authentication). Cost if wrong: delete the workflow and disable Pages.

## Non-goals

Order entry or routing, automatic rebalancing, broker sync, authentication and multi-user isolation (`CAP-TGT-010`), tax advice, an AI-written news classifier without approval, any new data provider or licence.

## Open gates created or touched

UI2-Q1 … UI2-Q8 in the requirements document §4; OQ-1, OQ-2, OQ-4 (policy pattern for score/limits), OQ-5 (additive only).

## Cost if wrong

All proposed endpoints are new and nothing persists except per-portfolio pin, stop levels, target weights, report runs/schedules and import batches (new tables, new migrations when each slice is built; applied migrations stay immutable). Reverting a slice means removing its routes, tables (by a new migration) and its frontend panel; the other slices do not depend on it. If a rule default or formula changes, only the backend domain service and its fixtures change because thresholds travel in the response.
