import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBatchAssetProfiles, fetchBatchLatestPrices, type AssetMarketBatch, type MarketQuote } from '../api/client';
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

function pendingQuotes() {
  let resolve!: (value: AssetMarketBatch) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<AssetMarketBatch>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const quoteBatch = (symbol: string, generatedAt: string): AssetMarketBatch => ({
  quotes: { [symbol]: { status: 'OK', source: 'test', data: { ...quote, symbol }, message: null, observedAt: generatedAt } },
  generatedAt,
});

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

  it.each(['success', 'failure'] as const)('ignores an obsolete batch after the requested symbols change: %s', async (outcome) => {
    const old = pendingQuotes();
    mockedLatest.mockReturnValueOnce(old.promise).mockResolvedValueOnce(quoteBatch('MSFT', '2026-07-25T21:00:00Z'));
    const { result, rerender } = renderHook(({ symbols }) => useMarketOverviewData(symbols, []), { initialProps: { symbols: ['AAPL'] } });
    await act(async () => rerender({ symbols: ['MSFT'] }));
    await act(async () => {
      if (outcome === 'success') old.resolve(quoteBatch('AAPL', '2026-07-24T21:00:00Z'));
      else old.reject(new Error('Obsolete batch failed'));
    });
    expect(Object.keys(result.current.quotes)).toEqual(['MSFT']);
    expect(result.current.lastUpdated).toBe('2026-07-25T21:00:00Z');
    expect(result.current.error).toBeNull();
  });

  it('does not repopulate quotes after the symbols are cleared', async () => {
    const old = pendingQuotes();
    mockedLatest.mockReturnValueOnce(old.promise);
    const { result, rerender } = renderHook(({ symbols }) => useMarketOverviewData(symbols, []), { initialProps: { symbols: ['AAPL'] } });
    rerender({ symbols: [] });
    await act(async () => old.resolve(quoteBatch('AAPL', '2026-07-24T21:00:00Z')));
    expect(result.current.quotes).toEqual({});
    expect(result.current.lastUpdated).toBeNull();
  });

  it('preserves a newer manual refresh when an older batch arrives later', async () => {
    const old = pendingQuotes();
    mockedLatest.mockReturnValueOnce(old.promise).mockResolvedValueOnce(quoteBatch('AAPL', '2026-07-25T21:00:00Z'));
    const { result } = renderHook(() => useMarketOverviewData(['AAPL'], []));
    await act(async () => { await result.current.reload(); });
    await act(async () => old.resolve(quoteBatch('AAPL', '2026-07-24T21:00:00Z')));
    expect(result.current.lastUpdated).toBe('2026-07-25T21:00:00Z');
    expect(result.current.quotes.AAPL.observedAt).toBe('2026-07-25T21:00:00Z');
  });

  it('does not hide a company profile failure when quote polling succeeds', async () => {
    mockedProfiles.mockRejectedValueOnce(new Error('Profiles unavailable'));
    const { result } = renderHook(() => useMarketOverviewData(['AAPL'], ['AAPL']));
    await flush();
    await act(async () => { await result.current.reload(); });
    expect(result.current.error).toContain('Company profiles');
    expect(result.current.quotes.AAPL.data?.symbol).toBe('AAPL');
  });

  it('does not let a retained reload callback restore previously requested symbols', async () => {
    mockedLatest.mockImplementation(async (symbols) => quoteBatch(symbols[0], '2026-07-24T21:00:00Z'));
    const { result, rerender } = renderHook(({ symbols }) => useMarketOverviewData(symbols, []), { initialProps: { symbols: ['AAPL'] } });
    await flush();
    const previousReload = result.current.reload;
    await act(async () => rerender({ symbols: ['MSFT'] }));
    await act(async () => { await previousReload(); });
    expect(Object.keys(result.current.quotes)).toEqual(['MSFT']);
  });
});
