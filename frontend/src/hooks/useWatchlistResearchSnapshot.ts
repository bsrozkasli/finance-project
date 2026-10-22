import { useCallback, useEffect, useRef, useState } from 'react';
import type { WatchlistResearchSnapshot } from '../api/client';
import { fetchWatchlistResearchSnapshot } from '../api/client';

interface UseWatchlistResearchSnapshotOptions {
  limit?: number;
  offset?: number;
  symbols?: string[];
  refresh?: boolean;
}

export function useWatchlistResearchSnapshot(
  watchlistId: number | null,
  options: UseWatchlistResearchSnapshotOptions = {}
) {
  const [snapshot, setSnapshot] = useState<WatchlistResearchSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const activeLoad = useRef<(() => Promise<void>) | null>(null);
  const limit = options.limit;
  const offset = options.offset;
  const refresh = options.refresh;
  const symbols = options.symbols;

  const load = useCallback(async function loadSnapshot(): Promise<void> {
    if (activeLoad.current !== loadSnapshot) return;
    const id = ++requestId.current;
    const isCurrent = () => activeLoad.current === loadSnapshot && id === requestId.current;
    setSnapshot(null);
    if (watchlistId == null) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchWatchlistResearchSnapshot(watchlistId, { limit, offset, refresh, symbols });
      if (!isCurrent()) return;
      setSnapshot(data);
    } catch (err) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : 'İzleme listesi araştırma özeti yüklenemedi');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [watchlistId, limit, offset, refresh, symbols]);

  useEffect(() => {
    activeLoad.current = load;
    void load();
    return () => { activeLoad.current = null; };
  }, [load]);

  return { snapshot, loading, error, reload: load };
}
