import { useCallback, useEffect, useState } from 'react';
import type { PatternDetectionResponse } from '../../../api/client';
import { fetchPatternDetection } from '../../../api/client';
import type { Interval, Range } from '../types/chart.types';

const rangeToBackend = (range: Range) => {
  if (range === '1D' || range === '5D') return '5d';
  if (range === '1M') return '1mo';
  if (range === '3M') return '3mo';
  if (range === '6M') return '6mo';
  if (range === 'YTD' || range === '1Y') return '1y';
  return '5y';
};

const intervalForRange = (range: Range, interval?: Interval) => interval ?? (range === '1D' || range === '5D' ? '1h' : '1d');

export const usePatternDetection = (symbol: string, range: Range, interval?: Interval) => {
  const [data, setData] = useState<PatternDetectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPatternDetection(symbol, intervalForRange(range, interval), rangeToBackend(range), false);
      setData(response);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Pattern detection unavailable');
    } finally {
      setLoading(false);
    }
  }, [interval, range, symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};
