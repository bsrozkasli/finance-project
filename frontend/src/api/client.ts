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

export interface PortfolioPosition {
  id: number;
  symbol: string;
  quantity: number;
  avgCostPrice: number;
  openedAt: string;
  notes?: string;
}

export interface AddPositionRequest {
  symbol: string;
  quantity: number;
  avgCostPrice: number;
  openedAt: string;
  notes?: string;
}

export interface AnalystRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface PriceTarget {
  symbol?: string;
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
  numberOfAnalysts?: number;
  lastUpdated?: string;
}

export interface TechnicalResult {
  symbol?: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  atr?: number;
  sma?: number;
  ema?: number;
  signalAction?: string;
  signalConfidence?: number;
}

export interface CompanyReport {
  symbol: string;
  technical?: TechnicalResult;
  recommendations?: AnalystRecommendation[];
  priceTarget?: PriceTarget | null;
  recentNews?: NewsItem[];
}

export const fetchPortfolioPositions = async (): Promise<PortfolioPosition[]> => {
  const response = await apiClient.get<PortfolioPosition[]>('/portfolio/positions');
  return response.data;
};

export const addPortfolioPosition = async (request: AddPositionRequest): Promise<PortfolioPosition> => {
  const response = await apiClient.post<PortfolioPosition>('/portfolio/positions', request);
  return response.data;
};

export const updatePortfolioPosition = async (id: number, request: AddPositionRequest): Promise<PortfolioPosition> => {
  const response = await apiClient.put<PortfolioPosition>(`/portfolio/positions/${id}`, request);
  return response.data;
};

export const deletePortfolioPosition = async (id: number): Promise<void> => {
  await apiClient.delete(`/portfolio/positions/${id}`);
};

export const fetchAnalystRecommendations = async (symbol: string): Promise<AnalystRecommendation[]> => {
  const response = await apiClient.get<AnalystRecommendation[]>(`/analyst/${symbol}/recommendations`);
  return response.data;
};

export const fetchPriceTarget = async (symbol: string): Promise<PriceTarget> => {
  const response = await apiClient.get<PriceTarget>(`/analyst/${symbol}/price-target`);
  return response.data;
};

export const fetchTechnicalAnalysis = async (
  symbol: string,
  interval = '1d',
  range = '3mo'
): Promise<TechnicalResult> => {
  const response = await apiClient.get<TechnicalResult>(`/technical/${symbol}`, { params: { interval, range } });
  return response.data;
};

export const fetchCompanyReport = async (symbol: string): Promise<CompanyReport> => {
  const response = await apiClient.get<CompanyReport>(`/reports/company/${symbol}`);
  return response.data;
};
