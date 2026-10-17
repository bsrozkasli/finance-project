import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  deleteInvestmentPortfolio,
  fetchEnrichedPositions,
  fetchPortfolioPerformance,
  fetchPortfolioSummary,
} from './client';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';
import { loadContractFixture } from '../test/contractFixtures';
import { server } from '../test/server';

// Strict schemas mirror the TypeScript types in client.ts. A field the backend adds,
// renames, or nulls without the frontend type knowing makes these parses fail.
const PortfolioSummarySchema = z.strictObject({
  totalValue: z.number(),
  cashBalance: z.number(),
  dailyPnL: z.number(),
  dailyPnLPercent: z.number(),
  totalPnL: z.number(),
  totalReturn: z.number(),
});

const PortfolioPerformanceSchema = z.strictObject({
  period: z.string(),
  series: z.array(z.strictObject({
    date: z.string(),
    portfolioValue: z.number(),
    benchmarkValue: z.number().nullable().optional(),
  })),
  metrics: z.strictObject({
    sharpe: z.number().nullable(),
    maxDrawdown: z.number().nullable(),
  }).optional(),
});

const EnrichedPositionsSchema = z.array(z.strictObject({
  symbol: z.string(),
  company: z.string(),
  shares: z.number(),
  avgCost: z.number(),
  currentPrice: z.number(),
  costBasis: z.number(),
  marketValue: z.number(),
  allocation: z.number(),
  dailyReturn: z.number(),
  totalReturn: z.number(),
  unrealizedPnL: z.number(),
}));

const BackendErrorSchema = z.strictObject({
  timestamp: z.string(),
  status: z.number().int(),
  error: z.string(),
  message: z.string(),
  path: z.string(),
});

const url = (path: string) => `${API_BASE_URL}${path}`;

describe('shared HTTP contract fixtures', () => {
  it('portfolio summary fixture matches the frontend type and passes through the client', async () => {
    const fixture = PortfolioSummarySchema.parse(loadContractFixture('portfolio-summary.json'));
    server.use(http.get(url('/portfolio/summary'), () => HttpResponse.json(fixture)));

    await expect(fetchPortfolioSummary()).resolves.toEqual(fixture);
  });

  it('portfolio performance fixture matches the frontend type, including nullable metrics', async () => {
    const fixture = PortfolioPerformanceSchema.parse(loadContractFixture('portfolio-performance.json'));
    server.use(http.get(url('/portfolio/performance'), () => HttpResponse.json(fixture)));

    await expect(fetchPortfolioPerformance('1M', 'SP500')).resolves.toEqual(fixture);
  });

  it('enriched positions fixture matches the frontend type', async () => {
    const fixture = EnrichedPositionsSchema.parse(loadContractFixture('portfolio-enriched-positions.json'));
    server.use(http.get(url('/portfolio/positions/enriched'), () => HttpResponse.json(fixture)));

    await expect(fetchEnrichedPositions()).resolves.toEqual(fixture);
  });

  it('backend error fixture becomes an ApiError carrying the backend message', async () => {
    const fixture = BackendErrorSchema.parse(loadContractFixture('error-response.json'));
    server.use(http.delete(url('/portfolios/2'), () => HttpResponse.json(fixture, { status: fixture.status })));

    const rejection = deleteInvestmentPortfolio(2);

    await expect(rejection).rejects.toBeInstanceOf(ApiError);
    await expect(rejection).rejects.toMatchObject({ message: fixture.message, status: fixture.status });
  });
});
