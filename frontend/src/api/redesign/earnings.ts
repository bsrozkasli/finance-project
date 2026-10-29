import { apiClient } from '../http';
import type {
  Contributors,
  EarningsByPortfolio,
  EarningsMonthly,
  EarningsPeriod,
  EarningsSources,
  EarningsSummary,
  EarningsYearly,
} from './schemas';

/** `ALL` or `PORTFOLIO:<id>`. */
export type EarningsScope = 'ALL' | `PORTFOLIO:${number}`;

export const fetchEarningsSummary = async (scope: EarningsScope = 'ALL', periods?: EarningsPeriod[]): Promise<EarningsSummary> => {
  const response = await apiClient.get<EarningsSummary>('/analytics/earnings/summary', {
    params: { scope, periods: periods?.join(',') },
  });
  return response.data;
};

export const fetchEarningsMonthly = async (scope: EarningsScope = 'ALL', months?: number): Promise<EarningsMonthly> => {
  const response = await apiClient.get<EarningsMonthly>('/analytics/earnings/monthly', { params: { scope, months } });
  return response.data;
};

export const fetchEarningsSources = async (scope: EarningsScope = 'ALL', period?: EarningsPeriod): Promise<EarningsSources> => {
  const response = await apiClient.get<EarningsSources>('/analytics/earnings/sources', { params: { scope, period } });
  return response.data;
};

export const fetchEarningsYearly = async (scope: EarningsScope = 'ALL'): Promise<EarningsYearly> => {
  const response = await apiClient.get<EarningsYearly>('/analytics/earnings/yearly', { params: { scope } });
  return response.data;
};

export const fetchEarningsContributors = async (
  direction: 'WINNERS' | 'LOSERS',
  params: { scope?: EarningsScope; period?: EarningsPeriod; limit?: number } = {},
): Promise<Contributors> => {
  const response = await apiClient.get<Contributors>('/analytics/earnings/contributors', {
    params: { ...params, direction },
  });
  return response.data;
};

export const fetchEarningsByPortfolio = async (
  params: { period?: EarningsPeriod; sort?: 'GAIN' | 'RETURN' | 'VALUE'; limit?: number; offset?: number } = {},
): Promise<EarningsByPortfolio> => {
  const response = await apiClient.get<EarningsByPortfolio>('/analytics/earnings/by-portfolio', { params });
  return response.data;
};
