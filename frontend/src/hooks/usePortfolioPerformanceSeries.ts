import { useEffect, useMemo, useState } from 'react';
import { fetchPriceHistory } from '../api/client';
import type { DashboardPosition } from '../components/terminal/dashboard/dashboardTransforms';
import type { PerformancePoint } from '../components/terminal/dashboard/PerformanceChart';

const rangeToApi = (range: string) => {
  if (range === '1D' || range === '5D') return '5d';
  if (range === '3M') return '3mo';
  if (range === '6M') return '6mo';
  if (range === '1Y') return '1y';
  if (range === 'ALL') return '5y';
  return '1mo';
};

export const usePortfolioPerformanceSeries = (positions: DashboardPosition[], range: string) => {
  const symbolKey = useMemo(() => positions.map((position) => `${position.symbol}:${position.quantity}`).sort().join('|'), [positions]);
  const [series, setSeries] = useState<PerformancePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (positions.length === 0) {
        setSeries([]);
        return;
      }
      setLoading(true);
      const settled = await Promise.allSettled(
        positions.map(async (position) => ({
          position,
          bars: await fetchPriceHistory(position.symbol, '1d', rangeToApi(range)),
        }))
      );

      if (cancelled) return;

      const byDate = new Map<string, number>();
      for (const result of settled) {
        if (result.status !== 'fulfilled') continue;
        for (const bar of result.value.bars) {
          const date = bar.timestamp.slice(0, 10);
          byDate.set(date, (byDate.get(date) ?? 0) + (bar.close * result.value.position.quantity));
        }
      }

      setSeries(Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value })));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [positions, range, symbolKey]);

  return { series, loading };
};
