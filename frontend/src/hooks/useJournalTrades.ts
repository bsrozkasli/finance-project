import { useState, useCallback, useEffect } from 'react';
import type {
  JournalTrade,
  JournalStats,
  AddJournalTradeRequest,
  PagedResponse,
} from '../api/client';
import {
  fetchJournalTrades,
  fetchJournalStats,
  addJournalTrade,
  updateJournalTrade,
  deleteJournalTrade,
} from '../api/client';

export function useJournalTrades() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (page = 0) => {
    setLoading(true);
    setError(null);
    try {
      const [pagedData, statsData] = await Promise.allSettled([
        fetchJournalTrades(page),
        fetchJournalStats(),
      ]);

      if (pagedData.status === 'fulfilled') {
        const paged = pagedData.value as PagedResponse<JournalTrade>;
        setTrades(paged.content ?? []);
        setTotal(paged.totalElements ?? 0);
      } else {
        setTrades([]);
        setTotal(0);
      }

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value as JournalStats);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load journal trades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTrade = useCallback(async (req: AddJournalTradeRequest) => {
    const created = await addJournalTrade(req);
    setTrades(prev => [created, ...prev]);
    setTotal(prev => prev + 1);
    return created;
  }, []);

  const editTrade = useCallback(async (id: number, req: AddJournalTradeRequest) => {
    const updated = await updateJournalTrade(id, req);
    setTrades(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  }, []);

  const removeTrade = useCallback(async (id: number) => {
    await deleteJournalTrade(id);
    setTrades(prev => prev.filter(t => t.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  return { trades, stats, total, loading, error, addTrade, editTrade, removeTrade, reload: load };
}
