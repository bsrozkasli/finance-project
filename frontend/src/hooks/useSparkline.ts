import { useState, useEffect } from 'react';
import { fetchPriceHistory } from '../api/client';

export const useSparkline = (symbol: string | null) => {
  const [points, setPoints] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!symbol) { if (!cancelled) setPoints([]); return; }
      setLoading(true);
      try {
        const bars = await fetchPriceHistory(symbol, '1d', '1mo');
        if (!cancelled) {
          // Take the last 14 closing prices for the sparkline
          setPoints(bars.slice(-14).map((b) => b.close));
        }
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [symbol]);

  return { points, loading };
};
