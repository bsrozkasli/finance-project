import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../api/config';
import { server } from '../test/server';
import { redesignFixtureHandlers } from '../test/redesignHandlers';
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
    onRemoveStockFromWatchlist={vi.fn()}
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

    expect(screen.getByRole('heading', { name: 'İzleme listem' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Core Growth kapsamı' })).toBeInTheDocument();
    expect(screen.getByText('Sağlıklı')).toBeInTheDocument();
    expect(screen.getByText('Araştırma özeti')).toBeInTheDocument();
    expect(screen.getByText('Semboller')).toBeInTheDocument();
    expect(screen.getByText(/^Son gözlem /)).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('AAPL')).toBeInTheDocument();
    expect(within(table).getByText('$210.00')).toBeInTheDocument();
    expect(within(table).getByText('62.4')).toBeInTheDocument();
    expect(screen.getByText('AAPL - AAPL Incorporated')).toBeInTheDocument();
  });

  it('exposes the active watchlist selector by its visible label', () => {
    renderView();

    expect(screen.getByRole('combobox', { name: 'Aktif liste' })).toHaveDisplayValue('Core Growth');
  });

  it('filters snapshot rows and normalizes added symbols', async () => {
    const user = userEvent.setup();
    const onAddStockToWatchlist = vi.fn();
    renderView({ onAddStockToWatchlist });

    await user.type(screen.getByPlaceholderText('Sembol ara'), 'msft');
    const table = screen.getByRole('table');
    expect(within(table).queryByText('AAPL')).not.toBeInTheDocument();
    expect(within(table).getByText('MSFT')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('AAPL, MSFT...'), 'nvda');
    await user.click(screen.getByRole('button', { name: 'Sembol ekle' }));

    expect(onAddStockToWatchlist).toHaveBeenCalledWith('1', 'NVDA');
  });

  it('keeps a STALE price, its own timestamp, the stale pill and the message in the detail panel', async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByPlaceholderText('Sembol ara'), 'msft');

    expect(screen.getByText('MSFT - MSFT Incorporated')).toBeInTheDocument();
    expect(screen.getAllByText('$320.00').length).toBeGreaterThan(0);
    // The price's own time is shown apart from the observation time, so an old price never reads as current.
    expect(screen.getByText('Served stale price')).toBeInTheDocument();
    expect(screen.getAllByText('Eski veri').length).toBeGreaterThan(0);
  });

  // Same options as the component's formatter, so the expected string is time-zone independent.
  const formatLikeTheView = (value: string) => new Intl.DateTimeFormat('tr-TR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

  const PRICE_TIME = '2026-07-09T07:30:00.000Z';
  const REQUEST_TIME = '2026-07-09T09:00:00.000Z';

  const mockMsftPriceTimestamp = (timestamp: string | null) => {
    const base = snapshot.rows.find((row) => row.symbol === 'MSFT')!;
    mockedUseWatchlistResearchSnapshot.mockReturnValue({
      snapshot: {
        ...snapshot,
        rows: [{
          ...base,
          price: { ...base.price, observedAt: REQUEST_TIME, data: { ...base.price.data!, timestamp } },
        }],
      },
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  };

  it('shows the exact price time in the pill, apart from the request time', () => {
    mockMsftPriceTimestamp(PRICE_TIME);
    renderView();

    expect(formatLikeTheView(PRICE_TIME)).not.toEqual(formatLikeTheView(REQUEST_TIME));
    const pill = screen.getByText(/^Fiyat zamanı /);
    expect(pill).toHaveTextContent(`Fiyat zamanı ${formatLikeTheView(PRICE_TIME)}`);
    expect(pill.textContent).not.toContain(formatLikeTheView(REQUEST_TIME));
    expect(screen.getByText(`Son gözlem ${formatLikeTheView(REQUEST_TIME)}`)).toBeInTheDocument();
  });

  it('shows no price-time pill when the price has no timestamp', () => {
    mockMsftPriceTimestamp(null);
    renderView();

    expect(screen.queryByText(/^Fiyat zamanı /)).not.toBeInTheDocument();
    expect(screen.getByText(`Son gözlem ${formatLikeTheView(REQUEST_TIME)}`)).toBeInTheDocument();
  });

  it('shows a dash, never a wrong time, for an invalid price timestamp', () => {
    mockMsftPriceTimestamp('not-a-date');
    renderView();

    const pill = screen.getByText(/^Fiyat zamanı /);
    expect(pill).toHaveTextContent('Fiyat zamanı —');
    expect(pill.textContent).not.toContain(formatLikeTheView(REQUEST_TIME));
  });

  it('labels a STALE overall status "Eski veri" in the table row and the detail header', async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByPlaceholderText('Sembol ara'), 'msft');

    const row = within(screen.getByRole('table')).getByText('MSFT').closest('tr') as HTMLElement;
    expect(within(row).getAllByText('Eski veri').length).toBeGreaterThan(0);
    const header = screen.getByText('MSFT - MSFT Incorporated').closest('section') as HTMLElement;
    // Overall pill and the "Fiyat" source pill, both from the shared vocabulary.
    expect(within(header).getAllByText('Eski veri').length).toBeGreaterThanOrEqual(2);
  });

  it('removes a symbol and refreshes the research snapshot', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const onRemoveStockFromWatchlist = vi.fn().mockResolvedValue(undefined);
    mockedUseWatchlistResearchSnapshot.mockReturnValue({
      snapshot,
      loading: false,
      error: null,
      reload,
    });

    renderView({ onRemoveStockFromWatchlist });
    await user.click(screen.getByRole('button', { name: 'AAPL sembolünü listeden kaldır' }));

    expect(onRemoveStockFromWatchlist).toHaveBeenCalledWith('1', 'AAPL');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('keeps the symbol visible and reports a failed delete', async () => {
    const user = userEvent.setup();
    const onRemoveStockFromWatchlist = vi.fn().mockRejectedValue(new Error('delete failed'));
    renderView({ onRemoveStockFromWatchlist });

    await user.click(screen.getByRole('button', { name: 'AAPL sembolünü listeden kaldır' }));

    expect(screen.getByText('AAPL kaldırılamadı.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AAPL sembolünü listeden kaldır' })).toBeInTheDocument();
  });

  it('shows Veri alınamadı for the performance panel while the endpoint has no data', async () => {
    renderView();

    const panel = screen.getByRole('region', { name: 'Liste performansı' });
    expect(await within(panel).findByText('Veri alınamadı')).toBeInTheDocument();
    expect(within(panel).queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders averages, breadth, table and heatmap from /watchlists/{id}/performance', async () => {
    server.use(...redesignFixtureHandlers());
    const user = userEvent.setup();
    renderView();

    const panel = screen.getByRole('region', { name: 'Liste performansı' });
    const table = await within(panel).findByRole('table', { name: 'Liste getiri tablosu' });
    expect(within(table).getByText('HS1')).toBeInTheDocument();
    expect(within(table).getAllByText('+1.00%').length).toBeGreaterThan(0);
    expect(within(panel).getByText('1A en iyi')).toBeInTheDocument();
    expect(within(panel).getByRole('img', { name: 'HS1 3 aylık fiyat eğilimi' })).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Isı haritası' }));
    expect(within(panel).getByRole('list', { name: /Isı haritası/ })).toBeInTheDocument();
    expect(within(panel).queryByRole('table')).not.toBeInTheDocument();
  });

  it('renames a list and reorders symbols through PUT /watchlists/{id}', async () => {
    const bodies: unknown[] = [];
    server.use(http.put(`${API_BASE_URL}/watchlists/:id`, async ({ request }) => {
      bodies.push(await request.json());
      return new HttpResponse(null, { status: 200 });
    }));
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Yeniden adlandır' }));
    const input = screen.getByRole('textbox', { name: 'Yeni liste adı' });
    await user.clear(input);
    await user.type(input, 'Büyüme');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(bodies).toContainEqual({ name: 'Büyüme' }));
    expect(await screen.findByRole('heading', { name: 'Büyüme kapsamı' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'AAPL sembolünü aşağı taşı' }));
    await waitFor(() => expect(bodies).toContainEqual({ symbols: ['MSFT', 'AAPL'] }));
  });
});
