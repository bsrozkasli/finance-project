import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StockDetailModal from './StockDetailModal';
import { useAnalystRatings } from '../hooks/useAnalystRatings';
import { useSmartReport } from '../hooks/useSmartReport';
import { useTechnicalAnalysis } from '../hooks/useTechnicalAnalysis';
import { useWatchlistResearch } from '../hooks/useWatchlistResearch';
import type { Stock } from '../types';

vi.mock('../hooks/useAnalystRatings', () => ({ useAnalystRatings: vi.fn() }));
vi.mock('../hooks/useSmartReport', () => ({ useSmartReport: vi.fn() }));
vi.mock('../hooks/useTechnicalAnalysis', () => ({ useTechnicalAnalysis: vi.fn() }));
vi.mock('../hooks/useWatchlistResearch', () => ({ useWatchlistResearch: vi.fn() }));

const stock: Stock = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  price: 200,
  change: 1,
  changePercent: 0.5,
  open: 199,
  high: 201,
  low: 198,
  close: 200,
  volume: '1M',
  high52W: 230,
  low52W: 150,
  marketCap: '$3T',
  pe: 30,
  pb: 40,
  debtEquity: 1,
  roe: 1,
  revenueGrowth: 1,
  divYield: null,
  history: [],
  sparkline: [],
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
};

describe('StockDetailModal', () => {
  beforeEach(() => {
    vi.mocked(useAnalystRatings).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });
    vi.mocked(useTechnicalAnalysis).mockReturnValue({ data: null, loading: false, error: null, lastFetched: null, refetch: vi.fn() });
    vi.mocked(useWatchlistResearch).mockReturnValue({
      data: { fundamentals: null, ratios: null, fiveDay: [], threeMonth: [], oneYear: [] },
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it('renders a partial smart report without replacing unavailable scores', async () => {
    vi.mocked(useSmartReport).mockReturnValue({
      report: {
        symbol: 'AAPL',
        overallScore: 72,
        grade: null,
        recommendation: null,
        breakdown: {
          fundamentalScore: 72,
          valuationScore: null,
          qualityScore: null,
          growthScore: null,
          momentumScore: null,
          riskScore: null,
          earningsScore: null,
          sentimentScore: null,
        },
        peers: [],
      } as never,
      loading: false,
      error: null,
    });

    render(<StockDetailModal stock={stock} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /akıllı rapor/i }));
    await userEvent.click(screen.getByRole('button', { name: /analizi oluştur/i }));

    expect(screen.getAllByText('72 / 100')).toHaveLength(2);
    expect(screen.getAllByText((_, element) => element?.textContent === 'Değerleme: Veri yok')).toHaveLength(2);
    expect(screen.queryByText('50 / 100')).not.toBeInTheDocument();
  });

  it('does not claim a STOCK type when no stock data is available', () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);

    render(<StockDetailModal stock={null} symbol="ZZZZ" onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);

    expect(screen.queryByText(/^STOCK -/)).not.toBeInTheDocument();
    expect(screen.getByText(/Tür bilinmiyor/)).toBeInTheDocument();
  });

  it('is a named dialog with Turkish tabs that closes with Escape and the close button', async () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);
    const onClose = vi.fn();

    render(<StockDetailModal stock={stock} onClose={onClose} onOpenTradeModal={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Apple Inc. (AAPL)' })).toBeInTheDocument();
    for (const tab of ['Genel bakış', 'Teknik', 'Analist görüşü', 'Akıllı rapor']) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument();
    }
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows the daily change in percent points without scaling it again', () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);

    render(<StockDetailModal stock={stock} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);

    expect(screen.getByText('+0.50%')).toBeInTheDocument();
    expect(screen.queryByText('+50.00%')).not.toBeInTheDocument();
  });

  it('does not invent a zero target price when the provider sends recommendations without one', async () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);
    vi.mocked(useAnalystRatings).mockReturnValue({
      data: {
        recommendations: [{ period: '2026-10-01', strongBuy: 5, buy: 3, hold: 2, sell: 0, strongSell: 0 }],
        priceTarget: null,
      } as never,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockDetailModal stock={stock} onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Analist görüşü' }));

    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/-100/)).not.toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('does not place the 52-week marker when the range is unknown', () => {
    vi.mocked(useSmartReport).mockReturnValue({ report: null, loading: false, error: null } as never);

    render(<StockDetailModal stock={null} symbol="ZZZZ" onClose={vi.fn()} onOpenTradeModal={vi.fn()} />);

    expect(screen.getByText(/Yıllık aralıktaki konum: —/)).toBeInTheDocument();
    expect(screen.queryByText(/0% of yearly range/)).not.toBeInTheDocument();
  });
});
