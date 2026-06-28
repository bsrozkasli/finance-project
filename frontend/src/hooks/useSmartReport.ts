import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface ScoreBreakdown {
  fundamentalScore: number;
  valuationScore: number;
  qualityScore: number;
  growthScore: number;
  momentumScore: number;
  riskScore: number;
  earningsScore: number;
  sentimentScore: number;
}

export interface PeerComparison {
  symbol: string;
  peRatio: number | null;
  pbRatio: number | null;
  debtToEquity: number | null;
  netProfitMargin: number | null;
  roe: number | null;
}

export interface SmartReport {
  symbol: string;
  overallScore: number;
  grade: string;
  recommendation: string;
  breakdown: ScoreBreakdown;
  peers: PeerComparison[];
}

export const useSmartReport = (symbol: string | null) => {
  const [report, setReport] = useState<SmartReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setReport(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchReport = async () => {
      try {
        const response = await apiClient.get<SmartReport>(`/reports/smart/${symbol}`);
        if (isMounted) {
          setReport(response.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch smart report');
          setReport(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  return { report, loading, error };
};
