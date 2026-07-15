import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WatchlistResearchSnapshot } from '../api/client';
import type { Stock, Watchlist } from '../types';
import { useWatchlistResearchSnapshot } from '../hooks/useWatchlistResearchSnapshot';
import WatchlistsView from './WatchlistsView';

vi.mock('../hooks/useWatchlistResearchSnapshot', () => ({
  useWatchlistResearchSnapshot: vi.fn(),
}));

const mockedUseWatchlistResearchSnapshot = vi.mocked(useWatchlistResearchSnapshot);

const makeStock = (symbol: string, price: number, changePercent = 1.2): Stock => ({
  symbol,
  name: `${symbol} Incorporated`,
  sector: 'Technology',
  industry: 'Software',
  price,
  change: price * (changePercent / 100),
  changePercent,
  open: price - 1,
  high: price + 2,
  low: price - 3,
  close: price,
  volume: '1.2M',
  high52W: price * 1.4,
  low52W: price * 0.7,
  marketCap: null,
  pe: null,
  pb: null,
  debtEquity: 0.42,
  roe: 0.22,
  revenueGrowth: null,
  divYield: null,
  history: [],
  sparkline: [],
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
});

const watchlists: Watchlist[] = [
  { id: '1', name: 'Core Growth', symbols: ['AAPL', 'MSFT'] },
];

const snapshot: WatchlistResearchSnapshot = {
  watchlistId: 1,
  watchlistName: 'Core Growth',
  totalSymbols: 2,
  limit: 50,
  offset: 0,
  requestedSymbols: ['AAPL', 'MSFT'],
  generatedAt: '2026-07-09T09:00:00.000Z',
  policy: {
    maxLimit: 50,
    providerConcurrencyLimit: 4,
    providerTimeoutMillis: 3500,
    partialFailureEnabled: true,
    staleWhileRevalidateEnabled: true,
  },
  rows: [
    {
      symbol: 'AAPL',
      overallStatus: 'OK',
      price: {
        status: 'OK',
        source: 'test-price',
        observedAt: '2026-07-09T09:00:00.000Z',
        message: null,
        data: { lastPrice: 210, open: 205, high: 212, low: 204, volume: 1500000, timestamp: '2026-07-09T09:00:00.000Z' },
      },
      technical: {
        status: 'OK',
        source: 'test-technical',
        observedAt: '2026-07-09T09:00:00.000Z',
        message: null,
        data: { rsi14: 62.4, macd: 1.2, macdSignal: 0.8, sma: 198, ema: 202, action: 'BUY', confidence: 0.74, timestamp: '2026-07-09T09:00:00.000Z' },
      },
      fundamentals: {
        status: 'OK',
        source: 'test-fundamentals',
        observedAt: '2026-07-09T09:00:00.000Z',
        message: null,
        data: {
          roe: 0.24,
          roic: 0.19,
          grossMargin: 0.45,
          operatingMargin: 0.3,
          netMargin: 0.22,
          debtToEquity: 0.38,
          revenue: 1000000,
          netIncome: 220000,
          operatingCashFlow: 300000,
          fiscalYear: '2025',
          currency: 'USD',
          calculatedAt: '2026-07-09T09:00:00.000Z',
        },
      },
      earnings: {
        status: 'OK',
        source: 'test-earnings',
        observedAt: '2026-07-09T09:00:00.000Z',
        message: null,
        data: { quarters: [{ period: 'Q2 2026', actual: 2.4, estimate: 2.2, surprise: 0.2, surprisePct: 0.09, beat: true }] },
      },
      institutional: {
        status: 'OK',
        source: 'test-quality',
        observedAt: '2026-07-09T09:00:00.000Z',
        message: null,
        data: { piotroskiFScore: 8, altmanZScore: 4.2, beneishMScore: -2.4, qualityComposite: 82.4, economicMoat: 'Wide', earningsQuality: 0.78 },
      },
    },
    {
      symbol: 'MSFT',
      overallStatus: 'STALE',
      price: {
        status: 'STALE',
        source: 'test-price',
        observedAt: '2026-07-09T08:45:00.000Z',
        message: 'Served stale price',
        data: { lastPrice: 320, open: 318, high: 322, low: 315, volume: 900000, timestamp: '2026-07-09T08:45:00.000Z' },
      },
      technical: { status: 'EMPTY', source: 'test-technical', observedAt: '2026-07-09T08:45:00.000Z', message: null, data: null },
      fundamentals: { status: 'EMPTY', source: 'test-fundamentals', observedAt: '2026-07-09T08:45:00.000Z', message: null, data: null },
      earnings: { status: 'EMPTY', source: 'test-earnings', observedAt: '2026-07-09T08:45:00.000Z', message: null, data: null },
      institutional: { status: 'EMPTY', source: 'test-quality', observedAt: '2026-07-09T08:45:00.000Z', message: null, data: null },
    },
  ],
};

const renderView = (extraProps: Partial<Parameters<typeof WatchlistsView>[0]> = {}) => render(
  <WatchlistsView
    stocks={[makeStock('AAPL', 210), makeStock('MSFT', 320, -0.4)]}
    watchlists={watchlists}
    onAddStockToWatchlist={vi.fn()}
    onAddWatchlist={vi.fn()}
    onOpenTradeModal={vi.fn()}
    onSelectStock={vi.fn()}
    {...extraProps}
  />,
);

describe('WatchlistsView', () => {
  beforeEach(() => {
    mockedUseWatchlistResearchSnapshot.mockReturnValue({
      snapshot,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it('renders a focused research workspace from the watchlist snapshot', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Watchlist Research' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Core Growth Coverage' })).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('AAPL')).toBeInTheDocument();
    expect(within(table).getByText('$210.00')).toBeInTheDocument();
    expect(within(table).getByText('62.4')).toBeInTheDocument();
    expect(screen.getByText('AAPL - AAPL Incorporated')).toBeInTheDocument();
  });

  it('filters snapshot rows and normalizes added symbols', async () => {
    const user = userEvent.setup();
    const onAddStockToWatchlist = vi.fn();
    renderView({ onAddStockToWatchlist });

    await user.type(screen.getByPlaceholderText('Search symbols'), 'msft');
    const table = screen.getByRole('table');
    expect(within(table).queryByText('AAPL')).not.toBeInTheDocument();
    expect(within(table).getByText('MSFT')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('AAPL, MSFT...'), 'nvda');
    await user.click(screen.getByRole('button', { name: 'Add symbol' }));

    expect(onAddStockToWatchlist).toHaveBeenCalledWith('1', 'NVDA');
  });
});
