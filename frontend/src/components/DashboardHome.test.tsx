import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { CalendarEvent, News, Portfolio, Stock } from '../types';
import { server } from '../test/server';
import DashboardHome from './DashboardHome';

const API_BASE = 'http://localhost:8080/api/v1';

const stock = (symbol: string, price: number): Stock => ({
  symbol,
  name: `${symbol} Inc.`,
  sector: 'Technology',
  industry: 'Software',
  price,
  change: 0,
  changePercent: 0,
  open: price,
  high: price,
  low: price,
  close: price,
  volume: '1000',
  high52W: price,
  low52W: price,
  marketCap: null,
  pe: null,
  pb: null,
  debtEquity: null,
  roe: null,
  revenueGrowth: null,
  divYield: null,
  history: [],
  sparkline: [],
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
});

const portfolios: Portfolio[] = [
  { id: '1', name: 'ALFA', holdings: [{ symbol: 'AAPL', quantity: 2, costPrice: 100 }] },
  { id: '2', name: 'BETA', holdings: [{ symbol: 'MSFT', quantity: 1, costPrice: 50 }] },
];

const renderDashboard = () => render(
  <DashboardHome
    stocks={[stock('AAPL', 120), stock('MSFT', 55)]}
    portfolios={portfolios}
    activePortfolioId="1"
    onSelectPortfolioId={vi.fn()}
    onSelectStock={vi.fn()}
    onOpenTradingJournal={vi.fn()}
    onNavigateToNews={vi.fn()}
    news={[] as News[]}
    calendarEvents={[] as CalendarEvent[]}
  />,
);

const installPositionPerformanceHandler = () => {
  server.use(
    http.get(`${API_BASE}/portfolio/positions/performance`, () => HttpResponse.json([
      {
        symbol: 'AAPL',
        company: 'AAPL Inc.',
        addedDate: '2026-01-02',
        costPrice: 100,
        currentPrice: 120,
        marketValue: 240,
        weight: 80,
        dailyReturn: 1.25,
        weeklyReturn: -2,
        oneMonthReturn: 4,
        threeMonthReturn: 12,
        sixMonthReturn: 18,
        oneYearReturn: 30,
        totalReturn: 20,
      },
    ])),
  );
};

describe('DashboardHome portfolio return comparison', () => {
  it('loads comparison series, shows hover-synchronized values, and renders revised overview panels', async () => {
    const requests: Array<{ portfolioIds: string | null; benchmarks: string | null; period: string | null }> = [];

    server.use(
      http.get(`${API_BASE}/macro/snapshot`, () => HttpResponse.json({})),
      http.get(`${API_BASE}/portfolio/performance/comparison`, ({ request }) => {
        const url = new URL(request.url);
        requests.push({
          portfolioIds: url.searchParams.get('portfolioIds'),
          benchmarks: url.searchParams.get('benchmarks'),
          period: url.searchParams.get('period'),
        });
        return HttpResponse.json({
          period: url.searchParams.get('period') || '6M',
          series: [
            {
              id: '1',
              label: 'ALFA',
              type: 'PORTFOLIO',
              currency: 'USD',
              points: [
                { date: '2026-01-09', value: 200, returnPct: 0 },
                { date: '2026-07-09', value: 240, returnPct: 20 },
              ],
            },
            {
              id: '2',
              label: 'BETA',
              type: 'PORTFOLIO',
              currency: 'USD',
              points: [
                { date: '2026-01-09', value: 50, returnPct: 0 },
                { date: '2026-07-09', value: 55, returnPct: 10 },
              ],
            },
            {
              id: 'SP500',
              label: 'S&P 500',
              type: 'BENCHMARK',
              currency: null,
              points: [
                { date: '2026-01-09', value: 400, returnPct: 0 },
                { date: '2026-07-09', value: 420, returnPct: 5 },
              ],
            },
          ],
        });
      }),
    );
    installPositionPerformanceHandler();

    renderDashboard();

    await waitFor(() => expect(screen.getByText('ALFA: +20.00%')).toBeInTheDocument());
    const chart = screen.getByLabelText('Portfolio cumulative return comparison chart');
    expect(chart).toBeInTheDocument();
    expect(screen.queryByText('Time-Series Values')).not.toBeInTheDocument();
    expect(screen.getByText('Asset Allocation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Allocation' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('02 Jan 2026')).toBeInTheDocument());
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();

    vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 240,
      right: 600,
      bottom: 240,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.mouseMove(chart, { clientX: 600 });
    expect(screen.getAllByText('9 Jul').length).toBeGreaterThan(1);
    expect(screen.getByText(/USD 240\.00/)).toBeInTheDocument();
    expect(screen.getByText(/420\.00/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'BETA' }));

    await waitFor(() => {
      expect(requests.some((request) => request.portfolioIds === '1,2' && request.period === '6M')).toBe(true);
    });
    expect(screen.getAllByText('BETA').length).toBeGreaterThan(0);
  });

  it('updates benchmark query when a benchmark chip is toggled', async () => {
    const benchmarkQueries: Array<string | null> = [];

    server.use(
      http.get(`${API_BASE}/macro/snapshot`, () => HttpResponse.json({})),
      http.get(`${API_BASE}/portfolio/performance/comparison`, ({ request }) => {
        const url = new URL(request.url);
        benchmarkQueries.push(url.searchParams.get('benchmarks'));
        return HttpResponse.json({ period: '6M', series: [] });
      }),
    );
    installPositionPerformanceHandler();

    renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: 'NASDAQ' }));

    await waitFor(() => {
      expect(benchmarkQueries).toContain('SP500,GOLD');
    });
  });
});