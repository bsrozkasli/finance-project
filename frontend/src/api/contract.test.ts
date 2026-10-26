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
  pricingStatus: z.enum(['OK', 'STALE', 'FAILED', 'EMPTY']).nullable(),
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
  priceAsOf: z.string().datetime().nullable(),
  priceStatus: z.enum(['OK', 'STALE', 'FAILED', 'EMPTY']).nullable(),
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

const SectionStatusSchema = z.enum([
  'OK', 'STALE', 'EMPTY', 'FAILED', 'RATE_LIMITED', 'INSUFFICIENT_DATA', 'PENDING_REFRESH',
]);

// The smart report has no client.ts type yet (next change); this pins the backend field set.
// Full serialized JournalTrade (the record is returned as-is). priceAsOf/priceStatus are null for closed trades.
const JournalTradeSchema = z.strictObject({
  id: z.number().int(),
  userId: z.string(),
  symbol: z.string(),
  company: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number(),
  purchasePrice: z.number(),
  currentPrice: z.number().nullable(),
  marketValue: z.number().nullable(),
  commission: z.number(),
  strategy: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
  status: z.enum(['OPEN', 'CLOSED']),
  pnl: z.number().nullable(),
  returnPct: z.number().nullable(),
  holdingDays: z.number().int(),
  portfolioId: z.number().int().nullable(),
  transactionId: z.number().int().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  priceAsOf: z.string().datetime().nullable(),
  priceStatus: z.enum(['OK', 'STALE', 'FAILED', 'EMPTY']).nullable(),
});

const SmartReportSchema = z.strictObject({
  symbol: z.string(),
  overallScore: z.number().nullable(),
  grade: z.string().nullable(),
  recommendation: z.string().nullable(),
  breakdown: z.strictObject({
    fundamentalScore: z.number().nullable(),
    valuationScore: z.number().nullable(),
    qualityScore: z.number().nullable(),
    growthScore: z.number().nullable(),
    momentumScore: z.number().nullable(),
    riskScore: z.number().nullable(),
    earningsScore: z.number().nullable(),
    sentimentScore: z.number().nullable(),
  }),
  peers: z.array(z.strictObject({
    symbol: z.string(),
    peRatio: z.number().nullable(),
    pbRatio: z.number().nullable(),
    debtToEquity: z.number().nullable(),
    netProfitMargin: z.number().nullable(),
    roe: z.number().nullable(),
  })),
  sectionStatus: z.strictObject({
    overall: SectionStatusSchema.nullable(),
    components: z.record(z.string(), z.strictObject({
      status: SectionStatusSchema.nullable(),
      reason: z.string().nullable(),
    })),
  }).nullable(),
});

// Agent analysis: decision and confidence are null when decision_status is FAILED (the placeholder
// verdict is withheld); decision_status itself is null when the data-service status is unknown.
const AgentAnalysisSchema = z.strictObject({
  ticker: z.string(),
  decision: z.string().nullable(),
  confidence: z.number().int().nullable(),
  decision_status: z.strictObject({
    status: SectionStatusSchema.nullable(),
    reason: z.string().nullable(),
  }).nullable(),
  fundamental_summary: z.string(),
  technical_summary: z.string(),
  risk_summary: z.string(),
  bull_case: z.string(),
  bear_case: z.string(),
  portfolio_manager_reasoning: z.string(),
  metrics_used: z.record(z.string(), z.unknown()),
  generated_at: z.string(),
  from_cache: z.boolean(),
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
    expect(fixture.pricingStatus).toBe('OK');
    // null when the portfolio has no positions; a stale price is a price, so pricingComplete stays true.
    expect(PortfolioSummarySchema.parse({ ...fixture, pricingStatus: null }).pricingStatus).toBeNull();
    expect(PortfolioSummarySchema.parse({ ...fixture, pricingStatus: 'STALE' }).pricingComplete).toBe(true);
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
    expect(fixture[0].priceStatus).toBe('OK');
    expect(fixture[0].priceAsOf).toBe('2026-10-20T20:00:00Z');
    // A position without any price carries a status and no time.
    expect(EnrichedPositionsSchema.parse([{ ...fixture[0], currentPrice: null, priceAsOf: null, priceStatus: 'EMPTY' }])[0]
      .priceAsOf).toBeNull();
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

  it('agent analysis fixtures match the schema, OK and FAILED with null decision and confidence', () => {
    const ok = AgentAnalysisSchema.parse(loadContractFixture('agent-analysis.json'));
    const failed = AgentAnalysisSchema.parse(loadContractFixture('agent-analysis-failed.json'));

    expect(ok).toMatchObject({ decision: 'BUY', confidence: 85, decision_status: { status: 'OK', reason: null } });
    expect(failed.decision).toBeNull();
    expect(failed.confidence).toBeNull();
    expect(failed.decision_status).toEqual({ status: 'FAILED', reason: 'pm_response_not_json_default_hold' });
  });

  it('smart report fixture matches the schema, including section status', () => {
    const fixture = SmartReportSchema.parse(loadContractFixture('smart-report.json'));

    expect(fixture.breakdown.valuationScore).toBeNull();
    expect(fixture.sectionStatus?.overall).toBe('EMPTY');
    expect(fixture.sectionStatus?.components.valuation_score.reason).toBe('valuation_component_unavailable');
  });

  it('journal trade fixture matches the schema, an open STALE trade with its price time', () => {
    const fixture = JournalTradeSchema.parse(loadContractFixture('journal-trade.json'));

    expect(fixture.status).toBe('OPEN');
    expect(fixture.priceStatus).toBe('STALE');
    expect(fixture.priceAsOf).toBe('2026-10-20T20:00:00Z');
    expect(JournalTradeSchema.parse({ ...fixture, status: 'CLOSED', priceAsOf: null, priceStatus: null }).priceStatus)
      .toBeNull();
  });
});
