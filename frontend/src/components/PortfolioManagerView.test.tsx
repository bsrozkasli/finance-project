import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Portfolio, Stock } from '../types';
import { API_BASE_URL as API_BASE } from '../api/config';
import { deleteInvestmentPortfolio } from '../api/client';
import { server } from '../test/server';
import PortfolioManagerView from './PortfolioManagerView';

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

const installPortfolioHandlers = (secondSource = 'MANUAL') => {
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
        originLocator: 'manual:00000000-0000-4000-8000-000000000010',
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
        source: secondSource,
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
  it('marks the portfolio total unavailable when one holding has no price', async () => {
    installPortfolioHandlers();
    server.use(http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])));
    renderPortfolio(portfolio, [makeStock('AAPL', 210)]);
    expect(await screen.findByRole('status')).toHaveTextContent('1/2 pozisyonun fiyatı var');
    expect(screen.getByText('Güncel değer').parentElement).toHaveTextContent('-');
  });

  it('renders the active portfolio command surface without the old trading control center', async () => {
    installPortfolioHandlers();

    renderPortfolio();

    expect(screen.getByRole('heading', { name: 'Growth' })).toBeInTheDocument();
    expect(screen.getByText('Performans analizi (USD)')).toBeInTheDocument();
    expect(screen.getByText('Varlık dağılımı')).toBeInTheDocument();
    for (const mode of ['Günlük getiri', 'Toplam getiri', 'Ağırlık']) {
      expect(screen.getByRole('button', { name: mode })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Pozisyonlar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'İşlem geçmişi' })).toBeInTheDocument();
    expect(screen.queryByText('Trading & Portfolio Control Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Thematic Asset Allocation')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('$210.00')).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'Eklenme tarihi' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Haftalık' })).toBeInTheDocument();
    expect(screen.getAllByText('Toplam').length).toBeGreaterThan(0);
    expect(screen.getByText('+110.00%')).toBeInTheDocument();
  });

  it('opens monthly performance and shows active-portfolio transaction history', async () => {
    installPortfolioHandlers();
    const user = userEvent.setup();

    renderPortfolio();

    await user.click(screen.getByRole('button', { name: 'Aylık görünüm' }));
    expect(screen.getByText('Aylık performans')).toBeInTheDocument();
    expect(screen.getByText('Dönem seçimi')).toBeInTheDocument();
    expect(screen.getByText('Aylık getiri')).toBeInTheDocument();
    expect(screen.getByText('Toplam getiri (seçilen dönem)')).toBeInTheDocument();

    const startMonth = screen.getByLabelText('Başlangıç ayı') as HTMLSelectElement;
    const endMonth = screen.getByLabelText('Bitiş ayı') as HTMLSelectElement;
    expect(startMonth.tagName).toBe('SELECT');
    expect(endMonth.tagName).toBe('SELECT');
    await user.selectOptions(startMonth, '2026-03');
    expect(Array.from(endMonth.options).map((option) => option.value)).not.toContain('2026-02');

    await user.click(screen.getByRole('button', { name: 'İşlem geçmişi' }));
    await waitFor(() => expect(screen.getByText('Initial buy')).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'İşlem tutarı' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ortalama maliyet' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'İşlem fiyatı' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Kaynak' })).toBeInTheDocument();
    const manualRow = screen.getByText('Initial buy').closest('tr');
    expect(manualRow).not.toBeNull();
    expect(within(manualRow!).getByText('Elle')).toBeInTheDocument();
    expect(within(manualRow!).getByText('manual:00000000-0000-4000-8000-000000000010')).toBeInTheDocument();
    const missingLocatorRow = screen.getByText('Trimmed position').closest('tr');
    expect(missingLocatorRow).not.toBeNull();
    expect(within(missingLocatorRow!).getByText('Köken kaydı yok')).toBeInTheDocument();
    expect(screen.getByText('Trimmed position')).toBeInTheDocument();
    expect(screen.getAllByText('02 Oca 2026').length).toBeGreaterThan(0);
  });

  it.each([
    ['CSV', 'CSV'],
    ['BROKER', 'Kaynak bilinmiyor'],
  ])('shows %s transaction source as %s', async (source, label) => {
    installPortfolioHandlers(source);
    const user = userEvent.setup();
    renderPortfolio();

    await user.click(screen.getByRole('button', { name: 'İşlem geçmişi' }));
    const row = (await screen.findByText('Trimmed position')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText(label)).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Portföy oluştur' }));
    await user.type(screen.getByPlaceholderText('Büyüme, Gelir, Koruma…'), 'Income');
    const createButtons = screen.getAllByRole('button', { name: 'Portföy oluştur' });
    await user.click(createButtons[createButtons.length - 1]);
    await waitFor(() => expect(onCreatePortfolio).toHaveBeenCalledWith('Income'));
    expect(onSelectPortfolioId).toHaveBeenCalledWith('3');

    await user.click(screen.getByRole('button', { name: 'Portföyü sil' }));
    const deleteButtons = screen.getAllByRole('button', { name: 'Portföyü sil' });
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

    await user.click(screen.getByRole('button', { name: 'Portföyü sil' }));
    expect(screen.getByText('Silmeden önce portföydeki tüm pozisyonları satın veya aktarın.')).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button', { name: 'Portföyü sil' });
    expect(deleteButtons[deleteButtons.length - 1]).toBeDisabled();
  });
  it('keeps an unpriced holding visible without fabricating allocation values', async () => {
    server.use(
      http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([
        {
          symbol: 'AAPL',
          company: 'Apple Inc.',
          addedDate: '2026-01-02',
          costPrice: 100,
          currentPrice: null,
          marketValue: null,
          weight: null,
          dailyReturn: null,
          weeklyReturn: null,
          oneMonthReturn: null,
          threeMonthReturn: null,
          sixMonthReturn: null,
          oneYearReturn: null,
          totalReturn: null,
        },
      ])),
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([])),
    );

    renderPortfolio(portfolio, []);

    await waitFor(() => {
      expect(screen.getByText('Kısmi veri: her pozisyonun gerçek piyasa fiyatı olmadan dağılım hesaplanamaz.')).toBeInTheDocument();
    });
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('does not fabricate allocation or holding rows for an empty portfolio', () => {
    server.use(
      http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([])),
    );

    renderPortfolio({ id: '1', name: 'Empty', holdings: [] }, [makeStock('AAPL', 210)]);

    expect(screen.getByText('Dağılım için pozisyon bulunamadı.')).toBeInTheDocument();
    expect(screen.getByText('Veri yok: güncel pozisyon yok.')).toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });

  it('shows the backend conflict message when the server rejects a deletion the UI allowed', async () => {
    server.use(
      http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([])),
      http.delete(apiUrl('/portfolios/2'), () => HttpResponse.json({
        timestamp: '2026-10-17T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'Portfolio cannot be deleted while it has active holdings',
        path: '/api/v1/portfolios/2',
      }, { status: 409 })),
    );
    const user = userEvent.setup();
    const stalePortfolio: Portfolio = { id: '2', name: 'Stale', holdings: [] };
    const onSelectPortfolioId = vi.fn();

    renderPortfolio(stalePortfolio, [], {
      portfolios: [portfolio, stalePortfolio],
      activePortfolioId: stalePortfolio.id,
      onDeletePortfolio: async () => {
        await deleteInvestmentPortfolio(2);
      },
      onSelectPortfolioId,
    });

    await user.click(screen.getByRole('button', { name: 'Portföyü sil' }));
    const deleteButtons = screen.getAllByRole('button', { name: 'Portföyü sil' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    expect(await screen.findByText('Portfolio cannot be deleted while it has active holdings')).toBeInTheDocument();
    expect(onSelectPortfolioId).not.toHaveBeenCalled();
  });

  it('offers the CSV import and Portfolio State panels for the active portfolio and reloads after accept', async () => {
    installPortfolioHandlers();
    let transactionLoads = 0;
    server.use(
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => {
        transactionLoads += 1;
        return HttpResponse.json([]);
      }),
      http.post(apiUrl('/portfolios/1/imports'), () => HttpResponse.json({
        batchId: 9,
        portfolioId: 1,
        status: 'STAGED',
        fileSha256: 'f'.repeat(64),
        createdAt: '2026-10-25T10:00:00Z',
        acceptedAt: null,
        counts: { valid: 1, invalid: 0, duplicate: 0, accepted: 0, rejected: 0 },
        rows: [{ rowNumber: 1, status: 'VALID', message: null, originLocator: 'csv:abc', transactionId: null }],
      }, { status: 201 })),
      http.post(apiUrl('/portfolios/1/imports/9/accept'), () => HttpResponse.json({
        batchId: 9,
        portfolioId: 1,
        status: 'ACCEPTED',
        fileSha256: 'f'.repeat(64),
        createdAt: '2026-10-25T10:00:00Z',
        acceptedAt: '2026-10-25T10:05:00Z',
        counts: { valid: 0, invalid: 0, duplicate: 0, accepted: 1, rejected: 0 },
        rows: [{ rowNumber: 1, status: 'ACCEPTED', message: null, originLocator: 'csv:abc', transactionId: 5 }],
      })),
    );
    const user = userEvent.setup();

    renderPortfolio();

    expect(await screen.findByRole('heading', { name: 'CSV ile işlem içe aktar' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Portföy durumu' })).toBeInTheDocument();
    await waitFor(() => expect(transactionLoads).toBe(1));
    await user.upload(screen.getByLabelText('CSV dosyası'), new File(['a,b'], 'x.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: 'Yükle' }));
    await user.click(await screen.findByRole('button', { name: 'Kabul et' }));

    await waitFor(() => expect(transactionLoads).toBe(2));
  });
});
