import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../api/config';
import { redesignFixtureHandlers } from '../test/redesignHandlers';
import { fixtureEarningsSources } from '../test/redesignFixtures';
import { server } from '../test/server';
import type { Portfolio } from '../types';
import EarningsAnalysisView from './EarningsAnalysisView';

const portfolios: Portfolio[] = [{ id: '1', name: 'Test Portföy', holdings: [] }];

describe('EarningsAnalysisView', () => {
  it('renders every section from the earnings endpoints', async () => {
    server.use(...redesignFixtureHandlers());
    render(<EarningsAnalysisView portfolios={portfolios} />);

    expect(await screen.findByTestId('summary-YTD')).toHaveTextContent('12,00');
    expect(screen.getByRole('heading', { name: 'Kazanç Analizi' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Aylık kazanç çubukları/ })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Yıllık kazanç özeti' })).toBeInTheDocument();
    expect(await screen.findAllByText('HS1')).not.toHaveLength(0);
    expect(await screen.findByRole('button', { name: 'Test Portföy portföyüne daralt' })).toBeInTheDocument();
    expect(screen.queryByTestId('earnings-residual')).not.toBeInTheDocument();
  });

  it('scopes to a portfolio when its ranking row is clicked', async () => {
    const scopes: string[] = [];
    server.use(
      http.get(`${API_BASE_URL}/analytics/earnings/summary`, ({ request }) => {
        scopes.push(new URL(request.url).searchParams.get('scope') ?? '');
        return HttpResponse.json({ status: 'AVAILABLE', asOf: '2026-07-09T09:00:00Z', items: [] });
      }),
      ...redesignFixtureHandlers(),
    );
    const user = userEvent.setup({ delay: null });
    render(<EarningsAnalysisView portfolios={portfolios} />);

    await user.click(await screen.findByRole('button', { name: 'Test Portföy portföyüne daralt' }));
    expect(screen.getByLabelText('Kapsam')).toHaveValue('1');
    await waitFor(() => expect(scopes).toContain('PORTFOLIO:1'));
  });

  it('reports a residual and the partial status instead of hiding it', async () => {
    server.use(
      http.get(`${API_BASE_URL}/analytics/earnings/sources`, () => HttpResponse.json({
        ...fixtureEarningsSources, status: 'PARTIAL', residual: 3.5, notes: ['Fark açıklanamadı'],
      })),
      ...redesignFixtureHandlers(),
    );
    render(<EarningsAnalysisView portfolios={portfolios} />);

    expect(await screen.findByTestId('earnings-residual')).toHaveTextContent('Açıklanamayan fark');
    expect(screen.getByText(/Kısmi veri: Fark açıklanamadı/)).toBeInTheDocument();
  });

  it('shows unavailable panels with no figures when the API has no data', async () => {
    render(<EarningsAnalysisView portfolios={portfolios} />);

    expect(await screen.findAllByText('Veri alınamadı')).not.toHaveLength(0);
    expect(screen.queryByTestId('summary-YTD')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Aylık kazanç çubukları/ })).not.toBeInTheDocument();
  });
});
