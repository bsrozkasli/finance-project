import { useCallback, useEffect, useState } from 'react';
import type { TechnicalResult, TechnicalSignalSummary } from '../../../api/client';
import { fetchTechnicalAnalysis, fetchTechnicalSignals } from '../../../api/client';
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

export const useTechnicalSignals = (symbol: string, range: Range, interval?: Interval) => {
  const [technical, setTechnical] = useState<TechnicalResult | null>(null);
  const [signals, setSignals] = useState<TechnicalSignalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const backendInterval = intervalForRange(range, interval);
      const backendRange = rangeToBackend(range);
      const [technicalData, signalData] = await Promise.all([
        fetchTechnicalAnalysis(symbol, backendInterval, backendRange),
        fetchTechnicalSignals(symbol, backendInterval, backendRange),
      ]);
      setTechnical(technicalData);
      setSignals(signalData);
    } catch (e) {
      setTechnical(null);
      setSignals(null);
      setError(e instanceof Error ? e.message : 'Technical analysis unavailable');
    } finally {
      setLoading(false);
    }
  }, [interval, range, symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  return { technical, signals, loading, error, reload: load };
};
