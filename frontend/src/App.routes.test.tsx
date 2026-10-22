import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';
import { API_BASE_URL as API_BASE } from './api/config';
import { server } from './test/server';

const apiUrl = (path: string) => `${API_BASE}${path}`;

const emptyPaged = { content: [], totalElements: 0, totalPages: 0, number: 0 };

const installShellHandlers = () => {
  server.use(
    http.get(apiUrl('/assets'), () => HttpResponse.json([])),
    http.get(apiUrl('/fundamentals/:symbol'), () => new HttpResponse(null, { status: 503 })),
    http.get(apiUrl('/fundamentals/:symbol/ratios'), () => new HttpResponse(null, { status: 503 })),
    http.get(apiUrl('/news/:symbol'), () => HttpResponse.json([])),
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
    http.get(apiUrl('/calendar'), () => HttpResponse.json({ earnings: [], economicEvents: [] })),
    http.get(apiUrl('/market/sessions'), () => HttpResponse.json([])),
    http.post(apiUrl('/prices/batch-latest'), () => HttpResponse.json({ quotes: {}, generatedAt: '2026-10-22T00:00:00Z' })),
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

  await screen.findByText('Mercek');
};

describe('App route contract', () => {
  it('shows a free website favicon for a watched symbol without a tracked asset', async () => {
    installShellHandlers();
    server.use(
      http.get(apiUrl('/watchlists'), () => HttpResponse.json([
        { id: 7, name: 'Takip', symbols: ['AAPL'], createdAt: '2026-10-22T00:00:00Z' },
      ])),
      http.get(apiUrl('/watchlists/:id/research-snapshot'), () => HttpResponse.json({
        watchlistId: 7,
        watchlistName: 'Takip',
        totalSymbols: 1,
        limit: 50,
        offset: 0,
        requestedSymbols: ['AAPL'],
        rows: [],
        policy: { maxLimit: 50, providerConcurrencyLimit: 4, providerTimeoutMillis: 3500, partialFailureEnabled: true, staleWhileRevalidateEnabled: true },
        generatedAt: '2026-10-22T00:00:00Z',
      })),
      http.post(apiUrl('/assets/batch-profiles'), async ({ request }) => {
        const body = await request.json() as { symbols: string[] };
        return HttpResponse.json({
          profiles: body.symbols.includes('AAPL') ? {
            AAPL: {
              status: 'OK', source: 'test-profile', message: null, observedAt: '2026-10-22T00:00:00Z',
              data: {
                symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD',
                sector: 'Technology', industry: 'Consumer Electronics', marketCap: null,
                description: null, website: 'https://www.apple.com', logoUrl: null,
                country: 'US', quoteType: 'EQUITY', fullTimeEmployees: null,
              },
            },
          } : {},
          generatedAt: '2026-10-22T00:00:00Z',
        });
      }),
    );

    render(<MemoryRouter initialEntries={['/watchlist']}><App /></MemoryRouter>);

    expect(await screen.findByRole('img', { name: 'AAPL logo' })).toHaveAttribute(
      'src', 'https://www.apple.com/favicon.ico',
    );
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
