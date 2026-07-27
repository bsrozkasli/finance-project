import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { useAssetMarketData } from './useAssetMarketData';
import { useMarketContext } from './useMarketContext';

const API_BASE = 'http://localhost:8080/api/v1';
const apiUrl = (path: string) => `${API_BASE}${path}`;
const asset = { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' };

const bars = [
  {
    assetId: 'AAPL',
    open: 101,
    high: 112,
    low: 100,
    close: 110,
    volume: 1200,
    timestamp: '2026-07-09T20:00:00Z',
  },
  {
    assetId: 'AAPL',
    open: 98,
    high: 102,
    low: 97,
    close: 100,
    volume: 1000,
    timestamp: '2026-07-08T20:00:00Z',
  },
];

describe('app market-data hooks', () => {
  it('maps real batch history into sorted stock data without inventing fundamentals', async () => {
    // Mock the Spring HTTP boundary so the hook never reaches a live market provider.
    server.use(
      http.post(apiUrl('/prices/batch-history'), () => HttpResponse.json({ AAPL: bars })),
    );

    const { result } = renderHook(() => useAssetMarketData([asset]));

    await waitFor(() => expect(result.current.stocks).toHaveLength(1));

    expect(result.current.error).toBeNull();
    expect(result.current.stocks).toHaveLength(1);
    expect(result.current.stocks[0]).toMatchObject({
      symbol: 'AAPL',
      price: 110,
      change: 10,
      changePercent: 10,
      high52W: 112,
      low52W: 97,
      volume: '1,200',
      marketCap: null,
      pe: null,
      technicals: null,
    });
    expect(result.current.stocks[0].sparkline).toEqual([100, 110]);
    expect(result.current.stocks[0].history.map((point) => point.date)).toEqual(['2026-07-08', '2026-07-09']);
  });

  it('exposes batch-history failures and returns no fabricated stocks', async () => {
    // Mock the Spring HTTP boundary to exercise provider degradation deterministically.
    server.use(
      http.post(
        apiUrl('/prices/batch-history'),
        () => HttpResponse.json({ message: 'provider unavailable' }, { status: 503 }),
      ),
    );

    const { result } = renderHook(() => useAssetMarketData([asset]));

    await waitFor(() => expect(result.current.error).toBe('provider unavailable'));

    expect(result.current.loading).toBe(false);
    expect(result.current.stocks).toEqual([]);
  });

  it('keeps available market context when the calendar provider fails', async () => {
    const news = {
      id: 7,
      datetime: 1_783_600_000,
      headline: 'AI demand update',
      image: '',
      related: 'MSFT,AAPL',
      source: 'Wire',
      summary: 'Demand remains firm.',
      url: 'https://example.test/news/7',
      category: 'AI',
      relatedSymbols: ['AAPL'],
    };
    // Mock both Spring endpoints to verify partial response preservation without live I/O.
    server.use(
      http.get(apiUrl('/news/portfolio'), () => HttpResponse.json([news])),
      http.get(apiUrl('/news/macro'), () => HttpResponse.json([])),
      http.get(
        apiUrl('/calendar/economic-events'),
        () => HttpResponse.json({ message: 'calendar unavailable' }, { status: 503 }),
      ),
      http.get(apiUrl('/calendar'), () => HttpResponse.json({ earnings: [], economicEvents: [] })),
    );

    const { result } = renderHook(() => useMarketContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.news).toEqual([
      expect.objectContaining({
        id: '7',
        title: 'AI demand update',
        category: 'tech',
        symbol: 'AAPL',
      }),
    ]);
    expect(result.current.calendarEvents).toEqual([]);
    expect(result.current.error).toBe('Failed to load economic events');
  });

  it('maps successful economic events into the shell contract', async () => {
    // Mock both Spring endpoints so event mapping is independent of external providers.
    server.use(
      http.get(apiUrl('/news/portfolio'), () => HttpResponse.json([])),
      http.get(apiUrl('/news/macro'), () => HttpResponse.json([])),
      http.get(apiUrl('/calendar/economic-events'), () => HttpResponse.json([
        { event: 'CPI', date: '2026-07-09T12:30:00Z', impact: 'HIGH' },
      ])),
      http.get(apiUrl('/calendar'), () => HttpResponse.json({ earnings: [], economicEvents: [] })),
    );

    const { result } = renderHook(() => useMarketContext());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.news).toEqual([]);
    expect(result.current.calendarEvents).toEqual([
      { id: '0', title: 'CPI', date: '2026-07-09', time: '12:30', importance: 'HIGH' },
    ]);
    expect(result.current.error).toBeNull();
  });
});
