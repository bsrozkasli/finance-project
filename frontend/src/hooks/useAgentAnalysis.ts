import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface AgentAnalysis {
  ticker: string;
  decision: string;
  confidence: number;
  fundamental_summary: string;
  technical_summary: string;
  risk_summary: string;
  bull_case: string;
  bear_case: string;
  portfolio_manager_reasoning: string;
  metrics_used: Record<string, unknown>;
  generated_at: string;
  from_cache: boolean;
}

export function useAgentAnalysis(symbol: string | null) {
  const [data, setData] = useState<AgentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AgentAnalysis>(`/agent-analysis/${encodeURIComponent(ticker)}`);
      setData(response.data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Agent analysis failed';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateAndRefetch = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/agent-analysis/${encodeURIComponent(symbol)}/cache`);
      await fetchAnalysis(symbol);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Invalidation failed';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, fetchAnalysis]);

  useEffect(() => {
    if (!symbol) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setError(null);
      return;
    }
    fetchAnalysis(symbol);
  }, [symbol, fetchAnalysis]);

  return {
    data,
    loading,
    error,
    refetch: () => symbol && fetchAnalysis(symbol),
    invalidateAndRefetch,
  };
}
