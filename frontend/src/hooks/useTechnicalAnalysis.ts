import { useState, useEffect, useCallback } from 'react';
import type { TechnicalResult } from '../api/client';
import { fetchTechnicalAnalysis } from '../api/client';

export function useTechnicalAnalysis(symbol: string | null, interval = '1d', range = '3mo') {
  const [data, setData] = useState<TechnicalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetch = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTechnicalAnalysis(ticker, interval, range);
      setData(result);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Technical analysis unavailable');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [interval, range]);

  useEffect(() => {
    if (!symbol) { setData(null); setError(null); return; }
    fetch(symbol);
  }, [symbol, fetch]);

  return { data, loading, error, lastFetched, refetch: () => symbol && fetch(symbol) };
}
