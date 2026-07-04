import { useState, useCallback, useEffect } from 'react';
import type { Watchlist } from '../api/client';
import {
  fetchWatchlists,
  createWatchlist,
  addSymbolToWatchlist,
  removeSymbolFromWatchlist,
  deleteWatchlist,
} from '../api/client';

export function useWatchlists() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWatchlists();
      setWatchlists(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load watchlists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createList = useCallback(async (name: string) => {
    const wl = await createWatchlist(name);
    setWatchlists(prev => [...prev, wl]);
    return wl;
  }, []);

  const addSymbol = useCallback(async (id: number, symbol: string) => {
    const updated = await addSymbolToWatchlist(id, symbol);
    setWatchlists(prev => prev.map(wl => wl.id === id ? updated : wl));
    return updated;
  }, []);

  const removeSymbol = useCallback(async (id: number, symbol: string) => {
    await removeSymbolFromWatchlist(id, symbol);
    setWatchlists(prev =>
      prev.map(wl =>
        wl.id === id
          ? { ...wl, symbols: wl.symbols.filter(s => s !== symbol) }
          : wl
      )
    );
  }, []);

  const removeList = useCallback(async (id: number) => {
    await deleteWatchlist(id);
    setWatchlists(prev => prev.filter(wl => wl.id !== id));
  }, []);

  return {
    watchlists,
    loading,
    error,
    createList,
    addSymbol,
    removeSymbol,
    removeList,
    reload: load,
  };
}
