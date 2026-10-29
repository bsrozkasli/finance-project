import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../api/config';
import { server } from '../test/server';
import { redesignFixtureHandlers } from '../test/redesignHandlers';
import CompareView from './CompareView';

const comparison = {
  period: '6M',
  series: [
    { id: 'PORTFOLIO:1', label: 'Test Portföy', type: 'PORTFOLIO', points: [{ date: '2026-01-01', value: 100, returnPct: 0 }, { date: '2026-02-01', value: 110, returnPct: 10 }] },
    { id: 'BENCHMARK:BIST100', label: 'BIST 100', type: 'BENCHMARK', points: [{ date: '2026-01-01', value: 100, returnPct: 0 }, { date: '2026-02-01', value: 108, returnPct: 8 }] },
  ],
};

describe('CompareView', () => {
  it('renders the comparison panels from API data and highlights the better side from the API map', async () => {
    server.use(
      ...redesignFixtureHandlers(),
      http.get(`${API_BASE_URL}/portfolio/performance/comparison`, () => HttpResponse.json(comparison)),
    );
    render(<CompareView />);

    expect(await screen.findByRole('heading', { name: 'Metrik karşılaştırması' })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Metrik karşılaştırma tablosu' });
    const row = within(table).getByRole('row', { name: /Dönem getirisi/ });
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveClass('cmp-better');
    expect(cells[1]).not.toHaveClass('cmp-better');
    expect(within(row).getByText('(daha iyi)')).toBeInTheDocument();

    expect(await screen.findByRole('img', { name: /Göreli getiri grafiği/ })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Risk getiri dağılımı/ })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Korelasyon matrisi' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '3M' }));
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('swaps the A and B selections', async () => {
    server.use(
      ...redesignFixtureHandlers(),
      http.get(`${API_BASE_URL}/portfolio/performance/comparison`, () => HttpResponse.json(comparison)),
    );
    render(<CompareView />);
    const selectA = await screen.findByRole('combobox', { name: 'Karşılaştırılan A' });
    await waitFor(() => expect(selectA).toHaveDisplayValue('Test Portföy'));
    await userEvent.setup().click(screen.getByRole('button', { name: 'A ve B seçimlerini yer değiştir' }));
    expect(screen.getByRole('combobox', { name: 'Karşılaştırılan A' })).toHaveDisplayValue('BIST 100');
  });

  it('shows Veri alınamadı instead of numbers when the services are unavailable', async () => {
    server.use(
      http.get(`${API_BASE_URL}/benchmarks`, () => HttpResponse.json({
        status: 'AVAILABLE', asOf: '2026-07-09T09:00:00Z',
        items: [{ code: 'BIST100', name: 'BIST 100', kind: 'INDEX', currency: 'TRY', source: 'stub' }],
      })),
      http.get(`${API_BASE_URL}/portfolio/performance/comparison`, () => HttpResponse.json({}, { status: 500 })),
    );
    render(<CompareView />);

    await waitFor(() => expect(screen.getAllByText('Veri alınamadı').length).toBeGreaterThan(0));
    expect(screen.queryByRole('table', { name: 'Metrik karşılaştırma tablosu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Göreli getiri grafiği/ })).not.toBeInTheDocument();
  });
});
