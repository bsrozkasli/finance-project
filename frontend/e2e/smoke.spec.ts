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

const emptyResearchSection = (symbol: string) => ({
  status: 'EMPTY',
  source: 'MOCK',
  data: null,
  message: null,
  observedAt: '2026-07-09T20:00:00Z',
  symbol,
});

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

    if (method === 'POST' && path === '/prices/batch-latest') {
      await route.fulfill({ json: { quotes: {}, generatedAt: '2026-07-09T20:00:00Z' } });
      return;
    }

    if (method === 'POST' && path === '/assets/batch-profiles') {
      const body = request.postDataJSON() as { symbols?: string[] } | null;
      const profiles = Object.fromEntries((body?.symbols ?? []).map((symbol) => [symbol, emptyResearchSection(symbol)]));
      await route.fulfill({ json: { profiles, generatedAt: '2026-07-09T20:00:00Z' } });
      return;
    }

    if (method === 'GET' && /^\/fundamentals\/[^/]+\/history$/.test(path)) {
      const symbol = path.split('/')[2];
      await route.fulfill({ json: { symbol, status: 'EMPTY', currency: null, periodType: 'annual', retrievedAt: null, points: [] } });
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

    if (method === 'GET' && path === '/portfolio/performance/comparison') {
      await route.fulfill({ json: { period: '6M', series: [] } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/allocation') {
      await route.fulfill({ json: { bySector: [], byAsset: [], byCountry: [] } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/positions/performance') {
      await route.fulfill({ json: [] });
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

    if (method === 'GET' && path === '/news/macro') {
      await route.fulfill({ json: [] });
      return;
    }

    if (method === 'GET' && path === '/calendar') {
      await route.fulfill({ json: { earnings: [], economicEvents: [] } });
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

  await expect(page.getByRole('heading', { level: 1, name: 'Bugün', exact: true })).toBeVisible();
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
    await expect(page.getByText('Uygulama hatası')).toHaveCount(0);
    if (path === '/watchlist') {
      await expect(page.getByRole('heading', { name: 'İzleme listem' })).toBeVisible();
    }
  }
});

test('opens shell actions without leaving the backend API boundary', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Kayıtlı varlıklarda ara').fill('micro');
  await expect(page.getByRole('option', { name: /MSFT.*Microsoft Corp/i })).toBeVisible();

  await page.locator('button[aria-label="Ayarlar"]:visible').click();
  await expect(page.getByRole('dialog', { name: 'Ayarlar' })).toBeVisible();
  await page.getByRole('button', { name: 'Kapat' }).click();
  await expect(page.getByRole('dialog', { name: 'Ayarlar' })).not.toBeVisible();
});

test('has no critical accessibility violations on the dashboard', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter((violation) => violation.impact === 'critical');

  expect(criticalViolations).toEqual([]);
});

test('dark research desk keeps evidence, source focus and six tasks usable', async ({ page }, testInfo) => {
  await page.route(`${API_BASE}/fundamentals/AAPL`,route=>route.fulfill({json:{symbol:'AAPL',revenue:[{year:2024,value:1000},{year:2025,value:1200}],netIncome:[{year:2025,value:0}],eps:[],freeCashFlow:[]}}));
  await page.goto('/workspace/AAPL');
  await expect(page.getByRole('tab',{name:'Genel bakış',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('heading',{name:'Apple Inc.',exact:true})).toBeVisible();
  const colors=await page.locator('.desk-app').evaluate(node=>getComputedStyle(node).backgroundColor);
  expect(colors).toBe('rgb(14, 18, 24)');
  await page.getByRole('tab',{name:'Finansallar',exact:true}).click();
  await expect(page.getByRole('table',{name:'Yıllık finansallar'})).toContainText('1.200');
  await page.getByRole('button',{name:'Kompakt',exact:true}).click();
  await expect(page.getByRole('table',{name:'Yıllık finansallar'})).toHaveClass(/is-compact/);
  await page.getByRole('button',{name:'Kaynak ayrıntıları',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Kaynak ayrıntıları',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Kaynak ayrıntıları',exact:true})).toBeFocused();
  await page.getByRole('tab',{name:'Grafik',exact:true}).click();
  await expect(page.getByRole('button',{name:'Heikin Ashi',exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'AI raporu',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Portföy Yöneticisi',exact:true})).toBeVisible();
  await page.screenshot({path:`../.cache/dark-implementation/app-${testInfo.project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
  if(testInfo.project.name.includes('desktop')){
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'Kaynak ayrıntıları',exact:true}).click();
    await expect(page.locator('#research-source-aside')).toBeVisible();
    expect(await page.locator('.research-content').evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThanOrEqual(900);
    await page.setViewportSize({width:1280,height:800});
    await expect(page.getByRole('dialog',{name:'Kaynak ayrıntıları',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'Kaynak ayrıntıları',exact:true})).toBeFocused();
  }
});
