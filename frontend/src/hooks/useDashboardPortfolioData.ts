import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InvestmentPortfolio, PortfolioHolding } from '../api/client';
import { fetchPortfolioHoldings } from '../api/client';
import { useInvestmentPortfolios } from './useInvestmentPortfolios';

export interface PortfolioScopedHolding extends PortfolioHolding {
  portfolioName: string;
  portfolioBaseCurrency: string;
}

const sameSymbol = (value: string) => value.trim().toUpperCase();

const mergeHoldings = (holdings: PortfolioScopedHolding[]): PortfolioScopedHolding[] => {
  const byKey = new Map<string, PortfolioScopedHolding>();

  for (const holding of holdings) {
    const symbol = sameSymbol(holding.symbol);
    const existing = byKey.get(symbol);
    if (!existing) {
      byKey.set(symbol, { ...holding, symbol });
      continue;
    }

    const quantity = existing.quantity + holding.quantity;
    const costBasis = existing.costBasis + holding.costBasis;
    byKey.set(symbol, {
      ...existing,
      symbol,
      quantity,
      costBasis,
      averageCost: quantity > 0 ? costBasis / quantity : 0,
      realizedPnl: existing.realizedPnl + holding.realizedPnl,
      portfolioName: existing.portfolioName === holding.portfolioName
        ? existing.portfolioName
        : `${existing.portfolioName}, ${holding.portfolioName}`,
    });
  }

  return Array.from(byKey.values()).filter((holding) => holding.quantity > 0);
};

export const useDashboardPortfolioData = (selectedPortfolioId: number | null) => {
  const { portfolios, loading: portfoliosLoading, error: portfoliosError, reload: reloadPortfolios } = useInvestmentPortfolios();
  const [holdings, setHoldings] = useState<PortfolioScopedHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.id === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId]
  );

  const loadHoldings = useCallback(async () => {
    if (portfoliosLoading) return;
    setLoading(true);
    setError(null);

    try {
      const sourcePortfolios: InvestmentPortfolio[] = selectedPortfolio
        ? [selectedPortfolio]
        : portfolios;

      if (sourcePortfolios.length === 0) {
        setHoldings([]);
        return;
      }

      const settled = await Promise.allSettled(
        sourcePortfolios.map(async (portfolio) => {
          const rows = await fetchPortfolioHoldings(portfolio.id);
          return rows.map((holding): PortfolioScopedHolding => ({
            ...holding,
            symbol: sameSymbol(holding.symbol),
            portfolioName: portfolio.name,
            portfolioBaseCurrency: portfolio.baseCurrency,
          }));
        })
      );

      const rejected = settled.find((result) => result.status === 'rejected');
      const loaded = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      setHoldings(selectedPortfolio ? loaded : mergeHoldings(loaded));
      setError(rejected ? 'Some portfolio holdings could not be loaded' : null);
    } catch (e) {
      setHoldings([]);
      setError(e instanceof Error ? e.message : 'Failed to load portfolio holdings');
    } finally {
      setLoading(false);
    }
  }, [portfolios, portfoliosLoading, selectedPortfolio]);

  useEffect(() => {
    void loadHoldings();
  }, [loadHoldings]);

  const symbols = useMemo(() => holdings.map((holding) => holding.symbol), [holdings]);

  const reload = useCallback(async () => {
    await reloadPortfolios();
    await loadHoldings();
  }, [loadHoldings, reloadPortfolios]);

  return {
    portfolios,
    selectedPortfolio,
    holdings,
    symbols,
    loading: portfoliosLoading || loading,
    error: portfoliosError ?? error,
    reload,
  };
};
