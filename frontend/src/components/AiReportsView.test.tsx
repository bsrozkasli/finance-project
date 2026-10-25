import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiReportsView from './AiReportsView';
import { useBacktest } from '../hooks/useBacktest';
import { useSmartReport } from '../hooks/useSmartReport';

vi.mock('../hooks/useSmartReport', () => ({ useSmartReport: vi.fn() }));
vi.mock('../hooks/useBacktest', () => ({ useBacktest: vi.fn() }));

const holdings = [{ symbol: 'AAPL', quantity: 1, costPrice: 100 }];

describe('AiReportsView', () => {
  beforeEach(() => {
    vi.mocked(useBacktest).mockReturnValue({ data: null, loading: false, error: null } as never);
  });

  it('says there is no verdict when the report has no overall score, grade or recommendation', () => {
    vi.mocked(useSmartReport).mockReturnValue({
      report: {
        symbol: 'AAPL',
        overallScore: null,
        grade: null,
        recommendation: null,
        breakdown: { sentimentScore: 70, valuationScore: null },
      },
      loading: false,
      error: null,
    } as never);

    render(<MemoryRouter><AiReportsView holdings={holdings} stocks={[]} /></MemoryRouter>);

    expect(screen.getByText('Kısmi veri: genel değerlendirme için yeterli kanıt yok.')).toBeInTheDocument();
    expect(screen.queryByText('·', { exact: false })).not.toBeInTheDocument();
  });

  it('shows the grade and recommendation when the report has them', () => {
    vi.mocked(useSmartReport).mockReturnValue({
      report: { symbol: 'AAPL', overallScore: 78, grade: 'B+', recommendation: 'Accumulate', breakdown: {} },
      loading: false,
      error: null,
    } as never);

    render(<MemoryRouter><AiReportsView holdings={holdings} stocks={[]} /></MemoryRouter>);

    expect(screen.getByText('B+ · Accumulate')).toBeInTheDocument();
  });
});
