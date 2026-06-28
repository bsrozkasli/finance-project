import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface BacktestResult {
  symbol: string;
  currentRsi: number;
  scenarioDescription: string;
  totalOccurrences: number;
  winRate: number;
  averageReturnPct: number;
  isMeaningful: boolean;
}

export const useBacktest = (symbol: string | null) => {
  const [data, setData] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    
    let isMounted = true;
    const fetchBacktest = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<BacktestResult>(`/backtest/${symbol}`);
        if (isMounted) setData(response.data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch backtest';
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBacktest();
    return () => { isMounted = false; };
  }, [symbol]);

  return { data, loading, error };
};
