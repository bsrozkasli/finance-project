import { useState, useEffect } from 'react';
import type { PriceHistory } from '../api/types';
import { fetchPriceHistory } from '../api/client';
import { isMarketOpen } from '../utils/market';

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

const intervalMs = () => (isMarketOpen() ? 30 * 1000 : 15 * 60 * 1000);

const toLivePrice = (bars: PriceHistory[]): LivePrice | null => {
  if (bars.length === 0) return null;
  const latest = bars[bars.length - 1];
  const prev = bars.length >= 2 ? bars[bars.length - 2] : null;
  const prevClose = prev ? prev.close : latest.open;
  const change = latest.close - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  return {
    price: latest.close,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    volume: latest.volume,
    change,
    changePct,
    timestamp: latest.timestamp,
  };
};

export const useLivePrice = (symbol: string | null) => {
  const [data, setData] = useState<LivePrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const load = async () => {
      if (!symbol) return;
      setLoading(true);
      try {
        const bars = await fetchPriceHistory(symbol, '1d', '5d');
        const live = toLivePrice(bars);
        if (!cancelled) {
          setData(live);
          setError(live ? null : 'No price data available');
        }
      } catch {
        if (!cancelled) setError('Failed to fetch latest price');
      } finally {
        if (!cancelled) {
          setLoading(false);
          timeoutId = window.setTimeout(load, intervalMs());
        }
      }
    };

    if (symbol) {
      void load();
    } else {
      setData(null);
      setError(null);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [symbol]);

  return { data, loading, error };
};
