export interface Asset {
  symbol: string;
  name: string;
  type: string;
}

export interface PriceHistory {
  assetId: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string; // ISO-8601 string from backend
}
