import { apiClient } from '../http';
import type {
  AlertSeverity,
  RebalanceSuggestions,
  RiskAlerts,
  StopLevel,
  StopLevels,
  StopLevelsWrite,
  TargetWeights,
  TargetWeightsWrite,
} from './schemas';

const stopLevelsPath = (portfolioId: number, symbol: string) =>
  `/portfolios/${portfolioId}/positions/${encodeURIComponent(symbol)}/stop-levels`;

export const fetchStopLevels = async (portfolioId: number): Promise<StopLevels> => {
  const response = await apiClient.get<StopLevels>(`/portfolios/${portfolioId}/stop-levels`);
  return response.data;
};

export const putStopLevels = async (portfolioId: number, symbol: string, levels: StopLevelsWrite): Promise<StopLevel> => {
  const response = await apiClient.put<StopLevel>(stopLevelsPath(portfolioId, symbol), levels);
  return response.data;
};

export const deleteStopLevels = async (portfolioId: number, symbol: string): Promise<void> => {
  await apiClient.delete(stopLevelsPath(portfolioId, symbol));
};

export const fetchUpcomingStopLevels = async (params: { pinned?: boolean; limit?: number } = {}): Promise<StopLevels> => {
  const response = await apiClient.get<StopLevels>('/stop-levels/upcoming', { params });
  return response.data;
};

export const fetchRiskAlerts = async (portfolioId: number, severity?: AlertSeverity): Promise<RiskAlerts> => {
  const response = await apiClient.get<RiskAlerts>(`/portfolios/${portfolioId}/risk-alerts`, { params: { severity } });
  return response.data;
};

export const fetchTargetWeights = async (portfolioId: number): Promise<TargetWeights> => {
  const response = await apiClient.get<TargetWeights>(`/portfolios/${portfolioId}/target-weights`);
  return response.data;
};

export const putTargetWeights = async (portfolioId: number, body: TargetWeightsWrite): Promise<TargetWeights> => {
  const response = await apiClient.put<TargetWeights>(`/portfolios/${portfolioId}/target-weights`, body);
  return response.data;
};

export const fetchRebalanceSuggestions = async (portfolioId: number, thresholdPp?: number): Promise<RebalanceSuggestions> => {
  const response = await apiClient.get<RebalanceSuggestions>(`/portfolios/${portfolioId}/rebalance-suggestions`, {
    params: { thresholdPp },
  });
  return response.data;
};
