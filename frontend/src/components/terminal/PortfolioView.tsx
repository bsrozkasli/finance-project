import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PortfolioHolding, PortfolioPosition, PortfolioTransaction } from '../../api/client';
import { AllocationPanel } from '../portfolio/AllocationPanel';
import type { ThemeAssignments } from '../portfolio/AllocationPanel';
import { HoldingDetailPanel } from '../portfolio/HoldingDetailPanel';
import { HoldingTable } from '../portfolio/HoldingTable';
import { MetricsStrip } from '../portfolio/MetricsStrip';
import { OptimizationPanel } from '../portfolio/OptimizationPanel';
import { PerformancePanel } from '../portfolio/PerformancePanel';
import { CurrencyImpactPanel } from '../portfolio/CurrencyImpactPanel';
import { DividendCalendarPanel } from '../portfolio/DividendCalendarPanel';
import { RiskAlertsPanel } from '../portfolio/RiskAlertsPanel';
import { buildPortfolioRiskAlerts, publishPortfolioRiskAlerts } from '../portfolio/portfolioRisk';
import { PortfolioHeader } from '../portfolio/PortfolioHeader';
import { calculateVolatility, performanceReturn, toNumber } from '../portfolio/portfolioUtils';
import type { EnrichedRow, PortfolioTotals } from '../portfolio/portfolioUtils';
import { useInvestmentPortfolio } from '../../hooks/useInvestmentPortfolio';
import { useLivePrice } from '../../hooks/useLivePrice';
import { usePortfolioPositions } from '../../hooks/usePortfolioPositions';

interface LivePriceEntry {
  price: number;
  changePct: number;
}

const themeAssignmentsKey = 'finance-project:portfolio-theme-assignments';
const customThemesKey = 'finance-project:portfolio-custom-themes';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const earliestTradeDate = (transactions: PortfolioTransaction[], symbol: string): string => {
  const dates = transactions
    .filter(transaction => transaction.symbol?.toUpperCase() === symbol.toUpperCase())
    .map(transaction => transaction.tradeDate)
    .filter(Boolean)
    .sort();
  return dates[0] ?? '';
};

const holdingToPosition = (
  holding: PortfolioHolding,
  index: number,
  legacy: PortfolioPosition | undefined,
  transactions: PortfolioTransaction[]
): PortfolioPosition => ({
  id: legacy?.id ?? index + 1,
  symbol: holding.symbol.toUpperCase(),
  quantity: toNumber(holding.quantity),
  avgCostPrice: toNumber(holding.averageCost),
  openedAt: legacy?.openedAt ?? earliestTradeDate(transactions, holding.symbol),
  notes: legacy?.notes ?? holding.assetType,
});

const rowValue = (row: EnrichedRow, key: string): number | string => {
  if (key === 'symbol') return row.position.symbol;
  if (key === 'marketValue') return row.marketValue ?? 0;
  if (key === 'changePct') return row.changePct ?? 0;
  if (key === 'totalReturn') return row.totalReturn ?? 0;
  if (key === 'unrealizedPnL') return row.unrealizedPnL ?? 0;
  if (key === 'quantity') return row.position.quantity;
  if (key === 'avgCost') return row.position.avgCostPrice;
  if (key === 'lastPrice') return row.price ?? 0;
  if (key === 'costBasis') return row.costBasis;
  return 0;
};

const PositionLiveProbe = ({ symbol, onUpdate }: { symbol: string; onUpdate: (symbol: string, price: number, changePct: number) => void }) => {
  const { data } = useLivePrice(symbol);

  useEffect(() => {
    if (data) {
      onUpdate(symbol, data.price, data.changePct);
    }
  }, [data, onUpdate, symbol]);

  return null;
};

const buildRows = ({
  holdings,
  legacyPositions,
  transactions,
  liveMap,
  enrichedPositions,
}: {
  holdings: PortfolioHolding[];
  legacyPositions: PortfolioPosition[];
  transactions: PortfolioTransaction[];
  liveMap: Record<string, LivePriceEntry>;
  enrichedPositions: import('../../api/client').EnrichedPosition[];
}): EnrichedRow[] => {
  if (holdings.length > 0) {
    return holdings.map((holding, index) => {
      const legacy = legacyPositions.find(position => position.symbol.toUpperCase() === holding.symbol.toUpperCase());
      const position = holdingToPosition(holding, index, legacy, transactions);
      const live = liveMap[position.symbol];
      const enriched = enrichedPositions.find(item => item.symbol.toUpperCase() === position.symbol);
      const price = live?.price ?? (enriched?.currentPrice != null ? toNumber(enriched.currentPrice) : null);
      const costBasis = toNumber(holding.costBasis, position.quantity * position.avgCostPrice);
      const marketValue = price != null ? price * position.quantity : (enriched?.marketValue != null ? toNumber(enriched.marketValue) : null);
      const realizedPnl = toNumber(holding.realizedPnl);
      const unrealizedPnL = marketValue != null ? marketValue - costBasis : null;
      const totalReturn = costBasis > 0 && unrealizedPnL != null ? ((unrealizedPnL + realizedPnl) / costBasis) * 100 : null;
      return { position, holding, enriched, price, changePct: live?.changePct ?? null, marketValue, costBasis, realizedPnl, unrealizedPnL, totalReturn };
    });
  }

  return legacyPositions.map(position => {
    const symbol = position.symbol.toUpperCase();
    const live = liveMap[symbol];
    const enriched = enrichedPositions.find(item => item.symbol.toUpperCase() === symbol);
    const price = live?.price ?? (enriched?.currentPrice != null ? toNumber(enriched.currentPrice) : null);
    const costBasis = position.quantity * position.avgCostPrice;
    const marketValue = price != null ? price * position.quantity : (enriched?.marketValue != null ? toNumber(enriched.marketValue) : null);
    const unrealizedPnL = marketValue != null ? marketValue - costBasis : null;
    const totalReturn = costBasis > 0 && unrealizedPnL != null ? (unrealizedPnL / costBasis) * 100 : null;
    return { position: { ...position, symbol }, enriched, price, changePct: live?.changePct ?? null, marketValue, costBasis, realizedPnl: 0, unrealizedPnL, totalReturn };
  });
};

const calculateTotals = (rows: EnrichedRow[]): PortfolioTotals => {
  const totalMarketValue = rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0);
  const totalCostBasis = rows.reduce((sum, row) => sum + row.costBasis, 0);
  const totalPnL = rows.reduce((sum, row) => sum + (row.unrealizedPnL ?? 0) + row.realizedPnl, 0);
  const dailyPnL = rows.reduce((sum, row) => {
    if (row.price == null || row.changePct == null) return sum;
    const previous = row.price / (1 + (row.changePct / 100));
    return sum + ((row.price - previous) * row.position.quantity);
  }, 0);
  return {
    totalMarketValue,
    dailyPnL,
    totalPnL,
    totalCostBasis,
    totalReturn: totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0,
    assetCount: rows.length,
  };
};

export const PortfolioView = () => {
  const navigate = useNavigate();
  const params = useParams<{ portfolioId?: string }>();
  const routePortfolioId = params.portfolioId ? Number(params.portfolioId) : null;
  const [activePeriod, setActivePeriod] = useState('1M');
  const [benchmark, setBenchmark] = useState<string | undefined>(undefined);
  const {
    portfolios,
    selectedPortfolio,
    selectedPortfolioId,
    holdings,
    transactions,
    performance,
    allocation,
    enrichedPositions,
    loading,
    error,
    setSelectedPortfolioId,
    createPortfolio,
    reload,
  } = useInvestmentPortfolio(Number.isFinite(routePortfolioId ?? Number.NaN) ? routePortfolioId : null, activePeriod, benchmark);
  const { positions: legacyPositions, loading: positionsLoading } = usePortfolioPositions();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('marketValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [liveMap, setLiveMap] = useState<Record<string, LivePriceEntry>>({});
  const [themeAssignments, setThemeAssignments] = useState<ThemeAssignments>(() => readJson<ThemeAssignments>(themeAssignmentsKey, {}));
  const [customThemes, setCustomThemes] = useState<string[]>(() => readJson<string[]>(customThemesKey, []));

  const handleLiveUpdate = useCallback((symbol: string, price: number, changePct: number) => {
    setLiveMap(prev => {
      const current = prev[symbol];
      if (current?.price === price && current.changePct === changePct) return prev;
      return { ...prev, [symbol]: { price, changePct } };
    });
  }, []);

  const rows = useMemo(() => buildRows({
    holdings,
    legacyPositions,
    transactions,
    liveMap,
    enrichedPositions,
  }), [enrichedPositions, holdings, legacyPositions, liveMap, transactions]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = needle ? rows.filter(row => row.position.symbol.toLowerCase().includes(needle)) : rows;
    return [...filtered].sort((a, b) => {
      const av = rowValue(a, sortKey);
      const bv = rowValue(b, sortKey);
      const diff = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [rows, search, sortDir, sortKey]);

  const totals = useMemo(() => calculateTotals(rows), [rows]);
  const riskAlerts = useMemo(() => buildPortfolioRiskAlerts(rows, allocation?.bySector ?? []), [allocation?.bySector, rows]);
  useEffect(() => {
    publishPortfolioRiskAlerts(riskAlerts);
  }, [riskAlerts]);
  const selectedRow = useMemo(() => rows.find(row => row.position.symbol === selectedSymbol) ?? null, [rows, selectedSymbol]);
  const periodicReturn = performanceReturn(performance);
  const volatility = calculateVolatility(performance);
  const sharpe = performance?.metrics?.sharpe ?? null;

  const saveThemes = (assignments: ThemeAssignments, themes: string[]) => {
    setThemeAssignments(assignments);
    setCustomThemes(themes);
    window.localStorage.setItem(themeAssignmentsKey, JSON.stringify(assignments));
    window.localStorage.setItem(customThemesKey, JSON.stringify(themes));
  };

  const selectPortfolio = (id: number) => {
    setSelectedPortfolioId(id);
    setSelectedSymbol(null);
    navigate(`/portfolio/${id}`);
  };

  const createNewPortfolio = async (name: string, baseCurrency: string, description?: string) => {
    const created = await createPortfolio({ name, baseCurrency, description });
    navigate(`/portfolio/${created.id}`);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(direction => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (error) {
    return (
      <div className="terminal-main flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="rounded-lg border p-6 text-center" style={{ background: 'var(--color-bear-dim)', borderColor: 'var(--color-bear)' }}>
          <div className="text-sm font-bold" style={{ color: 'var(--color-bear)' }}>Portfolio Error</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-main overflow-y-auto animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>
      {rows.map(row => <PositionLiveProbe key={row.position.symbol} symbol={row.position.symbol} onUpdate={handleLiveUpdate} />)}

      <PortfolioHeader
        portfolios={portfolios}
        selectedPortfolio={selectedPortfolio}
        selectedPortfolioId={selectedPortfolioId}
        summaries={selectedPortfolioId ? [{ portfolioId: selectedPortfolioId, value: totals.totalMarketValue, dailyPnl: totals.dailyPnL }] : []}
        onSelectPortfolio={selectPortfolio}
        onCreatePortfolio={createNewPortfolio}
      />

      <div className="px-5 pt-4">
        <RiskAlertsPanel alerts={riskAlerts} />
      </div>

      <MetricsStrip totals={totals} beta={null} sharpe={sharpe} performance={performance} />

      {selectedPortfolioId && (
        <div className="px-5 pb-4">
          <Link to={`/transactions?portfolioId=${selectedPortfolioId}`} className="inline-flex rounded-lg px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-bg-card)', color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>
            Islem Gecmisi
          </Link>
        </div>
      )}

      <div className="space-y-4 px-5 pb-6">
        <PerformancePanel
          period={activePeriod}
          benchmark={benchmark}
          performance={performance}
          rows={rows}
          onPeriodChange={setActivePeriod}
          onBenchmarkChange={setBenchmark}
        />

        <div className="grid gap-4 2xl:grid-cols-2">
          <AllocationPanel rows={rows} assignments={themeAssignments} customThemes={customThemes} onSave={saveThemes} />
          <OptimizationPanel rows={rows} totals={totals} currentReturn={periodicReturn.returnPct ?? totals.totalReturn} currentRisk={volatility} />
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <CurrencyImpactPanel portfolio={selectedPortfolio} rows={rows} transactions={transactions} />
          <DividendCalendarPanel rows={rows} transactions={transactions} baseCurrency={selectedPortfolio?.baseCurrency ?? 'USD'} />
        </div>

        <HoldingTable
          rows={filteredRows}
          loading={loading || positionsLoading}
          selectedSymbol={selectedSymbol}
          search={search}
          sortKey={sortKey}
          sortDir={sortDir}
          onSearchChange={setSearch}
          onSort={handleSort}
          onSelect={symbol => setSelectedSymbol(current => current === symbol ? null : symbol)}
        />
      </div>

      <HoldingDetailPanel row={selectedRow} portfolioId={selectedPortfolioId} onClose={() => setSelectedSymbol(null)} onTransactionAdded={reload} />
    </div>
  );
};
