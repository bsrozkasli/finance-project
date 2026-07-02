import { useEffect, useMemo, useState } from 'react';
import type { PriceHistory } from '../api/types';
import { fetchPriceHistory } from '../api/client';
import { isMarketOpen } from '../utils/market';

export interface DashboardLivePrice {
  price: number;
  change: number;
  changePct: number;
  timestamp: string;
  sparkline: number[];
}

const pollMs = () => (isMarketOpen() ? 30 * 1000 : 15 * 60 * 1000);

const toLivePrice = (bars: PriceHistory[]): DashboardLivePrice | null => {
  if (bars.length === 0) return null;
  const latest = bars[bars.length - 1];
  const prev = bars.length >= 2 ? bars[bars.length - 2] : null;
  const prevClose = prev?.close ?? latest.open;
  const change = latest.close - prevClose;
  return {
    price: latest.close,
    change,
    changePct: prevClose !== 0 ? (change / prevClose) * 100 : 0,
    timestamp: latest.timestamp,
    sparkline: bars.slice(-5).map((bar) => bar.close),
  };
};

export const useDashboardLivePrices = (symbols: string[]) => {
  const normalizedSymbols = useMemo(
    () => Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))),
    [symbols]
  );
  const [prices, setPrices] = useState<Record<string, DashboardLivePrice>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const load = async () => {
      if (normalizedSymbols.length === 0) {
        setPrices({});
        setLoading(false);
        return;
      }

      setLoading(true);
      const settled = await Promise.allSettled(
        normalizedSymbols.map(async (symbol) => ({
          symbol,
          live: toLivePrice(await fetchPriceHistory(symbol, '1d', '5d')),
        }))
      );

      if (!cancelled) {
        setPrices((current) => {
          const next: Record<string, DashboardLivePrice> = { ...current };
          for (const result of settled) {
            if (result.status === 'fulfilled' && result.value.live) {
              next[result.value.symbol] = result.value.live;
            }
          }
          return next;
        });
        setLoading(false);
        timeoutId = window.setTimeout(load, pollMs());
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [normalizedSymbols]);

  return { prices, loading };
};
