import { useState, useEffect, useCallback } from 'react';
import type { AnalystRecommendation, PriceTarget } from '../api/client';
import { fetchAnalystRecommendations, fetchPriceTarget } from '../api/client';

export interface AnalystData {
  recommendations: AnalystRecommendation[];
  priceTarget: PriceTarget | null;
}

export function useAnalystRatings(symbol: string | null) {
  const [data, setData] = useState<AnalystData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetch = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const [recs, pt] = await Promise.all([
        fetchAnalystRecommendations(ticker),
        fetchPriceTarget(ticker).catch(() => null),
      ]);
      setData({ recommendations: recs, priceTarget: pt });
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch analyst data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!symbol) { setData(null); setError(null); return; }
    fetch(symbol);
  }, [symbol, fetch]);

  return { data, loading, error, lastFetched, refetch: () => symbol && fetch(symbol) };
}
