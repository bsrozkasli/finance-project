import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreateInvestmentPortfolioRequest,
  EnrichedPosition,
  InvestmentPortfolio,
  PortfolioAllocation,
  PortfolioHolding,
  PortfolioPerformanceResponse,
  PortfolioSummary,
  PortfolioTransaction,
} from '../api/client';
import {
  createInvestmentPortfolio,
  fetchEnrichedPositions,
  fetchInvestmentPortfolios,
  fetchPortfolioAllocation,
  fetchPortfolioHoldings,
  fetchPortfolioPerformance,
  fetchPortfolioSummary,
  fetchPortfolioTransactions,
} from '../api/client';

interface PortfolioDetailState {
  portfolios: InvestmentPortfolio[];
  selectedPortfolio: InvestmentPortfolio | null;
  selectedPortfolioId: number | null;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  summary: PortfolioSummary | null;
  performance: PortfolioPerformanceResponse | null;
  allocation: PortfolioAllocation | null;
  enrichedPositions: EnrichedPosition[];
  loading: boolean;
  error: string | null;
  setSelectedPortfolioId: (id: number) => void;
  createPortfolio: (request: CreateInvestmentPortfolioRequest) => Promise<InvestmentPortfolio>;
  reload: () => Promise<void>;
}

const errorMessage = (value: unknown, fallback: string) => value instanceof Error ? value.message : fallback;

export function useInvestmentPortfolio(
  portfolioId: number | null,
  period = '1M',
  benchmark?: string
): PortfolioDetailState {
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioIdState] = useState<number | null>(portfolioId);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformanceResponse | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null);
  const [enrichedPositions, setEnrichedPositions] = useState<EnrichedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (portfolioId) {
      setSelectedPortfolioIdState(portfolioId);
    }
  }, [portfolioId]);

  const loadPortfolios = useCallback(async () => {
    const list = await fetchInvestmentPortfolios();
    setPortfolios(list);
    setSelectedPortfolioIdState(prev => {
      if (portfolioId && list.some(portfolio => portfolio.id === portfolioId)) return portfolioId;
      if (prev && list.some(portfolio => portfolio.id === prev)) return prev;
      return list.find(portfolio => portfolio.defaultPortfolio)?.id ?? list[0]?.id ?? null;
    });
    return list;
  }, [portfolioId]);

  const loadSelectedData = useCallback(async (id: number | null) => {
    const [holdingsResult, transactionsResult, summaryResult, performanceResult, allocationResult, enrichedResult] = await Promise.allSettled([
      id ? fetchPortfolioHoldings(id) : Promise.resolve([]),
      id ? fetchPortfolioTransactions(id) : Promise.resolve([]),
      fetchPortfolioSummary(),
      fetchPortfolioPerformance(period, benchmark),
      fetchPortfolioAllocation(),
      fetchEnrichedPositions(),
    ]);

    setHoldings(holdingsResult.status === 'fulfilled' ? holdingsResult.value : []);
    setTransactions(transactionsResult.status === 'fulfilled' ? transactionsResult.value : []);
    setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null);
    setPerformance(performanceResult.status === 'fulfilled' ? performanceResult.value : null);
    setAllocation(allocationResult.status === 'fulfilled' ? allocationResult.value : null);
    setEnrichedPositions(enrichedResult.status === 'fulfilled' ? enrichedResult.value : []);
  }, [benchmark, period]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await loadPortfolios();
      const id = selectedPortfolioId && list.some(portfolio => portfolio.id === selectedPortfolioId)
        ? selectedPortfolioId
        : portfolioId && list.some(portfolio => portfolio.id === portfolioId)
          ? portfolioId
          : list.find(portfolio => portfolio.defaultPortfolio)?.id ?? list[0]?.id ?? null;
      await loadSelectedData(id);
    } catch (e) {
      setError(errorMessage(e, 'Failed to load investment portfolios'));
      setPortfolios([]);
      setHoldings([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [loadPortfolios, loadSelectedData, portfolioId, selectedPortfolioId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!loading) {
      void loadSelectedData(selectedPortfolioId);
    }
  }, [loadSelectedData, loading, selectedPortfolioId]);

  const createPortfolio = useCallback(async (request: CreateInvestmentPortfolioRequest) => {
    const created = await createInvestmentPortfolio(request);
    setPortfolios(prev => [created, ...prev]);
    setSelectedPortfolioIdState(created.id);
    await loadSelectedData(created.id);
    return created;
  }, [loadSelectedData]);

  const selectedPortfolio = useMemo(
    () => portfolios.find(portfolio => portfolio.id === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId]
  );

  return {
    portfolios,
    selectedPortfolio,
    selectedPortfolioId,
    holdings,
    transactions,
    summary,
    performance,
    allocation,
    enrichedPositions,
    loading,
    error,
    setSelectedPortfolioId: setSelectedPortfolioIdState,
    createPortfolio,
    reload,
  };
}