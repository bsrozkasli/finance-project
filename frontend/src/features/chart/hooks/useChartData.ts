import { useState, useEffect } from 'react';
import type { OHLCVData, Range, ChartSymbolInfo } from '../types/chart.types';
import { marketDataService } from '../services/marketDataService';

export const useChartData = (initialSymbol: string) => {
  const [symbol, setSymbol] = useState(initialSymbol);

  useEffect(() => {
    setSymbol(initialSymbol);
  }, [initialSymbol]);
  const [range, setRange] = useState<Range>('1M');
  const [data, setData] = useState<OHLCVData[]>([]);
  const [symbolInfo, setSymbolInfo] = useState<ChartSymbolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [candles, info] = await Promise.all([
          marketDataService.getCandles({ symbol, range }),
          marketDataService.getSymbolInfo(symbol)
        ]);
        setData(candles);
        setSymbolInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, range]);

  return {
    symbol,
    setSymbol,
    range,
    setRange,
    data,
    symbolInfo,
    loading,
    error
  };
};
