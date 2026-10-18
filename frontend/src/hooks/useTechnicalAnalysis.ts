import { useState, useEffect, useCallback } from 'react';
import type { TechnicalResult } from '../api/client';
import { fetchTechnicalAnalysis, fetchTechnicalSignals } from '../api/client';

export function useTechnicalAnalysis(symbol: string | null, interval = '1d', range = '3mo') {
  const [data, setData] = useState<TechnicalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetch = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {      const [analysis, signals] = await Promise.allSettled([
        fetchTechnicalAnalysis(ticker, interval, range),
        fetchTechnicalSignals(ticker, interval, range),
      ]);
      if (analysis.status !== 'fulfilled' && signals.status !== 'fulfilled') {
        const failure = analysis.reason ?? signals.reason;
        throw failure instanceof Error ? failure : new Error('Technical analysis and signals are unavailable');
      }
      const indicators: Partial<TechnicalResult> = analysis.status === 'fulfilled' ? analysis.value : {};
      const signal: Partial<TechnicalResult> = signals.status === 'fulfilled' ? signals.value : {};
      setData({ ...indicators, signalAction: signal.signalAction ?? undefined, signalConfidence: signal.signalConfidence ?? undefined });
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
