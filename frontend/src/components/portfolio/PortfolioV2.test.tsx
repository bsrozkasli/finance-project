import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/config';
import { server } from '../../test/server';
import { redesignFixtureHandlers } from '../../test/redesignHandlers';
import PortfolioCards from './PortfolioCards';
import PortfolioPanels from './PortfolioPanels';

const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

describe('PortfolioCards', () => {
  it('lists portfolios with aggregate card, filters and pin toggle', async () => {
    const pinBodies: unknown[] = [];
    server.use(
      http.put(apiUrl('/portfolios/:portfolioId/pin'), async ({ request }) => {
        pinBodies.push(await request.json());
        return HttpResponse.json({ portfolioId: 1, pinned: false });
      }),
      ...redesignFixtureHandlers(),
    );
    const onSelect = vi.fn();
    render(<PortfolioCards activePortfolioId={1} onSelect={onSelect} />);

    expect(await screen.findByText('Test Portföy')).toBeInTheDocument();
    expect(screen.getByLabelText('Tüm portföyler')).toHaveTextContent('1 portföy · 0 kritik riskli');

    await userEvent.click(screen.getByRole('button', { name: 'Kritik riskli' }));
    expect(screen.queryByText('Test Portföy')).not.toBeInTheDocument();
    expect(screen.getByText('Bu filtreye uyan portföy yok.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sabitlenmiş' }));

    await userEvent.click(screen.getByRole('button', { name: /^Test Portföy 2 pozisyon/ }));
    expect(onSelect).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole('button', { name: 'Test Portföy sabitlemeyi kaldır' }));
    await waitFor(() => expect(pinBodies).toEqual([{ pinned: false }]));
  });

  it('shows Veri alınamadı when the overview is unavailable', async () => {
    render(<PortfolioCards activePortfolioId={undefined} onSelect={vi.fn()} />);
    expect(await screen.findByText('Veri alınamadı')).toBeInTheDocument();
  });
});

describe('PortfolioPanels', () => {
  it('renders every panel from fixtures, filters alerts and validates target weights', async () => {
    let deleted = '';
    server.use(
      http.delete(apiUrl('/portfolios/:portfolioId/positions/:symbol/stop-levels'), ({ params }) => {
        deleted = String(params.symbol);
        return new HttpResponse(null, { status: 204 });
      }),
      ...redesignFixtureHandlers(),
    );
    render(<PortfolioPanels portfolioId={1} />);

    const alerts = await screen.findByRole('region', { name: 'Risk uyarıları' });
    expect(await within(alerts).findByText('Yoğunlaşma')).toBeInTheDocument();
    expect(within(alerts).getByText(/Fiyat yok/)).toBeInTheDocument();
    await userEvent.click(within(alerts).getByRole('button', { name: 'Kritik' }));
    expect(within(alerts).getByText('Bu önem düzeyinde uyarı yok.')).toBeInTheDocument();

    expect(await screen.findByRole('img', { name: /Şirket dağılımı: HS1 %60,0/ })).toBeInTheDocument();
    expect(await screen.findByText('Test Sektör')).toBeInTheDocument();
    expect(screen.getByText('Bilgi amaçlıdır; emir oluşturmaz.')).toBeInTheDocument();

    const hs1Target = await screen.findByLabelText('HS1 hedef (%)');
    await userEvent.clear(hs1Target);
    await userEvent.type(hs1Target, '50');
    await userEvent.click(screen.getByRole('button', { name: 'Hedefleri kaydet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('toplamı %100 olmalı');

    await userEvent.clear(hs1Target);
    await userEvent.type(hs1Target, '95');
    await userEvent.click(screen.getByRole('button', { name: 'Hedefleri kaydet' }));
    expect(await screen.findByText('Hedefler kaydedildi.')).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: /stop seviyesini kaldır/ }));
    await waitFor(() => expect(deleted).not.toBe(''));
  });

  it('sets a stop level through the PUT endpoint', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.put(apiUrl('/portfolios/:portfolioId/positions/:symbol/stop-levels'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ portfolioId: 1, symbol: 'HS1' });
      }),
      ...redesignFixtureHandlers(),
    );
    render(<PortfolioPanels portfolioId={1} />);
    const form = await screen.findByRole('form', { name: 'Stop seviyesi belirle' });
    await userEvent.type(within(form).getByLabelText('Sembol'), 'hs1');
    await userEvent.type(within(form).getByLabelText('Zarar durdur'), '45,5');
    await userEvent.click(within(form).getByRole('button', { name: 'Stop kaydet' }));
    await waitFor(() => expect(bodies).toEqual([{ stopLoss: 45.5, takeProfit: null }]));
  });

  it('shows Veri alınamadı instead of numbers when the backend slice is unavailable', async () => {
    render(<PortfolioPanels portfolioId={1} />);
    await waitFor(() => expect(screen.getAllByText('Veri alınamadı').length).toBeGreaterThanOrEqual(7));
    expect(screen.queryByText(/%\d/)).not.toBeInTheDocument();
  });
});
