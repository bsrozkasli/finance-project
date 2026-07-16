import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const API_BASE = 'http://localhost:8080/api/v1';
const integrated = process.env.E2E_INTEGRATED === 'true';

test.skip(integrated, 'Mocked smoke tests are disabled in integrated mode; use integrated.spec.ts for real backend smoke.');

const priceBars = [
  { assetId: 'AAPL', open: 100, high: 105, low: 99, close: 102, volume: 1000, timestamp: '2026-07-08T20:00:00Z' },
  { assetId: 'AAPL', open: 102, high: 110, low: 101, close: 108, volume: 1200, timestamp: '2026-07-09T20:00:00Z' },
  { assetId: 'MSFT', open: 300, high: 325, low: 298, close: 320, volume: 2000, timestamp: '2026-07-09T20:00:00Z' },
];

test.beforeEach(async ({ page }) => {
  if (integrated) return;

  await page.route(`${API_BASE}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();

    if (method === 'GET' && path === '/assets') {
      await route.fulfill({ json: [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' }, { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK' }] });
      return;
    }

    if (method === 'POST' && path === '/prices/batch-history') {
      await route.fulfill({ json: { AAPL: priceBars.slice(0, 2), MSFT: priceBars.slice(2) } });
      return;
    }

    if (method === 'GET' && path.endsWith('/history')) {
      await route.fulfill({ json: priceBars });
      return;
    }

    if (method === 'GET' && path === '/portfolios') {
      await route.fulfill({ json: [{ id: 10, userId: 'local', name: 'Default', baseCurrency: 'USD', defaultPortfolio: true }] });
      return;
    }

    if (method === 'GET' && path === '/portfolios/10/holdings') {
      await route.fulfill({ json: [{ portfolioId: 10, symbol: 'AAPL', assetType: 'US_STOCK', quantity: 2, averageCost: 100, costBasis: 200, realizedPnl: 0, currency: 'USD' }] });
      return;
    }

    if (method === 'GET' && path === '/portfolios/10/transactions') {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'GET' && path === '/portfolio/summary') {
      await route.fulfill({ json: { totalValue: 216, cashBalance: 0, dailyPnL: 8, dailyPnLPercent: 3.85, totalPnL: 16, totalReturn: 8 } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/performance') {
      await route.fulfill({ json: { period: '1M', series: [{ date: '2026-07-09', portfolioValue: 216 }] } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/allocation') {
      await route.fulfill({ json: { bySector: [], byAsset: [], byCountry: [] } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/positions/enriched') {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'GET' && path === '/watchlists') {
      await route.fulfill({ json: [{ id: 1, name: 'Core', symbols: ['AAPL'], createdAt: '2026-07-09T09:00:00Z' }] });
      return;
    }

    if (method === 'GET' && path === '/journal/trades') {
      await route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0, number: 0 } });
      return;
    }

    if (method === 'GET' && path === '/journal/trades/stats') {
      await route.fulfill({ json: { totalTrades: 0, openTrades: 0, closedTrades: 0, winRate: 0, avgReturn: 0 } });
      return;
    }

    if (method === 'GET' && path === '/news/portfolio') {
      await route.fulfill({ json: [{ id: 1, headline: 'Market breadth improves', source: 'Test Wire', datetime: 1783606800, summary: 'Mocked backend news.', category: 'MARKET', relatedSymbols: ['AAPL'], url: 'https://example.test/news' }] });
      return;
    }

    if (method === 'GET' && path === '/calendar/economic-events') {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'GET' && path === '/macro/snapshot') {
      await route.fulfill({ json: { fedFundsRate: null, cpiYoy: null, unemploymentRate: null, treasury10y: null, observedAt: null } });
      return;
    }

    await route.fulfill({ json: [] });
  });
});

test('loads the dashboard and navigates primary frontend routes', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Nexus Terminal' })).toBeVisible();
  await expect(page.getByText('AAPL').first()).toBeVisible();

  for (const path of [
    '/workspace',
    '/watchlist',
    '/news',
    '/reports',
    '/journal',
    '/portfolio',
  ] as const) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test('opens shell actions without leaving the backend API boundary', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Search symbols, names, or sectors...').fill('micro');
  await expect(page.getByRole('button', { name: /MSFT.*Microsoft Corp/i })).toBeVisible();

  await page.getByRole('button', { name: /System Settings/i }).click();
  await expect(page.getByText('Nexus Terminal System Settings')).toBeVisible();

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('banner').getByRole('button', { name: 'Trading Journal' }).click();
  await expect(page.getByText(/Trading Journal/i).last()).toBeVisible();
});

test('has no critical accessibility violations on the dashboard', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter((violation) => violation.impact === 'critical');

  expect(criticalViolations).toEqual([]);
});
