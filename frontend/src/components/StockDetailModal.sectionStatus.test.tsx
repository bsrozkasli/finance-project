import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StockDetailModal from './StockDetailModal';
import { useAnalystRatings } from '../hooks/useAnalystRatings';
import { useSmartReport, type SmartReport, type SmartReportSectionStatus } from '../hooks/useSmartReport';
import { useTechnicalAnalysis } from '../hooks/useTechnicalAnalysis';
import { useTechnicalWorkspace } from '../hooks/useTechnicalWorkspace';
import { useWatchlistResearch } from '../hooks/useWatchlistResearch';
import type { Stock } from '../types';

vi.mock('../hooks/useAnalystRatings', () => ({ useAnalystRatings: vi.fn() }));
vi.mock('../hooks/useSmartReport', () => ({ useSmartReport: vi.fn() }));
vi.mock('../hooks/useTechnicalAnalysis', () => ({ useTechnicalAnalysis: vi.fn() }));
vi.mock('../hooks/useTechnicalWorkspace', () => ({ useTechnicalWorkspace: vi.fn() }));
vi.mock('../hooks/useWatchlistResearch', () => ({ useWatchlistResearch: vi.fn() }));

const stock = {
  symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', price: 200,
  change: 1, changePercent: 0.5, open: 199, high: 201, low: 198, close: 200, volume: '1M', high52W: 230, low52W: 150,
  marketCap: '$3T', pe: 30, pb: 40, debtEquity: 1, roe: 1, revenueGrowth: 1, divYield: null, history: [], sparkline: [],
  news: [], technicals: null, analystRating: null, alerts: [],
} as Stock;

const allScores = {
  fundamentalScore: 60, valuationScore: 60, qualityScore: 60, growthScore: 60,
  momentumScore: 60, riskScore: 60, earningsScore: 60, sentimentScore: 60,
};
const keys = ['fundamental', 'valuation', 'quality', 'growth', 'momentum', 'risk', 'earnings', 'sentiment'].map((k) => `${k}_score`);
const okStatus = (): SmartReportSectionStatus => ({
  overall: 'OK',
  components: Object.fromEntries(keys.map((k) => [k, { status: 'OK', reason: null }])) as SmartReportSectionStatus['components'],
});

async function renderReport(overrides: Record<string, unknown> = {}, breakdown: Record<string, number | null> = {}) {
  vi.mocked(useSmartReport).mockReturnValue({
    report: { symbol: 'AAPL', overallScore: 60, grade: 'B', recommendation: 'Hold', breakdown: { ...allScores, ...breakdown }, peers: [], sectionStatus: okStatus(), ...overrides } as unknown as SmartReport,
    loading: false,
    error: null,
  });
  render(<StockDetailModal stock={stock} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /akıllı rapor/i }));
  await userEvent.click(screen.getByRole('button', { name: /analizi oluştur/i }));
}

const panel = () => screen.getByRole('region', { name: 'Veri durumu' });
const row = (label: string) => within(panel()).getByText(label).closest('[data-component-row]') as HTMLElement;

describe('StockDetailModal smart report section status', () => {
  beforeEach(() => {
    vi.mocked(useAnalystRatings).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });
    vi.mocked(useTechnicalAnalysis).mockReturnValue({ data: null, loading: false, error: null, lastFetched: null, refetch: vi.fn() });
    vi.mocked(useTechnicalWorkspace).mockReturnValue({ data: null, loading: false, error: null } as never);
    vi.mocked(useWatchlistResearch).mockReturnValue({
      data: { fundamentals: null, ratios: null, fiveDay: [], threeMonth: [], oneYear: [] }, loading: false, error: null, reload: vi.fn(),
    });
  });

  it('shows no warning and no incomplete-evidence note when every component is OK', async () => {
    await renderReport();
    const pills = within(panel()).getAllByText('OK');
    expect(pills).toHaveLength(8);
    for (const pill of pills) expect(pill.className).not.toMatch(/warning-amber|bear-red/);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/eksik kanıta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/durum bilinmiyor/i)).not.toBeInTheDocument();
  });

  it.each([
    ['EMPTY', 'valuation_component_unavailable', 'Veri yok'],
    ['INSUFFICIENT_DATA', 'fallback_source_used', 'Yetersiz geçmiş'],
    ['FAILED', 'llm_response_unparseable', 'Yüklenemedi'],
  ] as const)('renders a null score with status %s as "Veri yok" plus pill and reason', async (status, reason, pillLabel) => {
    const sectionStatus = okStatus();
    sectionStatus.overall = status;
    sectionStatus.components.valuation_score = { status, reason };
    await renderReport({ sectionStatus }, { valuationScore: null });

    const valuation = row('Değerleme');
    expect(within(valuation).getByText('Veri yok', { selector: '[data-value]' })).toBeInTheDocument();
    expect(within(valuation).getByText(pillLabel, { selector: 'span.rounded-full' })).toBeInTheDocument();
    expect(within(valuation).getByText(reason)).toBeInTheDocument();
    expect(within(valuation).getByLabelText('puan yok')).toBeInTheDocument();
    if (reason === 'fallback_source_used') expect(within(valuation).getByText(/yedek kaynak/)).toBeInTheDocument();
    expect(within(valuation).queryByText(/^0/)).not.toBeInTheDocument();
    expect(screen.getByText(/eksik kanıta/i)).toBeInTheDocument();
  });

  it('says the status is unknown, never OK, when sectionStatus is null', async () => {
    await renderReport({ sectionStatus: null });
    expect(screen.getByText(/durum bilinmiyor/i)).toBeInTheDocument();
    expect(screen.getByText(/eksik kanıta/i)).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('treats an absent sectionStatus (old backend) as unknown, never OK', async () => {
    await renderReport({ sectionStatus: undefined });
    expect(screen.getByText(/durum bilinmiyor/i)).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('treats a null or unrecognised component status as unknown, not OK', async () => {
    const sectionStatus = okStatus();
    sectionStatus.components.risk_score = { status: null, reason: null };
    sectionStatus.components.growth_score = { status: 'SURPRISE' as never, reason: null };
    await renderReport({ sectionStatus: { ...sectionStatus, overall: null } });
    expect(within(row('Risk')).queryByText('OK')).not.toBeInTheDocument();
    expect(within(row('Risk')).getByText(/durum bilinmiyor/i)).toBeInTheDocument();
    expect(within(row('Büyüme')).queryByText('OK')).not.toBeInTheDocument();
    expect(within(row('Büyüme')).queryByText('Yüklenemedi')).not.toBeInTheDocument();
    expect(row('Büyüme').querySelector('span.rounded-full')).toBeNull();
    expect(within(row('Büyüme')).getByText(/durum bilinmiyor/i)).toBeInTheDocument();
    expect(screen.getByText(/eksik kanıta/i)).toBeInTheDocument();
  });

  it('lists a component that only sectionStatus reports, with its status and reason', async () => {
    const sectionStatus = okStatus();
    sectionStatus.components.brand_new_score = { status: 'EMPTY', reason: 'brand_new_unavailable' };
    await renderReport({ sectionStatus });
    const extra = row('brand new');
    expect(within(extra).getByText('Veri yok', { selector: 'span.rounded-full' })).toBeInTheDocument();
    expect(within(extra).getByText('brand_new_unavailable')).toBeInTheDocument();
    expect(screen.getAllByText(/Hold/).length).toBeGreaterThan(0);
  });

  it('still lists sectionStatus components when the breakdown is null', async () => {
    const sectionStatus = okStatus();
    await renderReport({ sectionStatus, breakdown: null });
    expect(within(panel()).getAllByText('OK')).toHaveLength(8);
  });

  it.each([
    ['non-OK', { ...okStatus(), overall: 'EMPTY' as const }],
    ['unknown', null],
  ])('puts the incomplete-evidence note before the grade text for %s status', async (_name, sectionStatus) => {
    await renderReport({ sectionStatus });
    const note = screen.getByRole('note');
    const grade = screen.getByText('Not:', { exact: false, selector: 'strong' });
    expect(note.compareDocumentPosition(grade) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(panel()).queryByRole('note')).not.toBeInTheDocument();
  });

  it('hides the analyst rating bar when there is no analyst data', async () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);
    const { container } = render(<StockDetailModal stock={stock} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Analist görüşü' }));
    expect(container.querySelector('.bg-bull-green.h-full')).toBeNull();
  });

  it('does not colour a missing price change as a gain', () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);
    render(<StockDetailModal stock={{ ...stock, changePercent: null as never }} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);
    const change = screen.getByText('Güncel değer').parentElement?.querySelector('span.text-sm');
    expect(change).toBeDefined();
    expect(change?.className).not.toContain('text-bull-green');
  });

  it('shows the candle count as unknown instead of 0 when the workspace has no data', async () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);
    render(<StockDetailModal stock={stock} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Teknik' }));
    expect(screen.queryByText('0 mum')).not.toBeInTheDocument();
    expect(screen.getByText('— mum')).toBeInTheDocument();
  });
});
