export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1mo';

export type Range = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

export interface OHLCVData {
  time: string; // YYYY-MM-DD string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSymbolInfo {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}
export interface PatternOverlayMarker {
  time: string;
  label: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  price?: number | null;
}

export interface SupportResistanceLevel {
  id: string;
  label: string;
  price: number;
  type: 'support' | 'resistance' | 'pivot';
  method: 'Classic' | 'Fibonacci' | 'Woodie';
}
