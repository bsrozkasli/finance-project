import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { useAssets } from './useAssets';
import { useAssetPrice } from './useAssetPrice';
import { useInvestmentPortfolio } from './useInvestmentPortfolio';
import { useJournalTrades } from './useJournalTrades';
import { useLivePrice } from './useLivePrice';
import { useNewsFilters } from './useNewsFilters';
import { useNotifications } from './useNotifications';
import { useSparkline } from './useSparkline';
import { useTechnicalAnalysis } from './useTechnicalAnalysis';
import { useWatchlistResearch } from './useWatchlistResearch';
import { useWatchlists } from './useWatchlists';

const API_BASE = 'http://localhost:8080/api/v1';
const apiUrl = (path: string) => `${API_BASE}${path}`;

const asset = { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' };
const msft = { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK' };
const priceBars = [
  { assetId: 'AAPL', open: 98, high: 102, low: 97, close: 100, volume: 1000, timestamp: '2026-07-08T20:00:00Z' },
  { assetId: 'AAPL', open: 101, high: 112, low: 100, close: 110, volume: 1200, timestamp: '2026-07-09T20:00:00Z' },
];
const journalTrade = {
  id: 1,
  symbol: 'AAPL',
  type: 'BUY' as const,
  quantity: 2,
  purchasePrice: 100,
  openedAt: '2026-07-09',
  status: 'OPEN' as const,
};
const portfolio = { id: 10, userId: 'local', name: 'Default', baseCurrency: 'USD', defaultPortfolio: true };
const transaction = {
  id: 20,
  portfolioId: 10,
  userId: 'local',
  symbol: 'AAPL',
  assetType: 'US_STOCK' as const,
  action: 'BUY' as const,
  quantity: 2,
  price: 100,
  currency: 'USD',
  fee: 0,
  fxRateToBase: 1,
  tradeDate: '2026-07-09',
  source: 'MANUAL' as const,
};
const holding = { portfolioId: 10, symbol: 'AAPL', assetType: 'US_STOCK' as const, quantity: 2, averageCost: 100, costBasis: 200, realizedPnl: 0, currency: 'USD' };

const json = (path: string, body: unknown, status = 200) => http.get(apiUrl(path), () => HttpResponse.json(body, { status }));
const postJson = (path: string, body: unknown, status = 200) => http.post(apiUrl(path), () => HttpResponse.json(body, { status }));
const putJson = (path: string, body: unknown, status = 200) => http.put(apiUrl(path), () => HttpResponse.json(body, { status }));
const delNoContent = (path: string) => http.delete(apiUrl(path), () => new HttpResponse(null, { status: 204 }));
const failGet = (path: string, status = 500) => http.get(apiUrl(path), () => HttpResponse.json({ message: 'provider unavailable' }, { status }));

const waitUntilLoaded = async <T extends { loading: boolean }>(result: { current: T }) => {
  await waitFor(() => expect(result.current.loading).toBe(false));
};

describe('data hooks', () => {
  it('useAssets loads assets, deduplicates added assets, and removes an asset', async () => {
    server.use(
      json('/assets', [asset]),
      postJson('/assets/batch', [asset, msft]),
      delNoContent('/assets/AAPL'),
    );

    const { result } = renderHook(() => useAssets());
    await waitUntilLoaded(result);

    expect(result.current.assets).toEqual([asset]);

    await act(async () => {
      await result.current.addAssets(['AAPL', 'MSFT']);
    });

    expect(result.current.assets).toEqual([asset, msft]);

    await act(async () => {
      await result.current.removeAsset('AAPL');
    });

    expect(result.current.assets).toEqual([msft]);
    expect(result.current.error).toBeNull();
  });

  it('useAssets exposes backend load errors without fabricating assets', async () => {
    server.use(failGet('/assets'));

    const { result } = renderHook(() => useAssets());
    await waitUntilLoaded(result);

    expect(result.current.assets).toEqual([]);
    expect(result.current.error).toContain('500');
  });

  it('useAssetPrice loads price history and clears state when symbol is null', async () => {
    server.use(json('/prices/AAPL/history', priceBars));

    const { result, rerender } = renderHook(({ symbol }) => useAssetPrice(symbol), { initialProps: { symbol: 'AAPL' as string | null } });
    await waitUntilLoaded(result);

    expect(result.current.prices).toEqual(priceBars);
    expect(result.current.error).toBeNull();

    rerender({ symbol: null });

    await waitFor(() => expect(result.current.prices).toEqual([]));
    expect(result.current.error).toBeNull();
  });

  it('useLivePrice derives latest price and change from real bars', async () => {
    server.use(json('/prices/AAPL/history', priceBars));

    const { result } = renderHook(() => useLivePrice('AAPL'));
    await waitUntilLoaded(result);

    expect(result.current.data).toMatchObject({ price: 110, change: 10, changePct: 10, volume: 1200 });
    expect(result.current.error).toBeNull();
  });

  it('useSparkline keeps only the last fourteen closes and degrades to empty on failure', async () => {
    const bars = Array.from({ length: 16 }, (_, index) => ({
      assetId: 'AAPL',
      open: index,
      high: index,
      low: index,
      close: index,
      volume: 100,
      timestamp: `2026-07-${String(index + 1).padStart(2, '0')}T20:00:00Z`,
    }));
    server.use(json('/prices/AAPL/history', bars));

    const { result, rerender } = renderHook(({ symbol }) => useSparkline(symbol), { initialProps: { symbol: 'AAPL' as string | null } });
    await waitUntilLoaded(result);

    expect(result.current.points).toEqual(Array.from({ length: 14 }, (_, index) => index + 2));

    rerender({ symbol: null });
    await waitFor(() => expect(result.current.points).toEqual([]));
  });

  it('useTechnicalAnalysis records 422 insufficient-candle errors as unavailable data', async () => {
    server.use(failGet('/technical/AAPL', 422));

    const { result } = renderHook(() => useTechnicalAnalysis('AAPL'));
    await waitUntilLoaded(result);

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('422');
  });

  it('useJournalTrades loads trades and stats, then mutates local state', async () => {
    const updatedTrade = { ...journalTrade, quantity: 3 };
    server.use(
      json('/journal/trades', { content: [journalTrade], totalElements: 1, totalPages: 1, number: 0 }),
      json('/journal/trades/stats', { totalTrades: 1, openTrades: 1, closedTrades: 0, winRate: 0, avgReturn: 0 }),
      postJson('/journal/trades', { ...journalTrade, id: 2, symbol: 'MSFT' }),
      putJson('/journal/trades/1', updatedTrade),
      delNoContent('/journal/trades/2'),
    );

    const { result } = renderHook(() => useJournalTrades());
    await waitUntilLoaded(result);

    expect(result.current.trades).toEqual([journalTrade]);
    expect(result.current.total).toBe(1);
    expect(result.current.stats?.totalTrades).toBe(1);

    await act(async () => {
      await result.current.addTrade({ symbol: 'MSFT', type: 'BUY', quantity: 1, purchasePrice: 50, openedAt: '2026-07-09' });
    });
    expect(result.current.trades[0].symbol).toBe('MSFT');
    expect(result.current.total).toBe(2);

    await act(async () => {
      await result.current.editTrade(1, { symbol: 'AAPL', type: 'BUY', quantity: 3, purchasePrice: 100, openedAt: '2026-07-09' });
    });
    expect(result.current.trades.find((trade) => trade.id === 1)?.quantity).toBe(3);

    await act(async () => {
      await result.current.removeTrade(2);
    });
    expect(result.current.trades.map((trade) => trade.id)).toEqual([1]);
    expect(result.current.total).toBe(1);
  });

  it('useWatchlists loads lists and applies create/add/remove mutations', async () => {
    const emptyList = { id: 1, name: 'Core', symbols: [], createdAt: '2026-07-09T09:00:00Z' };
    const listWithSymbol = { ...emptyList, symbols: ['AAPL'] };
    server.use(
      json('/watchlists', [emptyList]),
      postJson('/watchlists', { id: 2, name: 'Growth', symbols: [], createdAt: '2026-07-09T09:00:00Z' }),
      postJson('/watchlists/1/symbols', listWithSymbol),
      delNoContent('/watchlists/1/symbols/AAPL'),
      delNoContent('/watchlists/2'),
    );

    const { result } = renderHook(() => useWatchlists());
    await waitUntilLoaded(result);

    expect(result.current.watchlists).toEqual([emptyList]);

    await act(async () => {
      await result.current.createList('Growth');
    });
    expect(result.current.watchlists.map((watchlist) => watchlist.name)).toEqual(['Core', 'Growth']);

    await act(async () => {
      await result.current.addSymbol(1, 'AAPL');
    });
    expect(result.current.watchlists.find((watchlist) => watchlist.id === 1)?.symbols).toEqual(['AAPL']);

    await act(async () => {
      await result.current.removeSymbol(1, 'AAPL');
      await result.current.removeList(2);
    });
    expect(result.current.watchlists).toEqual([emptyList]);
  });

  it('useInvestmentPortfolio resolves the default portfolio and loads related slices', async () => {
    server.use(
      json('/portfolios', [portfolio]),
      json('/portfolios/10/holdings', [holding]),
      json('/portfolios/10/transactions', [transaction]),
      json('/portfolio/summary', { totalValue: 200, cashBalance: 0, dailyPnL: 1, dailyPnLPercent: 0.5, totalPnL: 10, totalReturn: 5 }),
      json('/portfolio/performance', { period: '1M', series: [{ date: '2026-07-09', portfolioValue: 200 }] }),
      json('/portfolio/allocation', { bySector: [], byAsset: [], byCountry: [] }),
      json('/portfolio/positions/enriched', []),
      postJson('/portfolios', { ...portfolio, id: 11, name: 'Growth', defaultPortfolio: false }),
      json('/portfolios/11/holdings', []),
      json('/portfolios/11/transactions', []),
    );

    const { result } = renderHook(() => useInvestmentPortfolio(null));
    await waitUntilLoaded(result);

    expect(result.current.selectedPortfolioId).toBe(10);
    expect(result.current.selectedPortfolio?.name).toBe('Default');
    expect(result.current.holdings).toEqual([holding]);
    expect(result.current.transactions).toEqual([transaction]);
    expect(result.current.summary?.totalValue).toBe(200);

    await act(async () => {
      await result.current.createPortfolio({ name: 'Growth', baseCurrency: 'USD' });
    });
    expect(result.current.selectedPortfolioId).toBe(11);
    expect(result.current.portfolios[0].name).toBe('Growth');
  });

  it('useNotifications loads unread count, marks all as read, and refreshes on interval', async () => {
    let callCount = 0;
    server.use(
      http.get(apiUrl('/notifications'), () => {
        callCount += 1;
        return HttpResponse.json([
          { id: 1, symbol: 'AAPL', score: 90, message: 'Signal', createdAt: '2026-07-09T09:00:00Z', read: callCount > 1 },
        ]);
      }),
      http.post(apiUrl('/notifications/read-all'), () => new HttpResponse(null, { status: 204 })),
    );

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await act(async () => {
      await result.current.markAllAsRead();
    });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((notification) => notification.read)).toBe(true);

    await act(async () => {
      await result.current.refresh();
    });
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('useWatchlistResearch degrades partial provider failures without fake values', async () => {
    server.use(
      json('/fundamentals/AAPL', { symbol: 'AAPL', revenue: [], netIncome: [], eps: [], freeCashFlow: [] }),
      failGet('/fundamentals/AAPL/ratios'),
      json('/prices/AAPL/history', priceBars),
    );

    const { result } = renderHook(() => useWatchlistResearch('AAPL'));
    await waitUntilLoaded(result);

    expect(result.current.data.fundamentals?.symbol).toBe('AAPL');
    expect(result.current.data.ratios).toBeNull();
    expect(result.current.data.fiveDay).toEqual(priceBars);
    expect(result.current.data.threeMonth).toEqual(priceBars);
    expect(result.current.data.oneYear).toEqual(priceBars);
    expect(result.current.error).toBeNull();
  });
});

describe('route state hooks', () => {
  it('useNewsFilters reads query params and writes normalized filters', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/news?category=AI&sentiment=BULLISH&priority=HIGH&time=TODAY&symbol=aapl&page=2']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useNewsFilters('msft'), { wrapper });

    expect(result.current.filters).toMatchObject({
      category: 'AI',
      sentiment: 'BULLISH',
      priority: 'HIGH',
      time: 'TODAY',
      symbol: 'AAPL',
      page: 2,
    });

    act(() => {
      result.current.setFilters({ category: 'ALL', symbol: ' nvda ', page: 0 });
    });

    await waitFor(() => expect(result.current.filters).toMatchObject({ category: 'ALL', symbol: 'NVDA', page: 0 }));
  });
});
