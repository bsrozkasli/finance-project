import { apiClient } from '../http';
import type {
  BenchmarkList,
  ComparisonMetrics,
  CorrelationMatrix,
  ReturnsHeatmap,
  RiskReturn,
} from './schemas';

/** `PORTFOLIO:<id>`, `ALL` or `BENCHMARK:<code>` (ComparableRef in the contract). */
export type ComparableRef = 'ALL' | `PORTFOLIO:${number}` | `BENCHMARK:${string}`;
export type ComparisonPeriod = '1M' | '3M' | '6M' | '1Y';

export const portfolioRef = (portfolioId: number): ComparableRef => `PORTFOLIO:${portfolioId}`;
export const benchmarkRef = (code: string): ComparableRef => `BENCHMARK:${code}`;

export const fetchBenchmarks = async (): Promise<BenchmarkList> => {
  const response = await apiClient.get<BenchmarkList>('/benchmarks');
  return response.data;
};

export const fetchReturnsHeatmap = async (refs: ComparableRef[], windows?: string[]): Promise<ReturnsHeatmap> => {
  const response = await apiClient.get<ReturnsHeatmap>('/returns/heatmap', {
    params: { refs: refs.join(','), windows: windows?.join(',') },
  });
  return response.data;
};

export const fetchComparisonMetrics = async (
  a: ComparableRef,
  b: ComparableRef,
  period?: ComparisonPeriod,
): Promise<ComparisonMetrics> => {
  const response = await apiClient.get<ComparisonMetrics>('/comparison/metrics', { params: { a, b, period } });
  return response.data;
};

export const fetchCorrelationMatrix = async (refs: ComparableRef[]): Promise<CorrelationMatrix> => {
  const response = await apiClient.get<CorrelationMatrix>('/comparison/correlation-matrix', {
    params: { refs: refs.join(',') },
  });
  return response.data;
};

export const fetchRiskReturn = async (refs: ComparableRef[], period?: ComparisonPeriod): Promise<RiskReturn> => {
  const response = await apiClient.get<RiskReturn>('/comparison/risk-return', {
    params: { refs: refs.join(','), period },
  });
  return response.data;
};
