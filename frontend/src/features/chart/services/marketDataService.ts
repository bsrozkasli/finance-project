import type { PriceHistory } from '../../../api/types';
import { fetchAssetPrice, fetchPriceHistory } from '../../../api/client';
import type { OHLCVData, Range, ChartSymbolInfo, Interval } from '../types/chart.types';

const RANGE_TO_BACKEND: Record<Range, string> = {
  '1D': '5d',
  '5D': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  'YTD': '1y',
  '1Y': '1y',
  '5Y': '5y',
  'ALL': '5y',
};

const intervalForRange = (range: Range, interval?: Interval): string => {
  if (interval) return interval;
  return range === '1D' || range === '5D' ? '1h' : '1d';
};

const toChartTime = (timestamp: string): string => {
  const parsed = new Date(timestamp);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return timestamp.slice(0, 10);
};

const toOhlcv = (bar: PriceHistory): OHLCVData => ({
  time: toChartTime(bar.timestamp),
  open: bar.open,
  high: bar.high,
  low: bar.low,
  close: bar.close,
  volume: bar.volume,
});

const infoFromBars = (symbol: string, bars: PriceHistory[]): ChartSymbolInfo => {
  const latest = bars[bars.length - 1];
  if (!latest) {
    throw new Error(`No price data found for ${symbol}`);
  }
  const previous = bars.length > 1 ? bars[bars.length - 2] : null;
  const previousClose = previous?.close ?? latest.open;
  const change = latest.close - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  return {
    symbol,
    price: latest.close,
    change,
    changePercent,
  };
};

export const marketDataService = {
  getCandles: async (params: {
    symbol: string;
    range: Range;
    interval?: Interval;
  }): Promise<OHLCVData[]> => {
    const bars = await fetchPriceHistory(
      params.symbol,
      intervalForRange(params.range, params.interval),
      RANGE_TO_BACKEND[params.range]
    );
    return bars.map(toOhlcv);
  },

  getSymbolInfo: async (symbol: string): Promise<ChartSymbolInfo> => {
    try {
      const latest = await fetchAssetPrice(symbol);
      const bars = await fetchPriceHistory(symbol, '1d', '5d').catch(() => [latest]);
      return infoFromBars(symbol, bars.length > 0 ? bars : [latest]);
    } catch {
      const bars = await fetchPriceHistory(symbol, '1d', '5d');
      return infoFromBars(symbol, bars);
    }
  }
};
