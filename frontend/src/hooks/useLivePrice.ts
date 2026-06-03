import { useState, useEffect } from 'react';
import type { PriceHistory } from '../api/types';
import { fetchPriceHistory } from '../api/client';

export interface LivePrice {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePct: number;
  timestamp: string;
}

export const useLivePrice = (symbol: string | null) => {
  const [data, setData] = useState<LivePrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!symbol) {
        if (!cancelled) setData(null);
        return;
      }

      setLoading(true);
      try {
        // Fetch last 2 bars to compute change
        const bars: PriceHistory[] = await fetchPriceHistory(symbol, '1d', '5d');
        if (!cancelled && bars.length >= 1) {
          const latest = bars[bars.length - 1];
          const prev = bars.length >= 2 ? bars[bars.length - 2] : null;
          const prevClose = prev ? prev.close : latest.open;
          const change = latest.close - prevClose;
          const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          setData({
            price: latest.close,
            open: latest.open,
            high: latest.high,
            low: latest.low,
            volume: latest.volume,
            change,
            changePct,
            timestamp: latest.timestamp,
          });
          setError(null);
        } else if (!cancelled) {
          setData(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
};
