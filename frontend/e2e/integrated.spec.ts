import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const API_BASE = 'http://localhost:8080/api/v1';
const integrated = process.env.E2E_INTEGRATED === 'true';

const priceBars = [
  { assetId: 'AAPL', open: 100, high: 105, low: 99, close: 102, volume: 1000, timestamp: '2026-07-08T20:00:00Z' },
  { assetId: 'AAPL', open: 102, high: 110, low: 101, close: 108, volume: 1200, timestamp: '2026-07-09T20:00:00Z' },
  { assetId: 'MSFT', open: 300, high: 325, low: 298, close: 320, volume: 2000, timestamp: '2026-07-09T20:00:00Z' },
  { assetId: 'DRAM', open: 90, high: 93, low: 88, close: 91, volume: 1500, timestamp: '2026-07-09T20:00:00Z' },
];

async function stubBrowserOnlyProviderReads(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();

    if (method === 'POST' && path === '/prices/batch-history') {
      await route.fulfill({ json: { AAPL: priceBars.slice(0, 2), MSFT: priceBars.slice(2, 3), DRAM: priceBars.slice(3) } });
      return;
    }

    if (method === 'GET' && /^\/prices\/[^/]+\/history$/.test(path)) {
      const symbol = path.split('/')[2]?.toUpperCase();
      await route.fulfill({ json: priceBars.filter((bar) => bar.assetId === symbol) });
      return;
    }

    if (method === 'GET' && (path.startsWith('/news/') || path.startsWith('/calendar/'))) {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'GET' && path === '/macro/snapshot') {
      await route.fulfill({ json: { fedFundsRate: null, cpiYoy: null, unemploymentRate: null, treasury10y: null, observedAt: null } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/positions/enriched') {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'GET' && path === '/portfolio/summary') {
      await route.fulfill({ json: { totalValue: 0, totalCost: 0, totalPnl: 0, totalPnlPercent: 0 } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/allocation') {
      await route.fulfill({ json: { byAssetType: [], bySymbol: [] } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/performance') {
      await route.fulfill({ json: { points: [] } });
      return;
    }

    if (method === 'GET' && path.startsWith('/reports/smart/')) {
      await route.fulfill({ json: { symbol: path.split('/').pop(), overallScore: null, grade: null, recommendation: null, breakdown: null, peers: [] } });
      return;
    }

    if (method === 'GET' && path.startsWith('/backtest/')) {
      await route.fulfill({ json: { symbol: path.split('/').pop(), isMeaningful: false } });
      return;
    }

    await route.continue();
  });
}
test.describe('integrated system smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!integrated, 'Set E2E_INTEGRATED=true to run real backend integration smoke tests.');

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-desktop-1280',
      'Integrated mutation smoke runs once against the shared local database.',
    );
    await stubBrowserOnlyProviderReads(page);
  });

  test('persists a watchlist symbol through the real backend', async ({ page, request }) => {
    await page.goto('/watchlist', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('combobox').first()).toContainText('Core');
    await page.getByPlaceholder('Add stock/ETF...').fill('msft');
    await page.getByRole('button', { name: 'Add instrument' }).click();

    await expect(page.getByText('MSFT').first()).toBeVisible();

    const watchlistsResponse = await request.get(`${API_BASE}/watchlists`);
    expect(watchlistsResponse.ok()).toBe(true);
    const watchlists = await watchlistsResponse.json() as Array<{ name: string; symbols: string[] }>;
    expect(watchlists.find((watchlist) => watchlist.name === 'Core')?.symbols).toContain('MSFT');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('MSFT').first()).toBeVisible();
  });

  test('creates and switches portfolios through real routes and APIs', async ({ page, request }) => {
    await page.goto('/portfolio', { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('New portfolio name...').fill('Growth E2E');
    await page.getByRole('button', { name: /Create Portfolio/i }).click();

    await expect(page).toHaveURL(/\/portfolio\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Growth E2E' })).toBeVisible();

    const portfoliosResponse = await request.get(`${API_BASE}/portfolios`);
    expect(portfoliosResponse.ok()).toBe(true);
    const portfolios = await portfoliosResponse.json() as Array<{ id: number; name: string }>;
    const created = portfolios.find((portfolio) => portfolio.name === 'Growth E2E');
    expect(created).toBeTruthy();

    const portfolioSelect = page.locator('select').filter({ hasText: 'Growth E2E' }).first();
    await portfolioSelect.selectOption(String(created!.id));
    await expect(page).toHaveURL(new RegExp(`/portfolio/${created!.id}$`));

    const defaultPortfolio = portfolios.find((portfolio) => portfolio.name === 'Default');
    expect(defaultPortfolio).toBeTruthy();
    await portfolioSelect.selectOption(String(defaultPortfolio!.id));
    await expect(page).toHaveURL(new RegExp(`/portfolio/${defaultPortfolio!.id}$`));
  });

  test('links portfolio transactions to journal entries and derived holdings', async ({ request }) => {
    const portfoliosResponse = await request.get(`${API_BASE}/portfolios`);
    expect(portfoliosResponse.ok()).toBe(true);
    const portfolios = await portfoliosResponse.json() as Array<{ id: number; name: string }>;
    const defaultPortfolio = portfolios.find((portfolio) => portfolio.name === 'Default') ?? portfolios[0];
    expect(defaultPortfolio).toBeTruthy();

    const transactionResponse = await request.post(`${API_BASE}/portfolios/${defaultPortfolio.id}/transactions`, {
      data: {
        symbol: 'AAPL',
        assetType: 'US_STOCK',
        action: 'BUY',
        quantity: 2,
        price: 108,
        currency: 'USD',
        tradeDate: '2026-07-09',
        source: 'MANUAL',
        notes: 'Integrated smoke trade',
        journalNotes: 'Integrated smoke thesis',
      },
    });
    expect(transactionResponse.ok()).toBe(true);
    const transaction = await transactionResponse.json() as { id: number; symbol: string };
    expect(transaction.symbol).toBe('AAPL');

    const holdingsResponse = await request.get(`${API_BASE}/portfolios/${defaultPortfolio.id}/holdings`);
    expect(holdingsResponse.ok()).toBe(true);
    const holdings = await holdingsResponse.json() as Array<{ symbol: string; quantity: number; averageCost: number }>;
    expect(holdings).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: 'AAPL', quantity: 2, averageCost: 108 }),
    ]));

    const journalResponse = await request.get(`${API_BASE}/journal/trades`);
    expect(journalResponse.ok()).toBe(true);
    const journal = await journalResponse.json() as { content: Array<{ symbol: string; portfolioId?: number; transactionId?: number; notes?: string }> };
    expect(journal.content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: 'AAPL',
        portfolioId: defaultPortfolio.id,
        transactionId: transaction.id,
        notes: 'Integrated smoke thesis',
      }),
    ]));
  });
});
