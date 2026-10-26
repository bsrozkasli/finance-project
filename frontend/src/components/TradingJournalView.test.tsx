import { render, screen, waitFor, within } from '@testing-library/react';
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
    const user = userEvent.setup({ delay: null });
    renderJournal();

    await user.clear(screen.getByLabelText('İşlem tutarı'));
    await user.type(screen.getByLabelText('İşlem tutarı'), '1000');
    await user.clear(screen.getByLabelText('Alış fiyatı'));
    await user.type(screen.getByLabelText('Alış fiyatı'), '200');
    await user.clear(screen.getByLabelText('Komisyon'));
    await user.type(screen.getByLabelText('Komisyon'), '2');
    await user.type(screen.getByLabelText('Açıklama'), 'Breakout setup');
    await user.click(screen.getByRole('button', { name: 'Portföy defterine kaydet' }));

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

  it('shows unknown profit and loss as unavailable instead of zero', () => {
    mockedUseJournalTrades.mockReturnValue({
      ...defaultHookState,
      trades: [{ id: 3, symbol: 'AAPL', type: 'BUY', quantity: 1, purchasePrice: 100, openedAt: '2026-07-01T10:00:00Z', status: 'OPEN' }],
      stats: { totalTrades: 1, openTrades: 1, closedTrades: 0, winRate: 0, avgReturn: null as unknown as number },
    });
    renderJournal();

    const row = screen.getByRole('row', { name: /AAPL/ });
    expect(row).not.toHaveTextContent('$0.00');
    expect(row).not.toHaveTextContent('0.00%');
    expect(row).toHaveTextContent('—');
    expect(row).toHaveTextContent('1 Tem 2026');
    expect(screen.getByText('Ort. getiri').parentElement).toHaveTextContent('—');
    expect(screen.getByRole('columnheader', { name: 'Kâr / zarar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AAPL işlemini sil' })).toBeInTheDocument();
  });

  describe('price staleness pill', () => {
    const formatExpected = (value: string) => new Intl.DateTimeFormat('tr-TR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

    const PRICE_AS_OF = '2026-07-15T13:45:00Z';
    const makeTrade = (overrides: Record<string, unknown>) => ({
      id: 9,
      symbol: 'AAPL',
      type: 'BUY' as const,
      quantity: 2,
      purchasePrice: 100,
      currentPrice: 110,
      pnl: 20,
      returnPct: 10,
      openedAt: '2026-07-01T10:00:00Z',
      status: 'OPEN' as const,
      ...overrides,
    });
    const renderWith = (trade: ReturnType<typeof makeTrade>) => {
      mockedUseJournalTrades.mockReturnValue({
        ...defaultHookState,
        trades: [trade],
        stats: { totalTrades: 1, openTrades: 1, closedTrades: 0, winRate: 0, avgReturn: 10 },
      });
      renderJournal();
      return screen.getByRole('row', { name: /AAPL/ });
    };

    it('shows "Eski fiyat" with the formatted priceAsOf for a STALE row and keeps the numbers', () => {
      const row = renderWith(makeTrade({ priceStatus: 'STALE', priceAsOf: PRICE_AS_OF }));
      expect(within(row).getByText('Eski fiyat')).toBeInTheDocument();
      expect(row).toHaveTextContent(formatExpected(PRICE_AS_OF));
      expect(row).toHaveTextContent('$20.00');
      expect(row).toHaveTextContent('10.00%');
      expect(within(row).queryByText('Fiyat yok')).not.toBeInTheDocument();
    });

    it('shows a dash instead of a wrong time when priceAsOf is invalid or missing', () => {
      const row = renderWith(makeTrade({ priceStatus: 'STALE', priceAsOf: 'not-a-date' }));
      const pill = within(row).getByText('Eski fiyat');
      expect(pill.parentElement).toHaveTextContent('Eski fiyat');
      expect(pill.parentElement).toHaveTextContent('—');
      expect(row).not.toHaveTextContent('Invalid');
    });

    it.each(['FAILED', 'EMPTY'])('shows "Fiyat yok" for %s', (priceStatus) => {
      const row = renderWith(makeTrade({ priceStatus, priceAsOf: null, currentPrice: null, pnl: null, returnPct: null }));
      expect(within(row).getByText('Fiyat yok')).toBeInTheDocument();
      expect(within(row).queryByText('Eski fiyat')).not.toBeInTheDocument();
    });

    it.each([
      ['OK', { priceStatus: 'OK', priceAsOf: PRICE_AS_OF }],
      ['null', { priceStatus: null, priceAsOf: null }],
      ['absent', {}],
    ])('shows no pill for %s status', (_label, extra) => {
      const row = renderWith(makeTrade(extra));
      expect(within(row).queryByText('Eski fiyat')).not.toBeInTheDocument();
      expect(within(row).queryByText('Fiyat yok')).not.toBeInTheDocument();
      expect(row).not.toHaveTextContent(formatExpected(PRICE_AS_OF));
    });

    it('shows no pill for a closed trade with null price fields', () => {
      const row = renderWith(makeTrade({ status: 'CLOSED', closedAt: '2026-07-10T10:00:00Z', priceStatus: null, priceAsOf: null }));
      expect(within(row).queryByText('Eski fiyat')).not.toBeInTheDocument();
      expect(within(row).queryByText('Fiyat yok')).not.toBeInTheDocument();
    });
  });

  it('accepts a free typed symbol in journal-only mode', async () => {
    const addTrade = vi.fn().mockResolvedValue({ id: 1 });
    const reload = vi.fn();
    mockedUseJournalTrades.mockReturnValue({ ...defaultHookState, addTrade, reload });
    const user = userEvent.setup({ delay: null });
    renderJournal({ portfolios: [] });

    await user.clear(screen.getByLabelText('Sembol'));
    await user.type(screen.getByLabelText('Sembol'), 'xyz');
    await user.clear(screen.getByLabelText('İşlem tutarı'));
    await user.type(screen.getByLabelText('İşlem tutarı'), '500');
    await user.clear(screen.getByLabelText('Alış fiyatı'));
    await user.type(screen.getByLabelText('Alış fiyatı'), '50');
    await user.click(screen.getByRole('button', { name: 'Günlüğe kaydet' }));

    await waitFor(() => expect(addTrade).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'XYZ',
      type: 'BUY',
      quantity: 10,
      purchasePrice: 50,
      currentPrice: undefined,
      status: 'OPEN',
      portfolioId: undefined,
    })));
    expect(mockedCreatePortfolioTransaction).not.toHaveBeenCalled();
  });
});
