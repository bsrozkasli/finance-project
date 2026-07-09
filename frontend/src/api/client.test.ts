import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  addAssetBatch,
  addJournalTrade,
  addPortfolioPosition,
  addSymbolToWatchlist,
  apiClient,
  checkPortfolioRebalance,
  createInvestmentPortfolio,
  createPortfolioTransaction,
  createWatchlist,
  deleteAsset,
  deleteInvestmentPortfolio,
  deleteJournalTrade,
  deletePortfolioPosition,
  deletePortfolioTransaction,
  deleteWatchlist,
  fetchAllNews,
  fetchAnalystRecommendations,
  fetchAssetPrice,
  fetchAssets,
  fetchBatchPriceHistory,
  fetchCompanyReport,
  fetchEarnings,
  fetchEconomicEvents,
  fetchEnrichedPositions,
  fetchFinancialRatios,
  fetchFundamentals,
  fetchInsiderActivity,
  fetchInstitutionalOwnership,
  fetchInvestmentPortfolios,
  fetchJournalStats,
  fetchJournalTrades,
  fetchMacroSnapshot,
  fetchNews,
  fetchPortfolioAllocation,
  fetchPortfolioHoldings,
  fetchPortfolioNews,
  fetchPortfolioPerformance,
  fetchPortfolioPositions,
  fetchPortfolioSummary,
  fetchPortfolioTransactions,
  fetchPriceHistory,
  fetchPriceTarget,
  fetchTechnicalAnalysis,
  fetchWatchlists,
  optimizePortfolio,
  removeSymbolFromWatchlist,
  updateInvestmentPortfolio,
  updateJournalTrade,
  updatePortfolioPosition,
} from './client';
import { server } from '../test/server';

const API_BASE = 'http://localhost:8080/api/v1';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequestAssertion = (request: Request) => void | Promise<void>;

const apiUrl = (path: string) => `${API_BASE}${path}`;

const respondJson = (method: Method, path: string, responseBody: unknown, assertRequest?: RequestAssertion) => {
  const resolver = async ({ request }: { request: Request }) => {
    await assertRequest?.(request);
    return HttpResponse.json(responseBody);
  };

  if (method === 'GET') return http.get(apiUrl(path), resolver);
  if (method === 'POST') return http.post(apiUrl(path), resolver);
  if (method === 'PUT') return http.put(apiUrl(path), resolver);
  return http.delete(apiUrl(path), resolver);
};

const respondNoContent = (method: Method, path: string, assertRequest?: RequestAssertion) => {
  const resolver = async ({ request }: { request: Request }) => {
    await assertRequest?.(request);
    return new HttpResponse(null, { status: 204 });
  };

  if (method === 'DELETE') return http.delete(apiUrl(path), resolver);
  if (method === 'POST') return http.post(apiUrl(path), resolver);
  if (method === 'PUT') return http.put(apiUrl(path), resolver);
  return http.get(apiUrl(path), resolver);
};

const expectQuery = (request: Request, expected: Record<string, string>) => {
  const url = new URL(request.url);
  expect(Object.fromEntries(url.searchParams.entries())).toEqual(expected);
};

const expectJsonBody = async (request: Request, expected: unknown) => {
  await expect(request.json()).resolves.toEqual(expected);
};

const AssetSchema = z.object({ symbol: z.string(), name: z.string(), type: z.string() });
const PriceHistorySchema = z.object({
  assetId: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  timestamp: z.string(),
});
const PagedJournalSchema = z.object({ content: z.array(z.unknown()), totalElements: z.number(), totalPages: z.number(), number: z.number() });

const asset = AssetSchema.parse({ symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' });
const price = PriceHistorySchema.parse({
  assetId: 'AAPL',
  open: 190,
  high: 195,
  low: 189,
  close: 193,
  volume: 53_120_000,
  timestamp: '2026-07-08T20:00:00Z',
});
const journalTrade = {
  id: 7,
  symbol: 'AAPL',
  type: 'BUY' as const,
  quantity: 2,
  purchasePrice: 190,
  openedAt: '2026-07-09',
  status: 'OPEN' as const,
};
const investmentPortfolio = {
  id: 3,
  userId: 'local',
  name: 'Growth',
  baseCurrency: 'USD',
  defaultPortfolio: false,
};

describe('api client contract', () => {
  it('uses only the Spring backend API base URL', () => {
    expect(apiClient.defaults.baseURL).toBe(API_BASE);
  });

  it('calls asset endpoints with the expected methods and bodies', async () => {
    server.use(
      respondJson('GET', '/assets', [asset]),
      respondJson('POST', '/assets/batch', [asset], (request) => expectJsonBody(request, { symbols: ['AAPL', 'MSFT'] })),
      respondNoContent('DELETE', '/assets/AAPL'),
    );

    await expect(fetchAssets()).resolves.toEqual([asset]);
    await expect(addAssetBatch(['AAPL', 'MSFT'])).resolves.toEqual([asset]);
    await expect(deleteAsset('AAPL')).resolves.toBeUndefined();
  });

  it('calls price endpoints with interval/range query contracts', async () => {
    server.use(
      respondJson('GET', '/prices/AAPL/latest', price),
      respondJson('GET', '/prices/AAPL/history', [price], (request) => expectQuery(request, { interval: '1d', range: '1mo' })),
      respondJson('POST', '/prices/batch-history', { AAPL: [price] }, (request) => expectJsonBody(request, { symbols: ['AAPL'], interval: '1d', range: '1y' })),
    );

    await expect(fetchAssetPrice('AAPL')).resolves.toEqual(price);
    await expect(fetchPriceHistory('AAPL', '1d', '1mo')).resolves.toEqual([price]);
    await expect(fetchBatchPriceHistory(['AAPL'], '1d', '1y')).resolves.toEqual({ AAPL: [price] });
  });

  it('calls analyst, technical, and report endpoints', async () => {
    const recommendation = { period: '2026-07', strongBuy: 1, buy: 2, hold: 3, sell: 0, strongSell: 0 };
    const priceTarget = { symbol: 'AAPL', targetHigh: 240, targetLow: 180, targetMean: 210 };
    const technical = { symbol: 'AAPL', rsi: 55, macd: 1.2 };
    const report = { symbol: 'AAPL', technical, recommendations: [recommendation], priceTarget, recentNews: [] };

    server.use(
      respondJson('GET', '/analyst/AAPL/recommendations', [recommendation]),
      respondJson('GET', '/analyst/AAPL/price-target', priceTarget),
      respondJson('GET', '/technical/AAPL', technical, (request) => expectQuery(request, { interval: '1d', range: '3mo' })),
      respondJson('GET', '/reports/company/AAPL', report),
    );

    await expect(fetchAnalystRecommendations('AAPL')).resolves.toEqual([recommendation]);
    await expect(fetchPriceTarget('AAPL')).resolves.toEqual(priceTarget);
    await expect(fetchTechnicalAnalysis('AAPL', '1d', '3mo')).resolves.toEqual(technical);
    await expect(fetchCompanyReport('AAPL')).resolves.toEqual(report);
  });

  it('calls portfolio position and dashboard endpoints', async () => {
    const positionRequest = { symbol: 'AAPL', quantity: 2, avgCostPrice: 190, openedAt: '2026-07-09', notes: 'entry' };
    const position = { id: 11, ...positionRequest };
    const summary = { totalValue: 1000, cashBalance: 50, dailyPnL: 5, dailyPnLPercent: 0.5, totalPnL: 100, totalReturn: 10 };
    const performance = { period: '1M', series: [{ date: '2026-07-09', portfolioValue: 1000, benchmarkValue: 990 }] };
    const allocation = { bySector: [], byAsset: [], byCountry: [] };
    const enriched = { symbol: 'AAPL', company: 'Apple Inc.', shares: 2, avgCost: 190, currentPrice: 193, costBasis: 380, marketValue: 386, allocation: 50, dailyReturn: 1, totalReturn: 2, unrealizedPnL: 6 };

    server.use(
      respondJson('GET', '/portfolio/positions', [position]),
      respondJson('POST', '/portfolio/positions', position, (request) => expectJsonBody(request, positionRequest)),
      respondJson('PUT', '/portfolio/positions/11', position, (request) => expectJsonBody(request, positionRequest)),
      respondNoContent('DELETE', '/portfolio/positions/11'),
      respondJson('GET', '/portfolio/summary', summary),
      respondJson('GET', '/portfolio/performance', performance, (request) => expectQuery(request, { period: '1M', benchmark: 'SPY' })),
      respondJson('GET', '/portfolio/allocation', allocation),
      respondJson('GET', '/portfolio/positions/enriched', [enriched]),
    );

    await expect(fetchPortfolioPositions()).resolves.toEqual([position]);
    await expect(addPortfolioPosition(positionRequest)).resolves.toEqual(position);
    await expect(updatePortfolioPosition(11, positionRequest)).resolves.toEqual(position);
    await expect(deletePortfolioPosition(11)).resolves.toBeUndefined();
    await expect(fetchPortfolioSummary()).resolves.toEqual(summary);
    await expect(fetchPortfolioPerformance('1M', 'SPY')).resolves.toEqual(performance);
    await expect(fetchPortfolioAllocation()).resolves.toEqual(allocation);
    await expect(fetchEnrichedPositions()).resolves.toEqual([enriched]);
  });

  it('calls investment portfolio and ledger endpoints', async () => {
    const portfolioRequest = { name: 'Growth', baseCurrency: 'USD', description: 'Long-term', defaultPortfolio: false };
    const transactionRequest = { symbol: 'AAPL', action: 'BUY' as const, quantity: 2, price: 190, tradeDate: '2026-07-09', source: 'MANUAL' as const };
    const transaction = { id: 4, portfolioId: 3, userId: 'local', assetType: 'US_STOCK' as const, currency: 'USD', fee: 0, fxRateToBase: 1, ...transactionRequest };
    const holding = { portfolioId: 3, symbol: 'AAPL', assetType: 'US_STOCK' as const, quantity: 2, averageCost: 190, costBasis: 380, realizedPnl: 0, currency: 'USD' };

    server.use(
      respondJson('GET', '/portfolios', [investmentPortfolio]),
      respondJson('POST', '/portfolios', investmentPortfolio, (request) => expectJsonBody(request, portfolioRequest)),
      respondJson('PUT', '/portfolios/3', investmentPortfolio, (request) => expectJsonBody(request, portfolioRequest)),
      respondNoContent('DELETE', '/portfolios/3'),
      respondJson('GET', '/portfolios/3/transactions', [transaction]),
      respondJson('POST', '/portfolios/3/transactions', transaction, (request) => expectJsonBody(request, transactionRequest)),
      respondNoContent('DELETE', '/portfolios/3/transactions/4'),
      respondJson('GET', '/portfolios/3/holdings', [holding]),
    );

    await expect(fetchInvestmentPortfolios()).resolves.toEqual([investmentPortfolio]);
    await expect(createInvestmentPortfolio(portfolioRequest)).resolves.toEqual(investmentPortfolio);
    await expect(updateInvestmentPortfolio(3, portfolioRequest)).resolves.toEqual(investmentPortfolio);
    await expect(deleteInvestmentPortfolio(3)).resolves.toBeUndefined();
    await expect(fetchPortfolioTransactions(3)).resolves.toEqual([transaction]);
    await expect(createPortfolioTransaction(3, transactionRequest)).resolves.toEqual(transaction);
    await expect(deletePortfolioTransaction(3, 4)).resolves.toBeUndefined();
    await expect(fetchPortfolioHoldings(3)).resolves.toEqual([holding]);
  });

  it('calls portfolio optimization and rebalance endpoints', async () => {
    const optimizeRequest = { symbols: ['AAPL', 'MSFT'], objective: 'MAX_SHARPE' as const, risk_free_rate: 0.04, lookback_period: 252, max_weight: 0.8, min_weight: 0.05 };
    const optimizeResponse = { weights: { AAPL: 0.6, MSFT: 0.4 }, portfolioMetrics: { sharpe: 1.2 } };
    const rebalanceRequest = { target_weights: { AAPL: 0.5 }, current_weights: { AAPL: 0.7 }, threshold: 0.05 };
    const rebalanceResponse = { actions: [{ symbol: 'AAPL', deviation: 0.2, action: 'SELL' }] };

    server.use(
      respondJson('POST', '/portfolio/optimize', optimizeResponse, (request) => expectJsonBody(request, optimizeRequest)),
      respondJson('POST', '/portfolio/rebalance-check', rebalanceResponse, (request) => expectJsonBody(request, rebalanceRequest)),
    );

    await expect(optimizePortfolio(optimizeRequest)).resolves.toEqual(optimizeResponse);
    await expect(checkPortfolioRebalance(rebalanceRequest)).resolves.toEqual(rebalanceResponse);
  });

  it('calls journal endpoints with pagination and mutation contracts', async () => {
    const paged = PagedJournalSchema.parse({ content: [journalTrade], totalElements: 1, totalPages: 1, number: 0 });
    const journalRequest = { symbol: 'AAPL', type: 'BUY' as const, quantity: 2, purchasePrice: 190, openedAt: '2026-07-09', status: 'OPEN' as const };
    const stats = { totalTrades: 1, openTrades: 1, closedTrades: 0, winRate: 0, avgReturn: 0 };

    server.use(
      respondJson('GET', '/journal/trades', paged, (request) => expectQuery(request, { page: '0', size: '25', sort: 'openedAt,desc' })),
      respondJson('POST', '/journal/trades', journalTrade, (request) => expectJsonBody(request, journalRequest)),
      respondJson('PUT', '/journal/trades/7', journalTrade, (request) => expectJsonBody(request, journalRequest)),
      respondNoContent('DELETE', '/journal/trades/7'),
      respondJson('GET', '/journal/trades/stats', stats),
    );

    await expect(fetchJournalTrades(0, 25)).resolves.toEqual(paged);
    await expect(addJournalTrade(journalRequest)).resolves.toEqual(journalTrade);
    await expect(updateJournalTrade(7, journalRequest)).resolves.toEqual(journalTrade);
    await expect(deleteJournalTrade(7)).resolves.toBeUndefined();
    await expect(fetchJournalStats()).resolves.toEqual(stats);
  });

  it('calls watchlist endpoints with symbol mutation contracts', async () => {
    const watchlist = { id: 5, name: 'Core', symbols: ['AAPL'], createdAt: '2026-07-09T09:00:00Z' };

    server.use(
      respondJson('GET', '/watchlists', [watchlist]),
      respondJson('POST', '/watchlists', watchlist, (request) => expectJsonBody(request, { name: 'Core' })),
      respondJson('POST', '/watchlists/5/symbols', watchlist, (request) => expectJsonBody(request, { symbol: 'AAPL' })),
      respondNoContent('DELETE', '/watchlists/5/symbols/AAPL'),
      respondNoContent('DELETE', '/watchlists/5'),
    );

    await expect(fetchWatchlists()).resolves.toEqual([watchlist]);
    await expect(createWatchlist('Core')).resolves.toEqual(watchlist);
    await expect(addSymbolToWatchlist(5, 'AAPL')).resolves.toEqual(watchlist);
    await expect(removeSymbolFromWatchlist(5, 'AAPL')).resolves.toBeUndefined();
    await expect(deleteWatchlist(5)).resolves.toBeUndefined();
  });

  it('calls fundamentals and research-adjacent endpoints', async () => {
    const fundamentals = { symbol: 'AAPL', revenue: [], netIncome: [], eps: [], freeCashFlow: [], dividendYield: null };
    const ratios = { pe: 30, pb: 10 };
    const earnings = [{ quarter: '2026Q2', epsEstimate: 2.1, epsActual: 2.2 }];
    const insider = [{ name: 'Jane Doe', transactionType: 'BUY' as const, shares: 10, price: 190, value: 1900, date: '2026-07-09' }];
    const institutional = [{ institution: 'Fund Co', shares: 1000, percentHeld: 0.5 }];

    server.use(
      respondJson('GET', '/fundamentals/AAPL', fundamentals),
      respondJson('GET', '/fundamentals/AAPL/ratios', ratios),
      respondJson('GET', '/fundamentals/AAPL/earnings', earnings, (request) => expectQuery(request, { periods: '4' })),
      respondJson('GET', '/fundamentals/AAPL/insider', insider),
      respondJson('GET', '/fundamentals/AAPL/institutional', institutional),
    );

    await expect(fetchFundamentals('AAPL')).resolves.toEqual(fundamentals);
    await expect(fetchFinancialRatios('AAPL')).resolves.toEqual(ratios);
    await expect(fetchEarnings('AAPL', 4)).resolves.toEqual(earnings);
    await expect(fetchInsiderActivity('AAPL')).resolves.toEqual(insider);
    await expect(fetchInstitutionalOwnership('AAPL')).resolves.toEqual(institutional);
  });

  it('calls news, macro, and calendar endpoints with degradation-friendly shapes', async () => {
    const news = { id: 1, category: 'TECHNOLOGY' as const, datetime: 1_783_600_000, headline: 'AAPL update', image: '', related: 'AAPL', source: 'Wire', summary: '', url: 'https://example.test/news', relatedSymbols: ['AAPL'] };
    const allNews = { content: [news], totalElements: 1 };
    const macro = { fedFundsRate: null, cpiYoy: null, unemploymentRate: null, observedAt: null };
    const event = { event: 'CPI', date: '2026-07-09T12:30:00Z', country: 'US', impact: 'HIGH' };

    server.use(
      respondJson('GET', '/news/AAPL', [news]),
      respondJson('GET', '/news', allNews, (request) => expectQuery(request, { category: 'TECHNOLOGY', page: '2', size: '10', symbols: 'AAPL,MSFT' })),
      respondJson('GET', '/news/portfolio', [news]),
      respondJson('GET', '/macro/snapshot', macro),
      respondJson('GET', '/calendar/economic-events', [event]),
    );

    await expect(fetchNews('AAPL')).resolves.toEqual([news]);
    await expect(fetchAllNews('TECHNOLOGY', 2, 10, ['AAPL', 'MSFT'])).resolves.toEqual(allNews);
    await expect(fetchPortfolioNews()).resolves.toEqual([news]);
    await expect(fetchMacroSnapshot()).resolves.toEqual(macro);
    await expect(fetchEconomicEvents()).resolves.toEqual([event]);
  });
});
