import { useCallback, useEffect, useState } from 'react';
import type { FinancialRatios, FundamentalsData } from '../api/client';
import type { PriceHistory } from '../api/types';
import { fetchFinancialRatios, fetchFundamentals, fetchPriceHistory } from '../api/client';
import type { ResearchSnapshot } from '../components/watchlist/watchlistUtils';

const emptySnapshot: ResearchSnapshot = {
  fundamentals: null,
  ratios: null,
  fiveDay: [],
  threeMonth: [],
  oneYear: [],
};

export function useWatchlistResearch(symbol: string | null) {
  const [data, setData] = useState<ResearchSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const [fundamentals, ratios, fiveDay, threeMonth, oneYear] = await Promise.allSettled([
        fetchFundamentals(ticker),
        fetchFinancialRatios(ticker),
        fetchPriceHistory(ticker, '1d', '5d'),
        fetchPriceHistory(ticker, '1d', '3mo'),
        fetchPriceHistory(ticker, '1d', '1y'),
      ]);

      setData({
        fundamentals: fundamentals.status === 'fulfilled' ? fundamentals.value as FundamentalsData : null,
        ratios: ratios.status === 'fulfilled' ? ratios.value as FinancialRatios : null,
        fiveDay: fiveDay.status === 'fulfilled' ? fiveDay.value as PriceHistory[] : [],
        threeMonth: threeMonth.status === 'fulfilled' ? threeMonth.value as PriceHistory[] : [],
        oneYear: oneYear.status === 'fulfilled' ? oneYear.value as PriceHistory[] : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load research data');
      setData(emptySnapshot);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!symbol) {
      setData(emptySnapshot);
      setError(null);
      return;
    }
    void load(symbol);
  }, [load, symbol]);

  return { data, loading, error, reload: () => symbol ? load(symbol) : undefined };
}