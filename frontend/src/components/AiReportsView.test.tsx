import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import AiReportsView from './AiReportsView';

const API_BASE = 'http://localhost:8080/api/v1';

describe('AiReportsView', () => {
  it('treats malformed research and backtest responses as unavailable', async () => {
    server.use(
      http.get(`${API_BASE}/reports/smart/AAPL`, () => HttpResponse.json([])),
      http.get(`${API_BASE}/backtest/AAPL`, () => HttpResponse.json([])),
    );

    render(<AiReportsView holdings={[{ symbol: 'AAPL', quantity: 2, costPrice: 100 }]} stocks={[]} />);

    expect(await screen.findByText(/Research unavailable/i)).toBeInTheDocument();
    expect(await screen.findByText(/Backtest unavailable/i)).toBeInTheDocument();
  });

  it('shows supported symbol research and does not offer an unavailable portfolio AI report', async () => {
    server.use(
      http.get(`${API_BASE}/reports/smart/AAPL`, () => HttpResponse.json({
        symbol: 'AAPL', overallScore: 71, grade: 'B', recommendation: 'WATCH', breakdown: null, peers: [],
      })),
      http.get(`${API_BASE}/backtest/AAPL`, () => HttpResponse.json({
        symbol: 'AAPL', currentRsi: 50, scenarioDescription: '', totalOccurrences: 0, winRate: 0, averageReturnPct: 0, isMeaningful: false,
      })),
    );

    render(<AiReportsView holdings={[{ symbol: 'AAPL', quantity: 2, costPrice: 100 }]} stocks={[]} />);

    expect(await screen.findByText('71 / 100')).toBeInTheDocument();
    expect(screen.getByText(/portfolio report is not available/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /macro overview|portfolio optimization plan|risk & sector concentration/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/gemini-3.5-flash/i)).not.toBeInTheDocument();
    expect(screen.queryByText('$200.00')).not.toBeInTheDocument();
  });
});
