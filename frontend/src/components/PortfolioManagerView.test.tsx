import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Portfolio, Stock } from '../types';
import { server } from '../test/server';
import PortfolioManagerView from './PortfolioManagerView';

const API_BASE = 'http://localhost:8080/api/v1';
const apiUrl = (path: string) => `${API_BASE}${path}`;

const makeStock = (symbol: string, price: number): Stock => ({
  symbol,
  name: `${symbol} Incorporated`,
  sector: 'Technology',
  industry: 'Software',
  price,
  change: 0,
  changePercent: symbol === 'AAPL' ? 1.25 : -0.8,
  open: price,
  high: price,
  low: price,
  close: price,
  volume: '1M',
  high52W: price * 1.5,
  low52W: price * 0.5,
  marketCap: null,
  pe: null,
  pb: null,
  debtEquity: null,
  roe: null,
  revenueGrowth: null,
  divYield: null,
  history: Array.from({ length: 120 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    price: price + index * (symbol === 'AAPL' ? 0.9 : 0.35),
  })),
  sparkline: [],
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
});

const portfolio: Portfolio = {
  id: '1',
  name: 'Growth',
  holdings: [
    { symbol: 'AAPL', quantity: 2, costPrice: 100 },
    { symbol: 'MSFT', quantity: 1, costPrice: 120 },
  ],
};

const installPortfolioHandlers = () => {
  server.use(
    http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([
      {
        symbol: 'AAPL',
        company: 'Apple Inc.',
        addedDate: '2026-01-02',
        costPrice: 100,
        currentPrice: 210,
        marketValue: 420,
        weight: 72.41,
        dailyReturn: 1.25,
        weeklyReturn: 3.5,
        oneMonthReturn: 8.4,
        threeMonthReturn: 18.2,
        sixMonthReturn: 32.1,
        oneYearReturn: 45.6,
        totalReturn: 110,
      },
      {
        symbol: 'MSFT',
        company: 'Microsoft Corp.',
        addedDate: '2026-01-05',
        costPrice: 120,
        currentPrice: 160,
        marketValue: 160,
        weight: 27.59,
        dailyReturn: -0.8,
        weeklyReturn: 1.1,
        oneMonthReturn: 4.2,
        threeMonthReturn: 9.5,
        sixMonthReturn: 14.2,
        oneYearReturn: 20.4,
        totalReturn: 33.33,
      },
    ])),
    http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([
      {
        id: 10,
        portfolioId: 1,
        userId: 'test-user',
        symbol: 'AAPL',
        assetType: 'US_STOCK',
        action: 'BUY',
        quantity: 2,
        price: 100,
        currency: 'USD',
        fee: 1,
        fxRateToBase: 1,
        tradeDate: '2026-01-02T10:00:00Z',
        source: 'MANUAL',
        notes: 'Initial buy',
      },
      {
        id: 11,
        portfolioId: 1,
        userId: 'test-user',
        symbol: 'AAPL',
        assetType: 'US_STOCK',
        action: 'SELL',
        quantity: 1,
        price: 220,
        currency: 'USD',
        fee: 0,
        fxRateToBase: 1,
        tradeDate: '2026-02-05T10:00:00Z',
        source: 'MANUAL',
        notes: 'Trimmed position',
      },
    ])),
  );
};

const renderPortfolio = (
  targetPortfolio: Portfolio = portfolio,
  stocks: Stock[] = [makeStock('AAPL', 210), makeStock('MSFT', 160)],
  extraProps: Partial<Parameters<typeof PortfolioManagerView>[0]> = {},
) => render(
  <PortfolioManagerView
    stocks={stocks}
    portfolios={[targetPortfolio]}
    onUpdatePortfolios={vi.fn()}
    activePortfolioId={targetPortfolio.id}
    onSelectPortfolioId={vi.fn()}
    onExecuteTrade={vi.fn()}
    onOpenTradingJournal={vi.fn()}
    {...extraProps}
  />,
);

describe('PortfolioManagerView', () => {
  it('renders the active portfolio command surface without the old trading control center', async () => {
    installPortfolioHandlers();

    renderPortfolio();

    expect(screen.getByRole('heading', { name: 'Growth' })).toBeInTheDocument();
    expect(screen.getByText('Performance Analysis (USD)')).toBeInTheDocument();
    expect(screen.getByText('Asset Allocation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current Holdings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transaction History' })).toBeInTheDocument();
    expect(screen.queryByText('Trading & Portfolio Control Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Thematic Asset Allocation')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('$210.00')).toBeInTheDocument());
    expect(screen.getByText('Added Date')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0);
    expect(screen.getByText('+110.00%')).toBeInTheDocument();
  });

  it('opens monthly performance and shows active-portfolio transaction history', async () => {
    installPortfolioHandlers();
    const user = userEvent.setup();

    renderPortfolio();

    await user.click(screen.getByRole('button', { name: 'Monthly View' }));
    expect(screen.getByText('Monthly Performance')).toBeInTheDocument();
    expect(screen.getByText('Period Selection')).toBeInTheDocument();
    expect(screen.getByText('Monthly Return')).toBeInTheDocument();
    expect(screen.getByText('Total Return (Selected Range)')).toBeInTheDocument();

    const startMonth = screen.getByLabelText('Start Month') as HTMLSelectElement;
    const endMonth = screen.getByLabelText('End Month') as HTMLSelectElement;
    expect(startMonth.tagName).toBe('SELECT');
    expect(endMonth.tagName).toBe('SELECT');
    await user.selectOptions(startMonth, '2026-03');
    expect(Array.from(endMonth.options).map((option) => option.value)).not.toContain('2026-02');

    await user.click(screen.getByRole('button', { name: 'Transaction History' }));
    await waitFor(() => expect(screen.getByText('Initial buy')).toBeInTheDocument());
    expect(screen.getByText('Purchase Amount')).toBeInTheDocument();
    expect(screen.getByText('Average Cost')).toBeInTheDocument();
    expect(screen.getByText('Price at Transaction')).toBeInTheDocument();
    expect(screen.getByText('Trimmed position')).toBeInTheDocument();
  });

  it('enforces portfolio create and delete rules in the UI', async () => {
    server.use(
      http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([])),
    );
    const user = userEvent.setup();
    const emptyPortfolio: Portfolio = { id: '2', name: 'Empty', holdings: [] };
    const onCreatePortfolio = vi.fn().mockResolvedValue('3');
    const onDeletePortfolio = vi.fn().mockResolvedValue(undefined);
    const onSelectPortfolioId = vi.fn();

    renderPortfolio(emptyPortfolio, [], {
      portfolios: [portfolio, emptyPortfolio],
      activePortfolioId: emptyPortfolio.id,
      onCreatePortfolio,
      onDeletePortfolio,
      onSelectPortfolioId,
    });

    await user.click(screen.getByRole('button', { name: 'Create Portfolio' }));
    await user.type(screen.getByPlaceholderText('Growth, Income, Hedge...'), 'Income');
    const createButtons = screen.getAllByRole('button', { name: 'Create Portfolio' });
    await user.click(createButtons[createButtons.length - 1]);
    await waitFor(() => expect(onCreatePortfolio).toHaveBeenCalledWith('Income'));
    expect(onSelectPortfolioId).toHaveBeenCalledWith('3');

    await user.click(screen.getByRole('button', { name: 'Delete Portfolio' }));
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Portfolio' });
    await user.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => expect(onDeletePortfolio).toHaveBeenCalledWith('2'));
    expect(onSelectPortfolioId).toHaveBeenCalledWith('1');
  });

  it('prevents deleting a portfolio while it still has holdings', async () => {
    installPortfolioHandlers();
    const user = userEvent.setup();

    renderPortfolio(portfolio, [makeStock('AAPL', 210), makeStock('MSFT', 160)], {
      portfolios: [portfolio, { id: '2', name: 'Empty', holdings: [] }],
      activePortfolioId: portfolio.id,
    });

    await user.click(screen.getByRole('button', { name: 'Delete Portfolio' }));
    expect(screen.getByText('Sell or transfer all holdings before deleting this portfolio.')).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Portfolio' });
    expect(deleteButtons[deleteButtons.length - 1]).toBeDisabled();
  });
  it('does not fabricate allocation or holding rows for an empty portfolio', () => {
    server.use(
      http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([])),
    );

    renderPortfolio({ id: '1', name: 'Empty', holdings: [] }, [makeStock('AAPL', 210)]);

    expect(screen.getByText('No holdings are available for allocation analysis.')).toBeInTheDocument();
    expect(screen.getByText('No current holdings are available.')).toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });
});