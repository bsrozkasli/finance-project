import { apiClient } from '../http';
import type {
  CompanyAnalysis,
  CompanyStatements,
  Peers,
  QuarterlyTrend,
  RatioHistory,
  RatioMetric,
  StatementType,
} from './schemas';

const companyPath = (symbol: string, tail: string) => `/companies/${encodeURIComponent(symbol)}/${tail}`;

export const fetchCompanyAnalysis = async (symbol: string): Promise<CompanyAnalysis> => {
  const response = await apiClient.get<CompanyAnalysis>(companyPath(symbol, 'analysis'));
  return response.data;
};

export const fetchRatioHistory = async (symbol: string, metric: RatioMetric, quarters?: number): Promise<RatioHistory> => {
  const response = await apiClient.get<RatioHistory>(companyPath(symbol, 'ratio-history'), { params: { metric, quarters } });
  return response.data;
};

export const fetchQuarterlyTrend = async (symbol: string, quarters?: number): Promise<QuarterlyTrend> => {
  const response = await apiClient.get<QuarterlyTrend>(companyPath(symbol, 'quarterly-trend'), { params: { quarters } });
  return response.data;
};

export const fetchCompanyStatements = async (
  symbol: string,
  type: StatementType,
  periods?: number,
): Promise<CompanyStatements> => {
  const response = await apiClient.get<CompanyStatements>(companyPath(symbol, 'statements'), { params: { type, periods } });
  return response.data;
};

export const fetchCompanyPeers = async (symbol: string): Promise<Peers> => {
  const response = await apiClient.get<Peers>(companyPath(symbol, 'peers'));
  return response.data;
};
