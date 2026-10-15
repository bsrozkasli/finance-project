import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { server } from './test/server';

const API_BASE = 'http://localhost:8080/api/v1';
const apiUrl = (path: string) => `${API_BASE}${path}`;

const emptyPaged = { content: [], totalElements: 0, totalPages: 0, number: 0 };

const installShellHandlers = () => {
  server.use(
    http.get(apiUrl('/assets'), () => HttpResponse.json([])),
    http.get(apiUrl('/portfolios'), () => HttpResponse.json([])),
    http.get(apiUrl('/portfolio/summary'), () => HttpResponse.json({ totalValue: 0, cashBalance: 0, dailyPnL: 0, dailyPnLPercent: 0, totalPnL: 0, totalReturn: 0 })),
    http.get(apiUrl('/portfolio/performance'), () => HttpResponse.json({ period: '1M', series: [] })),
    http.get(apiUrl('/portfolio/performance/comparison'), () => HttpResponse.json({ period: '6M', series: [] })),
    http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])),
    http.get(apiUrl('/portfolio/allocation'), () => HttpResponse.json({ bySector: [], byAsset: [], byCountry: [] })),
    http.get(apiUrl('/portfolio/positions/enriched'), () => HttpResponse.json([])),
    http.get(apiUrl('/watchlists'), () => HttpResponse.json([])),
    http.get(apiUrl('/journal/trades'), () => HttpResponse.json(emptyPaged)),
    http.get(apiUrl('/journal/trades/stats'), () => HttpResponse.json({ totalTrades: 0, openTrades: 0, closedTrades: 0, winRate: 0, avgReturn: 0 })),
    http.get(apiUrl('/news/portfolio'), () => HttpResponse.json([])),
    http.get(apiUrl('/calendar/economic-events'), () => HttpResponse.json([])),
    http.get(apiUrl('/macro/snapshot'), () => HttpResponse.json({ fedFundsRate: null, cpiYoy: null, unemploymentRate: null, treasury10y: null, observedAt: null })),
  );
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

const renderAppAt = async (path: string) => {
  installShellHandlers();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText('Nexus Terminal');
};

describe('App route contract', () => {
  it('uses the backend ledger after a saved trade instead of inventing a local holding', async () => {
    installShellHandlers();
    server.use(
      http.get(apiUrl('/assets'), () => HttpResponse.json([{ symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' }])),
      http.post(apiUrl('/prices/batch-history'), () => HttpResponse.json({ AAPL: [{ assetId: 'AAPL', open: 120, high: 122, low: 119, close: 121, volume: 1000, timestamp: '2026-07-09T00:00:00Z' }] })),
      http.get(apiUrl('/portfolios'), () => HttpResponse.json([{ id: 1, name: 'Main', baseCurrency: 'USD', defaultPortfolio: true }])),
      http.get(apiUrl('/portfolios/1/holdings'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/1/transactions'), () => HttpResponse.json([])),
      http.post(apiUrl('/portfolios/1/transactions'), () => HttpResponse.json({ id: 17 })),
    );
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Manage Assets' }));
    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '100');
    await user.click(screen.getByRole('button', { name: /save to portfolio/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('saved to the backend portfolio ledger')));
    expect(screen.getByText(/This portfolio has no positions yet/i)).toBeInTheDocument();
  });

  it('does not announce a saved position when the backend rejects the transaction', async () => {
    installShellHandlers();
    server.use(
      http.get(apiUrl('/assets'), () => HttpResponse.json([{ symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' }])),
      http.post(apiUrl('/prices/batch-history'), () => HttpResponse.json({ AAPL: [{ assetId: 'AAPL', open: 120, high: 122, low: 119, close: 121, volume: 1000, timestamp: '2026-07-09T00:00:00Z' }] })),
      http.get(apiUrl('/portfolios'), () => HttpResponse.json([{ id: 1, name: 'Main', baseCurrency: 'USD', defaultPortfolio: true }])),
      http.get(apiUrl('/portfolios/1/holdings'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/1/transactions'), () => HttpResponse.json([])),
      http.post(apiUrl('/portfolios/1/transactions'), () => HttpResponse.json({ message: 'Ledger unavailable' }, { status: 503 })),
    );
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Manage Assets' }));
    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '100');
    await user.click(screen.getByRole('button', { name: /save to portfolio/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Position could not be saved. Please try again.'));
    expect(alertSpy).not.toHaveBeenCalledWith(expect.stringContaining('saved to the backend portfolio ledger'));
  });
  it('redirects the root route to the documented dashboard route', async () => {
    await renderAppAt('/');

    await waitFor(() => expect(screen.getByTestId('location-path')).toHaveTextContent('/dashboard'));
  });

  it.each([
    '/dashboard',
    '/workspace',
    '/workspace/AAPL',
    '/portfolio',
    '/portfolio/10',
    '/transactions',
    '/journal',
    '/watchlist',
    '/news',
    '/news/AAPL',
    '/reports',
    '/reports/AAPL',
  ])('keeps documented SPEC route %s addressable without fallback redirect', async (path) => {
    await renderAppAt(path);

    await waitFor(() => expect(screen.getByTestId('location-path')).toHaveTextContent(path));
  });
});
