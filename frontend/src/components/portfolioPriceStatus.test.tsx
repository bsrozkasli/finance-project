import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Portfolio, Stock } from '../types';
import type { PriceStatus } from '../api/types';
import { API_BASE_URL as API_BASE } from '../api/config';
import { server } from '../test/server';
import DashboardHome from './DashboardHome';
import PortfolioManagerView from './PortfolioManagerView';

const NOTE = 'Bazı fiyatlar doğrulanamadı; toplam eski fiyatlar içerebilir.';
const PRICE_AS_OF = '2026-07-15T13:45:00Z';
// A different timestamp elsewhere in the fixture so a wrong source cannot pass by accident.
const OTHER_TIME = '2026-03-02T08:10:00Z';

const formatExpected = (value: string) => new Intl.DateTimeFormat('tr-TR', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const stock = (symbol: string, price: number): Stock => ({
  symbol, name: `${symbol} Inc.`, sector: 'Technology', industry: 'Software', price, change: 0, changePercent: 0,
  open: price, high: price, low: price, close: price, volume: '1000', high52W: price, low52W: price, marketCap: null,
  pe: null, pb: null, debtEquity: null, roe: null, revenueGrowth: null, divYield: null, history: [], sparkline: [],
  news: [], technicals: null, analystRating: null, alerts: [],
});

const position = (symbol: string, extra: Record<string, unknown> = {}) => ({
  symbol, company: `${symbol} Corp.`, addedDate: OTHER_TIME, costPrice: 100, currentPrice: 210, marketValue: 420,
  weight: 100, dailyReturn: 1, weeklyReturn: 1, oneMonthReturn: 1, threeMonthReturn: 1, sixMonthReturn: 1,
  oneYearReturn: 1, totalReturn: 110, ...extra,
});

const useRows = (rows: unknown[]) => server.use(
  http.get(`${API_BASE}/portfolio/positions/performance`, () => HttpResponse.json(rows)),
  http.get(`${API_BASE}/portfolios/:portfolioId/transactions`, () => HttpResponse.json([])),
);

// NVDA is not a holding of the local portfolio, so the screen shows the API price as given.
const portfolio: Portfolio = { id: '1', name: 'Growth', holdings: [{ symbol: 'AAPL', quantity: 2, costPrice: 100 }] };

const renderManager = (pricingStatus?: PriceStatus | null) => render(
  <PortfolioManagerView
    stocks={[stock('AAPL', 210)]}
    portfolios={[portfolio]}
    onUpdatePortfolios={vi.fn()}
    activePortfolioId="1"
    onSelectPortfolioId={vi.fn()}
    onExecuteTrade={vi.fn()}
    onOpenTradingJournal={vi.fn()}
    pricingStatus={pricingStatus}
  />,
);

const renderDashboard = (pricingStatus?: PriceStatus | null) => render(
  <DashboardHome
    stocks={[stock('AAPL', 120)]}
    portfolios={[portfolio]}
    activePortfolioId="1"
    onSelectPortfolioId={vi.fn()}
    onSelectStock={vi.fn()}
    onOpenTradingJournal={vi.fn()}
    onNavigateToNews={vi.fn()}
    pricingStatus={pricingStatus}
    news={[]}
    calendarEvents={[]}
  />,
);

const rowOf = async (symbol: string) => {
  const cell = await screen.findAllByText(symbol);
  const row = cell.map((el) => el.closest('tr')).find((r): r is HTMLTableRowElement => r != null);
  if (!row) throw new Error(`no row for ${symbol}`);
  return row;
};

const screens = [
  ['PortfolioManagerView', renderManager],
  ['DashboardHome', renderDashboard],
] as const;

describe.each(screens)('%s price staleness', (_name, renderScreen) => {
  it('shows "Eski fiyat" and the exact priceAsOf for a STALE row, numbers unchanged', async () => {
    useRows([position('NVDA', { priceStatus: 'STALE', priceAsOf: PRICE_AS_OF })]);
    renderScreen();
    const row = await rowOf('NVDA');
    expect(within(row).getByText('Eski fiyat')).toBeInTheDocument();
    expect(within(row).getByText('Eski fiyat').parentElement).toHaveTextContent(formatExpected(PRICE_AS_OF));
    expect(row).not.toHaveTextContent(formatExpected(OTHER_TIME));
    expect(row).toHaveTextContent('$210.00');
    expect(within(row).queryByText('Fiyat yok')).not.toBeInTheDocument();
  });

  it('shows a dash instead of a wrong time when priceAsOf is invalid', async () => {
    useRows([position('NVDA', { priceStatus: 'STALE', priceAsOf: 'not-a-date' })]);
    renderScreen();
    const row = await rowOf('NVDA');
    expect(within(row).getByText('Eski fiyat').parentElement).toHaveTextContent('—');
    expect(row).not.toHaveTextContent('Invalid');
  });

  it.each(['FAILED', 'EMPTY'])('shows "Fiyat yok" for %s', async (priceStatus) => {
    useRows([position('NVDA', { priceStatus, priceAsOf: null })]);
    renderScreen();
    const row = await rowOf('NVDA');
    expect(within(row).getByText('Fiyat yok')).toBeInTheDocument();
    expect(within(row).queryByText('Eski fiyat')).not.toBeInTheDocument();
  });

  it.each([
    ['OK', { priceStatus: 'OK', priceAsOf: PRICE_AS_OF }],
    ['null', { priceStatus: null, priceAsOf: null }],
    ['absent', {}],
  ])('shows nothing extra for %s', async (_label, extra) => {
    useRows([position('NVDA', extra)]);
    renderScreen();
    const row = await rowOf('NVDA');
    expect(within(row).queryByText('Eski fiyat')).not.toBeInTheDocument();
    expect(within(row).queryByText('Fiyat yok')).not.toBeInTheDocument();
    expect(row).not.toHaveTextContent(formatExpected(PRICE_AS_OF));
  });

  it.each(['STALE', 'FAILED'] as const)('shows one summary note for pricingStatus %s', async (status) => {
    useRows([position('NVDA')]);
    renderScreen(status);
    await rowOf('NVDA');
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
  });

  it.each([['OK', 'OK' as PriceStatus], ['EMPTY', 'EMPTY' as PriceStatus], ['null', null], ['absent', undefined]])(
    'shows no summary note for pricingStatus %s',
    async (_label, status) => {
      useRows([position('NVDA')]);
      renderScreen(status);
      await rowOf('NVDA');
      expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    },
  );
});

describe('DashboardHome live price', () => {
  it('shows no pill where the price comes from market data, even if the API row is STALE', async () => {
    useRows([position('AAPL', { weeklyReturn: 7.77, priceStatus: 'STALE', priceAsOf: PRICE_AS_OF })]);
    renderDashboard();
    // The API row has loaded once its distinctive weekly return is on screen.
    await waitFor(() => expect(screen.getByText(/7\.77%/)).toBeInTheDocument());
    const row = await rowOf('AAPL');
    expect(row).toHaveTextContent('$120.00');
    expect(screen.queryByText('Eski fiyat')).not.toBeInTheDocument();
  });
});
