import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWatchlistResearchSnapshot, type WatchlistResearchSnapshot } from '../api/client';
import { useWatchlistResearchSnapshot } from './useWatchlistResearchSnapshot';

// Control the HTTP boundary to reproduce delayed requests without live providers.
vi.mock('../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/client')>(),
  fetchWatchlistResearchSnapshot: vi.fn(),
}));

const fetchSnapshot = vi.mocked(fetchWatchlistResearchSnapshot);
const snapshot = (watchlistId: number, offset = 0): WatchlistResearchSnapshot => ({
  watchlistId, watchlistName: `List ${watchlistId}`, totalSymbols: 0, limit: 50, offset,
  requestedSymbols: [], rows: [], generatedAt: '2026-07-09T20:00:00Z',
  policy: { maxLimit: 50, providerConcurrencyLimit: 4, providerTimeoutMillis: 1000, partialFailureEnabled: true, staleWhileRevalidateEnabled: true },
});

function pendingSnapshot() {
  let resolve!: (value: WatchlistResearchSnapshot) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<WatchlistResearchSnapshot>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('useWatchlistResearchSnapshot request ownership', () => {
  beforeEach(() => fetchSnapshot.mockReset());

  it.each(['success', 'failure'] as const)('ignores a previous list response after selecting another list: %s', async (outcome) => {
    const old = pendingSnapshot();
    fetchSnapshot.mockReturnValueOnce(old.promise).mockResolvedValueOnce(snapshot(2));
    const { result, rerender } = renderHook(({ id }) => useWatchlistResearchSnapshot(id), { initialProps: { id: 1 } });
    await act(async () => rerender({ id: 2 }));
    expect(result.current.snapshot?.watchlistId).toBe(2);
    await act(async () => {
      if (outcome === 'success') old.resolve(snapshot(1));
      else old.reject(new Error('Old list failed'));
    });
    expect(result.current.snapshot?.watchlistId).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('clears previous rows while loading a different page', async () => {
    fetchSnapshot.mockResolvedValueOnce(snapshot(1)).mockReturnValueOnce(pendingSnapshot().promise);
    const { result, rerender } = renderHook(({ offset }) => useWatchlistResearchSnapshot(1, { offset }), { initialProps: { offset: 0 } });
    await act(async () => {});
    rerender({ offset: 50 });
    expect(result.current.snapshot).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('keeps loading true when an obsolete request finishes before the current one', async () => {
    const old = pendingSnapshot();
    const current = pendingSnapshot();
    fetchSnapshot.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result, rerender } = renderHook(({ id }) => useWatchlistResearchSnapshot(id), { initialProps: { id: 1 } });
    rerender({ id: 2 });
    await act(async () => old.resolve(snapshot(1)));
    expect(result.current.loading).toBe(true);
    expect(result.current.snapshot).toBeNull();
    await act(async () => current.resolve(snapshot(2)));
    expect(result.current.snapshot?.watchlistId).toBe(2);
    expect(result.current.loading).toBe(false);
  });

  it('does not restore rows after clearing the selected list', async () => {
    const old = pendingSnapshot();
    fetchSnapshot.mockReturnValueOnce(old.promise);
    const { result, rerender } = renderHook(({ id }) => useWatchlistResearchSnapshot(id), { initialProps: { id: 1 as number | null } });
    rerender({ id: null });
    await act(async () => old.resolve(snapshot(1)));
    expect(result.current.snapshot).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('exposes a failed refresh without keeping apparently current rows', async () => {
    fetchSnapshot.mockResolvedValueOnce(snapshot(1)).mockRejectedValueOnce(new Error('Refresh failed'));
    const { result } = renderHook(() => useWatchlistResearchSnapshot(1));
    await act(async () => {});
    await act(async () => { await result.current.reload(); });
    expect(result.current.snapshot).toBeNull();
    expect(result.current.error).toBe('Refresh failed');
    expect(result.current.loading).toBe(false);
  });

  it('does not let a retained reload callback restore a previously selected list', async () => {
    fetchSnapshot.mockImplementation(async (id) => snapshot(id));
    const { result, rerender } = renderHook(({ id }) => useWatchlistResearchSnapshot(id), { initialProps: { id: 1 } });
    await act(async () => {});
    const previousReload = result.current.reload;
    await act(async () => rerender({ id: 2 }));
    await act(async () => { await previousReload(); });
    expect(result.current.snapshot?.watchlistId).toBe(2);
  });
});
