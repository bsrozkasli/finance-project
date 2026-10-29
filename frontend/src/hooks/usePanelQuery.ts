import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorStatus } from '../api/errors';

export type PanelQueryState = 'loading' | 'ready' | 'empty' | 'partial' | 'unavailable' | 'notImplemented';

export interface PanelQuery<T> {
  state: PanelQueryState;
  data: T | null;
  error: unknown;
  reload: () => void;
}

interface Snapshot<T> {
  state: PanelQueryState;
  data: T | null;
  error: unknown;
}

const LOADING: Snapshot<never> = { state: 'loading', data: null, error: null };

/** HTTP statuses that mean "this endpoint is not built yet" (X-3 in the v2 target spec). */
const NOT_IMPLEMENTED_STATUSES = new Set([404, 501]);

/** Maps the `status` field of a redesign response body to a panel state; bodies without it are ready. */
export const stateFromBody = (body: unknown): PanelQueryState => {
  if (typeof body !== 'object' || body === null || !('status' in body)) return 'ready';
  switch ((body as { status: unknown }).status) {
    case 'PARTIAL': return 'partial';
    case 'EMPTY': return 'empty';
    case 'UNAVAILABLE': return 'unavailable';
    default: return 'ready';
  }
};

/**
 * Loads one dashboard panel. `deps` must be primitives (they are compared by value); changing them
 * reloads the panel. A 404/501 answer becomes `notImplemented`, any other failure `unavailable`;
 * a successful body is mapped through its `status` field.
 */
export function usePanelQuery<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []): PanelQuery<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>(LOADING);
  const [reloadToken, setReloadToken] = useState(0);
  const fetcherRef = useRef(fetcher);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    setSnapshot(LOADING);
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setSnapshot({ state: stateFromBody(data), data, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        const status = getApiErrorStatus(error);
        const state = status !== null && NOT_IMPLEMENTED_STATUSES.has(status) ? 'notImplemented' : 'unavailable';
        setSnapshot({ state, data: null, error });
      },
    );
    return () => { cancelled = true; };
  }, [depsKey, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { state: snapshot.state, data: snapshot.data, error: snapshot.error, reload };
}
