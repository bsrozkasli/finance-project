import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { fetchBenchmarks } from '../api/redesign';
import { API_BASE_URL } from '../api/config';
import { server } from '../test/server';
import { fixtureBenchmarks } from '../test/redesignFixtures';
import { stateFromBody, usePanelQuery } from './usePanelQuery';

const problem = (status: number) => HttpResponse.json(
  { timestamp: '2026-07-09T09:00:00Z', status, error: 'x', message: 'Sunucu hatası', path: '/benchmarks' },
  { status },
);

describe('stateFromBody', () => {
  it('maps the response status field and defaults to ready', () => {
    expect(stateFromBody({ status: 'AVAILABLE' })).toBe('ready');
    expect(stateFromBody({ status: 'PARTIAL' })).toBe('partial');
    expect(stateFromBody({ status: 'EMPTY' })).toBe('empty');
    expect(stateFromBody({ status: 'UNAVAILABLE' })).toBe('unavailable');
    expect(stateFromBody({ items: [] })).toBe('ready');
    expect(stateFromBody(null)).toBe('ready');
  });
});

describe('usePanelQuery', () => {
  it('starts loading and becomes ready with data', async () => {
    server.use(http.get(`${API_BASE_URL}/benchmarks`, () => HttpResponse.json(fixtureBenchmarks)));
    const { result } = renderHook(() => usePanelQuery(fetchBenchmarks));
    expect(result.current.state).toBe('loading');
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data?.items[0].code).toBe('BIST100');
    expect(result.current.error).toBeNull();
  });

  it.each([
    ['PARTIAL', 'partial'],
    ['EMPTY', 'empty'],
    ['UNAVAILABLE', 'unavailable'],
  ] as const)('maps body status %s to %s and keeps the body', async (status, expected) => {
    server.use(http.get(`${API_BASE_URL}/benchmarks`, () => HttpResponse.json({ ...fixtureBenchmarks, status })));
    const { result } = renderHook(() => usePanelQuery(fetchBenchmarks));
    await waitFor(() => expect(result.current.state).toBe(expected));
    expect(result.current.data?.status).toBe(status);
  });

  it.each([404, 501])('maps HTTP %i to notImplemented', async (status) => {
    server.use(http.get(`${API_BASE_URL}/benchmarks`, () => problem(status)));
    const { result } = renderHook(() => usePanelQuery(fetchBenchmarks));
    await waitFor(() => expect(result.current.state).toBe('notImplemented'));
    expect(result.current.data).toBeNull();
  });

  it('maps other failures to unavailable and exposes the error', async () => {
    server.use(http.get(`${API_BASE_URL}/benchmarks`, () => problem(503)));
    const { result } = renderHook(() => usePanelQuery(fetchBenchmarks));
    await waitFor(() => expect(result.current.state).toBe('unavailable'));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('reload refetches and recovers', async () => {
    let calls = 0;
    server.use(http.get(`${API_BASE_URL}/benchmarks`, () => {
      calls += 1;
      return calls === 1 ? problem(503) : HttpResponse.json(fixtureBenchmarks);
    }));
    const { result } = renderHook(() => usePanelQuery(fetchBenchmarks));
    await waitFor(() => expect(result.current.state).toBe('unavailable'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(calls).toBe(2);
  });

  it('refetches when deps change and ignores a superseded response', async () => {
    const fetcher = vi.fn((id: number) => Promise.resolve({ status: 'AVAILABLE', id }));
    const { result, rerender } = renderHook(({ id }) => usePanelQuery(() => fetcher(id), [id]), { initialProps: { id: 1 } });
    await waitFor(() => expect(result.current.state).toBe('ready'));
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data?.id).toBe(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
