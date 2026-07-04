import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Search,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Briefcase,
  Sparkles,
  Globe,
  Landmark,
  Cpu,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText
} from 'lucide-react';
import { Stock, Portfolio, Holding } from '../types';
import { MACRO_CALENDAR, MOCK_NEWS } from '../mockData';

interface DashboardHomeProps {
  stocks: Stock[];
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolioId: (id: string) => void;
  onSelectStock: (stock: Stock) => void;
  onOpenTradeModal: (symbol: string) => void;
  onOpenTradingJournal: () => void;
  onNavigateToNews: () => void;
}

export default function DashboardHome({
  stocks,
  portfolios,
  activePortfolioId,
  onSelectPortfolioId,
  onSelectStock,
  onOpenTradeModal,
  onOpenTradingJournal,
  onNavigateToNews,
}: DashboardHomeProps) {
  const [timeframe, setTimeframe] = useState('1M');
  const [tableSearch, setTableSearch] = useState('');
  const [hoveredHistoryIndex, setHoveredHistoryIndex] = useState<number | null>(null);
  const [bottomTab, setBottomTab] = useState<'news' | 'calendar'>('news');

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

  // Calculate metrics for all portfolios to display in the selector page bar cards
  const portfolioSummaryList = useMemo(() => {
    return portfolios.map((p) => {
      let totalValue = 0;
      let totalCost = 0;
      p.holdings.forEach((h) => {
        const stock = stockMap[h.symbol];
        const currentPrice = stock ? stock.price : h.costPrice;
        totalValue += h.quantity * currentPrice;
        totalCost += h.quantity * h.costPrice;
      });

      const pl = totalValue - totalCost;
      const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        totalValue,
        profitLoss: pl,
        profitLossPercent: plPct,
        holdingsCount: p.holdings.length,
      };
    });
  }, [portfolios, stockMap]);

  // Search filter for holdings table
  const filteredPositions = useMemo(() => {
    if (!tableSearch.trim()) return portfolioMetrics.positions;
    const query = tableSearch.toLowerCase();
    return portfolioMetrics.positions.filter(
      (pos) =>
        pos.symbol.toLowerCase().includes(query) ||
        pos.name.toLowerCase().includes(query)
    );
  }, [portfolioMetrics.positions, tableSearch]);

  // Asset allocation percentages for Donut Chart
  const allocationData = useMemo(() => {
    const total = portfolioMetrics.totalValue;
    if (total === 0) return [];

    return portfolioMetrics.positions.map((pos) => ({
      symbol: pos.symbol,
      value: pos.value,
      percentage: (pos.value / total) * 100,
    }));
  }, [portfolioMetrics.positions, portfolioMetrics.totalValue]);

  // Date formatter helper for visual chart labels in Turkish
  const formatTurkishDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = date.getDate();
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return `${day} ${months[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  // Reconstruct portfolio historical valuation curve dynamically over 250 days based on active holdings
  const performanceHistory = useMemo(() => {
    if (!activePortfolio || activePortfolio.holdings.length === 0) {
      // Empty portfolio template fallback
      const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Pzt', 'Sal', 'Çar', 'Per', 'Bugün'];
      return labels.map((label) => ({
        label,
        value: 1000.0,
        date: '',
      }));
    }

    // Use history of the first asset to map indices, assuming historical dates align
    const firstHoldingSymbol = activePortfolio.holdings[0].symbol;
    const stockHistoryLength = stockMap[firstHoldingSymbol]?.history?.length || 0;
    if (stockHistoryLength === 0) {
      return [];
    }

    const fullHistory: { date: string; value: number }[] = [];
    for (let i = 0; i < stockHistoryLength; i++) {
      let dailyValue = 0;
      let date = '';
      activePortfolio.holdings.forEach((h) => {
        const stock = stockMap[h.symbol];
        if (stock && stock.history[i]) {
          dailyValue += h.quantity * stock.history[i].price;
          date = stock.history[i].date;
        }
      });
      fullHistory.push({
        date,
        value: Math.round(dailyValue * 100) / 100,
      });
    }

    // Determine slice index based on selected timeframe
    let sliceCount = 30; // default 1M
    switch (timeframe) {
      case '1D':
        sliceCount = 10; // represent last 10 ticks for micro-movement
        break;
      case '5D':
        sliceCount = 5;
        break;
      case '1M':
        sliceCount = 30;
        break;
      case '3M':
        sliceCount = 90;
        break;
      case '6M':
        sliceCount = 180;
        break;
      case '1Y':
      case 'ALL':
        sliceCount = stockHistoryLength;
        break;
    }

    const slicedData = fullHistory.slice(-sliceCount);

    return slicedData.map((d) => ({
      label: formatTurkishDate(d.date),
      value: d.value,
      date: d.date,
    }));
  }, [activePortfolio, stockMap, timeframe]);

  // Calculate return percent over the selected timeframe
  const timeframeReturn = useMemo(() => {
    if (performanceHistory.length < 2) return { value: 0, percent: 0, isPositive: true };
    const firstPoint = performanceHistory[0].value;
    const lastPoint = performanceHistory[performanceHistory.length - 1].value;

    if (firstPoint === 0) return { value: 0, percent: 0, isPositive: true };

    const diff = lastPoint - firstPoint;
    const pct = (diff / firstPoint) * 100;
    return {
      value: diff,
      percent: pct,
      isPositive: diff >= 0,
    };
  }, [performanceHistory]);

  const timeframeLabel = useMemo(() => {
    switch (timeframe) {
      case '1D': return 'son 1 günde';
      case '5D': return 'son 5 günde';
      case '1M': return 'son 1 ayda';
      case '3M': return 'son 3 ayda';
      case '6M': return 'son 6 ayda';
      case '1Y': return 'son 1 yılda';
      default: return 'tüm süreçte';
    }
  }, [timeframe]);

  // Custom SVG path calculation for portfolio curve
  const svgPath = useMemo(() => {
    const width = 600;
    const height = 180;
    const padding = 15;

    const values = performanceHistory.map((h) => h.value);
    const minVal = Math.min(...values) * 0.99;
    const maxVal = Math.max(...values) * 1.01;
    const valRange = maxVal - minVal || 10;

    const points = performanceHistory.map((pt, index) => {
      const x = padding + (index / (performanceHistory.length - 1)) * (width - padding * 2);
      const y = height - padding - ((pt.value - minVal) / valRange) * (height - padding * 2);
      return { x, y };
    });

    if (points.length === 0) return null;

    // Generate smooth bezier curves
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return { path, points, minVal, maxVal };
  }, [performanceHistory]);

  // Prioritize active portfolio stocks + macro financial news in Turkish
  const portfolioNewsList = useMemo(() => {
    if (!activePortfolio) return MOCK_NEWS.slice(0, 4);
    const activeSymbols = new Set(activePortfolio.holdings.map((h) => h.symbol));

    const filtered = MOCK_NEWS.filter((n) => {
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
  }, [activePortfolio]);

  const allocationColors = ['#4d8eff', '#4edea3', '#ffb779', '#ff5451', '#bec6e0'];

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
              <span>Konsolide Portföy Terminali:</span>
              <span className="text-primary font-sans font-extrabold">{activePortfolio ? activePortfolio.name : ''}</span>
            </h2>
            
            {/* Portfolio Up/Down switch buttons */}
            <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/30 rounded-lg p-1 shadow-sm shrink-0">
              <button
                onClick={handlePrevPortfolio}
                title="Önceki Portföy"
                className="p-1 hover:bg-primary/10 rounded text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextPortfolio}
                title="Sonraki Portföy"
                className="p-1 hover:bg-primary/10 rounded text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Aktif yatırım stratejiniz, hisse özel haberler ve varlık rasyoları.
          </p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            PORTFÖY DEĞERİ
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-data-mono text-2xl font-bold text-text-primary">
              ${portfolioMetrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-bull-green"></span>
            <span>Canlı Borsa Varlığı</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            TOPLAM KAR / ZARAR (P/L)
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
                <ArrowUpRight className="w-3.5 h-3.5" /> Net Kazançta
              </span>
            ) : (
              <span className="text-bear-red flex items-center font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> Net Kayıpta
              </span>
            )}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            TOPLAM GETİRİ ORANI
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-data-mono text-2xl font-bold ${portfolioMetrics.totalReturnPercent >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
              {portfolioMetrics.totalReturnPercent >= 0 ? '+' : ''}
              {portfolioMetrics.totalReturnPercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Sermaye Büyüme Katsayısı</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 hover:border-primary/20 transition-all shadow-md flex flex-col justify-between">
          <span className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            ENSTRÜMAN ÇEŞİTLİLİĞİ
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-data-mono text-2xl font-bold text-text-primary">
              {portfolioMetrics.holdingsCount}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Aktif Dağıtılmış Risk</span>
          </div>
        </div>
      </div>

      {/* Charts section: Performance Curve and Allocation Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 mb-4">
            <div>
              <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Portföy Değer Gelişim Grafiği</span>
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-data-mono font-semibold ${timeframeReturn.isPositive ? 'text-bull-green' : 'text-bear-red'}`}>
                  {timeframeReturn.isPositive ? '+' : ''}{timeframeReturn.percent.toFixed(2)}% {timeframeLabel}
                </span>
              </div>
            </div>
            {/* Timeframe selector */}
            <div className="flex gap-1 bg-bg-base p-1 rounded-lg border border-outline-variant/40">
              {['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 rounded font-label-caps text-[10px] font-bold tracking-wider transition-all ${
                    timeframe === tf
                      ? 'bg-primary text-bg-base font-extrabold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Curved performance line */}
          <div className="h-56 w-full relative select-none">
            {/* Legend / Hover pricing details */}
            {hoveredHistoryIndex !== null && performanceHistory[hoveredHistoryIndex] ? (
              <div className="absolute top-1 left-4 bg-bg-primary border border-primary/30 px-3 py-1.5 rounded shadow-lg z-20 animate-fade-in text-xs font-sans">
                <div className="text-[10px] text-text-muted">Tarih: {performanceHistory[hoveredHistoryIndex].label}</div>
                <div className="font-data-mono text-sm font-bold text-primary mt-0.5">
                  ${performanceHistory[hoveredHistoryIndex].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ) : null}

            {/* Custom SVG line */}
            {svgPath && (
              <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4d8eff" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#4d8eff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="15" y1="20" x2="585" y2="20" stroke="#424753" strokeOpacity="0.2" strokeDasharray="3 3" />
                <line x1="15" y1="70" x2="585" y2="70" stroke="#424753" strokeOpacity="0.2" strokeDasharray="3 3" />
                <line x1="15" y1="120" x2="585" y2="120" stroke="#424753" strokeOpacity="0.2" strokeDasharray="3 3" />
                <line x1="15" y1="165" x2="585" y2="165" stroke="#424753" strokeOpacity="0.2" strokeDasharray="3 3" />

                {/* Ticks text */}
                <text x="585" y="24" fill="#8c909f" fontSize="8" fontFamily="JetBrains Mono" textAnchor="end">
                  ${svgPath.maxVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </text>
                <text x="585" y="94" fill="#8c909f" fontSize="8" fontFamily="JetBrains Mono" textAnchor="end">
                  ${((svgPath.maxVal + svgPath.minVal) / 2).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </text>
                <text x="585" y="169" fill="#8c909f" fontSize="8" fontFamily="JetBrains Mono" textAnchor="end">
                  ${svgPath.minVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </text>

                {/* Gradient fill beneath line */}
                <path
                  d={`${svgPath.path} L 585 165 L 15 165 Z`}
                  fill="url(#chartGradient)"
                />

                {/* Main Line stroke */}
                <path
                  d={svgPath.path}
                  fill="none"
                  stroke="#4d8eff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Circular interactive nodes (Limit to avoid clutter if too many days) */}
                {svgPath.points.map((pt: any, i: number) => {
                  const shouldShowDot = performanceHistory.length <= 15 || i === 0 || i === performanceHistory.length - 1 || i % Math.round(performanceHistory.length / 8) === 0 || hoveredHistoryIndex === i;
                  if (!shouldShowDot) return null;
                  return (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredHistoryIndex === i ? 6 : 3.5}
                      className="transition-all duration-150 cursor-pointer"
                      fill={hoveredHistoryIndex === i ? '#adc6ff' : '#4d8eff'}
                      stroke="#171f33"
                      strokeWidth={2}
                      onMouseEnter={() => setHoveredHistoryIndex(i)}
                      onMouseLeave={() => setHoveredHistoryIndex(null)}
                    />
                  );
                })}
              </svg>
            )}

            {/* Bottom Timeline labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between px-3">
              {performanceHistory.map((h, i) => {
                // Label reduction filter
                const shouldShowLabel = i === 0 || i === performanceHistory.length - 1 || (performanceHistory.length > 5 && i === Math.floor(performanceHistory.length / 2)) || (performanceHistory.length > 10 && (i === Math.floor(performanceHistory.length / 4) || i === Math.floor(3 * performanceHistory.length / 4)));
                if (!shouldShowLabel) return <span key={i} className="w-0" />;
                return (
                  <span key={i} className="font-data-mono text-[9px] text-text-muted mt-1">
                    {h.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Allocation Donut */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div className="border-b border-outline-variant/30 pb-3 mb-4">
            <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide">
              Varlık Dağılım Oranları
            </h3>
          </div>

          {/* Donut graphic */}
          <div className="h-44 w-full flex items-center justify-center relative">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="50"
                stroke="#11131a"
                strokeWidth="12"
                fill="transparent"
              />
              
              {/* Generate slices dynamically */}
              {(() => {
                let accumulatedPercent = 0;
                return allocationData.map((item, index) => {
                  const circumference = 2 * Math.PI * 50; // ~314.16
                  const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                  accumulatedPercent += item.percentage;
                  
                  return (
                    <circle
                      key={item.symbol}
                      cx="72"
                      cy="72"
                      r="50"
                      stroke={allocationColors[index % allocationColors.length]}
                      strokeWidth="13"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all hover:stroke-[15px] cursor-pointer"
                    />
                  );
                });
              })()}
            </svg>

            {/* Center label inside Donut */}
            <div className="absolute text-center">
              <span className="font-headline text-xl font-bold text-text-primary block leading-none">
                {portfolioMetrics.holdingsCount}
              </span>
              <span className="font-label-caps text-[8px] text-text-muted tracking-wider uppercase block mt-1">
                ENSTRÜMAN
              </span>
            </div>
          </div>

          {/* Allocation Legend */}
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
            {allocationData.length === 0 ? (
              <div className="text-center text-xs text-text-muted py-2 font-sans">Varlık eklenmemiş.</div>
            ) : (
              allocationData.map((item, index) => (
                <div key={item.symbol} className="flex items-center justify-between text-xs font-sans border-b border-outline-variant/10 pb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: allocationColors[index % allocationColors.length] }}
                    ></span>
                    <span className="font-data-mono font-bold text-text-primary">{item.symbol}</span>
                    <span className="text-[10px] text-text-muted truncate max-w-[80px]">
                      {stockMap[item.symbol]?.name || ''}
                    </span>
                  </div>
                  <span className="font-data-mono text-text-secondary font-bold">{item.percentage.toFixed(1)}%</span>
                </div>
              ))
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
                className={`flex-1 pb-2 border-b-2 text-center transition-all ${
                  bottomTab === 'news'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Haber Akışı (News)
              </button>
              <button
                onClick={() => setBottomTab('calendar')}
                className={`flex-1 pb-2 border-b-2 text-center transition-all ${
                  bottomTab === 'calendar'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Ekonomik Takvim
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
                      className={`block p-2.5 rounded-lg border transition-all text-xs ${
                        isActiveSymbolsRelated
                          ? 'bg-primary/5 border-primary/30 hover:border-primary/55'
                          : 'bg-bg-base/30 border-outline-variant/20 hover:border-outline-variant/50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-data-mono text-[9px] text-text-muted uppercase tracking-wider font-bold">
                          {news.source} • {news.time}
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
                  <span>Tüm Haberleri Filtrele & Oku</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tab B: Macro Calendar */}
            {bottomTab === 'calendar' && (
              <div className="space-y-3">
                {MACRO_CALENDAR.map((event) => (
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
                      className={`text-[8px] font-label-caps px-1.5 py-0.5 rounded border tracking-wider font-bold shrink-0 ${
                        event.importance === 'CRITICAL'
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
        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3 mb-4">
            <div>
              <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" />
                <span>Mevcut Varlık Pozisyonları</span>
              </h3>
              <span className="text-[11px] text-text-muted font-sans font-medium">
                Aktif portföydeki {portfolioMetrics.holdingsCount} varlık listeleniyor
              </span>
            </div>

            {/* Quick Filter Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Pozisyonlarda filtrele..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="bg-bg-base border border-outline-variant rounded px-2.5 py-1 pl-8 text-xs text-text-primary placeholder:text-text-muted w-44 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/35 text-[9px] font-label-caps text-text-muted tracking-wider uppercase bg-bg-base/20">
                  <th className="py-2.5 px-3">Enstrüman</th>
                  <th className="py-2.5 px-3 text-right">Miktar</th>
                  <th className="py-2.5 px-3 text-right">Ort. Maliyet</th>
                  <th className="py-2.5 px-3 text-right">Son Fiyat</th>
                  <th className="py-2.5 px-3 text-right">Piyasa Değeri</th>
                  <th className="py-2.5 px-3 text-right">K/Z (%)</th>
                  <th className="py-2.5 px-3 text-right">Kar / Zarar (P/L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-text-muted font-sans">
                      Aranan pozisyon bulunamadı. Yeni bir işlem emri eklemek için üst bar veya hisse detaylarındaki Al-Sat seçeneklerini kullanın.
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
                        {/* Symbol */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-bg-primary border border-outline-variant/60 flex items-center justify-center font-extrabold text-xs text-primary group-hover:text-text-primary group-hover:border-primary/45 transition-colors shrink-0">
                              {pos.symbol.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-data-mono font-bold text-text-primary group-hover:text-primary transition-colors text-xs">
                                {pos.symbol}
                              </div>
                              <div className="text-[10px] text-text-muted max-w-[120px] truncate">
                                {pos.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-primary font-bold">
                          {pos.quantity.toFixed(4)}
                        </td>

                        {/* Avg Cost */}
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-secondary">
                          ${pos.costPrice.toFixed(2)}
                        </td>

                        {/* Last price */}
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-primary font-bold">
                          ${pos.currentPrice.toFixed(2)}
                        </td>

                        {/* Market Value */}
                        <td className="py-3 px-3 text-right font-data-mono text-xs text-text-primary font-bold">
                          ${pos.value.toFixed(2)}
                        </td>

                        {/* Profit percent */}
                        <td
                          className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${
                            pos.profitLoss >= 0 ? 'text-bull-green' : 'text-bear-red'
                          }`}
                        >
                          {pos.profitLoss >= 0 ? '+' : ''}
                          {pos.profitLossPercent.toFixed(2)}%
                        </td>

                        {/* P/L nominal */}
                        <td
                          className={`py-3 px-3 text-right font-data-mono text-xs font-bold ${
                            pos.profitLoss >= 0 ? 'text-bull-green' : 'text-bear-red'
                          }`}
                        >
                          {pos.profitLoss >= 0 ? '+' : ''}
                          ${pos.profitLoss.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick portfolio ledger CTAs */}
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <span className="text-[10px] text-text-muted font-sans">
              Tablodaki satırlara tıklayarak hissenin yapay zeka analizine ve teknik grafik detaylarına erişebilirsiniz.
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={onOpenTradingJournal}
                className="text-xs font-bold text-primary hover:text-text-primary flex items-center gap-1.5 transition-colors font-sans"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>İşlem Defteri (Popup)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
