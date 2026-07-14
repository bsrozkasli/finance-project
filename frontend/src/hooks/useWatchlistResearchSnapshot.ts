import { useCallback, useEffect, useState } from 'react';
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
  const limit = options.limit;
  const offset = options.offset;
  const refresh = options.refresh;
  const symbols = options.symbols;

  const load = useCallback(async () => {
    if (watchlistId == null) {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchWatchlistResearchSnapshot(watchlistId, { limit, offset, refresh, symbols });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist research snapshot');
    } finally {
      setLoading(false);
    }
  }, [watchlistId, limit, offset, refresh, symbols]);

  useEffect(() => {
    void load();
  }, [load]);

  return { snapshot, loading, error, reload: load };
}