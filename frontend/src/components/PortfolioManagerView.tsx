import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Stock, Portfolio, Trade } from '../types';
import type { PortfolioPositionPerformance, PortfolioTransaction } from '../api/client';
import { fetchPortfolioPositionsPerformance, fetchPortfolioTransactions } from '../api/client';

interface PortfolioManagerViewProps {
  stocks: Stock[];
  portfolios: Portfolio[];
  onUpdatePortfolios: (updated: Portfolio[]) => void;
  onCreatePortfolio?: (name: string) => Promise<string | void> | string | void;
  onDeletePortfolio?: (id: string) => Promise<void> | void;
  activePortfolioId: string;
  onSelectPortfolioId: (id: string) => void;
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => void | Promise<void>;
  onOpenTradingJournal?: () => void;
}

type AllocationMode = 'daily' | 'total' | 'allocation';
type HoldingsTab = 'holdings' | 'transactions';
type PerformanceRange = '1M' | '3M' | '6M' | '1Y' | '2Y';

interface LocalPositionPerformance extends Omit<PortfolioPositionPerformance,
  'currentPrice' | 'marketValue' | 'dailyReturn' | 'weeklyReturn' | 'oneMonthReturn' | 'threeMonthReturn' |
  'sixMonthReturn' | 'oneYearReturn' | 'totalReturn'> {
  currentPrice: number | null;
  marketValue: number;
  dailyReturn: number | null;
  weeklyReturn: number | null;
  oneMonthReturn: number | null;
  threeMonthReturn: number | null;
  sixMonthReturn: number | null;
  oneYearReturn: number | null;
  totalReturn: number | null;
  quantity?: number;
}

const performanceRanges: PerformanceRange[] = ['1M', '3M', '6M', '1Y', '2Y'];
const allocationModes: Array<{ id: AllocationMode; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'total', label: 'Total' },
  { id: 'allocation', label: 'Allocation' },
];

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

const numericPortfolioId = (id: string | undefined): number | undefined => {
  if (!id) return undefined;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const parseDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function PortfolioManagerView({
  stocks,
  portfolios,
  onUpdatePortfolios,
  onCreatePortfolio,
  onDeletePortfolio,
  activePortfolioId,
  onSelectPortfolioId,
  onOpenTradingJournal,
}: PortfolioManagerViewProps) {
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('daily');
  const [activeTab, setActiveTab] = useState<HoldingsTab>('holdings');
  const [performanceRange, setPerformanceRange] = useState<PerformanceRange>('1M');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: number; returnPct: number } | null>(null);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [positionPerformance, setPositionPerformance] = useState<PortfolioPositionPerformance[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [positionError, setPositionError] = useState(false);
  const [transactionsError, setTransactionsError] = useState(false);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [portfolioActionError, setPortfolioActionError] = useState('');
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);
  const [isDeletingPortfolio, setIsDeletingPortfolio] = useState(false);
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false);
  const [isDeletePortfolioOpen, setIsDeletePortfolioOpen] = useState(false);

  const activePortfolio = useMemo(() => {
    return portfolios.find((portfolio) => portfolio.id === activePortfolioId) || (!activePortfolioId ? portfolios[0] : null);
  }, [activePortfolioId, portfolios]);

  const activeInvestmentPortfolioId = useMemo(() => numericPortfolioId(activePortfolio?.id), [activePortfolio?.id]);

  const stockMap = useMemo(() => {
    const map: Record<string, Stock> = {};
    stocks.forEach((stock) => {
      map[stock.symbol.toUpperCase()] = stock;
    });
    return map;
  }, [stocks]);

  useEffect(() => {
    let cancelled = false;

    const loadPortfolioDetails = async () => {
      if (!activeInvestmentPortfolioId) {
        setPositionPerformance([]);
        setTransactions([]);
        return;
      }

      const [positionsResult, transactionsResult] = await Promise.allSettled([
        fetchPortfolioPositionsPerformance(activeInvestmentPortfolioId),
        fetchPortfolioTransactions(activeInvestmentPortfolioId),
      ]);

      if (cancelled) return;

      if (positionsResult.status === 'fulfilled') {
        setPositionPerformance(positionsResult.value);
        setPositionError(false);
      } else {
        setPositionPerformance([]);
        setPositionError(true);
      }

      if (transactionsResult.status === 'fulfilled') {
        setTransactions(transactionsResult.value);
        setTransactionsError(false);
      } else {
        setTransactions([]);
        setTransactionsError(true);
      }
    };

    void loadPortfolioDetails();
    return () => {
      cancelled = true;
    };
  }, [activeInvestmentPortfolioId]);

  const fallbackPositions = useMemo<LocalPositionPerformance[]>(() => {
    if (!activePortfolio) return [];
    const values = activePortfolio.holdings.map((holding) => {
      const stock = stockMap[holding.symbol.toUpperCase()];
      const currentPrice = typeof stock?.price === 'number' ? stock.price : null;
      const marketValue = currentPrice == null ? 0 : holding.quantity * currentPrice;
      const costValue = holding.quantity * holding.costPrice;
      return {
        holding,
        stock,
        currentPrice,
        marketValue,
        totalReturn: currentPrice == null || costValue <= 0 ? null : ((marketValue - costValue) / costValue) * 100,
      };
    });
    const totalValue = values.reduce((sum, item) => sum + item.marketValue, 0);

    return values.map((item) => ({
      symbol: item.holding.symbol,
      company: item.stock?.name ?? item.holding.symbol,
      addedDate: null,
      costPrice: item.holding.costPrice,
      currentPrice: item.currentPrice,
      marketValue: item.marketValue,
      weight: totalValue > 0 ? (item.marketValue / totalValue) * 100 : 0,
      dailyReturn: item.stock?.changePercent ?? null,
      weeklyReturn: null,
      oneMonthReturn: null,
      threeMonthReturn: null,
      sixMonthReturn: null,
      oneYearReturn: null,
      totalReturn: item.totalReturn,
      quantity: item.holding.quantity,
    }));
  }, [activePortfolio, stockMap]);
  const displayedPositions = useMemo<LocalPositionPerformance[]>(() => {
    if (positionPerformance.length === 0) return fallbackPositions;
    return positionPerformance.map((position) => ({
      ...position,
      company: stockMap[position.symbol.toUpperCase()]?.name ?? position.company ?? position.symbol,
      currentPrice: position.currentPrice,
      marketValue: position.marketValue,
      dailyReturn: position.dailyReturn ?? null,
      weeklyReturn: position.weeklyReturn ?? null,
      oneMonthReturn: position.oneMonthReturn ?? null,
      threeMonthReturn: position.threeMonthReturn ?? null,
      sixMonthReturn: position.sixMonthReturn ?? null,
      oneYearReturn: position.oneYearReturn ?? null,
      totalReturn: position.totalReturn ?? null,
      quantity: activePortfolio?.holdings.find((holding) => holding.symbol === position.symbol)?.quantity,
    }));
  }, [activePortfolio?.holdings, fallbackPositions, positionPerformance, stockMap]);

  const portfolioSummary = useMemo(() => {
    const pricedPositions = displayedPositions.filter((position) => position.currentPrice != null);
    const totalValue = pricedPositions.reduce((sum, position) => sum + position.marketValue, 0);
    const totalCost = pricedPositions.reduce((sum, position) => sum + ((position.quantity ?? 1) * position.costPrice), 0);
    const totalPnl = totalValue - totalCost;
    const totalReturn = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
    const largestWeight = displayedPositions.reduce((max, position) => Math.max(max, position.weight), 0);

    return { totalValue, totalCost, totalPnl, totalReturn, largestWeight };
  }, [displayedPositions]);

  const allPerformanceData = useMemo(() => {
    if (!activePortfolio || activePortfolio.holdings.length === 0) return [];
    const histories = activePortfolio.holdings.map((holding) => {
      const stock = stockMap[holding.symbol.toUpperCase()];
      if (!stock?.history?.length) return null;
      const pricesByDate = new Map(stock.history.map((point) => [point.date.slice(0, 10), point.price]));
      return { holding, pricesByDate };
    });
    if (histories.some((item) => item == null)) return [];

    const typedHistories = histories as Array<{ holding: typeof activePortfolio.holdings[number]; pricesByDate: Map<string, number> }>;
    const commonDates = Array.from(typedHistories[0].pricesByDate.keys())
      .filter((date) => typedHistories.every((item) => item.pricesByDate.has(date)))
      .sort();

    return commonDates.map((date) => {
      let value = 0;
      let cost = 0;
      typedHistories.forEach(({ holding, pricesByDate }) => {
        const price = pricesByDate.get(date);
        if (price == null) return;
        value += holding.quantity * price;
        cost += holding.quantity * holding.costPrice;
      });
      return {
        date,
        value,
        returnPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      };
    });
  }, [activePortfolio, stockMap]);

  const rangedPerformanceData = useMemo(() => {
    const days = performanceRange === '1M' ? 30 : performanceRange === '3M' ? 90 : performanceRange === '6M' ? 180 : performanceRange === '1Y' ? 365 : 730;
    return allPerformanceData.slice(Math.max(0, allPerformanceData.length - days));
  }, [allPerformanceData, performanceRange]);

  const performanceChart = useMemo(() => {
    const width = 600;
    const height = 220;
    const padding = { top: 20, right: 16, bottom: 32, left: 52 };
    if (rangedPerformanceData.length < 2) {
      return { width, height, padding, line: '', area: '', points: [] as Array<{ x: number; y: number; data: typeof rangedPerformanceData[number] }>, min: -5, max: 5 };
    }
    const returns = rangedPerformanceData.map((point) => point.returnPct);
    const rawMin = Math.min(...returns);
    const rawMax = Math.max(...returns);
    const spread = Math.max(rawMax - rawMin, 8);
    const min = Math.floor((rawMin - spread * 0.18) / 2) * 2;
    const max = Math.ceil((rawMax + spread * 0.18) / 2) * 2;
    const range = max - min || 1;
    const drawableWidth = width - padding.left - padding.right;
    const drawableHeight = height - padding.top - padding.bottom;
    const points = rangedPerformanceData.map((point, index) => {
      const x = padding.left + (index / Math.max(rangedPerformanceData.length - 1, 1)) * drawableWidth;
      const y = padding.top + ((max - point.returnPct) / range) * drawableHeight;
      return { x, y, data: point };
    });
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const zeroY = padding.top + ((max - 0) / range) * drawableHeight;
    const area = `${line} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`;
    return { width, height, padding, line, area, points, min, max };
  }, [rangedPerformanceData]);

  const monthlyReturns = useMemo(() => {
    const grouped = new Map<string, { label: string; first: number; last: number; sort: string }>();
    allPerformanceData.forEach((point) => {
      const date = parseDate(point.date);
      if (!date) return;
      const key = monthKey(date);
      const label = monthFormatter.format(date);
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, { label, first: point.value, last: point.value, sort: key });
      } else {
        current.last = point.value;
      }
    });
    return Array.from(grouped.values()).map((item) => ({
      ...item,
      returnPct: item.first > 0 ? ((item.last - item.first) / item.first) * 100 : 0,
    }));
  }, [allPerformanceData]);

  const monthOptions = useMemo(() => monthlyReturns.sort((a, b) => a.sort.localeCompare(b.sort)), [monthlyReturns]);

  useEffect(() => {
    if (monthOptions.length === 0) {
      if (startMonth) setStartMonth('');
      if (endMonth) setEndMonth('');
      return;
    }
    const defaultStart = monthOptions[Math.max(0, monthOptions.length - 13)]?.sort ?? monthOptions[0].sort;
    const defaultEnd = monthOptions[monthOptions.length - 1].sort;
    const available = new Set(monthOptions.map((month) => month.sort));
    const nextStart = !startMonth || !available.has(startMonth) || startMonth > defaultEnd ? defaultStart : startMonth;
    const nextEnd = !endMonth || !available.has(endMonth) || endMonth < nextStart ? defaultEnd : endMonth;
    if (nextStart !== startMonth) setStartMonth(nextStart);
    if (nextEnd !== endMonth) setEndMonth(nextEnd);
  }, [endMonth, monthOptions, startMonth]);

  const startMonthOptions = useMemo(() => monthOptions.filter((month) => !endMonth || month.sort <= endMonth), [endMonth, monthOptions]);
  const endMonthOptions = useMemo(() => monthOptions.filter((month) => !startMonth || month.sort >= startMonth), [monthOptions, startMonth]);

  const filteredMonthlyReturns = useMemo(() => {
    return monthOptions.filter((month) => (!startMonth || month.sort >= startMonth) && (!endMonth || month.sort <= endMonth));
  }, [endMonth, monthOptions, startMonth]);

  const healthMetrics = useMemo(() => {
    const best = [...displayedPositions].filter((position) => position.totalReturn != null).sort((a, b) => (b.totalReturn ?? 0) - (a.totalReturn ?? 0))[0];
    const worst = [...displayedPositions].filter((position) => position.totalReturn != null).sort((a, b) => (a.totalReturn ?? 0) - (b.totalReturn ?? 0))[0];
    const largest = [...displayedPositions].sort((a, b) => b.weight - a.weight)[0];
    const unpriced = activePortfolio?.holdings.filter((holding) => !stockMap[holding.symbol.toUpperCase()]).length ?? 0;
    return { best, worst, largest, unpriced };
  }, [activePortfolio?.holdings, displayedPositions, stockMap]);

  const transactionRows = useMemo(() => {
    const sortedAscending = [...transactions].sort((a, b) => {
      const byDate = new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
      return byDate || a.id - b.id;
    });

    const accumulated = sortedAscending.reduce(
      (state, transaction) => {
        const quantity = transaction.quantity ?? 0;
        const purchaseAmount = quantity * transaction.price + (transaction.fee ?? 0);
        const sellAverageCost = state.runningQuantity > 0 ? state.runningCost / state.runningQuantity : 0;
        const nextState = transaction.action === 'BUY' || transaction.action === 'MANUAL_VALUATION'
          ? {
              runningQuantity: state.runningQuantity + quantity,
              runningCost: state.runningCost + purchaseAmount,
            }
          : transaction.action === 'SELL'
            ? {
                runningQuantity: Math.max(0, state.runningQuantity - quantity),
                runningCost: Math.max(0, state.runningCost - sellAverageCost * quantity),
              }
            : {
                runningQuantity: state.runningQuantity,
                runningCost: state.runningCost,
              };
        const averageCost = nextState.runningQuantity > 0 ? nextState.runningCost / nextState.runningQuantity : 0;
        return {
          ...nextState,
          rows: [...state.rows, { ...transaction, purchaseAmount, averageCost }],
        };
      },
      { runningQuantity: 0, runningCost: 0, rows: [] as Array<PortfolioTransaction & { purchaseAmount: number; averageCost: number }> },
    );

    return accumulated.rows.sort((a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime() || b.id - a.id);
  }, [transactions]);

  const activeHasHoldings = (activePortfolio?.holdings.length ?? 0) > 0;
  const deleteBlockReason = !activePortfolio
    ? 'Select a portfolio before deleting.'
    : portfolios.length <= 1
      ? 'At least one portfolio must remain.'
      : activeHasHoldings
        ? 'Sell or transfer all holdings before deleting this portfolio.'
        : '';

  const handleCreatePortfolio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newPortfolioName.trim();
    setPortfolioActionError('');

    if (name.length < 2 || name.length > 40) {
      setPortfolioActionError('Portfolio name must be 2-40 characters.');
      return;
    }
    if (portfolios.some((portfolio) => portfolio.name.trim().toLowerCase() === name.toLowerCase())) {
      setPortfolioActionError('A portfolio with this name already exists.');
      return;
    }

    setIsCreatingPortfolio(true);
    try {
      if (onCreatePortfolio) {
        const createdId = await Promise.resolve(onCreatePortfolio(name));
        if (createdId) {
          onSelectPortfolioId(String(createdId));
        }
      } else {
        const newPortfolio: Portfolio = { id: `portfolio-${Date.now()}`, name, holdings: [] };
        onUpdatePortfolios([...portfolios, newPortfolio]);
        onSelectPortfolioId(newPortfolio.id);
      }
      setNewPortfolioName('');
      setIsCreatePortfolioOpen(false);
    } catch (error) {
      setPortfolioActionError(error instanceof Error ? error.message : 'Portfolio could not be created.');
    } finally {
      setIsCreatingPortfolio(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!activePortfolio) return;
    setPortfolioActionError('');

    if (deleteBlockReason) {
      setPortfolioActionError(deleteBlockReason);
      return;
    }

    setIsDeletingPortfolio(true);
    try {
      if (onDeletePortfolio) {
        await Promise.resolve(onDeletePortfolio(activePortfolio.id));
      } else {
        onUpdatePortfolios(portfolios.filter((portfolio) => portfolio.id !== activePortfolio.id));
      }
      const nextPortfolio = portfolios.find((portfolio) => portfolio.id !== activePortfolio.id);
      if (nextPortfolio) {
        onSelectPortfolioId(nextPortfolio.id);
      }
      setIsDeletePortfolioOpen(false);
    } catch (error) {
      setPortfolioActionError(error instanceof Error ? error.message : 'Portfolio could not be deleted.');
    } finally {
      setIsDeletingPortfolio(false);
    }
  };
  const handlePerformanceMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (performanceChart.points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * performanceChart.width;
    const closest = performanceChart.points.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best, performanceChart.points[0]);
    setHoveredPoint({ x: closest.x, y: closest.y, date: closest.data.date, value: closest.data.value, returnPct: closest.data.returnPct });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '-';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatReturn = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = parseDate(value);
    return date ? dateFormatter.format(date) : value;
  };

  const returnColor = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return 'text-text-muted';
    return value >= 0 ? 'text-bull-green' : 'text-bear-red';
  };

  const tileColor = (value: number | null | undefined) => {
    if (allocationMode === 'allocation') return 'bg-primary/25 border-primary/35';
    if (value == null || Number.isNaN(value)) return 'bg-bg-base/70 border-outline-variant/35';
    return value >= 0 ? 'bg-bull-green/55 border-bull-green/50' : 'bg-bear-red/70 border-bear-red/60';
  };

  const chartColor = rangedPerformanceData[rangedPerformanceData.length - 1]?.returnPct < 0 ? '#ff3b5f' : '#14c8a6';
  const latestMonthlyReturns = monthlyReturns.slice(-3).reverse();
  const totalMonthlyReturn = filteredMonthlyReturns.length > 0 && filteredMonthlyReturns[0].first > 0
    ? ((filteredMonthlyReturns[filteredMonthlyReturns.length - 1].last - filteredMonthlyReturns[0].first) / filteredMonthlyReturns[0].first) * 100
    : null;
  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-4 md:p-6 space-y-6">
      <section className="bg-bg-card border border-outline-variant rounded-xl overflow-hidden shadow-md">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_560px] gap-6 p-6 md:p-8 min-h-72 items-center">
          <div className="flex items-center gap-8">
            <div className="hidden sm:flex h-28 w-28 items-end justify-center rounded-xl border border-outline-variant/25 bg-bg-base/35 p-4">
              <div className="flex items-end gap-2">
                <span className="h-10 w-8 rounded-t-md bg-bear-red/80" />
                <span className="h-20 w-8 rounded-t-md bg-primary/80" />
                <span className="h-14 w-8 rounded-t-md bg-warning-amber/80" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-text-muted">
                <span>US</span>
                <span>USD</span>
              </div>
              <h1 className="font-headline text-5xl font-black tracking-tight text-text-primary">
                {activePortfolio?.name || 'Portfolio'}
              </h1>
              <p className="mt-3 max-w-xl text-sm text-text-secondary">
                Active portfolio performance, allocation, concentration, and ledger history.
              </p>
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="min-w-56 text-[10px] font-label-caps font-bold uppercase tracking-widest text-text-muted">
                  Active Portfolio
                  <select
                    value={activePortfolio?.id ?? ''}
                    onChange={(event) => onSelectPortfolioId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-bg-base px-3 py-2 text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
                    aria-label="Select active portfolio"
                  >
                    {!activePortfolio && <option value="">Select portfolio</option>}
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id} className="bg-bg-card text-text-primary">
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPortfolioActionError('');
                                    setIsCreatePortfolioOpen(true);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/15"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Portfolio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPortfolioActionError('');
                                    setIsDeletePortfolioOpen(true);
                  }}
                  disabled={!activePortfolio || isDeletingPortfolio}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-bear-red/30 bg-bear-red/10 px-3 text-xs font-bold text-bear-red hover:bg-bear-red/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Portfolio</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-bull-green/30 bg-bg-base/30 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] gap-5 items-center">
              <div>
                <div className="mb-4 text-[11px] font-label-caps font-bold uppercase tracking-widest text-text-muted">Recent Months</div>
                <div className="space-y-3">
                  {latestMonthlyReturns.length === 0 ? (
                    <div className="text-xs text-text-muted">Monthly history is unavailable.</div>
                  ) : latestMonthlyReturns.map((month) => (
                    <div key={month.sort} className="flex items-center justify-between gap-4 text-sm font-bold">
                      <span className="text-text-secondary">{month.label}</span>
                      <span className={`rounded-full px-2 py-0.5 font-data-mono text-xs ${month.returnPct >= 0 ? 'bg-bull-green/10 text-bull-green' : 'bg-bear-red/10 text-bear-red'}`}>
                        {formatReturn(month.returnPct)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden h-36 bg-outline-variant/25 sm:block" />
              <div className="text-center">
                <div className="text-[11px] font-label-caps font-bold uppercase tracking-widest text-text-muted">Total Return</div>
                <div className={`mt-6 font-data-mono text-5xl font-black ${returnColor(portfolioSummary.totalReturn)}`}>
                  {formatReturn(portfolioSummary.totalReturn)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMonthlyModalOpen(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/15"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Monthly View</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Portfolio Value" value={formatCurrency(portfolioSummary.totalValue)} tone="neutral" />
        <MetricCard label="Best Performer" value={healthMetrics.best ? `${healthMetrics.best.symbol} ${formatReturn(healthMetrics.best.totalReturn)}` : '-'} tone="positive" />
        <MetricCard label="Worst Performer" value={healthMetrics.worst ? `${healthMetrics.worst.symbol} ${formatReturn(healthMetrics.worst.totalReturn)}` : '-'} tone="negative" />
        <MetricCard label="Largest Weight" value={healthMetrics.largest ? `${healthMetrics.largest.symbol} ${healthMetrics.largest.weight.toFixed(1)}%` : '-'} tone={portfolioSummary.largestWeight > 25 ? 'warning' : 'neutral'} />
      </section>


      <section className="bg-bg-card border border-outline-variant rounded-xl p-6 shadow-md">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-headline text-xl font-bold text-text-primary">Performance Analysis (USD)</h2>
            <p className="mt-1 text-sm text-text-secondary">USD-based cumulative performance</p>
          </div>
          <div className="flex rounded-xl border border-outline-variant/35 bg-bg-base p-1">
            {performanceRanges.map((range) => (
              <button
                key={range}
                onClick={() => setPerformanceRange(range)}
                className={`min-w-16 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${performanceRange === range ? 'bg-primary/15 text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              >
                <span className="block">{range}</span>
                <span className={`block font-data-mono text-[10px] ${returnColor(rangedPerformanceData[rangedPerformanceData.length - 1]?.returnPct)}`}>
                  {formatReturn(rangedPerformanceData[rangedPerformanceData.length - 1]?.returnPct)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-72">
          {hoveredPoint && (
            <div className="absolute z-20 rounded-lg border border-outline-variant bg-bg-primary px-3 py-2 text-xs shadow-lg" style={{ left: Math.min(hoveredPoint.x + 12, 430), top: Math.max(hoveredPoint.y - 26, 8) }}>
              <div className="font-data-mono text-text-muted">{formatDate(hoveredPoint.date)}</div>
              <div className="mt-1 font-data-mono font-bold text-text-primary">{formatCurrency(hoveredPoint.value)}</div>
              <div className={`font-data-mono text-[11px] ${returnColor(hoveredPoint.returnPct)}`}>{formatReturn(hoveredPoint.returnPct)}</div>
            </div>
          )}
          {performanceChart.points.length < 2 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-outline-variant/30 bg-bg-base/30 text-xs text-text-muted">
              Performance history is unavailable for this portfolio.
            </div>
          ) : (
            <svg
              className="h-full w-full cursor-crosshair"
              viewBox="0 0 600 220"
              preserveAspectRatio="none"
              aria-label="Portfolio performance analysis chart"
              onMouseMove={handlePerformanceMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="portfolioPerformanceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => {
                const y = performanceChart.padding.top + (line / 3) * (220 - performanceChart.padding.top - performanceChart.padding.bottom);
                const value = performanceChart.max - (line / 3) * (performanceChart.max - performanceChart.min);
                return (
                  <g key={line}>
                    <line x1="52" y1={y} x2="584" y2={y} stroke="#424753" strokeOpacity="0.24" strokeDasharray="3 3" />
                    <text x="44" y={y + 3} fill="#bec6e0" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                      {formatReturn(value)}
                    </text>
                  </g>
                );
              })}
              <path d={performanceChart.area} fill="url(#portfolioPerformanceArea)" />
              <path d={performanceChart.line} fill="none" stroke={chartColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {hoveredPoint && (
                <>
                  <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1="20" y2="188" stroke={chartColor} strokeOpacity="0.45" strokeDasharray="4 4" />
                  <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill={chartColor} stroke="#171f33" strokeWidth="2" />
                </>
              )}
            </svg>
          )}
        </div>
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[600px_minmax(0,1fr)] gap-6">
        <div className="bg-bg-card border border-outline-variant rounded-xl p-6 shadow-md">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold text-text-primary">Asset Allocation</h2>
              <p className="mt-1 text-sm text-text-secondary">Weight and performance</p>
            </div>
            <div className="flex rounded-xl border border-outline-variant/35 bg-bg-base p-1">
              {allocationModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setAllocationMode(mode.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${allocationMode === mode.id ? 'bg-primary/15 text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          {displayedPositions.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-outline-variant/30 bg-bg-base/30 text-xs text-text-muted">
              No holdings are available for allocation analysis.
            </div>
          ) : (
            <div className="grid min-h-72 grid-cols-2 auto-rows-fr gap-1.5 sm:grid-cols-4">
              {[...displayedPositions].sort((a, b) => b.weight - a.weight).map((position, index) => {
                const value = allocationMode === 'daily' ? position.dailyReturn : allocationMode === 'total' ? position.totalReturn : position.weight;
                return (
                  <div
                    key={position.symbol}
                    className={`flex min-h-24 flex-col items-center justify-center rounded-md border p-3 text-center ${tileColor(value)}`}
                    style={{ gridColumn: index === 0 ? 'span 2' : undefined, gridRow: position.weight >= 18 ? 'span 2' : undefined }}
                  >
                    <div className="font-data-mono text-base font-black text-text-primary">{position.symbol}</div>
                    <div className="mt-1 font-data-mono text-sm font-bold text-text-primary">
                      {allocationMode === 'allocation' ? `${position.weight.toFixed(1)}%` : formatReturn(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-outline-variant rounded-xl overflow-hidden shadow-md">
          <div className="flex border-b border-outline-variant/30 bg-bg-card/45 px-5">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`border-b-2 px-4 py-4 text-sm font-bold transition-colors ${activeTab === 'holdings' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Current Holdings
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`border-b-2 px-4 py-4 text-sm font-bold transition-colors ${activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Transaction History
            </button>
          </div>

          {activeTab === 'holdings' ? (
            <HoldingsTable positions={displayedPositions} formatCurrency={formatCurrency} formatDate={formatDate} formatReturn={formatReturn} returnColor={returnColor} />
          ) : (
            <TransactionTable rows={transactionRows} transactionsError={transactionsError} formatCurrency={formatCurrency} formatDate={formatDate} />
          )}
        </div>
      </section>

      {healthMetrics.unpriced > 0 && (
        <div className="rounded-xl border border-outline-variant/35 bg-bg-card px-4 py-3 text-xs text-text-muted">
          {healthMetrics.unpriced} holding(s) do not have refreshed market history and are excluded from some period-return calculations.
        </div>
      )}

      {positionError && (
        <div className="rounded-xl border border-warning-amber/35 bg-warning-amber/10 px-4 py-3 text-xs text-warning-amber">
          Live position metrics are unavailable; local holding values are shown without fabricated period returns.
        </div>
      )}

      {onOpenTradingJournal && (
        <button
          type="button"
          onClick={onOpenTradingJournal}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-bold text-primary shadow-lg backdrop-blur hover:bg-primary/15"
        >
          <BookOpen className="h-4 w-4" />
          <span>Open Trading Journal</span>
        </button>
      )}

      {isCreatePortfolioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-outline-variant bg-bg-primary shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 bg-bg-card/60 p-5">
              <h2 className="font-headline text-lg font-bold text-text-primary">Create Portfolio</h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreatePortfolioOpen(false);
                  setPortfolioActionError('');
                }}
                className="rounded-lg bg-bg-base/60 p-2 text-text-secondary hover:text-text-primary"
                aria-label="Close create portfolio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePortfolio} className="space-y-4 p-5">
              <label className="block text-xs font-bold text-text-secondary">
                Portfolio Name
                <input
                  autoFocus
                  value={newPortfolioName}
                  onChange={(event) => setNewPortfolioName(event.target.value)}
                  maxLength={40}
                  placeholder="Growth, Income, Hedge..."
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </label>
              {portfolioActionError && (
                <div className="rounded-lg border border-bear-red/35 bg-bear-red/10 px-3 py-2 text-xs font-semibold text-bear-red">
                  {portfolioActionError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePortfolioOpen(false)}
                  className="rounded-lg border border-outline-variant/40 bg-bg-base px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPortfolio}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isCreatingPortfolio ? 'Creating...' : 'Create Portfolio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeletePortfolioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-outline-variant bg-bg-primary shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 bg-bg-card/60 p-5">
              <h2 className="font-headline text-lg font-bold text-text-primary">Delete Portfolio</h2>
              <button
                type="button"
                onClick={() => {
                  setIsDeletePortfolioOpen(false);
                  setPortfolioActionError('');
                }}
                className="rounded-lg bg-bg-base/60 p-2 text-text-secondary hover:text-text-primary"
                aria-label="Close delete portfolio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-outline-variant/35 bg-bg-card p-4">
                <div className="text-[10px] font-label-caps font-bold uppercase tracking-widest text-text-muted">Selected Portfolio</div>
                <div className="mt-2 font-data-mono text-lg font-black text-text-primary">{activePortfolio?.name || '-'}</div>
              </div>
              {deleteBlockReason ? (
                <div className="rounded-lg border border-warning-amber/35 bg-warning-amber/10 px-3 py-2 text-xs font-semibold text-warning-amber">
                  {deleteBlockReason}
                </div>
              ) : (
                <div className="rounded-lg border border-bear-red/35 bg-bear-red/10 px-3 py-2 text-xs font-semibold text-bear-red">
                  This action deletes the empty portfolio. Transaction history for this portfolio will no longer be shown.
                </div>
              )}
              {portfolioActionError && (
                <div className="rounded-lg border border-bear-red/35 bg-bear-red/10 px-3 py-2 text-xs font-semibold text-bear-red">
                  {portfolioActionError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeletePortfolioOpen(false)}
                  className="rounded-lg border border-outline-variant/40 bg-bg-base px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePortfolio}
                  disabled={Boolean(deleteBlockReason) || isDeletingPortfolio}
                  className="inline-flex items-center gap-2 rounded-lg border border-bear-red/30 bg-bear-red/10 px-4 py-2 text-xs font-bold text-bear-red hover:bg-bear-red/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{isDeletingPortfolio ? 'Deleting...' : 'Delete Portfolio'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {monthlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg-base/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-outline-variant bg-bg-primary shadow-2xl">
            <div className="flex items-start justify-between border-b border-outline-variant/30 bg-bg-card/60 p-5">
              <div>
                <h2 className="font-headline text-lg font-bold text-text-primary">Monthly Performance</h2>
                <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                  {activePortfolio?.name || 'Portfolio'}
                </span>
              </div>
              <button onClick={() => setMonthlyModalOpen(false)} className="rounded-lg bg-bg-base/60 p-2 text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-outline-variant/35 bg-bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                  <CalendarDays className="h-4 w-4" />
                  <span>Period Selection</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-xs font-bold text-text-secondary">
                    Start Month
                    <select
                      value={startMonth}
                      onChange={(event) => setStartMonth(event.target.value)}
                      disabled={startMonthOptions.length === 0}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {startMonthOptions.map((month) => (
                        <option key={month.sort} value={month.sort} className="bg-bg-card text-text-primary">
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-text-secondary">
                    End Month
                    <select
                      value={endMonth}
                      onChange={(event) => setEndMonth(event.target.value)}
                      disabled={endMonthOptions.length === 0}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {endMonthOptions.map((month) => (
                        <option key={month.sort} value={month.sort} className="bg-bg-card text-text-primary">
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/35 bg-bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-headline text-sm font-bold text-text-primary">Monthly Return</h3>
                  <span className="text-xs text-text-muted">{filteredMonthlyReturns.length} months shown</span>
                </div>
                <div className="flex h-64 items-end gap-3 border-b border-outline-variant/25 px-2 pb-8 pt-4">
                  {filteredMonthlyReturns.length === 0 ? (
                    <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">No monthly data in this range.</div>
                  ) : filteredMonthlyReturns.map((month) => {
                    const height = Math.min(100, Math.max(8, Math.abs(month.returnPct) * 4));
                    return (
                      <div key={month.sort} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <div className={`w-full max-w-8 rounded-t ${month.returnPct >= 0 ? 'bg-primary' : 'bg-bear-red'}`} style={{ height: `${height}%` }} title={`${month.label}: ${formatReturn(month.returnPct)}`} />
                        <span className="-rotate-45 whitespace-nowrap text-[9px] text-text-muted">{month.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/35 bg-bg-card p-4">
                <h3 className="font-headline text-sm font-bold text-text-primary">Total Return (Selected Range)</h3>
                <div className="mt-4 h-4 rounded-full bg-bg-base">
                  <div className="h-4 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(2, Math.abs(totalMonthlyReturn ?? 0)))}%` }} />
                </div>
                <div className={`mt-4 rounded-xl border border-primary/25 bg-primary/10 p-4 font-data-mono text-2xl font-black ${returnColor(totalMonthlyReturn)}`}>
                  {activePortfolio?.name || 'Portfolio'} {formatReturn(totalMonthlyReturn)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'positive' | 'negative' | 'warning' }) {
  const color = tone === 'positive' ? 'text-bull-green' : tone === 'negative' ? 'text-bear-red' : tone === 'warning' ? 'text-warning-amber' : 'text-text-primary';
  return (
    <div className="rounded-xl border border-outline-variant/35 bg-bg-card p-4 shadow-sm">
      <div className="text-[10px] font-label-caps font-bold uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`mt-2 truncate font-data-mono text-lg font-black ${color}`}>{value}</div>
    </div>
  );
}

function HoldingsTable({
  positions,
  formatCurrency,
  formatDate,
  formatReturn,
  returnColor,
}: {
  positions: LocalPositionPerformance[];
  formatCurrency: (value: number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
  formatReturn: (value: number | null | undefined) => string;
  returnColor: (value: number | null | undefined) => string;
}) {
  if (positions.length === 0) {
    return <div className="p-8 text-center text-xs text-text-muted">No current holdings are available.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-xs">
        <thead className="bg-bg-base/40 text-[10px] uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-4 py-3">Added Date</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3 text-right">Cost</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Weight</th>
            <th className="px-4 py-3 text-right">Daily</th>
            <th className="px-4 py-3 text-right">Weekly</th>
            <th className="px-4 py-3 text-right">1M</th>
            <th className="px-4 py-3 text-right">3M</th>
            <th className="px-4 py-3 text-right">6M</th>
            <th className="px-4 py-3 text-right">1Y</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {positions.map((position) => (
            <tr key={position.symbol} className="hover:bg-bg-base/25">
              <td className="px-4 py-3 font-data-mono text-text-secondary">{formatDate(position.addedDate)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/50 bg-bg-base font-data-mono font-black text-primary">
                    {position.symbol.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-data-mono font-black text-text-primary">{position.symbol}</div>
                    <div className="max-w-36 truncate text-[10px] text-text-muted">{position.company}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-data-mono font-bold text-text-secondary">{formatCurrency(position.costPrice)}</td>
              <td className="px-4 py-3 text-right font-data-mono font-bold text-text-primary">{formatCurrency(position.currentPrice)}</td>
              <td className="px-4 py-3 text-right font-data-mono font-bold text-text-primary">{position.weight.toFixed(2)}%</td>
              <td className={`px-4 py-3 text-right font-data-mono font-bold ${returnColor(position.dailyReturn)}`}>{formatReturn(position.dailyReturn)}</td>
              <td className={`px-4 py-3 text-right font-data-mono font-bold ${returnColor(position.weeklyReturn)}`}>{formatReturn(position.weeklyReturn)}</td>
              <td className={`px-4 py-3 text-right font-data-mono font-bold ${returnColor(position.oneMonthReturn)}`}>{formatReturn(position.oneMonthReturn)}</td>
              <td className={`px-4 py-3 text-right font-data-mono font-bold ${returnColor(position.threeMonthReturn)}`}>{formatReturn(position.threeMonthReturn)}</td>
              <td className={`px-4 py-3 text-right font-data-mono font-bold ${returnColor(position.sixMonthReturn)}`}>{formatReturn(position.sixMonthReturn)}</td>
              <td className={`px-4 py-3 text-right font-data-mono font-bold ${returnColor(position.oneYearReturn)}`}>{formatReturn(position.oneYearReturn)}</td>
              <td className={`px-4 py-3 text-right font-data-mono font-black ${returnColor(position.totalReturn)}`}>{formatReturn(position.totalReturn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionTable({
  rows,
  transactionsError,
  formatCurrency,
  formatDate,
}: {
  rows: Array<PortfolioTransaction & { purchaseAmount: number; averageCost: number }>;
  transactionsError: boolean;
  formatCurrency: (value: number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
}) {
  if (transactionsError) {
    return <div className="p-8 text-center text-xs text-warning-amber">Transaction history is unavailable.</div>;
  }
  if (rows.length === 0) {
    return <div className="p-8 text-center text-xs text-text-muted">No transaction history is available for this portfolio.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="bg-bg-base/40 text-[10px] uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3 text-right">Purchase Amount</th>
            <th className="px-4 py-3 text-right">Average Cost</th>
            <th className="px-4 py-3 text-right">Price at Transaction</th>
            <th className="px-4 py-3">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-bg-base/25">
              <td className="px-4 py-3 font-data-mono text-text-secondary">{formatDate(row.tradeDate)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex min-w-24 items-center justify-center rounded-md border px-2 py-1 font-bold ${row.action === 'SELL' ? 'border-bear-red/35 bg-bear-red/10 text-bear-red' : 'border-bull-green/35 bg-bull-green/10 text-bull-green'}`}>
                  {row.action === 'SELL' ? <ArrowDownRight className="mr-1 h-3 w-3" /> : <ArrowUpRight className="mr-1 h-3 w-3" />}
                  {row.action}
                </span>
              </td>
              <td className="px-4 py-3 font-data-mono font-black text-text-primary">{row.symbol ?? '-'}</td>
              <td className="px-4 py-3 text-right font-data-mono font-bold text-text-primary">{formatCurrency(row.purchaseAmount)}</td>
              <td className="px-4 py-3 text-right font-data-mono font-bold text-text-secondary">{formatCurrency(row.averageCost)}</td>
              <td className="px-4 py-3 text-right font-data-mono font-bold text-text-primary">{formatCurrency(row.price)}</td>
              <td className="px-4 py-3 text-text-secondary">{row.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}