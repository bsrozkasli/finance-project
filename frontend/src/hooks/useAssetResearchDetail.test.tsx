import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAssetResearchDetail, type AssetResearchDetail } from '../api/client';
import { useAssetResearchDetail } from './useAssetResearchDetail';

// Control the HTTP boundary to reproduce responses arriving out of order.
vi.mock('../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/client')>(),
  fetchAssetResearchDetail: vi.fn(),
}));

const fetchDetail = vi.mocked(fetchAssetResearchDetail);
const detail = (symbol: string): AssetResearchDetail => ({
  symbol,
  profile: { status: 'EMPTY', source: 'test', data: null, message: null, observedAt: '2026-07-09T20:00:00Z' },
  market: { status: 'EMPTY', source: 'test', data: null, message: null, observedAt: '2026-07-09T20:00:00Z' },
  generatedAt: '2026-07-09T20:00:00Z',
});

function pendingDetail() {
  let resolve!: (value: AssetResearchDetail) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<AssetResearchDetail>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('useAssetResearchDetail request ownership', () => {
  beforeEach(() => fetchDetail.mockReset());

  it.each(['success', 'failure'] as const)('ignores an old symbol response after the new symbol loads: %s', async (outcome) => {
    const old = pendingDetail();
    fetchDetail.mockReturnValueOnce(old.promise).mockResolvedValueOnce(detail('MSFT'));
    const { result, rerender } = renderHook(({ symbol }) => useAssetResearchDetail(symbol), { initialProps: { symbol: 'AAPL' } });

    await act(async () => rerender({ symbol: 'MSFT' }));
    expect(result.current.data?.symbol).toBe('MSFT');

    await act(async () => {
      if (outcome === 'success') old.resolve(detail('AAPL'));
      else old.reject(new Error('Old request failed'));
    });
    expect(result.current.data?.symbol).toBe('MSFT');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('does not display the previous symbol while the next symbol is loading', async () => {
    fetchDetail.mockResolvedValueOnce(detail('AAPL')).mockReturnValueOnce(pendingDetail().promise);
    const { result, rerender } = renderHook(({ symbol }) => useAssetResearchDetail(symbol), { initialProps: { symbol: 'AAPL' } });
    await act(async () => {});
    rerender({ symbol: 'MSFT' });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('clears loading and prevents a pending request from repopulating a cleared selection', async () => {
    const old = pendingDetail();
    fetchDetail.mockReturnValueOnce(old.promise);
    const { result, rerender } = renderHook(({ symbol }) => useAssetResearchDetail(symbol), { initialProps: { symbol: 'AAPL' as string | null } });
    rerender({ symbol: null });
    expect(result.current.loading).toBe(false);
    await act(async () => old.resolve(detail('AAPL')));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('keeps the latest reload when overlapping reloads finish in reverse order', async () => {
    fetchDetail.mockResolvedValueOnce(detail('AAPL'));
    const { result } = renderHook(() => useAssetResearchDetail('AAPL'));
    await act(async () => {});
    const old = pendingDetail();
    fetchDetail.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...detail('AAPL'), generatedAt: '2026-07-10T20:00:00Z' });
    act(() => { void result.current.reload(); });
    await act(async () => { await result.current.reload(); });
    await act(async () => old.resolve(detail('AAPL')));
    expect(result.current.data?.generatedAt).toBe('2026-07-10T20:00:00Z');
  });

  it('does not let a retained reload callback restore a previously selected symbol', async () => {
    fetchDetail.mockImplementation(async (symbol) => detail(symbol));
    const { result, rerender } = renderHook(({ symbol }) => useAssetResearchDetail(symbol), { initialProps: { symbol: 'AAPL' } });
    await act(async () => {});
    const previousReload = result.current.reload;
    await act(async () => rerender({ symbol: 'MSFT' }));
    await act(async () => { await previousReload(); });
    expect(result.current.data?.symbol).toBe('MSFT');
  });
});
