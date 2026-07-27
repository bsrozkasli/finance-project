import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBatchAssetProfiles, fetchBatchLatestPrices, type MarketQuote } from '../api/client';
import { selectDisplayQuote, useMarketOverviewData } from './useMarketOverviewData';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    fetchBatchAssetProfiles: vi.fn(),
    fetchBatchLatestPrices: vi.fn(),
  };
});

const mockedLatest = vi.mocked(fetchBatchLatestPrices);
const mockedProfiles = vi.mocked(fetchBatchAssetProfiles);

const quote: MarketQuote = {
  symbol: 'AAPL',
  marketState: 'POST_MARKET',
  exchangeTimezone: 'America/New_York',
  previousClose: 209,
  regularPrice: 210,
  regularChange: 1,
  regularChangePercent: 1 / 209,
  regularTimestamp: '2026-07-24T20:00:00Z',
  preMarketPrice: null,
  preMarketChange: null,
  preMarketChangePercent: null,
  preMarketTimestamp: null,
  postMarketPrice: 211,
  postMarketChange: 2,
  postMarketChangePercent: 2 / 209,
  postMarketTimestamp: '2026-07-24T21:00:00Z',
  delayed: false,
};

const setVisibility = (value: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  document.dispatchEvent(new Event('visibilitychange'));
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useMarketOverviewData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    mockedLatest.mockReset().mockResolvedValue({
      quotes: { AAPL: { status: 'OK', source: 'yahoo', data: quote, message: null, observedAt: '2026-07-24T21:00:00Z' } },
      generatedAt: '2026-07-24T21:00:00Z',
    });
    mockedProfiles.mockReset().mockResolvedValue({ profiles: {}, generatedAt: '2026-07-24T21:00:00Z' });
  });

  it('selects the provider session price without inventing a value', () => {
    expect(selectDisplayQuote(quote)).toMatchObject({ price: 211, change: 2, marketState: 'POST_MARKET' });
    expect(selectDisplayQuote({ ...quote, regularPrice: null, postMarketPrice: null })).toBeNull();
  });

  it('polls every 30 seconds only while the document is visible', async () => {
    const { unmount } = renderHook(() => useMarketOverviewData(['aapl', 'AAPL'], []));
    await flush();
    expect(mockedLatest).toHaveBeenCalledTimes(1);
    expect(mockedLatest).toHaveBeenLastCalledWith(['AAPL']);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(mockedLatest).toHaveBeenCalledTimes(2);

    act(() => setVisibility('hidden'));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mockedLatest).toHaveBeenCalledTimes(2);

    act(() => setVisibility('visible'));
    await flush();
    expect(mockedLatest).toHaveBeenCalledTimes(3);
    unmount();
  });
});