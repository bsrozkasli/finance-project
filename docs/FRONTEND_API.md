# Frontend API Contract

This document maps frontend routes and API callers to the Spring backend contract. The frontend must call only the Spring backend base URL configured in `frontend/src/api/client.ts`:

```ts
http://localhost:8080/api/v1
```

The frontend must not call the FastAPI data-service or external market providers directly.

## Browser Routes

Frontend routes are user-facing SPA routes served by Vite/React Router. They are not backend API paths.

| Route | Screen | Backend data used |
| --- | --- | --- |
| `/` | Redirects to `/dashboard` | none directly |
| `/dashboard` | Dashboard home | assets, prices, news, portfolio dashboard data |
| `/workspace` | Chart workspace | assets plus `GET /prices/{symbol}/history` and `GET /prices/{symbol}/latest` |
| `/workspace/:symbol` | Chart workspace scoped to a symbol | assets plus `GET /prices/{symbol}/history` and `GET /prices/{symbol}/latest` |
| `/portfolio` | Portfolio page | portfolio positions, latest prices, and allocation derived from backend data |
| `/portfolio/:portfolioId` | Portfolio page | portfolio positions, latest prices, and allocation derived from backend data |
| `/transactions` | Trading journal alias | journal trade APIs |
| `/journal` | Trading journal | journal trade APIs |
| `/watchlist` | Watchlist/market grid | assets, watchlists, prices, analysis panels |
| `/news` | News hub | categorized news; optional selected symbol state |
| `/news/:symbol` | News hub scoped to symbol | `GET /news?symbols=...`, fallback `GET /news/{symbol}` |
| `/reports` | Reports page | company/smart report for selected/default symbol |
| `/reports/:symbol` | Reports page scoped to symbol | reports, smart report, backtest, chat |

## Frontend API Mapping

| Frontend caller | Backend endpoint | Status |
| --- | --- | --- |
| `fetchAssets()` | `GET /assets` | matched |
| `addAssetBatch(symbols)` | `POST /assets/batch` | matched |
| `deleteAsset(symbol)` | `DELETE /assets/{symbol}` | matched |
| `fetchAssetPrice(symbol)` | `GET /prices/{symbol}/latest` | matched |
| `fetchPriceHistory(symbol, interval, range)` | `GET /prices/{symbol}/history?interval=&range=` | matched |
| `fetchNews(symbol)` | `GET /news/{symbol}` | matched |
| `fetchAllNews(category, page, size, symbols)` | `GET /news?category=&page=&size=&symbols=` | matched |
| `fetchPortfolioNews()` | `GET /news/portfolio` | matched |
| `fetchPortfolioPositions()` | `GET /portfolio/positions` | matched |
| `addPortfolioPosition(request)` | `POST /portfolio/positions` | matched |
| `updatePortfolioPosition(id, request)` | `PUT /portfolio/positions/{id}` | matched |
| `deletePortfolioPosition(id)` | `DELETE /portfolio/positions/{id}` | matched |
| `fetchPortfolioSummary()` | `GET /portfolio/summary` | matched |
| `fetchPortfolioPerformance(period, benchmark)` | `GET /portfolio/performance?period=&benchmark=` | matched |
| `fetchPortfolioAllocation()` | `GET /portfolio/allocation` | matched |
| `fetchEnrichedPositions()` | `GET /portfolio/positions/enriched` | matched |
| `fetchAnalystRecommendations(symbol)` | `GET /analyst/{symbol}/recommendations` | matched |
| `fetchPriceTarget(symbol)` | `GET /analyst/{symbol}/price-target` | matched |
| `fetchTechnicalAnalysis(symbol, interval, range)` | `GET /technical/{symbol}?interval=&range=` | matched |
| `fetchCompanyReport(symbol)` | `GET /reports/company/{symbol}` | matched |
| `fetchJournalTrades(page, size)` | `GET /journal/trades?page=&size=&sort=` | matched |
| `addJournalTrade(request)` | `POST /journal/trades` | matched |
| `updateJournalTrade(id, request)` | `PUT /journal/trades/{id}` | matched |
| `deleteJournalTrade(id)` | `DELETE /journal/trades/{id}` | matched |
| `fetchJournalStats()` | `GET /journal/trades/stats` | matched |
| `fetchInvestmentPortfolios()` | `GET /portfolios` | matched |
| `createInvestmentPortfolio(request)` | `POST /portfolios` | matched |
| `updateInvestmentPortfolio(id, request)` | `PUT /portfolios/{id}` | matched |
| `deleteInvestmentPortfolio(id)` | `DELETE /portfolios/{id}` | matched |
| `fetchPortfolioTransactions(portfolioId)` | `GET /portfolios/{id}/transactions` | matched |
| `createPortfolioTransaction(portfolioId, request)` | `POST /portfolios/{id}/transactions` | matched |
| `deletePortfolioTransaction(portfolioId, transactionId)` | `DELETE /portfolios/{id}/transactions/{transactionId}` | matched |
| `fetchPortfolioHoldings(portfolioId)` | `GET /portfolios/{id}/holdings` | matched |
| `fetchWatchlists()` | `GET /watchlists` | matched |
| `createWatchlist(name)` | `POST /watchlists` | matched |
| `addSymbolToWatchlist(id, symbol)` | `POST /watchlists/{id}/symbols` | matched |
| `removeSymbolFromWatchlist(id, symbol)` | `DELETE /watchlists/{id}/symbols/{symbol}` | matched |
| `deleteWatchlist(id)` | `DELETE /watchlists/{id}` | matched |
| `fetchFundamentals(symbol)` | `GET /fundamentals/{symbol}` | matched |
| `fetchFinancialRatios(symbol)` | `GET /fundamentals/{symbol}/ratios` | matched |
| `fetchEarnings(symbol, periods)` | `GET /fundamentals/{symbol}/earnings?periods=` | matched |
| `fetchInsiderActivity(symbol)` | `GET /fundamentals/{symbol}/insider` | matched |
| `fetchInstitutionalOwnership(symbol)` | `GET /fundamentals/{symbol}/institutional` | matched |
| `useAgentAnalysis(symbol)` | `GET /agent-analysis/{ticker}` | matched; response fields are snake_case |
| `invalidateAndRefetch()` | `DELETE /agent-analysis/{ticker}/cache` | matched |
| `useBacktest(symbol)` | `GET /backtest/{symbol}` | matched |
| `useSmartReport(symbol)` | `GET /reports/smart/{symbol}` | matched |
| `SmartReportChat` | `POST /chat/ask` | matched |
| `useNotifications()` | `GET /notifications`, `POST /notifications/read-all` | matched |
| `ChartTerminal` | `GET /prices/{symbol}/history?interval=&range=` | matched |

## Contract Notes

- Frontend route parameters such as `:symbol` must be normalized to uppercase before API calls when the value represents a market symbol.
- Backend API paths and DTO field names are the source of truth for data contracts.
- Live price UI must use Spring price endpoints only; provider API keys and provider WebSockets must not run in the browser.
- Dashboard portfolio data refreshes from backend portfolio endpoints on load, every 60 seconds while the market is open, and every 15 minutes while the market is closed.
- Portfolio buy/sell workflows should create `PortfolioTransaction` entries. They may create linked journal notes through `journalNotes`; journal history must remain after a sale closes or reduces a holding.
- React Router routes must not require changes to Spring endpoint paths.
- Vite dev server handles SPA fallback for local development. Production hosting must also route unknown browser paths to `index.html`.
- Agent analysis response fields are snake_case: `fundamental_summary`, `technical_summary`, `risk_summary`, `bull_case`, `bear_case`, `portfolio_manager_reasoning`, `metrics_used`, `generated_at`, `from_cache`.

## Gaps And Follow-Up Work

Current frontend callers have matching backend endpoints. The following areas are integration gaps or likely product/API improvements:

| Area | Current state | Recommended follow-up |
| --- | --- | --- |
| Technical signals | Backend exposes `GET /technical/{symbol}/signals`, but the frontend currently consumes only `GET /technical/{symbol}`. | Add a typed frontend client and hook when a dedicated signals UI is implemented. |
| Portfolio analytics | Backend exposes `/portfolio/optimize` and `/portfolio/rebalance-check`; no current frontend caller was found. | Add typed callers only when the UI flow is added. |
| Asset detail | Backend exposes `GET /assets/{symbol}`; current frontend uses list and batch flows. | Add a typed caller if an asset detail route is introduced. |
