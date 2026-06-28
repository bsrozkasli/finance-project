import { useState, useEffect } from 'react';
import type { PriceHistory } from '../api/types';
import { fetchPriceHistory } from '../api/client';
import { isMarketOpen } from '../utils/market';

export const useAssetPrice = (
  symbol: string | null,
  interval: string = '1d',
  range: string = '1mo'
) => {
  const [prices, setPrices] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const loadPrices = async () => {
      if (!symbol) {
        setPrices([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchPriceHistory(symbol, interval, range);
        if (!cancelled) {
          setPrices(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : `Failed to fetch price history for ${symbol}`;
          setError(message);
          setPrices([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          const intervalMs = isMarketOpen() ? 30 * 1000 : 15 * 60 * 1000;
          timeoutId = window.setTimeout(loadPrices, intervalMs);
        }
      }
    };

    loadPrices();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [symbol, interval, range]);

  return { prices, loading, error };
};
