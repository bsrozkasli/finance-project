import { apiClient } from './http';

export interface Watchlist {
  id: number;
  name: string;
  symbols: string[];
  createdAt: string;
}

export type WatchlistResearchStatus = 'OK' | 'STALE' | 'EMPTY' | 'FAILED' | 'RATE_LIMITED' | 'INSUFFICIENT_DATA' | 'PENDING_REFRESH';

export interface WatchlistResearchSection<T> {
  status: WatchlistResearchStatus;
  source: string;
  data: T | null;
  message: string | null;
  observedAt: string;
}

export interface WatchlistPriceSummary {
  lastPrice: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: string | null;
}

export interface WatchlistTechnicalSummary {
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  sma: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  ema: number | null;
  action: string | null;
  confidence: number | null;
  timestamp: string | null;
}

export interface WatchlistFundamentalSummary {
  roe: number | null;
  roic: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  revenue: number | null;
  netIncome: number | null;
  operatingCashFlow: number | null;
  fiscalYear: string | null;
  currency: string | null;
  calculatedAt: string | null;
}

export interface WatchlistEarningsQuarter {
  period: string | null;
  actual: number | null;
  estimate: number | null;
  surprise: number | null;
  surprisePct: number | null;
  beat: boolean | null;
}

export interface WatchlistEarningsSummary {
  quarters: WatchlistEarningsQuarter[];
}

export interface WatchlistInstitutionalSummary {
  piotroskiFScore: number | null;
  altmanZScore: number | null;
  beneishMScore: number | null;
  qualityComposite: number | null;
  economicMoat: string | null;
  earningsQuality: number | null;
}

export interface WatchlistResearchRow {
  symbol: string;
  name?: string | null;
  type?: string | null;
  exchange?: string | null;
  currency?: string | null;
  sector?: string | null;
  industry?: string | null;
  marketCap?: number | null;
  metadataStatus?: WatchlistResearchStatus;
  metadataSource?: string | null;
  price: WatchlistResearchSection<WatchlistPriceSummary>;
  technical: WatchlistResearchSection<WatchlistTechnicalSummary>;
  fundamentals: WatchlistResearchSection<WatchlistFundamentalSummary>;
  earnings: WatchlistResearchSection<WatchlistEarningsSummary>;
  institutional: WatchlistResearchSection<WatchlistInstitutionalSummary>;
  overallStatus: WatchlistResearchStatus;
}

export interface WatchlistResearchPolicy {
  maxLimit: number;
  providerConcurrencyLimit: number;
  providerTimeoutMillis: number;
  partialFailureEnabled: boolean;
  staleWhileRevalidateEnabled: boolean;
}

export interface WatchlistResearchSnapshot {
  watchlistId: number;
  watchlistName: string;
  totalSymbols: number;
  limit: number;
  offset: number;
  requestedSymbols: string[];
  rows: WatchlistResearchRow[];
  policy: WatchlistResearchPolicy;
  generatedAt: string;
}

export interface WatchlistResearchSnapshotParams {
  limit?: number;
  offset?: number;
  symbols?: string[];
  refresh?: boolean;
}

export const fetchWatchlists = async (): Promise<Watchlist[]> => {
  const response = await apiClient.get<Watchlist[]>('/watchlists');
  return response.data;
};

export const createWatchlist = async (name: string): Promise<Watchlist> => {
  const response = await apiClient.post<Watchlist>('/watchlists', { name });
  return response.data;
};

export const addSymbolToWatchlist = async (
  id: number,
  symbol: string
): Promise<Watchlist> => {
  const response = await apiClient.post<Watchlist>(`/watchlists/${id}/symbols`, { symbol });
  return response.data;
};

export const removeSymbolFromWatchlist = async (
  id: number,
  symbol: string
): Promise<void> => {
  await apiClient.delete(`/watchlists/${id}/symbols/${symbol}`);
};

export const deleteWatchlist = async (id: number): Promise<void> => {
  await apiClient.delete(`/watchlists/${id}`);
};

export const fetchWatchlistResearchSnapshot = async (
  id: number,
  params: WatchlistResearchSnapshotParams = {}
): Promise<WatchlistResearchSnapshot> => {
  const response = await apiClient.get<WatchlistResearchSnapshot>(`/watchlists/${id}/research-snapshot`, {
    params: {
      limit: params.limit,
      offset: params.offset,
      symbols: params.symbols?.join(','),
      refresh: params.refresh,
    },
  });
  return response.data;
};

// Fundamentals
