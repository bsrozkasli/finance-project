import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL as base } from '../../api/config';
import { server } from '../../test/server';
import { redesignFixtureHandlers } from '../../test/redesignHandlers';
import * as fx from '../../test/redesignFixtures';
import CompanyAnalysisSection from './CompanyAnalysisSection';
import CompanyHeaderStats from './CompanyHeaderStats';

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const section = () => render(<MemoryRouter><CompanyAnalysisSection symbol="HS1" /></MemoryRouter>);

describe('CompanyAnalysisSection', () => {
  it('shows an honest unavailable state in every panel and never a health score', async () => {
    section();
    expect(await screen.findAllByText('Veri alınamadı')).toHaveLength(6);
    expect(screen.queryByText(/\/ 100/)).not.toBeInTheDocument();
  });

  it('renders ready fixtures with verdict badge, ratio chart, quarterly, statements and peers', async () => {
    server.use(...redesignFixtureHandlers());
    server.use(http.get(`${base}/companies/:symbol/analysis`, () => HttpResponse.json({
      ...fx.fixtureCompanyAnalysis,
      ttm: { pe: { value: 10, sectorAverage: 12, verdict: 'CHEAPER' } },
      healthScore: 72, policyVersion: 'hs-v1',
      healthComponents: [{ name: 'PROFITABILITY', score: 80 }],
    })));
    section();
    const valuation = await screen.findByRole('table', { name: 'Değerleme ve kârlılık' });
    expect(within(valuation).getByText('Sektörden ucuz')).toBeInTheDocument();
    expect(await screen.findByText('Politika sürümü: hs-v1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Kârlılık 80 / 100' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /F\/K geçmişi/ })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Çeyreklik gelir ve net kâr/ })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Gelir tablosu' })).toBeInTheDocument();
    expect(within(await screen.findByRole('table', { name: 'Benzer şirketler' })).getByText(/HS1/)).toBeInTheDocument();
  });

  it('does not show a score without its policy version', async () => {
    server.use(http.get(`${base}/companies/:symbol/analysis`, () => HttpResponse.json({
      ...fx.fixtureCompanyAnalysis, healthScore: 72, policyVersion: null,
    })));
    section();
    expect(await screen.findByText(/onaylı bir politika sürümü olmadan/)).toBeInTheDocument();
    expect(screen.queryByText('72')).not.toBeInTheDocument();
  });

  it('switches the statement type through real buttons', async () => {
    let requested = '';
    server.use(http.get(`${base}/companies/:symbol/statements`, ({ request }) => {
      requested = new URL(request.url).searchParams.get('type') ?? '';
      return HttpResponse.json(fx.fixtureCompanyStatements);
    }));
    section();
    await user().click(await screen.findByRole('button', { name: 'Bilanço' }));
    await screen.findByRole('table', { name: 'Bilanço' });
    expect(requested).toBe('BALANCE');
  });
});

describe('CompanyHeaderStats', () => {
  it('keeps unknown market cap and 52-week range as a dash and links to the report', async () => {
    server.use(http.get(`${base}/assets/:symbol/detail`, () => HttpResponse.json({ symbol: 'HS1', generatedAt: 'x', profile: { status: 'EMPTY', source: 's', data: null, message: null, observedAt: 'x' }, market: { status: 'EMPTY', source: 's', data: null, message: null, observedAt: 'x' } })));
    render(<MemoryRouter><CompanyHeaderStats symbol="HS1" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Rapor oluştur/ })).toHaveAttribute('href', '/reports/HS1');
    expect(screen.getByText('52 hafta aralığı')).toBeInTheDocument();
    expect(await screen.findAllByText('—')).not.toHaveLength(0);
  });
});
