import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface ScoreBreakdown {
  fundamentalScore: number | null;
  valuationScore: number | null;
  qualityScore: number | null;
  growthScore: number | null;
  momentumScore: number | null;
  riskScore: number | null;
  earningsScore: number | null;
  sentimentScore: number | null;
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
  overallScore: number | null;
  grade: string | null;
  recommendation: string | null;
  breakdown: ScoreBreakdown | null;
  peers: PeerComparison[];
}

export const useSmartReport = (symbol: string | null) => {
  const [report, setReport] = useState<SmartReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setReport(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setReport(null);

    const fetchReport = async () => {
      try {
        const response = await apiClient.get<SmartReport>(`/reports/smart/${symbol}`);
        if (isMounted) {
          setReport(response.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Akıllı rapor yüklenemedi');
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
