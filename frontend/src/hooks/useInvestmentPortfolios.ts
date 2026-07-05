import { useCallback, useEffect, useState } from 'react';
import type { InvestmentPortfolio } from '../api/client';
import { fetchInvestmentPortfolios } from '../api/client';

export const useInvestmentPortfolios = () => {
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvestmentPortfolios();
      setPortfolios(data);
    } catch (e) {
      setPortfolios([]);
      setError(e instanceof Error ? e.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { portfolios, loading, error, reload };
};
