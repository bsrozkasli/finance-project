import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../api/config';
import type { PortfolioState } from '../../api/client';
import { loadContractFixture } from '../../test/contractFixtures';
import { server } from '../../test/server';
import PortfolioStatePanel from './PortfolioStatePanel';

const url = (path: string) => `${API_BASE_URL}${path}`;
const complete = loadContractFixture('portfolio-state-complete.json') as PortfolioState;
const partial = loadContractFixture('portfolio-state-partial.json') as PortfolioState;
// src/test/setup.ts fixes the system clock at 2026-07-09T09:00:00Z.
const todayUtc = '2026-07-09';

describe('PortfolioStatePanel', () => {
  it('limits the as-of date to today and posts the chosen date', async () => {
    let posted: unknown = null;
    server.use(http.post(url('/portfolios/1/states'), async ({ request }) => {
      posted = await request.json();
      return HttpResponse.json(complete, { status: 201 });
    }));
    render(<PortfolioStatePanel portfolioId={1} />);

    const date = screen.getByLabelText('Durum tarihi');
    expect(date).toHaveAttribute('max', todayUtc);
    await userEvent.clear(date);
    await userEvent.type(date, '2026-07-01');
    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    await screen.findByRole('table', { name: 'Durum pozisyonları' });
    expect(posted).toEqual({ asOf: '2026-07-01' });
  });

  it('blocks a future date without calling the backend', async () => {
    let calls = 0;
    server.use(http.post(url('/portfolios/1/states'), () => {
      calls += 1;
      return HttpResponse.json(complete, { status: 201 });
    }));
    render(<PortfolioStatePanel portfolioId={1} />);

    const date = screen.getByLabelText('Durum tarihi');
    await userEvent.clear(date);
    await userEvent.type(date, '2999-01-01');

    expect(screen.getByRole('button', { name: 'Durum oluştur' })).toBeDisabled();
    expect(screen.getByText('Tarih bugünden sonra olamaz.')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('renders a COMPLETE state with short version, full version title, prices and weights', async () => {
    server.use(http.post(url('/portfolios/1/states'), () => HttpResponse.json(complete, { status: 201 })));
    render(<PortfolioStatePanel portfolioId={1} />);

    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    expect(await screen.findByTitle('pstate-v2:abc')).toBeInTheDocument();
    expect(screen.getByText('Tam')).toBeInTheDocument();
    expect(screen.getByText(/yatırım sinyali değildir/i)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Durum pozisyonları' });
    const row = within(table).getByText('AAPL').closest('tr') as HTMLElement;
    expect(within(row).getByText('Fiyatlandı')).toBeInTheDocument();
    expect(within(row).queryByLabelText('bilinmiyor')).not.toBeInTheDocument();
    const weights = screen.getByRole('table', { name: 'Varlık türü ağırlıkları' });
    expect(within(weights).getByText('US_STOCK')).toBeInTheDocument();
    expect(within(weights).getByText('%100,00')).toBeInTheDocument();
  });

  it('renders a PARTIAL state with an em dash labelled bilinmiyor for null values and withholds weights with a note', async () => {
    server.use(http.post(url('/portfolios/1/states'), () => HttpResponse.json(partial, { status: 201 })));
    render(<PortfolioStatePanel portfolioId={1} />);

    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    const table = await screen.findByRole('table', { name: 'Durum pozisyonları' });
    const row = within(table).getByText('AAPL').closest('tr') as HTMLElement;
    const unknownCells = within(row).getAllByLabelText('bilinmiyor');
    expect(unknownCells).toHaveLength(4);
    unknownCells.forEach((cell) => {
      expect(cell).toHaveTextContent('—');
      expect(cell).toHaveAttribute('title', 'bilinmiyor');
    });
    expect(within(row).queryByText('bilinmiyor')).not.toBeInTheDocument();
    expect(within(row).getByText('Fiyat yok')).toBeInTheDocument();
    expect(within(row).queryByText(/^0([.,]0+)?$/)).not.toBeInTheDocument();
    expect(screen.getByText('Kısmi')).toBeInTheDocument();
    expect(screen.getByText(/ağırlıklar gösterilmiyor/)).toHaveTextContent(/kullanılabilir fiyatı veya eşleşen para birimi yok/);
    expect(screen.queryByRole('table', { name: 'Varlık türü ağırlıkları' })).not.toBeInTheDocument();
  });

  it('never shows weights for a non-COMPLETE state even if the response carries them', async () => {
    const inconsistent: PortfolioState = {
      ...partial,
      positions: [{ ...partial.positions[0], weight: 0.5 }],
      assetTypeWeights: { US_STOCK: 0.5 },
    };
    server.use(http.post(url('/portfolios/1/states'), () => HttpResponse.json(inconsistent, { status: 201 })));
    render(<PortfolioStatePanel portfolioId={1} />);

    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    const table = await screen.findByRole('table', { name: 'Durum pozisyonları' });
    expect(screen.queryByRole('table', { name: 'Varlık türü ağırlıkları' })).not.toBeInTheDocument();
    expect(within(table).queryByText(/%/)).not.toBeInTheDocument();
    expect(within(table).getAllByLabelText('bilinmiyor')).toHaveLength(4);
  });

  it('shows a dash, not zero, for a null weight inside a COMPLETE state', async () => {
    const closed = {
      ...complete.positions[0],
      symbol: 'MSFT',
      quantity: 0,
      valuationStatus: 'CLOSED' as const,
      price: null,
      priceDate: null,
      marketValue: null,
      weight: null,
    };
    const withClosed: PortfolioState = { ...complete, positions: [...complete.positions, closed] };
    server.use(http.post(url('/portfolios/1/states'), () => HttpResponse.json(withClosed, { status: 201 })));
    render(<PortfolioStatePanel portfolioId={1} />);

    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    const row = (await screen.findByText('MSFT')).closest('tr') as HTMLElement;
    expect(within(row).getAllByLabelText('bilinmiyor')).toHaveLength(4);
    expect(within(row).queryByText(/%/)).not.toBeInTheDocument();
    expect(within(row).getByText('Kapalı')).toBeInTheDocument();
  });

  it('explains an EMPTY state without weights', async () => {
    const empty: PortfolioState = { ...partial, exposureStatus: 'EMPTY', positions: [], sourceEventIds: [] };
    server.use(http.post(url('/portfolios/1/states'), () => HttpResponse.json(empty, { status: 201 })));
    render(<PortfolioStatePanel portfolioId={1} />);

    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    expect(await screen.findByText('Bu tarihte açık pozisyon yok.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Varlık türü ağırlıkları' })).not.toBeInTheDocument();
  });

  it('shows the backend error message', async () => {
    server.use(http.post(url('/portfolios/1/states'), () => HttpResponse.json({
      timestamp: '2026-10-25T10:00:00Z',
      status: 404,
      error: 'Not Found',
      message: 'Portfolio not found',
      path: '/api/v1/portfolios/1/states',
    }, { status: 404 })));
    render(<PortfolioStatePanel portfolioId={1} />);

    await userEvent.click(screen.getByRole('button', { name: 'Durum oluştur' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Portfolio not found');
  });
});
