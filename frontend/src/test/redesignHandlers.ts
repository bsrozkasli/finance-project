import { http, HttpResponse, type HttpHandler } from 'msw';
import { API_BASE_URL } from '../api/config';
import * as fx from './redesignFixtures';

const url = (path: string) => `${API_BASE_URL}${path}`;

/** Body every analytic endpoint returns while its data source is not approved (spec: never an estimate). */
const unavailable = (extra: Record<string, unknown> = {}) => ({
  status: 'UNAVAILABLE',
  asOf: fx.FIXTURE_AS_OF,
  notes: ['Test stub: veri kaynağı yok'],
  ...extra,
});

interface GetRoute {
  path: string;
  /** Valid response used by view tests (`fixture*` values only exist in tests). */
  fixture: unknown;
  /** Default response: UNAVAILABLE with the collections the schema requires left empty. */
  unavailable: unknown;
}

const GET_ROUTES: GetRoute[] = [
  { path: '/benchmarks', fixture: fx.fixtureBenchmarks, unavailable: unavailable({ items: [] }) },
  { path: '/portfolios/overview', fixture: fx.fixturePortfolioOverview, unavailable: unavailable({ total: 0, items: [], aggregate: {} }) },
  { path: '/portfolios/:portfolioId/summary', fixture: fx.fixturePortfolioSummary, unavailable: unavailable() },
  { path: '/portfolios/:portfolioId/allocation', fixture: fx.fixtureAllocation, unavailable: unavailable({ slices: [] }) },
  { path: '/portfolios/:portfolioId/gains', fixture: fx.fixtureGains, unavailable: unavailable({ items: [] }) },
  { path: '/portfolios/:portfolioId/monthly-returns', fixture: fx.fixtureMonthlyReturns, unavailable: unavailable({ items: [] }) },
  { path: '/portfolios/:portfolioId/holdings/analysis', fixture: fx.fixtureHoldingsAnalysis, unavailable: unavailable({ items: [] }) },
  { path: '/portfolios/:portfolioId/composition-history', fixture: fx.fixtureCompositionHistory, unavailable: unavailable({ dates: [], series: [] }) },
  { path: '/returns/heatmap', fixture: fx.fixtureReturnsHeatmap, unavailable: unavailable({ windows: [], rows: [] }) },
  { path: '/portfolios/:portfolioId/stop-levels', fixture: fx.fixtureStopLevels, unavailable: unavailable({ items: [] }) },
  { path: '/stop-levels/upcoming', fixture: fx.fixtureStopLevels, unavailable: unavailable({ items: [] }) },
  { path: '/portfolios/:portfolioId/risk-alerts', fixture: fx.fixtureRiskAlerts, unavailable: unavailable({ counts: {}, items: [] }) },
  { path: '/portfolios/:portfolioId/target-weights', fixture: fx.fixtureTargetWeights, unavailable: unavailable({ targets: [] }) },
  { path: '/portfolios/:portfolioId/rebalance-suggestions', fixture: fx.fixtureRebalanceSuggestions, unavailable: unavailable({ items: [] }) },
  { path: '/comparison/metrics', fixture: fx.fixtureComparisonMetrics, unavailable: unavailable({ a: { ref: 'ALL', label: '-' }, b: { ref: 'ALL', label: '-' } }) },
  { path: '/comparison/correlation-matrix', fixture: fx.fixtureCorrelationMatrix, unavailable: unavailable({ labels: [], matrix: [] }) },
  { path: '/comparison/risk-return', fixture: fx.fixtureRiskReturn, unavailable: unavailable({ points: [] }) },
  { path: '/analytics/earnings/summary', fixture: fx.fixtureEarningsSummary, unavailable: unavailable({ items: [] }) },
  { path: '/analytics/earnings/monthly', fixture: fx.fixtureEarningsMonthly, unavailable: unavailable({ items: [] }) },
  { path: '/analytics/earnings/sources', fixture: fx.fixtureEarningsSources, unavailable: unavailable() },
  { path: '/analytics/earnings/yearly', fixture: fx.fixtureEarningsYearly, unavailable: unavailable({ items: [] }) },
  { path: '/analytics/earnings/contributors', fixture: fx.fixtureContributors, unavailable: unavailable({ items: [] }) },
  { path: '/analytics/earnings/by-portfolio', fixture: fx.fixtureEarningsByPortfolio, unavailable: unavailable({ total: 0, items: [] }) },
  { path: '/transactions/recent', fixture: fx.fixtureRecentTransactions, unavailable: unavailable({ items: [] }) },
  { path: '/journal/decisions', fixture: fx.fixtureJournalDecisions, unavailable: unavailable({ total: 0, items: [] }) },
  { path: '/calendar/events', fixture: fx.fixtureCalendarEvents, unavailable: unavailable({ items: [] }) },
  { path: '/news/items', fixture: fx.fixtureNewsItems, unavailable: unavailable({ total: 0, items: [] }) },
  { path: '/news/portfolio-impact', fixture: fx.fixturePortfolioNewsImpact, unavailable: unavailable({ items: [] }) },
  { path: '/news/sector-impact', fixture: fx.fixtureSectorImpact, unavailable: unavailable({ items: [] }) },
  { path: '/news/topics', fixture: fx.fixtureTopics, unavailable: unavailable({ items: [] }) },
  { path: '/watchlists/:watchlistId/performance', fixture: fx.fixtureWatchlistPerformance, unavailable: unavailable({ items: [] }) },
  { path: '/companies/:symbol/analysis', fixture: fx.fixtureCompanyAnalysis, unavailable: unavailable() },
  { path: '/companies/:symbol/ratio-history', fixture: fx.fixtureRatioHistory, unavailable: unavailable({ points: [] }) },
  { path: '/companies/:symbol/quarterly-trend', fixture: fx.fixtureQuarterlyTrend, unavailable: unavailable({ points: [] }) },
  { path: '/companies/:symbol/statements', fixture: fx.fixtureCompanyStatements, unavailable: unavailable({ periods: [], lines: [] }) },
  { path: '/companies/:symbol/peers', fixture: fx.fixturePeers, unavailable: unavailable({ items: [] }) },
  {
    path: '/report-templates',
    fixture: fx.fixtureReportTemplates,
    unavailable: { delivery: { email: false, pdf: false, xlsx: false }, items: [] },
  },
  { path: '/report-runs/performance', fixture: fx.fixturePerformanceReport, unavailable: unavailable() },
  { path: '/report-runs/realized-pnl', fixture: fx.fixtureRealizedPnlReport, unavailable: unavailable({ costMethod: 'AVERAGE_COST', disclaimer: '-', rows: [] }) },
  { path: '/report-runs/dividends', fixture: fx.fixtureDividendReport, unavailable: unavailable({ disclaimer: '-', rows: [] }) },
  { path: '/report-runs', fixture: fx.fixtureReportRuns, unavailable: { total: 0, items: [] } },
  { path: '/report-runs/:runId', fixture: fx.fixtureReportRun, unavailable: unavailable({ runId: 'none', templateId: 'PERFORMANCE', createdAt: fx.FIXTURE_AS_OF }) },
  { path: '/report-schedules', fixture: fx.fixtureReportSchedules, unavailable: { items: [] } },
];

/** Write endpoints fixtures (POST/PUT body is ignored by the stub). */
const WRITE_ROUTES: { method: 'post' | 'put'; path: string; status: number; fixture: unknown }[] = [
  { method: 'put', path: '/portfolios/:portfolioId/pin', status: 200, fixture: fx.fixturePinState },
  { method: 'put', path: '/portfolios/:portfolioId/positions/:symbol/stop-levels', status: 200, fixture: fx.fixtureStopLevel },
  { method: 'put', path: '/portfolios/:portfolioId/target-weights', status: 200, fixture: fx.fixtureTargetWeights },
  { method: 'post', path: '/transactions/parse', status: 200, fixture: fx.fixtureParsedTransactions },
  { method: 'post', path: '/transactions/bulk', status: 201, fixture: fx.fixtureBulkResult },
  { method: 'post', path: '/transactions/imports', status: 201, fixture: fx.fixtureImportPreview },
  { method: 'post', path: '/transactions/imports/:importId/commit', status: 200, fixture: fx.fixtureBulkResult },
  { method: 'post', path: '/transactions/imports/:importId/undo', status: 200, fixture: fx.fixtureUndoResult },
  { method: 'post', path: '/report-runs', status: 201, fixture: fx.fixtureReportRun },
  { method: 'post', path: '/report-schedules', status: 201, fixture: fx.fixtureReportSchedule },
];

const notImplemented = (path: string) => HttpResponse.json(
  { timestamp: fx.FIXTURE_AS_OF, status: 501, error: 'Not Implemented', message: 'Test stub: uç nokta hazır değil', path },
  { status: 501 },
);

/** Default handlers: every new GET answers 200 UNAVAILABLE; writes and file downloads answer 501. */
export const redesignDefaultHandlers = (): HttpHandler[] => [
  ...GET_ROUTES.map((route) => http.get(url(route.path), () => HttpResponse.json(route.unavailable as Record<string, unknown>))),
  http.get(url('/transactions/import-template'), ({ request }) => notImplemented(new URL(request.url).pathname)),
  http.get(url('/report-runs/:runId/download'), ({ request }) => notImplemented(new URL(request.url).pathname)),
  ...WRITE_ROUTES.map((route) => http[route.method](url(route.path), ({ request }) => notImplemented(new URL(request.url).pathname))),
  http.delete(url('/portfolios/:portfolioId/positions/:symbol/stop-levels'), ({ request }) => notImplemented(new URL(request.url).pathname)),
  http.post(url('/report-runs/:runId/email'), ({ request }) => notImplemented(new URL(request.url).pathname)),
  http.delete(url('/report-schedules/:scheduleId'), ({ request }) => notImplemented(new URL(request.url).pathname)),
  http.put(url('/watchlists/:watchlistId'), ({ request }) => notImplemented(new URL(request.url).pathname)),
];

/**
 * Test-only: handlers that answer with valid `fixture*` payloads. Use with `server.use(...)` in view
 * tests that need data; the default handlers above keep every other panel UNAVAILABLE.
 */
export const redesignFixtureHandlers = (): HttpHandler[] => [
  ...GET_ROUTES.map((route) => http.get(url(route.path), () => HttpResponse.json(route.fixture as Record<string, unknown>))),
  http.get(url('/transactions/import-template'), () => new HttpResponse('date,side,symbol,quantity,price\n', { headers: { 'Content-Type': 'text/csv' } })),
  ...WRITE_ROUTES.map((route) => http[route.method](url(route.path), () => HttpResponse.json(route.fixture as Record<string, unknown>, { status: route.status }))),
  http.delete(url('/portfolios/:portfolioId/positions/:symbol/stop-levels'), () => new HttpResponse(null, { status: 204 })),
  http.post(url('/report-runs/:runId/email'), () => new HttpResponse(null, { status: 202 })),
  http.delete(url('/report-schedules/:scheduleId'), () => new HttpResponse(null, { status: 204 })),
  http.put(url('/watchlists/:watchlistId'), () => new HttpResponse(null, { status: 200 })),
];

/** Fixture lookup for contract tests: route path -> valid payload. */
export const fixtureByPath = (path: string): unknown => GET_ROUTES.find((route) => route.path === path)?.fixture;
export const redesignGetPaths = (): string[] => GET_ROUTES.map((route) => route.path);
export const redesignUnavailableBody = (path: string): unknown => GET_ROUTES.find((route) => route.path === path)?.unavailable;
