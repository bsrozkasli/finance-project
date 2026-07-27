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
