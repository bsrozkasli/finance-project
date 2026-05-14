import axios from 'axios';
import type { Asset, PriceHistory } from './types';

const apiClient = axios.create({
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
