import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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
