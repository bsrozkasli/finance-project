import { apiClient } from '../http';
import type {
  Allocation,
  CompositionHistory,
  Gains,
  HoldingsAnalysis,
  MarketScope,
  MonthlyReturns,
  PinState,
  PortfolioOverview,
  PortfolioSummary,
  RiskLevel,
} from './schemas';

export interface PortfolioOverviewParams {
  market?: MarketScope;
  pinned?: boolean;
  riskLevel?: RiskLevel;
  limit?: number;
  offset?: number;
}

export type AllocationBy = 'HOLDING' | 'SECTOR';
export type HoldingsSort = 'WEIGHT' | 'DAY_CHANGE' | 'PNL';

export const fetchPortfolioOverview = async (params: PortfolioOverviewParams = {}): Promise<PortfolioOverview> => {
  const response = await apiClient.get<PortfolioOverview>('/portfolios/overview', { params });
  return response.data;
};

export const pinPortfolio = async (portfolioId: number, pinned: boolean): Promise<PinState> => {
  const response = await apiClient.put<PinState>(`/portfolios/${portfolioId}/pin`, { pinned });
  return response.data;
};

export const fetchPortfolioSummaryV2 = async (portfolioId: number): Promise<PortfolioSummary> => {
  const response = await apiClient.get<PortfolioSummary>(`/portfolios/${portfolioId}/summary`);
  return response.data;
};

export const fetchPortfolioAllocation = async (portfolioId: number, by: AllocationBy): Promise<Allocation> => {
  const response = await apiClient.get<Allocation>(`/portfolios/${portfolioId}/allocation`, { params: { by } });
  return response.data;
};

export const fetchPortfolioGains = async (portfolioId: number): Promise<Gains> => {
  const response = await apiClient.get<Gains>(`/portfolios/${portfolioId}/gains`);
  return response.data;
};

export const fetchPortfolioMonthlyReturns = async (portfolioId: number, months?: number): Promise<MonthlyReturns> => {
  const response = await apiClient.get<MonthlyReturns>(`/portfolios/${portfolioId}/monthly-returns`, { params: { months } });
  return response.data;
};

export const fetchHoldingsAnalysis = async (portfolioId: number, sort?: HoldingsSort): Promise<HoldingsAnalysis> => {
  const response = await apiClient.get<HoldingsAnalysis>(`/portfolios/${portfolioId}/holdings/analysis`, { params: { sort } });
  return response.data;
};

export const fetchCompositionHistory = async (
  portfolioId: number,
  params: { months?: number; top?: number } = {},
): Promise<CompositionHistory> => {
  const response = await apiClient.get<CompositionHistory>(`/portfolios/${portfolioId}/composition-history`, { params });
  return response.data;
};
