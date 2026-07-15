import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPortfolioTransaction } from '../api/client';
import type { Stock, Portfolio } from '../types';
import { useJournalTrades } from '../hooks/useJournalTrades';
import TradingJournalView from './TradingJournalView';

vi.mock('../hooks/useJournalTrades', () => ({
  useJournalTrades: vi.fn(),
}));

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    createPortfolioTransaction: vi.fn(),
  };
});

const mockedUseJournalTrades = vi.mocked(useJournalTrades);
const mockedCreatePortfolioTransaction = vi.mocked(createPortfolioTransaction);

const makeStock = (symbol: string, price: number): Stock => ({
  symbol,
  name: `${symbol} Incorporated`,
  sector: 'Technology',
  industry: 'Software',
  price,
  change: 0,
  changePercent: 1.25,
  open: price,
  high: price + 2,
  low: price - 2,
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
  history: [],
  sparkline: [],
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
});

const portfolios: Portfolio[] = [
  { id: '7', name: 'Growth', holdings: [{ symbol: 'AAPL', quantity: 2, costPrice: 100 }] },
];

const defaultHookState = {
  trades: [],
  stats: { totalTrades: 0, openTrades: 0, closedTrades: 0, winRate: 0, avgReturn: 0 },
  total: 0,
  loading: false,
  error: null,
  addTrade: vi.fn(),
  editTrade: vi.fn(),
  removeTrade: vi.fn(),
  reload: vi.fn(),
};

const renderJournal = (extraProps: Partial<Parameters<typeof TradingJournalView>[0]> = {}) => render(
  <TradingJournalView
    stocks={[makeStock('AAPL', 200), makeStock('MSFT', 320)]}
    portfolios={portfolios}
    onOpenTradeModal={vi.fn()}
    {...extraProps}
  />,
);

describe('TradingJournalView', () => {
  beforeEach(() => {
    mockedUseJournalTrades.mockReturnValue({ ...defaultHookState, addTrade: vi.fn(), reload: vi.fn() });
    mockedCreatePortfolioTransaction.mockResolvedValue({
      id: 12,
      portfolioId: 7,
      userId: 'test-user',
      symbol: 'AAPL',
      assetType: 'US_STOCK',
      action: 'BUY',
      quantity: 5,
      price: 200,
      currency: 'USD',
      fee: 2,
      fxRateToBase: 1,
      tradeDate: '2026-07-09',
      source: 'MANUAL',
      notes: 'Breakout setup',
    });
  });

  it('calculates quantity from amount and saves a linked portfolio transaction', async () => {
    const user = userEvent.setup();
    renderJournal();

    await user.clear(screen.getByLabelText('Trade Amount'));
    await user.type(screen.getByLabelText('Trade Amount'), '1000');
    await user.clear(screen.getByLabelText('Purchase Price'));
    await user.type(screen.getByLabelText('Purchase Price'), '200');
    await user.clear(screen.getByLabelText('Commission'));
    await user.type(screen.getByLabelText('Commission'), '2');
    await user.type(screen.getByLabelText('Description'), 'Breakout setup');
    await user.click(screen.getByRole('button', { name: 'Save to Portfolio Ledger' }));

    await waitFor(() => expect(mockedCreatePortfolioTransaction).toHaveBeenCalledWith(7, expect.objectContaining({
      symbol: 'AAPL',
      action: 'BUY',
      quantity: 5,
      price: 200,
      fee: 2,
      source: 'MANUAL',
      notes: 'Breakout setup',
      journalNotes: 'Breakout setup',
    })));
  });

  it('accepts a free typed symbol in journal-only mode', async () => {
    const addTrade = vi.fn().mockResolvedValue({ id: 1 });
    const reload = vi.fn();
    mockedUseJournalTrades.mockReturnValue({ ...defaultHookState, addTrade, reload });
    const user = userEvent.setup();
    renderJournal({ portfolios: [] });

    await user.clear(screen.getByLabelText('Symbol'));
    await user.type(screen.getByLabelText('Symbol'), 'xyz');
    await user.clear(screen.getByLabelText('Trade Amount'));
    await user.type(screen.getByLabelText('Trade Amount'), '500');
    await user.clear(screen.getByLabelText('Purchase Price'));
    await user.type(screen.getByLabelText('Purchase Price'), '50');
    await user.click(screen.getByRole('button', { name: 'Save Journal Trade' }));

    await waitFor(() => expect(addTrade).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'XYZ',
      type: 'BUY',
      quantity: 10,
      purchasePrice: 50,
      status: 'OPEN',
      portfolioId: undefined,
    })));
    expect(mockedCreatePortfolioTransaction).not.toHaveBeenCalled();
  });
});
