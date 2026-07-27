import type { NewsItem } from './news';
import { apiClient } from './http';

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
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema?: number;
  signalAction?: string;
  signalConfidence?: number;
}

export interface TechnicalWorkspace {
  symbol: string;
  interval: string;
  range: string;
  timestamp: string;
  candles: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }>;
  overlays: Record<string, Array<{ timestamp: string; value: number | null }>>;
  oscillators: Record<string, Array<{ timestamp: string; value: number | null }>>;
  levels: Array<{ kind: string; price: number; strength: number; touches: number }>;
  dataQuality?: Record<string, unknown>;
}

export interface TechnicalCopilotResponse {
  symbol: string;
  answer: string;
  overlays: Array<{ kind: string; label: string; price?: number | null; startTimestamp?: string | null; endTimestamp?: string | null; color?: string | null }>;
  caveats: string[];
  generatedAt: string;
}

export const fetchTechnicalCopilot = async (symbol: string, prompt: string, interval = '1d', range = '1y'): Promise<TechnicalCopilotResponse> => {
  const response = await apiClient.post<TechnicalCopilotResponse>(`/technical/${symbol}/copilot`, { prompt, interval, range });
  return response.data;
};

export const fetchTechnicalWorkspace = async (symbol: string, interval = '1d', range = '1y'): Promise<TechnicalWorkspace> => {
  const response = await apiClient.get<TechnicalWorkspace>(`/technical/${symbol}/workspace`, { params: { interval, range } });
  return response.data;
};

export interface CompanyReport {
  symbol: string;
  technical?: TechnicalResult;
  recommendations?: AnalystRecommendation[];
  priceTarget?: PriceTarget | null;
  recentNews?: NewsItem[];
}
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

export const fetchTechnicalSignals = async (
  symbol: string,
  interval = '1d',
  range = '3mo'
): Promise<TechnicalResult> => {
  const response = await apiClient.get<TechnicalResult>(`/technical/${symbol}/signals`, { params: { interval, range } });
  return response.data;
};

export const fetchCompanyReport = async (symbol: string): Promise<CompanyReport> => {
  const response = await apiClient.get<CompanyReport>(`/reports/company/${symbol}`);
  return response.data;
};

export interface AnnualMetric {
  year: number;
  value: number;
}

export interface QuarterlyMetric {
  quarter: string;
  value: number;
}

export interface FundamentalsData {
  symbol: string;
  revenue: AnnualMetric[];
  netIncome: AnnualMetric[];
  eps: AnnualMetric[];
  freeCashFlow: AnnualMetric[];
  grossMargin?: number;
  netMargin?: number;
  roic?: number;
  roe?: number;
  dividendYield?: number;
}

export interface FinancialRatios {
  pe?: number;
  pb?: number;
  ps?: number;
  evEbitda?: number;
  debtEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  roe?: number;
  roa?: number;
}

export interface EarningsResult {
  quarter: string;
  epsEstimate?: number;
  epsActual?: number;
  surprise?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  surprisePct?: number;
}

export interface InsiderActivity {
  name: string;
  title?: string;
  transactionType: 'BUY' | 'SELL';
  shares: number;
  price: number;
  value: number;
  date: string;
  filingDate?: string;
}

export interface InstitutionalHolder {
  institution: string;
  shares: number;
  percentHeld: number;
  changeShares?: number;
  changePercent?: number;
  reportDate?: string;
}

export const fetchFundamentals = async (symbol: string): Promise<FundamentalsData> => {
  const response = await apiClient.get<FundamentalsData>(`/fundamentals/${symbol}`);
  return response.data;
};

export const fetchFinancialRatios = async (symbol: string): Promise<FinancialRatios> => {
  const response = await apiClient.get<FinancialRatios>(`/fundamentals/${symbol}/ratios`);
  return response.data;
};

export const fetchEarnings = async (symbol: string, periods = 8): Promise<EarningsResult[]> => {
  const response = await apiClient.get<EarningsResult[]>(`/fundamentals/${symbol}/earnings`, {
    params: { periods },
  });
  return response.data;
};

export const fetchInsiderActivity = async (symbol: string): Promise<InsiderActivity[]> => {
  const response = await apiClient.get<InsiderActivity[]>(`/fundamentals/${symbol}/insider`);
  return response.data;
};

export const fetchInstitutionalOwnership = async (symbol: string): Promise<InstitutionalHolder[]> => {
  const response = await apiClient.get<InstitutionalHolder[]>(`/fundamentals/${symbol}/institutional`);
  return response.data;
};

// News (categorized)
