import { useState, useEffect, useCallback } from 'react';
import type { CompanyReport } from '../api/client';
import { fetchCompanyReport } from '../api/client';

export function useCompanyReport(symbol: string | null) {
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetch = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompanyReport(ticker);
      setReport(data);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load company report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!symbol) { setReport(null); setError(null); return; }
    fetch(symbol);
  }, [symbol, fetch]);

  return { report, loading, error, lastFetched, refetch: () => symbol && fetch(symbol) };
}
