import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import * as api from './index';
import * as schemas from './schemas';
import { API_BASE_URL } from '../config';
import { ApiError } from '../errors';
import { apiClient } from '../http';
import { server } from '../../test/server';
import * as fx from '../../test/redesignFixtures';
import {
  fixtureByPath, redesignFixtureHandlers, redesignGetPaths, redesignUnavailableBody,
} from '../../test/redesignHandlers';

// path -> response schema. Every GET handled by the stubs must have an entry (checked below).
const SCHEMA_BY_PATH: Record<string, z.ZodType> = {
  '/benchmarks': schemas.BenchmarkListSchema,
  '/portfolios/overview': schemas.PortfolioOverviewSchema,
  '/portfolios/:portfolioId/summary': schemas.PortfolioSummarySchema,
  '/portfolios/:portfolioId/allocation': schemas.AllocationSchema,
  '/portfolios/:portfolioId/gains': schemas.GainsSchema,
  '/portfolios/:portfolioId/monthly-returns': schemas.MonthlyReturnsSchema,
  '/portfolios/:portfolioId/holdings/analysis': schemas.HoldingsAnalysisSchema,
  '/portfolios/:portfolioId/composition-history': schemas.CompositionHistorySchema,
  '/returns/heatmap': schemas.ReturnsHeatmapSchema,
  '/portfolios/:portfolioId/stop-levels': schemas.StopLevelsSchema,
  '/stop-levels/upcoming': schemas.StopLevelsSchema,
  '/portfolios/:portfolioId/risk-alerts': schemas.RiskAlertsSchema,
  '/portfolios/:portfolioId/target-weights': schemas.TargetWeightsSchema,
  '/portfolios/:portfolioId/rebalance-suggestions': schemas.RebalanceSuggestionsSchema,
  '/comparison/metrics': schemas.ComparisonMetricsSchema,
  '/comparison/correlation-matrix': schemas.CorrelationMatrixSchema,
  '/comparison/risk-return': schemas.RiskReturnSchema,
  '/analytics/earnings/summary': schemas.EarningsSummarySchema,
  '/analytics/earnings/monthly': schemas.EarningsMonthlySchema,
  '/analytics/earnings/sources': schemas.EarningsSourcesSchema,
  '/analytics/earnings/yearly': schemas.EarningsYearlySchema,
  '/analytics/earnings/contributors': schemas.ContributorsSchema,
  '/analytics/earnings/by-portfolio': schemas.EarningsByPortfolioSchema,
  '/transactions/recent': schemas.RecentTransactionsSchema,
  '/journal/decisions': schemas.JournalDecisionsSchema,
  '/calendar/events': schemas.CalendarEventsSchema,
  '/news/items': schemas.NewsItemsSchema,
  '/news/portfolio-impact': schemas.PortfolioNewsImpactSchema,
  '/news/sector-impact': schemas.SectorImpactSchema,
  '/news/topics': schemas.TopicsSchema,
  '/watchlists/:watchlistId/performance': schemas.WatchlistPerformanceSchema,
  '/companies/:symbol/analysis': schemas.CompanyAnalysisSchema,
  '/companies/:symbol/ratio-history': schemas.RatioHistorySchema,
  '/companies/:symbol/quarterly-trend': schemas.QuarterlyTrendSchema,
  '/companies/:symbol/statements': schemas.CompanyStatementsSchema,
  '/companies/:symbol/peers': schemas.PeersSchema,
  '/report-templates': schemas.ReportTemplatesSchema,
  '/report-runs/performance': schemas.PerformanceReportSchema,
  '/report-runs/realized-pnl': schemas.RealizedPnlReportSchema,
  '/report-runs/dividends': schemas.DividendReportSchema,
  '/report-runs': schemas.ReportRunsSchema,
  '/report-runs/:runId': schemas.ReportRunSchema,
  '/report-schedules': schemas.ReportSchedulesSchema,
};

describe('redesign zod schemas', () => {
  it('cover every stubbed GET endpoint', () => {
    expect(redesignGetPaths().sort()).toEqual(Object.keys(SCHEMA_BY_PATH).sort());
  });

  it.each(Object.entries(SCHEMA_BY_PATH))('%s: fixture parses', (path, schema) => {
    expect(schema.safeParse(fixtureByPath(path)).error).toBeUndefined();
  });

  it.each(Object.entries(SCHEMA_BY_PATH))('%s: default UNAVAILABLE stub parses', (path, schema) => {
    expect(schema.safeParse(redesignUnavailableBody(path)).error).toBeUndefined();
  });

  it('parses the remaining write payload fixtures', () => {
    expect(schemas.PinStateSchema.safeParse(fx.fixturePinState).success).toBe(true);
    expect(schemas.StopLevelSchema.safeParse(fx.fixtureStopLevel).success).toBe(true);
    expect(schemas.BulkResultSchema.safeParse(fx.fixtureBulkResult).success).toBe(true);
    expect(schemas.ImportPreviewSchema.safeParse(fx.fixtureImportPreview).success).toBe(true);
    expect(schemas.ParsedTransactionsSchema.safeParse(fx.fixtureParsedTransactions).success).toBe(true);
    expect(schemas.UndoResultSchema.safeParse(fx.fixtureUndoResult).success).toBe(true);
    expect(schemas.ReportScheduleSchema.safeParse(fx.fixtureReportSchedule).success).toBe(true);
  });

  it('rejects drift: bad status, wrong types, missing required fields', () => {
    expect(schemas.PortfolioSummarySchema.safeParse({ ...fx.fixturePortfolioSummary, status: 'OK' }).success).toBe(false);
    expect(schemas.PortfolioSummarySchema.safeParse({ ...fx.fixturePortfolioSummary, value: '10' }).success).toBe(false);
    expect(schemas.PortfolioSummarySchema.safeParse({ status: 'AVAILABLE' }).success).toBe(false);
    expect(schemas.ComparisonMetricsSchema.safeParse({ ...fx.fixtureComparisonMetrics, correlation: 2 }).success).toBe(false);
    expect(schemas.RealizedPnlReportSchema.safeParse({ ...fx.fixtureRealizedPnlReport, costMethod: 'FIFO' }).success).toBe(false);
    expect(schemas.ParsedRowSchema.safeParse({ line: 1, status: 'VALID', code: 'NOPE' }).success).toBe(false);
  });

  it('keeps missing evidence as null, never a number', () => {
    const parsed = schemas.AllocationSchema.parse(fx.fixtureAllocation);
    const unpriced = parsed.slices.find((slice) => slice.key === 'HS2');
    expect(unpriced?.value).toBeNull();
    expect(unpriced?.weight).toBeNull();
  });
});

describe('redesign endpoint functions', () => {
  const capture = (method: 'get' | 'put' | 'post' | 'delete', path: string, body: () => Response = () => HttpResponse.json({})) => {
    const seen: { url: URL; body: unknown; contentType: string | null }[] = [];
    server.use(http[method](`${API_BASE_URL}${path}`, async ({ request }) => {
      const text = await request.clone().text();
      seen.push({
        url: new URL(request.url),
        body: text && request.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text,
        contentType: request.headers.get('content-type'),
      });
      return body();
    }));
    return seen;
  };

  it('serialises query parameters and path segments', async () => {
    server.use(...redesignFixtureHandlers());
    const overview = capture('get', '/portfolios/overview', () => HttpResponse.json(fx.fixturePortfolioOverview));
    await api.fetchPortfolioOverview({ market: 'BIST', pinned: true, riskLevel: 'HIGH', limit: 10, offset: 20 });
    expect(Object.fromEntries(overview[0].url.searchParams)).toEqual({ market: 'BIST', pinned: 'true', riskLevel: 'HIGH', limit: '10', offset: '20' });

    const metrics = capture('get', '/comparison/metrics', () => HttpResponse.json(fx.fixtureComparisonMetrics));
    await api.fetchComparisonMetrics(api.portfolioRef(12), api.benchmarkRef('BIST100'), '3M');
    expect(Object.fromEntries(metrics[0].url.searchParams)).toEqual({ a: 'PORTFOLIO:12', b: 'BENCHMARK:BIST100', period: '3M' });

    const heatmap = capture('get', '/returns/heatmap', () => HttpResponse.json(fx.fixtureReturnsHeatmap));
    await api.fetchReturnsHeatmap(['ALL', api.portfolioRef(1)], ['1D', '1M']);
    expect(Object.fromEntries(heatmap[0].url.searchParams)).toEqual({ refs: 'ALL,PORTFOLIO:1', windows: '1D,1M' });

    const contributors = capture('get', '/analytics/earnings/contributors', () => HttpResponse.json(fx.fixtureContributors));
    await api.fetchEarningsContributors('LOSERS', { scope: 'PORTFOLIO:3', period: 'YTD', limit: 5 });
    expect(Object.fromEntries(contributors[0].url.searchParams)).toEqual({ scope: 'PORTFOLIO:3', period: 'YTD', limit: '5', direction: 'LOSERS' });

    const news = capture('get', '/news/items', () => HttpResponse.json(fx.fixtureNewsItems));
    await api.fetchNewsItems({ category: 'MACRO', scope: 'PORTFOLIO', symbols: ['HS1', 'HS2'], q: 'faiz' });
    expect(Object.fromEntries(news[0].url.searchParams)).toEqual({ category: 'MACRO', scope: 'PORTFOLIO', symbols: 'HS1,HS2', q: 'faiz' });

    const statements = capture('get', '/companies/:symbol/statements', () => HttpResponse.json(fx.fixtureCompanyStatements));
    await api.fetchCompanyStatements('BRK.B', 'CASH_FLOW', 4);
    expect(statements[0].url.pathname).toBe('/api/v1/companies/BRK.B/statements');
    expect(Object.fromEntries(statements[0].url.searchParams)).toEqual({ type: 'CASH_FLOW', periods: '4' });
  });

  it('sends write bodies and handles empty responses', async () => {
    const pin = capture('put', '/portfolios/:portfolioId/pin', () => HttpResponse.json(fx.fixturePinState));
    await expect(api.pinPortfolio(1, true)).resolves.toEqual(fx.fixturePinState);
    expect(pin[0].body).toEqual({ pinned: true });

    const stop = capture('put', '/portfolios/:portfolioId/positions/:symbol/stop-levels', () => HttpResponse.json(fx.fixtureStopLevel));
    await api.putStopLevels(1, 'HS 1', { stopLoss: 55, takeProfit: null });
    expect(stop[0].url.pathname).toBe('/api/v1/portfolios/1/positions/HS%201/stop-levels');
    expect(stop[0].body).toEqual({ stopLoss: 55, takeProfit: null });

    capture('delete', '/portfolios/:portfolioId/positions/:symbol/stop-levels', () => new HttpResponse(null, { status: 204 }));
    await expect(api.deleteStopLevels(1, 'HS1')).resolves.toBeUndefined();

    const parse = capture('post', '/transactions/parse', () => HttpResponse.json(fx.fixtureParsedTransactions));
    await api.parseTransactions('AL HS1 10 60', 1);
    expect(parse[0].body).toEqual({ text: 'AL HS1 10 60', defaultPortfolioId: 1 });

    capture('put', '/watchlists/:watchlistId', () => new HttpResponse(null, { status: 200 }));
    await expect(api.updateWatchlist(4, { name: 'Yeni ad', symbols: ['HS1'] })).resolves.toBeUndefined();

    capture('post', '/report-runs/:runId/email', () => new HttpResponse(null, { status: 202 }));
    await expect(api.emailReportRun('r1', 'pdf')).resolves.toBeUndefined();
  });

  it('uploads an import as multipart form data', async () => {
    const seen = capture('post', '/transactions/imports', () => HttpResponse.json(fx.fixtureImportPreview, { status: 201 }));
    const file = new File(['a,b\n1,2\n'], 'test.csv', { type: 'text/csv' });
    const preview = await api.stageImport({ file, portfolioId: 2, mapping: { Tarih: 'DATE' } });
    expect(preview.importId).toBe(fx.fixtureImportPreview.importId);
    expect(seen[0].contentType).toMatch(/^multipart\/form-data/);
  });

  it('requests a report download as a blob and the import template as text', async () => {
    // jsdom's Blob is not accepted by MSW's undici Response, so the transport call is asserted instead.
    const blob = new Blob(['PDF'], { type: 'application/pdf' });
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: blob });
    await expect(api.downloadReportRun('r 1', 'xlsx')).resolves.toBe(blob);
    expect(get).toHaveBeenCalledWith('/report-runs/r%201/download', { params: { format: 'xlsx' }, responseType: 'blob' });
    get.mockResolvedValue({ data: 'date,side' });
    await expect(api.fetchImportTemplate()).resolves.toBe('date,side');
    expect(get).toHaveBeenLastCalledWith('/transactions/import-template', { responseType: 'text' });
    get.mockRestore();
  });

  it('surfaces 501 DELIVERY_NOT_CONFIGURED as an ApiError', async () => {
    server.use(http.post(`${API_BASE_URL}/report-schedules`, () => HttpResponse.json(
      { timestamp: fx.FIXTURE_AS_OF, status: 501, error: 'Not Implemented', message: 'Teslimat yapılandırılmadı', path: '/report-schedules', code: 'DELIVERY_NOT_CONFIGURED' },
      { status: 501 },
    )));
    const error = await api.createReportSchedule({ templateId: 'PERFORMANCE', frequency: 'WEEKLY', format: 'pdf' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(501);
  });

  it('default stubs answer UNAVAILABLE for GETs and 501 for writes', async () => {
    const summary = await api.fetchPortfolioSummaryV2(1);
    expect(summary.status).toBe('UNAVAILABLE');
    expect(summary.value).toBeUndefined();
    await expect(api.pinPortfolio(1, true)).rejects.toMatchObject({ status: 501 });
  });
});
