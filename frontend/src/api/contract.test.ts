import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  deleteInvestmentPortfolio,
  fetchEnrichedPositions,
  fetchPortfolioPerformance,
  acceptPortfolioImport,
  createPortfolioState,
  fetchPortfolioState,
  fetchPortfolioSummary,
  fetchPortfolioTransactions,
  uploadPortfolioImport,
} from './client';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';
import { loadContractFixture } from '../test/contractFixtures';
import { server } from '../test/server';

// Strict schemas mirror the TypeScript types exported through client.ts. A field the backend adds,
// renames, or nulls without the frontend type knowing makes these parses fail.
const PortfolioSummarySchema = z.strictObject({
  totalValue: z.number().nullable(),
  cashBalance: z.number(),
  dailyPnL: z.number().nullable(),
  dailyPnLPercent: z.number().nullable(),
  totalPnL: z.number().nullable(),
  totalReturn: z.number().nullable(),
  pricingComplete: z.boolean(),
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
  currentPrice: z.number().nullable(),
  costBasis: z.number(),
  marketValue: z.number().nullable(),
  allocation: z.number().nullable(),
  dailyReturn: z.number().nullable(),
  totalReturn: z.number().nullable(),
  unrealizedPnL: z.number().nullable(),
}));

const PortfolioTransactionsSchema = z.array(z.strictObject({
  id: z.number().int(),
  portfolioId: z.number().int(),
  userId: z.string(),
  symbol: z.string().nullable(),
  assetType: z.enum(['US_STOCK', 'US_ETF', 'BIST_STOCK', 'FUND', 'GOLD', 'CASH', 'OTHER']),
  action: z.enum(['BUY', 'SELL', 'DIVIDEND', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'FEE', 'TRANSFER_IN', 'TRANSFER_OUT', 'MANUAL_VALUATION']),
  quantity: z.number(),
  price: z.number(),
  currency: z.string(),
  fee: z.number(),
  fxRateToBase: z.number(),
  tradeDate: z.string(),
  source: z.enum(['MANUAL', 'CSV']),
  notes: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  originLocator: z.string().nullable(),
}));

const AssetTypeSchema = z.enum(['US_STOCK', 'US_ETF', 'BIST_STOCK', 'FUND', 'GOLD', 'CASH', 'OTHER']);

const PortfolioImportBatchSchema = z.strictObject({
  batchId: z.number().int(),
  portfolioId: z.number().int(),
  status: z.enum(['STAGED', 'ACCEPTED']),
  fileSha256: z.string(),
  createdAt: z.string(),
  acceptedAt: z.string().nullable(),
  counts: z.strictObject({
    valid: z.number().int(),
    invalid: z.number().int(),
    duplicate: z.number().int(),
    accepted: z.number().int(),
    rejected: z.number().int(),
  }),
  rows: z.array(z.strictObject({
    rowNumber: z.number().int(),
    status: z.enum(['VALID', 'INVALID', 'DUPLICATE', 'ACCEPTED', 'REJECTED']),
    message: z.string().nullable(),
    originLocator: z.string().nullable(),
    transactionId: z.number().int().nullable(),
  })),
});

const PortfolioStateSchema = z.strictObject({
  version: z.string(),
  portfolioId: z.number().int(),
  asOf: z.string(),
  exposureStatus: z.enum(['COMPLETE', 'PARTIAL', 'EMPTY']),
  sourceEventIds: z.array(z.number().int()),
  positions: z.array(z.strictObject({
    symbol: z.string(),
    assetType: AssetTypeSchema,
    quantity: z.number(),
    averageCost: z.number().nullable(),
    costBasis: z.number().nullable(),
    realizedPnl: z.number().nullable(),
    currency: z.string().nullable(),
    valuationStatus: z.enum(['PRICED', 'STALE_PRICE', 'NO_PRICE', 'CURRENCY_UNKNOWN', 'CURRENCY_MISMATCH', 'CLOSED']),
    price: z.number().nullable(),
    priceDate: z.string().nullable(),
    marketValue: z.number().nullable(),
    weight: z.number().nullable(),
  })),
  assetTypeWeights: z.partialRecord(AssetTypeSchema, z.number()),
});

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

  it('portfolio transaction fixture retains the backend source locator', async () => {
    const fixture = PortfolioTransactionsSchema.parse(loadContractFixture('portfolio-transactions.json'));
    server.use(http.get(url('/portfolios/1/transactions'), () => HttpResponse.json(fixture)));

    await expect(fetchPortfolioTransactions(1)).resolves.toEqual(fixture);
  });

  it('backend error fixture becomes an ApiError carrying the backend message', async () => {
    const fixture = BackendErrorSchema.parse(loadContractFixture('error-response.json'));
    server.use(http.delete(url('/portfolios/2'), () => HttpResponse.json(fixture, { status: fixture.status })));

    const rejection = deleteInvestmentPortfolio(2);

    await expect(rejection).rejects.toBeInstanceOf(ApiError);
    await expect(rejection).rejects.toMatchObject({ message: fixture.message, status: fixture.status });
  });

  it('import batch fixture matches the frontend type and passes through upload and accept', async () => {
    const fixture = PortfolioImportBatchSchema.parse(loadContractFixture('portfolio-import-batch.json'));
    server.use(
      http.post(url('/portfolios/1/imports'), () => HttpResponse.json(fixture, { status: 201 })),
      http.post(url('/portfolios/1/imports/9/accept'), () => HttpResponse.json(fixture)),
    );

    await expect(uploadPortfolioImport(1, new Blob(['a,b']))).resolves.toEqual(fixture);
    await expect(acceptPortfolioImport(1, 9)).resolves.toEqual(fixture);
  });

  it('COMPLETE and PARTIAL portfolio state fixtures match the frontend type', async () => {
    const complete = PortfolioStateSchema.parse(loadContractFixture('portfolio-state-complete.json'));
    const partial = PortfolioStateSchema.parse(loadContractFixture('portfolio-state-partial.json'));
    server.use(
      http.post(url('/portfolios/1/states'), () => HttpResponse.json(complete, { status: 201 })),
      http.get(url('/portfolios/1/states/:version'), () => HttpResponse.json(partial)),
    );

    await expect(createPortfolioState(1, '2026-10-25')).resolves.toEqual(complete);
    await expect(fetchPortfolioState(1, partial.version)).resolves.toEqual(partial);
    expect(partial.positions[0]).toMatchObject({ price: null, marketValue: null, weight: null });
    expect(partial.assetTypeWeights).toEqual({});
  });
});
