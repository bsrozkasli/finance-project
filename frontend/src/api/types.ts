export interface Asset {
  symbol: string;
  name: string;
  type: string;
}

/** Data-availability label for a price (domain enum PriceStatus); never an investment signal. */
export type PriceStatus = 'OK' | 'STALE' | 'FAILED' | 'EMPTY';

export interface PriceHistory {
  assetId: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string; // ISO-8601 string from backend
  /** Candle time of the price used; null/absent when unknown (latest-price endpoint only). */
  priceAsOf?: string | null;
  priceStatus?: PriceStatus | null;
}
