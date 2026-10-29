import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../api/config';
import { server } from '../test/server';
import { redesignFixtureHandlers } from '../test/redesignHandlers';
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

  it('shows recent additions and decision notes from the API and undoes a transaction', async () => {
    let deleted = false;
    server.use(
      http.delete(`${API_BASE_URL}/portfolios/1/transactions/101`, () => { deleted = true; return new HttpResponse(null, { status: 204 }); }),
      ...redesignFixtureHandlers(),
    );
    const user = userEvent.setup({ delay: null });
    renderJournal();

    expect(await screen.findByText('Test notu')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'HS1 işlemini geri al' }));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it('shows an unavailable state, not numbers, when the API has no data', async () => {
    renderJournal();
    expect(await screen.findAllByText('Veri alınamadı')).not.toHaveLength(0);
  });

  it('previews pasted text with per-row codes and saves only valid rows', async () => {
    let bulkRows: unknown[] | null = null;
    server.use(
      http.post(`${API_BASE_URL}/transactions/bulk`, async ({ request }) => {
        bulkRows = ((await request.json()) as { rows: unknown[] }).rows;
        return HttpResponse.json({ batchId: 'b1', created: 1, skipped: 0 }, { status: 201 });
      }),
      ...redesignFixtureHandlers(),
    );
    const user = userEvent.setup({ delay: null });
    renderJournal();

    await user.click(screen.getByRole('button', { name: 'Toplu metin' }));
    await user.type(screen.getByLabelText(/İşlemler \(Excel/), 'AL HS1 10 60{Enter}AL ZZZ 1 1');
    await user.click(screen.getByRole('button', { name: 'Önizle' }));

    expect(await screen.findByTestId('row-code-2')).toHaveTextContent('Sembol bulunamadı');
    await user.click(screen.getByRole('button', { name: '1 geçerli satırı kaydet' }));
    await waitFor(() => expect(bulkRows).toHaveLength(1));
    expect(await screen.findByText(/1 işlem kaydedildi/)).toBeInTheDocument();
  });

  it('explains that pasted-text parsing is not ready and keeps the quick form usable', async () => {
    const user = userEvent.setup({ delay: null });
    renderJournal();

    await user.click(screen.getByRole('button', { name: 'Toplu metin' }));
    await user.type(screen.getByLabelText(/İşlemler \(Excel/), 'AL HS1 10 60');
    await user.click(screen.getByRole('button', { name: 'Önizle' }));
    expect(await screen.findByText(/henüz hazır değil/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hızlı form' }));
    expect(screen.getByLabelText('Alış fiyatı')).toBeInTheDocument();
  });

  it('stages a CSV, edits the mapping, commits and undoes the import', async () => {
    server.use(...redesignFixtureHandlers());
    const user = userEvent.setup({ delay: null });
    renderJournal();

    await user.click(screen.getByRole('button', { name: 'CSV / ekstre' }));
    await user.upload(screen.getByLabelText('CSV veya aracı kurum ekstresi'), new File(['a,b'], 'test.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: 'Önizleme oluştur' }));

    expect(await screen.findByLabelText('Not')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Not'), 'NOTE');
    await user.click(screen.getByRole('button', { name: 'Eşlemeyi uygula' }));
    await user.click(await screen.findByRole('button', { name: 'İçe aktar' }));
    expect(await screen.findByText(/1 işlem içe aktarıldı/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Geri al' }));
    expect(await screen.findByText(/1 işlem geri alındı/)).toBeInTheDocument();
  });
});
