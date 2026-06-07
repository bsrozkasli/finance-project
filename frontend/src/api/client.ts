import axios from 'axios';
import type { Asset, PriceHistory } from './types';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const deleteAsset = async (symbol: string): Promise<void> => {
  await apiClient.delete(`/assets/${symbol}`);
};

// Replace 'any' with a proper type if FinnhubNewsDto structure is known in the frontend,
// but for now an array of any or a basic interface is fine.
export interface NewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export const fetchNews = async (symbol: string): Promise<NewsItem[]> => {
  const response = await apiClient.get<NewsItem[]>(`/news/${symbol}`);
  return response.data;
};
