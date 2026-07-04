import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InvestmentPortfolio, PortfolioTransaction } from '../api/client';
import { fetchInvestmentPortfolios, fetchPortfolioTransactions } from '../api/client';

export interface LedgerEntry extends PortfolioTransaction {
  portfolioName: string;
  portfolioCurrency: string;
}

export function useJournalLedger() {
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const portfolioList = await fetchInvestmentPortfolios();
      setPortfolios(portfolioList);
      const settled = await Promise.allSettled(
        portfolioList.map(async portfolio => {
          const items = await fetchPortfolioTransactions(portfolio.id);
          return items.map(transaction => ({
            ...transaction,
            portfolioName: portfolio.name,
            portfolioCurrency: portfolio.baseCurrency,
          }));
        })
      );
      setTransactions(settled.flatMap(result => result.status === 'fulfilled' ? result.value : []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio ledger');
      setPortfolios([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const portfolioById = useMemo(() => {
    const map = new Map<number, InvestmentPortfolio>();
    portfolios.forEach(portfolio => map.set(portfolio.id, portfolio));
    return map;
  }, [portfolios]);

  return { portfolios, transactions, portfolioById, loading, error, reload: load };
}