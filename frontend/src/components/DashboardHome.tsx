import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Briefcase,
  Globe,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import type { CalendarEvent, News, Stock, Portfolio } from '../types';
import type { MacroSnapshot, PortfolioComparisonSeries, PortfolioPositionPerformance } from '../api/client';
import { fetchMacroSnapshot, fetchPortfolioPerformanceComparison, fetchPortfolioPositionsPerformance } from '../api/client';

interface DashboardHomeProps {
  stocks: Stock[];
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolioId: (id: string) => void;
  onSelectStock: (stock: Stock) => void;
  onOpenTradingJournal: () => void;
  onNavigateToNews: () => void;
  news: News[];
  calendarEvents: CalendarEvent[];
}

export default function DashboardHome({
  stocks,
  portfolios,
  activePortfolioId,
  onSelectPortfolioId,
  onSelectStock,
  onOpenTradingJournal,
  onNavigateToNews,
  news,
  calendarEvents,
}: DashboardHomeProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [comparisonPeriod, setComparisonPeriod] = useState('6M');
  const [selectedComparisonPortfolioIds, setSelectedComparisonPortfolioIds] = useState<string[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>(['SP500', 'NASDAQ', 'GOLD']);
  const [comparisonSeries, setComparisonSeries] = useState<PortfolioComparisonSeries[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(false);
  const [hoveredComparisonDate, setHoveredComparisonDate] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<'news' | 'calendar'>('news');
  const [macroSnapshot, setMacroSnapshot] = useState<MacroSnapshot | null>(null);
  const [macroSnapshotError, setMacroSnapshotError] = useState(false);
  const [allocationMode, setAllocationMode] = useState<'daily' | 'total' | 'allocation'>('daily');
  const [positionPerformance, setPositionPerformance] = useState<PortfolioPositionPerformance[]>([]);
  const [positionPerformanceLoading, setPositionPerformanceLoading] = useState(false);
  const [positionPerformanceError, setPositionPerformanceError] = useState(false);


  useEffect(() => {
    let cancelled = false;

    const loadMacroSnapshot = async () => {
      try {
        const snapshot = await fetchMacroSnapshot();
        if (!cancelled) {
          setMacroSnapshot(snapshot);
          setMacroSnapshotError(false);
        }
      } catch {
        if (!cancelled) {
          setMacroSnapshot(null);
          setMacroSnapshotError(true);
        }
      }
    };

    void loadMacroSnapshot();
    return () => {
      cancelled = true;
    };
  }, []);
  const handlePrevPortfolio = () => {
    if (portfolios.length <= 1) return;
    const currentIndex = portfolios.findIndex((p) => p.id === activePortfolioId);
    const prevIndex = (currentIndex - 1 + portfolios.length) % portfolios.length;
    onSelectPortfolioId(portfolios[prevIndex].id);
  };

  const handleNextPortfolio = () => {
    if (portfolios.length <= 1) return;
    const currentIndex = portfolios.findIndex((p) => p.id === activePortfolioId);
    const nextIndex = (currentIndex + 1) % portfolios.length;
    onSelectPortfolioId(portfolios[nextIndex].id);
  };

  // Map stocks by symbol for quick access
  const stockMap = useMemo(() => {
    const map: Record<string, Stock> = {};
    stocks.forEach((s) => {
      map[s.symbol] = s;
    });
    return map;
  }, [stocks]);

  // Find active portfolio
  const activePortfolio = useMemo(() => {
    return portfolios.find((p) => p.id === activePortfolioId) || portfolios[0] || portfolios[0];
  }, [portfolios, activePortfolioId]);

  // Calculations for active portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!activePortfolio) {
      return { totalValue: 0, totalProfitLoss: 0, totalReturnPercent: 0, positions: [], holdingsCount: 0 };
    }

    let currentTotalValue = 0;
    let totalCostBasis = 0;

    const calculatedPositions = activePortfolio.holdings.map((h) => {
      const stock = stockMap[h.symbol];
      const currentPrice = stock ? stock.price : h.costPrice;
      const value = h.quantity * currentPrice;
      const cost = h.quantity * h.costPrice;
      const profitLoss = value - cost;
      const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;

      currentTotalValue += value;
      totalCostBasis += cost;

      return {
        ...h,
        currentPrice,
        value,
        profitLoss,
        profitLossPercent,
        name: stock ? stock.name : h.symbol,
      };
    });

    const totalProfitLoss = currentTotalValue - totalCostBasis;
    const totalReturnPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

    return {
      totalValue: currentTotalValue,
      totalProfitLoss,
      totalReturnPercent,
      positions: calculatedPositions,
      holdingsCount: activePortfolio.holdings.length,
    };
  }, [activePortfolio, stockMap]);


  const activeInvestmentPortfolioId = useMemo(() => {
    const id = Number(activePortfolio?.id);
    return Number.isFinite(id) ? id : undefined;
  }, [activePortfolio?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadPositionPerformance = async () => {
      setPositionPerformanceLoading(true);
      try {
        const response = await fetchPortfolioPositionsPerformance(activeInvestmentPortfolioId);
        if (!cancelled) {
          setPositionPerformance(response);
          setPositionPerformanceError(false);
        }
      } catch {
        if (!cancelled) {
          setPositionPerformance([]);
          setPositionPerformanceError(true);
        }
      } finally {
        if (!cancelled) {
          setPositionPerformanceLoading(false);
        }
      }
    };

    void loadPositionPerformance();
    return () => {
      cancelled = true;
    };
  }, [activeInvestmentPortfolioId]);

  const fallbackPositionPerformance = useMemo<PortfolioPositionPerformance[]>(() => {
    const totalValue = portfolioMetrics.totalValue;
    return portfolioMetrics.positions.map((pos) => ({
      symbol: pos.symbol,
      company: pos.name,
      addedDate: null,
      costPrice: pos.costPrice,
      currentPrice: pos.currentPrice,
      marketValue: pos.value,
      weight: totalValue > 0 ? (pos.value / totalValue) * 100 : 0,
      dailyReturn: null,
      weeklyReturn: null,
      oneMonthReturn: null,
      threeMonthReturn: null,
      sixMonthReturn: null,
      oneYearReturn: null,
      totalReturn: pos.profitLossPercent,
    }));
  }, [portfolioMetrics.positions, portfolioMetrics.totalValue]);

  const displayedPositionPerformance = positionPerformance.length > 0 ? positionPerformance : fallbackPositionPerformance;

  // Search filter for holdings table
  const filteredPositions = useMemo(() => {
    if (!tableSearch.trim()) return displayedPositionPerformance;
    const query = tableSearch.toLowerCase();
    return displayedPositionPerformance.filter(
      (pos) =>
        pos.symbol.toLowerCase().includes(query) ||
        pos.company.toLowerCase().includes(query)
    );
  }, [displayedPositionPerformance, tableSearch]);


  const allocationData = useMemo(() => {
    const source = displayedPositionPerformance.length > 0 ? displayedPositionPerformance : fallbackPositionPerformance;
    return source
      .map((pos) => {
        const selectedReturn = allocationMode === 'daily'
          ? pos.dailyReturn
          : allocationMode === 'total'
            ? pos.totalReturn
            : pos.weight;
        return {
          symbol: pos.symbol,
          company: pos.company,
          value: pos.marketValue,
          percentage: pos.weight,
          selectedReturn,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [allocationMode, displayedPositionPerformance, fallbackPositionPerformance]);

  const allocationModes = [
    { id: 'daily' as const, label: 'Daily' },
    { id: 'total' as const, label: 'Total' },
    { id: 'allocation' as const, label: 'Allocation' },
  ];

  const formatDateLabel = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatReturn = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const returnColor = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return 'text-text-muted';
    return value >= 0 ? 'text-bull-green' : 'text-bear-red';
  };

  const tileColorClass = (value: number | null | undefined) => {
    if (allocationMode === 'allocation') return 'bg-primary/25 border-primary/35';
    if (value == null || Number.isNaN(value)) return 'bg-bg-base/80 border-outline-variant/35';
    return value >= 0 ? 'bg-bull-green/55 border-bull-green/50' : 'bg-bear-red/65 border-bear-red/55';
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '-';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Date formatter helper for visual chart labels in English
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  const comparisonBenchmarks = [
    { id: 'SP500', label: 'S&P 500' },
    { id: 'NASDAQ', label: 'NASDAQ' },
    { id: 'GOLD', label: 'GOLD' },
    { id: 'BIST100', label: 'BIST 100' },
  ];

  const comparisonPeriods = [
    { id: '1M', label: '1M' },
    { id: '3M', label: '3M' },
    { id: '6M', label: '6M' },
    { id: 'YTD', label: 'YTD' },
    { id: '1Y', label: '1Y' },
    { id: 'ALL', label: 'MAX' },
  ];

  useEffect(() => {
    if (portfolios.length === 0) {
      setSelectedComparisonPortfolioIds([]);
      return;
    }

    setSelectedComparisonPortfolioIds((current) => {
      const availableIds = new Set(portfolios.map((portfolio) => portfolio.id));
      const retained = current.filter((id) => availableIds.has(id));
      if (retained.length > 0) return retained;
      return [activePortfolio?.id || portfolios[0].id];
    });
  }, [activePortfolio?.id, portfolios]);

  useEffect(() => {
    let cancelled = false;
    const portfolioIds = selectedComparisonPortfolioIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (portfolioIds.length === 0 && selectedBenchmarks.length === 0) {
      setComparisonSeries([]);
      return;
    }

    const loadComparison = async () => {
      setComparisonLoading(true);
      try {
        const response = await fetchPortfolioPerformanceComparison(
          comparisonPeriod,
          portfolioIds,
          selectedBenchmarks
        );
        if (!cancelled) {
          setComparisonSeries(response.series);
          setComparisonError(false);
        }
      } catch {
        if (!cancelled) {
          setComparisonSeries([]);
          setComparisonError(true);
        }
      } finally {
        if (!cancelled) {
          setComparisonLoading(false);
        }
      }
    };

    void loadComparison();
    return () => {
      cancelled = true;
    };
  }, [comparisonPeriod, selectedBenchmarks, selectedComparisonPortfolioIds]);

  const toggleComparisonPortfolio = (portfolioId: string) => {
    setSelectedComparisonPortfolioIds((current) => {
      if (current.includes(portfolioId)) {
        return current.filter((id) => id !== portfolioId);
      }
      return [...current, portfolioId];
    });
  };

  const toggleBenchmark = (benchmarkId: string) => {
    setSelectedBenchmarks((current) => {
      if (current.includes(benchmarkId)) {
        return current.filter((id) => id !== benchmarkId);
      }
      return [...current, benchmarkId];
    });
  };

  const visibleComparisonSeries = useMemo(() => {
    const selectedPortfolioIds = new Set(selectedComparisonPortfolioIds);
    const selectedBenchmarkIds = new Set(selectedBenchmarks);
    return comparisonSeries.filter((series) => {
      if (series.type === 'PORTFOLIO') return selectedPortfolioIds.has(series.id);
      return selectedBenchmarkIds.has(series.id) || selectedBenchmarkIds.has(series.label.replace(/\s+/g, '').toUpperCase());
    });
  }, [comparisonSeries, selectedBenchmarks, selectedComparisonPortfolioIds]);

  const comparisonChart = useMemo(() => {
    const width = 600;
    const height = 240;
    const padding = { top: 18, right: 18, bottom: 34, left: 48 };
    const drawableWidth = width - padding.left - padding.right;
    const drawableHeight = height - padding.top - padding.bottom;
    const allPoints = visibleComparisonSeries.flatMap((series) => series.points);
    const allDates = Array.from(new Set(allPoints.map((point) => point.date)))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (allPoints.length === 0 || allDates.length === 0) {
      return { width, height, padding, minReturn: -10, maxReturn: 10, series: [], labels: [] as string[], allDates: [] as string[] };
    }

    const rawMin = Math.min(...allPoints.map((point) => point.returnPct));
    const rawMax = Math.max(...allPoints.map((point) => point.returnPct));
    const spread = Math.max(rawMax - rawMin, 10);
    const minReturn = Math.floor((rawMin - spread * 0.12) / 5) * 5;
    const maxReturn = Math.ceil((rawMax + spread * 0.12) / 5) * 5;
    const valueRange = maxReturn - minReturn || 10;
    const colors = ['#4d8eff', '#14c8a6', '#f59e0b', '#ff5451', '#8bb8d8', '#e6cf63', '#a78bfa'];
    const dateX = new Map(allDates.map((date, index) => [date, padding.left + (index / Math.max(allDates.length - 1, 1)) * drawableWidth]));

    const mappedSeries = visibleComparisonSeries.map((series, seriesIndex) => {
      const points = series.points.map((point) => {
        const x = dateX.get(point.date) ?? padding.left;
        const y = padding.top + ((maxReturn - point.returnPct) / valueRange) * drawableHeight;
        return { x, y, point };
      });
      const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
      return { ...series, color: colors[seriesIndex % colors.length], path, chartPoints: points };
    });

    const labelIndexes = Array.from(new Set([0, Math.floor((allDates.length - 1) / 2), allDates.length - 1]));
    const labels = labelIndexes.map((index) => allDates[index]).filter(Boolean);

    return { width, height, padding, minReturn, maxReturn, series: mappedSeries, labels, allDates };
  }, [visibleComparisonSeries]);
  const comparisonSummary = useMemo(() => {
    const firstPortfolio = visibleComparisonSeries.find((series) => series.type === 'PORTFOLIO' && series.points.length > 0);
    const lastPoint = firstPortfolio?.points[firstPortfolio.points.length - 1];
    if (!firstPortfolio || !lastPoint) {
      return null;
    }
    return { label: firstPortfolio.label, returnPct: lastPoint.returnPct };
  }, [visibleComparisonSeries]);

  const hoveredComparisonSnapshot = useMemo(() => {
    if (!hoveredComparisonDate) return null;
    const dateIndex = comparisonChart.allDates.indexOf(hoveredComparisonDate);
    const x = dateIndex >= 0
      ? comparisonChart.padding.left + (dateIndex / Math.max(comparisonChart.allDates.length - 1, 1)) * (comparisonChart.width - comparisonChart.padding.left - comparisonChart.padding.right)
      : comparisonChart.padding.left;
    return {
      date: hoveredComparisonDate,
      x,
      items: comparisonChart.series.map((series) => {
        const point = series.points.find((item) => item.date === hoveredComparisonDate);
        return {
          id: series.id,
          label: series.label,
          color: series.color,
          currency: series.currency,
          value: point?.value ?? null,
          returnPct: point?.returnPct ?? null,
        };
      }),
    };
  }, [comparisonChart, hoveredComparisonDate]);

  const updateHoveredComparisonDate = (clientX: number, bounds: DOMRect) => {
    if (comparisonChart.allDates.length === 0 || bounds.width <= 0) return;
    const ratio = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
    const viewX = ratio * comparisonChart.width;
    const drawableWidth = comparisonChart.width - comparisonChart.padding.left - comparisonChart.padding.right;
    const axisRatio = Math.min(Math.max((viewX - comparisonChart.padding.left) / drawableWidth, 0), 1);
    const index = Math.round(axisRatio * (comparisonChart.allDates.length - 1));
    setHoveredComparisonDate(comparisonChart.allDates[index] ?? null);
  };

  const formatComparisonValue = (value: number | null, currency?: string | null) => {
    if (value == null) return '-';
    if (currency) {
      return `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  // Prioritize active portfolio stocks and macro financial news
  const portfolioNewsList = useMemo(() => {
    if (!activePortfolio) return news.slice(0, 4);
    const activeSymbols = new Set(activePortfolio.holdings.map((h) => h.symbol));

    const filtered = news.filter((n) => {
      const isMacro = n.category === 'macro';
      const isRelated = n.symbol && activeSymbols.has(n.symbol);
      return isMacro || isRelated;
    });

    // Sort: related assets first
    return filtered.sort((a, b) => {
      const aRelated = a.symbol && activeSymbols.has(a.symbol);
      const bRelated = b.symbol && activeSymbols.has(b.symbol);
      if (aRelated && !bRelated) return -1;
      if (!aRelated && bRelated) return 1;
      return 0;
    }).slice(0, 4);
  }, [activePortfolio, news]);

  const formatMacroValue = (value: number | null | undefined, suffix = '%') => value == null ? '-' : value.toFixed(2) + suffix;

  const macroItems = [
    { label: 'Fed Funds', value: formatMacroValue(macroSnapshot?.fedFundsRate) },
    { label: '10Y Treasury', value: formatMacroValue(macroSnapshot?.treasury10y) },
    { label: 'CPI YoY', value: formatMacroValue(macroSnapshot?.cpiYoy) },
    { label: 'Unemployment', value: formatMacroValue(macroSnapshot?.unemploymentRate) },
    { label: 'Yield Spread', value: formatMacroValue(macroSnapshot?.yieldCurveSpread) },
  ];

  const hasMacroValues = macroItems.some((item) => item.value !== '-');


  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
              <span>Consolidated Portfolio Terminal:</span>
              <span className="text-primary font-sans font-extrabold">{activePortfolio ? activePortfolio.name : ''}</span>
            </h2>

            {/* Portfolio Up/Down switch buttons */}
            <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/30 rounded-lg p-1 shadow-sm shrink-0">
              <button
                onClick={handlePrevPortfolio}
                title="Previous Portfolio"
                className="p-1 hover:bg-primary/10 rounded text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextPortfolio}
                title="Next Portfolio"
                className="p-1 hover:bg-primary/10 rounded text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Your active investment strategy, stock-specific news, and asset ratios.
          </p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            PORTFOLIO VALUE
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-data-mono text-2xl font-bold text-text-primary">
              ${portfolioMetrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-bull-green"></span>
            <span>Live Market Exposure</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            TOTAL PROFIT / LOSS (P/L)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-data-mono text-2xl font-bold ${portfolioMetrics.totalProfitLoss >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
              {portfolioMetrics.totalProfitLoss >= 0 ? '+' : ''}
              ${portfolioMetrics.totalProfitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px]">
            {portfolioMetrics.totalProfitLoss >= 0 ? (
              <span className="text-bull-green flex items-center font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> Net Gain</span>
            ) : (
              <span className="text-bear-red flex items-center font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> Net Loss</span>
            )}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            TOTAL RETURN RATE
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-data-mono text-2xl font-bold ${portfolioMetrics.totalReturnPercent >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
              {portfolioMetrics.totalReturnPercent >= 0 ? '+' : ''}
              {portfolioMetrics.totalReturnPercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Capital Growth Multiple</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            INSTRUMENT DIVERSITY
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-data-mono text-2xl font-bold text-text-primary">
              {portfolioMetrics.holdingsCount}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Active Distributed Risk</span>
          </div>
        </div>
      </div>

      {/* Macro Snapshot */}
      <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-primary" />
              <span>Macro Snapshot</span>
            </h3>
            <p className="text-[11px] text-text-muted font-sans">FRED macro context. Missing provider fields stay empty.</p>
          </div>
          {macroSnapshot?.observedAt && (
            <span className="font-data-mono text-[10px] text-text-muted">Observed: {macroSnapshot.observedAt}</span>
          )}
        </div>

        {hasMacroValues ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {macroItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
                <div className="text-[9px] uppercase tracking-wider text-text-muted font-label-caps">{item.label}</div>
                <div className="mt-1 font-data-mono text-lg font-bold text-text-primary">{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3 text-xs text-text-secondary">
            {macroSnapshotError ? 'Macro provider unavailable; no fabricated macro values are shown.' : 'Macro values are not available yet.'}
          </div>
        )}
      </div>

      {/* Charts section: Performance Curve and Allocation Treemap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-series cumulative return chart */}
        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-4 mb-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="font-headline text-sm font-bold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Portfolio Return Comparison</span>
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-xs font-data-mono font-semibold ${comparisonSummary && comparisonSummary.returnPct >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                  {comparisonSummary ? `${comparisonSummary.label}: ${comparisonSummary.returnPct >= 0 ? '+' : ''}${comparisonSummary.returnPct.toFixed(2)}%` : 'Cumulative return'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:items-end">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-label-caps font-bold tracking-wider text-text-muted">
                <span>Benchmark:</span>
                {comparisonBenchmarks.map((benchmark) => {
                  const active = selectedBenchmarks.includes(benchmark.id);
                  return (
                    <button
                      key={benchmark.id}
                      onClick={() => toggleBenchmark(benchmark.id)}
                      className={`rounded-md border px-2 py-1 transition-colors ${active ? 'border-primary/45 bg-primary/15 text-text-primary' : 'border-outline-variant/40 text-text-secondary hover:text-text-primary'}`}
                    >
                      {benchmark.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 bg-bg-base p-1 rounded-lg border border-outline-variant/40">
                {comparisonPeriods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setComparisonPeriod(period.id)}
                    className={`px-2 py-0.5 rounded font-label-caps text-[10px] font-bold tracking-wider transition-all ${comparisonPeriod === period.id
                        ? 'bg-primary text-bg-base font-extrabold'
                        : 'text-text-secondary hover:text-text-primary'
                      }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {portfolios.map((portfolio) => {
              const active = selectedComparisonPortfolioIds.includes(portfolio.id);
              return (
                <button
                  key={portfolio.id}
                  onClick={() => toggleComparisonPortfolio(portfolio.id)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${active ? 'border-primary/50 bg-primary/15 text-text-primary' : 'border-outline-variant/35 text-text-secondary hover:text-text-primary'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${active ? 'bg-primary' : 'bg-outline-variant'}`} />
                  <span>{portfolio.name}</span>
                </button>
              );
            })}
          </div>

          <div className="h-72 w-full relative select-none">
            {hoveredComparisonSnapshot && (
              <div
                className="absolute z-20 min-w-56 rounded border border-primary/30 bg-bg-primary px-3 py-2 text-xs shadow-lg"
                style={{ left: Math.min(hoveredComparisonSnapshot.x + 12, 430), top: 8 }}
              >
                <div className="mb-1 font-data-mono text-[11px] font-bold text-text-primary">
                  {formatDate(hoveredComparisonSnapshot.date)}
                </div>
                <div className="space-y-1">
                  {hoveredComparisonSnapshot.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-text-secondary">{item.label}</span>
                      <span className="font-data-mono text-text-primary">
                        {formatComparisonValue(item.value, item.currency)}
                        <span className={`ml-2 ${returnColor(item.returnPct)}`}>{formatReturn(item.returnPct)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comparisonLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-text-muted">Loading return series...</div>
            ) : comparisonError ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-outline-variant/30 bg-bg-base/30 text-xs text-text-secondary">
                Performance data is unavailable; no fabricated values are shown.
              </div>
            ) : comparisonChart.series.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-outline-variant/30 bg-bg-base/30 text-xs text-text-secondary">
                Select a portfolio or benchmark to compare.
              </div>
            ) : (
              <svg
                className="h-full w-full"
                viewBox="0 0 600 240"
                preserveAspectRatio="none"
                aria-label="Portfolio cumulative return comparison chart"
                onMouseMove={(event) => updateHoveredComparisonDate(event.clientX, event.currentTarget.getBoundingClientRect())}
                onMouseLeave={() => setHoveredComparisonDate(null)}
              >
                {[0, 1, 2, 3].map((line) => {
                  const y = comparisonChart.padding.top + (line / 3) * (240 - comparisonChart.padding.top - comparisonChart.padding.bottom);
                  const value = comparisonChart.maxReturn - (line / 3) * (comparisonChart.maxReturn - comparisonChart.minReturn);
                  return (
                    <g key={line}>
                      <line x1="48" y1={y} x2="582" y2={y} stroke="#424753" strokeOpacity="0.22" strokeDasharray="3 3" />
                      <text x="42" y={y + 3} fill="#bec6e0" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                        {value >= 0 ? '+' : ''}{value.toFixed(0)}%
                      </text>
                    </g>
                  );
                })}

                {hoveredComparisonSnapshot && (
                  <line
                    x1={hoveredComparisonSnapshot.x}
                    x2={hoveredComparisonSnapshot.x}
                    y1={comparisonChart.padding.top}
                    y2={240 - comparisonChart.padding.bottom}
                    stroke="#6f88c9"
                    strokeOpacity="0.45"
                    strokeDasharray="4 4"
                  />
                )}

                {comparisonChart.series.map((series) => (
                  <g key={series.id}>
                    {series.path && (
                      <path
                        d={series.path}
                        fill="none"
                        stroke={series.color}
                        strokeWidth={series.type === 'PORTFOLIO' ? 2.8 : 1.8}
                        strokeDasharray={series.type === 'BENCHMARK' ? '5 4' : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {series.chartPoints.map((point, pointIndex) => {
                      const active = point.point.date === hoveredComparisonDate;
                      const shouldShow = pointIndex === 0 || pointIndex === series.chartPoints.length - 1 || active;
                      if (!shouldShow) return null;
                      return (
                        <circle
                          key={`${series.id}-${point.point.date}`}
                          cx={point.x}
                          cy={point.y}
                          r={active ? 5 : 3}
                          fill={series.color}
                          stroke="#171f33"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </g>
                ))}
              </svg>
            )}

            <div className="absolute bottom-0 left-12 right-4 flex justify-between">
              {comparisonChart.labels.map((label) => (
                <span key={label} className="font-data-mono text-[9px] text-text-muted">
                  {formatDate(label)}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {comparisonChart.series.map((series) => (
              <div key={`${series.id}-legend`} className="flex items-center gap-1.5 rounded-md bg-bg-base/70 px-2 py-1 text-xs font-bold text-text-primary">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                <span>{series.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Allocation Treemap */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-outline-variant/30 pb-3">
            <div>
              <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide">
                Asset Allocation
              </h3>
              <p className="mt-1 text-[11px] text-text-muted">Weight and performance</p>
            </div>
            <div className="flex rounded-lg border border-outline-variant/35 bg-bg-base p-1">
              {allocationModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setAllocationMode(mode.id)}
                  className={`rounded px-2 py-1 text-[10px] font-bold transition-colors ${allocationMode === mode.id ? 'bg-primary text-bg-base' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-72 flex-1">
            {allocationData.length === 0 ? (
              <div className="flex h-full min-h-56 items-center justify-center rounded-lg border border-outline-variant/30 bg-bg-base/30 text-xs text-text-muted">
                No assets have been added.
              </div>
            ) : (
              <div className="grid h-full min-h-72 grid-cols-2 auto-rows-fr gap-1.5 sm:grid-cols-3">
                {allocationData.map((item, index) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      const matchedStock = stockMap[item.symbol];
                      if (matchedStock) onSelectStock(matchedStock);
                    }}
                    className={`min-h-20 rounded-md border p-3 text-left transition-transform hover:-translate-y-0.5 ${tileColorClass(item.selectedReturn)}`}
                    style={{
                      gridColumn: index === 0 ? 'span 2' : undefined,
                      gridRow: item.percentage >= 20 ? 'span 2' : undefined,
                    }}
                  >
                    <div className="flex h-full flex-col justify-center">
                      <div className="font-data-mono text-base font-extrabold text-text-primary">{item.symbol}</div>
                      <div className="mt-1 font-data-mono text-sm font-bold text-text-primary">
                        {allocationMode === 'allocation' ? `${item.percentage.toFixed(1)}%` : formatReturn(item.selectedReturn)}
                      </div>
                      <div className="mt-1 truncate text-[10px] text-text-secondary">{item.company}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Layout: Tabbed News/Calendar Block on the Left, Holdings Positions Table on the Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tabbed News & Macro Calendar Sidebar */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Tabs */}
            <div className="flex border-b border-outline-variant/35 pb-2 text-xs font-sans font-bold">
              <button
                onClick={() => setBottomTab('news')}
                className={`flex-1 pb-2 border-b-2 text-center transition-all ${bottomTab === 'news'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
              >
                News Feed
              </button>
              <button
                onClick={() => setBottomTab('calendar')}
                className={`flex-1 pb-2 border-b-2 text-center transition-all ${bottomTab === 'calendar'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
              >
                Economic Calendar
              </button>
            </div>

            {/* Tab A: News stream */}
            {bottomTab === 'news' && (
              <div className="space-y-3">
                {portfolioNewsList.map((news) => {
                  const isActiveSymbolsRelated = news.symbol && activePortfolio?.holdings.some(h => h.symbol === news.symbol);
                  return (
                    <a
                      key={news.id}
                      href={news.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`block p-2.5 rounded-lg border transition-all text-xs ${isActiveSymbolsRelated
                          ? 'bg-primary/5 border-primary/30 hover:border-primary/55'
                          : 'bg-bg-base/30 border-outline-variant/20 hover:border-outline-variant/50'
                        }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-data-mono text-[9px] text-text-muted uppercase tracking-wider font-bold">
                          {news.source} - {news.time}
                        </span>
                        {news.symbol && (
                          <span className="font-data-mono text-[8px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-1 py-0.2 rounded">
                            {news.symbol}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-text-primary mt-1 group-hover:text-primary leading-snug truncate">
                        {news.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                        {news.summary}
                      </p>
                    </a>
                  );
                })}

                <button
                  onClick={onNavigateToNews}
                  className="w-full py-2 border border-outline-variant/50 hover:border-primary/40 rounded-lg text-center text-xs font-bold text-primary hover:text-text-primary transition-all flex items-center justify-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Filter and Read All News</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tab B: Macro Calendar */}
            {bottomTab === 'calendar' && (
              <div className="space-y-3">
                {calendarEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-bg-base/60 rounded-lg border border-outline-variant/25 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-[10px] text-text-muted font-data-mono">
                        {event.date}, {event.time}
                      </div>
                      <h4 className="text-xs font-bold text-text-primary leading-tight">{event.title}</h4>
                    </div>

                    <span
                      className={`text-[8px] font-label-caps px-1.5 py-0.5 rounded border tracking-wider font-bold shrink-0 ${event.importance === 'CRITICAL'
                          ? 'bg-bear-red/10 border-bear-red/35 text-bear-red'
                          : 'bg-warning-amber/10 border-warning-amber/35 text-warning-amber'
                        }`}
                    >
                      {event.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Positions holdings table */}
        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3 mb-4">
            <div>
              <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" />
                <span>Current Asset Positions</span>
              </h3>
              <span className="text-[11px] text-text-muted font-sans font-medium">
                Showing {displayedPositionPerformance.length} assets in the active portfolio
                {positionPerformanceError ? ' - live position metrics unavailable' : ''}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Filter positions..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="bg-bg-base border border-outline-variant rounded px-2.5 py-1 pl-8 text-xs text-text-primary placeholder:text-text-muted w-44 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/35 text-[9px] font-label-caps text-text-muted tracking-wider uppercase bg-bg-base/20">
                  <th className="py-2.5 px-3">Added</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Weight</th>
                  <th className="py-2.5 px-3 text-right">Daily</th>
                  <th className="py-2.5 px-3 text-right">Weekly</th>
                  <th className="py-2.5 px-3 text-right">1M</th>
                  <th className="py-2.5 px-3 text-right">3M</th>
                  <th className="py-2.5 px-3 text-right">6M</th>
                  <th className="py-2.5 px-3 text-right">1Y</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {positionPerformanceLoading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-xs text-text-muted font-sans">
                      Loading position metrics...
                    </td>
                  </tr>
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-xs text-text-muted font-sans">
                      No matching position found. Use the top bar or stock detail actions to add a new trade order.
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((pos) => {
                    const matchedStock = stockMap[pos.symbol];
                    return (
                      <tr
                        key={pos.symbol}
                        onClick={() => matchedStock && onSelectStock(matchedStock)}
                        className="border-b border-outline-variant/15 hover:bg-bg-base/35 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 font-data-mono text-[11px] text-text-secondary whitespace-nowrap">
                          {formatDateLabel(pos.addedDate)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-bg-primary border border-outline-variant/60 flex items-center justify-center font-extrabold text-xs text-primary group-hover:text-text-primary group-hover:border-primary/45 transition-colors shrink-0">
                              {pos.symbol.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-data-mono font-bold text-text-primary group-hover:text-primary transition-colors text-xs">
                                {pos.symbol}
                              </div>
                              <div className="text-[10px] text-text-muted max-w-[140px] truncate">
                                {pos.company}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-secondary">{formatCurrency(pos.costPrice)}</td>
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-primary font-bold">{formatCurrency(pos.currentPrice)}</td>
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-primary font-bold">{pos.weight.toFixed(2)}%</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${returnColor(pos.dailyReturn)}`}>{formatReturn(pos.dailyReturn)}</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${returnColor(pos.weeklyReturn)}`}>{formatReturn(pos.weeklyReturn)}</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${returnColor(pos.oneMonthReturn)}`}>{formatReturn(pos.oneMonthReturn)}</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${returnColor(pos.threeMonthReturn)}`}>{formatReturn(pos.threeMonthReturn)}</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${returnColor(pos.sixMonthReturn)}`}>{formatReturn(pos.sixMonthReturn)}</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${returnColor(pos.oneYearReturn)}`}>{formatReturn(pos.oneYearReturn)}</td>
                        <td className={`py-3 px-3 text-right font-data-mono text-xs font-extrabold ${returnColor(pos.totalReturn)}`}>{formatReturn(pos.totalReturn)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <span className="text-[10px] text-text-muted font-sans">
              Select a row to open AI analysis and technical chart details for that stock.
            </span>
            <button
              onClick={onOpenTradingJournal}
              className="text-xs font-bold text-primary hover:text-text-primary flex items-center gap-1.5 transition-colors font-sans"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Trading Journal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
