import type { Asset, PriceHistory } from './types';
import { apiClient } from './http';

export const fetchAssets = async (): Promise<Asset[]> => {
  const response = await apiClient.get<Asset[]>('/assets');
  return response.data;
};

export const addAssetBatch = async (symbols: string[]): Promise<Asset[]> => {
  const response = await apiClient.post<Asset[]>('/assets/batch', { symbols });
  return response.data;
};

export const fetchAssetPrice = async (symbol: string): Promise<PriceHistory> => {
  const response = await apiClient.get<PriceHistory>(`/prices/${symbol}/latest`);
  return response.data;
};

export const fetchPriceHistory = async (
  symbol: string,
  interval: string = '1d',
  range: string = '1mo'
): Promise<PriceHistory[]> => {
  const response = await apiClient.get<PriceHistory[]>(
    `/prices/${symbol}/history`,
    { params: { interval, range } }
  );
  return response.data;
};

export interface BatchPriceHistoryRequest {
  symbols: string[];
  interval?: string;
  range?: string;
}

export const fetchBatchPriceHistory = async (
  symbols: string[],
  interval: string = '1d',
  range: string = '1mo'
): Promise<Record<string, PriceHistory[]>> => {
  const response = await apiClient.post<Record<string, PriceHistory[]>>('/prices/batch-history', {
    symbols,
    interval,
    range,
  } satisfies BatchPriceHistoryRequest);
  return response.data;
};
export const deleteAsset = async (symbol: string): Promise<void> => {
  await apiClient.delete(`/assets/${symbol}`);
};

// Replace 'any' with a proper type if FinnhubNewsDto structure is known in the frontend,
// but for now an array of any or a basic interface is fine.

export interface AssetResearchSection<T> {
  status: 'OK' | 'EMPTY' | 'FAILED';
  source: string;
  data: T | null;
  message: string | null;
  observedAt: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  country: string | null;
  quoteType: string | null;
  fullTimeEmployees: number | null;
}

export interface MarketQuote {
  symbol: string;
  marketState: 'PRE_MARKET' | 'REGULAR' | 'POST_MARKET' | 'CLOSED' | 'UNKNOWN' | null;
  exchangeTimezone: string | null;
  previousClose: number | null;
  regularPrice: number | null;
  regularChange: number | null;
  regularChangePercent: number | null;
  regularTimestamp: string | null;
  preMarketPrice: number | null;
  preMarketChange: number | null;
  preMarketChangePercent: number | null;
  preMarketTimestamp: string | null;
  postMarketPrice: number | null;
  postMarketChange: number | null;
  postMarketChangePercent: number | null;
  postMarketTimestamp: string | null;
  delayed: boolean | null;
}

export interface AssetResearchDetail {
  symbol: string;
  profile: AssetResearchSection<CompanyProfile>;
  market: AssetResearchSection<MarketQuote>;
  generatedAt: string;
}

export const fetchAssetResearchDetail = async (symbol: string): Promise<AssetResearchDetail> => {
  const response = await apiClient.get<AssetResearchDetail>(`/assets/${symbol}/detail`);
  return response.data;
};

export interface AssetMarketBatch {
  quotes: Record<string, AssetResearchSection<MarketQuote>>;
  generatedAt: string;
}

export interface AssetProfileBatch {
  profiles: Record<string, AssetResearchSection<CompanyProfile>>;
  generatedAt: string;
}

export const fetchBatchLatestPrices = async (symbols: string[]): Promise<AssetMarketBatch> => {
  const response = await apiClient.post<AssetMarketBatch>('/prices/batch-latest', { symbols });
  return response.data;
};

export const fetchBatchAssetProfiles = async (symbols: string[]): Promise<AssetProfileBatch> => {
  const response = await apiClient.post<AssetProfileBatch>('/assets/batch-profiles', { symbols });
  return response.data;
};