import { useCallback, useEffect, useState } from 'react';
import { fetchTechnicalWorkspace, type TechnicalWorkspace } from '../api/client';

export function useTechnicalWorkspace(symbol: string | null, interval = '1d', range = '1y') {
  const [data, setData] = useState<TechnicalWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (ticker: string) => {
    setLoading(true);
    try { setData(await fetchTechnicalWorkspace(ticker, interval, range)); setError(null); }
    catch (reason) { setData(null); setError(reason instanceof Error ? reason.message : 'Teknik çalışma alanı yüklenemedi'); }
    finally { setLoading(false); }
  }, [interval, range]);
  useEffect(() => { if (symbol) void load(symbol); else { setData(null); setError(null); } }, [load, symbol]);
  return { data, loading, error, refetch: () => symbol ? load(symbol) : undefined };
}