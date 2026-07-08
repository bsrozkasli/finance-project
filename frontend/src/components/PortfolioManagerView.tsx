import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Minus,
  Trash2,
  TrendingUp,
  PieChart,
  Coins,
  Layers,
  Activity,
  BookOpen,
  Download,
  Upload
} from 'lucide-react';
import type { Stock, Portfolio, Trade } from '../types';

interface PortfolioManagerViewProps {
  stocks: Stock[];
  portfolios: Portfolio[];
  onUpdatePortfolios: (updated: Portfolio[]) => void;
  activePortfolioId: string;
  onSelectPortfolioId: (id: string) => void;
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => void | Promise<void>;
  onOpenTradingJournal?: () => void;
}

export default function PortfolioManagerView({
  stocks,
  portfolios,
  onUpdatePortfolios,
  activePortfolioId,
  onSelectPortfolioId,
  onExecuteTrade,
  onOpenTradingJournal,
}: PortfolioManagerViewProps) {
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [selectedStockSymbol, setSelectedStockSymbol] = useState(stocks[0]?.symbol || '');
  const [activePeriod, setActivePeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

  // States for inline transaction modal
  const [tradeModalStock, setTradeModalStock] = useState<Stock | null>(null);
  const [tradeModalType, setTradeModalType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeModalQty, setTradeModalQty] = useState<number>(1);
  const [tradeModalPrice, setTradeModalPrice] = useState<number>(0);
  const [tradeModalNotes, setTradeModalNotes] = useState<string>('');
  const [importingCsv, setImportingCsv] = useState(false);

  // Find active portfolio
  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activePortfolioId) || portfolios[0];
  }, [portfolios, activePortfolioId]);

  // Handle adding a new portfolio
  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPortfolioName.trim();
    if (!name) return;

    const newPort: Portfolio = {
      id: `port-${Date.now()}`,
      name,
      holdings: [],
    };

    const updated = [...portfolios, newPort];
    onUpdatePortfolios(updated);
    onSelectPortfolioId(newPort.id);
    setNewPortfolioName('');
  };

  // Handle deleting the current portfolio
  const handleDeletePortfolio = (id: string) => {
    if (portfolios.length <= 1) {
      alert('At least one portfolio is required.');
      return;
    }
    if (confirm('Delete this portfolio?')) {
      const updated = portfolios.filter(p => p.id !== id);
      onUpdatePortfolios(updated);
      onSelectPortfolioId(updated[0].id);
    }
  };

  const escapeCsvValue = (value: string | number) => {
    const raw = String(value ?? '');
    return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };

  const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const handleExportCsv = () => {
    if (!activePortfolio) return;

    const rows = [
      ['symbol', 'type', 'quantity', 'price', 'notes'],
      ...activePortfolio.holdings.map(holding => [
        holding.symbol,
        'BUY',
        holding.quantity,
        holding.costPrice,
        `${activePortfolio.name} exported holding`,
      ]),
    ];
    const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activePortfolio.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-holdings.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activePortfolio) return;

    setImportingCsv(true);
    try {
      const content = await file.text();
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      const [headerLine, ...dataLines] = lines;
      const headers = parseCsvLine(headerLine).map(header => header.trim().toLowerCase());
      const indexOf = (name: string) => headers.indexOf(name);
      const symbolIndex = indexOf('symbol');
      const typeIndex = indexOf('type') >= 0 ? indexOf('type') : indexOf('action');
      const quantityIndex = indexOf('quantity');
      const priceIndex = indexOf('price');
      const notesIndex = indexOf('notes');

      if ([symbolIndex, typeIndex, quantityIndex, priceIndex].some(index => index < 0)) {
        alert('CSV kolonlari symbol,type,quantity,price alanlarini icermelidir.');
        return;
      }

      let imported = 0;
      for (const line of dataLines) {
        const values = parseCsvLine(line);
        const type = values[typeIndex]?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
        const quantity = Number(values[quantityIndex]);
        const price = Number(values[priceIndex]);
        const symbol = values[symbolIndex]?.trim().toUpperCase();
        if (!symbol || !Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price < 0) {
          continue;
        }

        await Promise.resolve(onExecuteTrade({
          symbol,
          type,
          quantity,
          price,
          notes: notesIndex >= 0 ? values[notesIndex] : `${symbol} CSV import`,
          portfolioId: activePortfolio.id,
          source: 'CSV',
        }));
        imported += 1;
      }

      alert(`${imported} CSV islemi ice aktarildi.`);
    } finally {
      setImportingCsv(false);
    }
  };

  // Handle opening inline trade modal for specific stock and direction
  const handleOpenTradeModal = (symbol: string, direction: 'BUY' | 'SELL') => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const holding = activePortfolio?.holdings.find(h => h.symbol === symbol);

    setTradeModalStock(stock);
    setTradeModalType(direction);
    setTradeModalQty(direction === 'SELL' && holding ? holding.quantity : 1);
    setTradeModalPrice(stock.price);
    setTradeModalNotes('');
  };

  // Compute calculated values for active portfolio holdings
  const holdingsWithMetrics = useMemo(() => {
    if (!activePortfolio || !activePortfolio.holdings) return [];

    return activePortfolio.holdings.map(h => {
      const currentStock = stocks.find(s => s.symbol === h.symbol);
      const currentPrice = currentStock ? currentStock.price : h.costPrice;
      const totalCost = h.quantity * h.costPrice;
      const totalValue = h.quantity * currentPrice;
      const profitLoss = totalValue - totalCost;
      const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

      return {
        ...h,
        currentPrice,
        totalCost,
        totalValue,
        profitLoss,
        profitLossPercent,
        name: currentStock ? currentStock.name : h.symbol
      };
    });
  }, [activePortfolio, stocks]);

  // Aggregate Portfolio Stats
  const portfolioSummary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;

    holdingsWithMetrics.forEach(h => {
      totalValue += h.totalValue;
      totalCost += h.totalCost;
    });

    const totalPNL = totalValue - totalCost;
    const totalPNLPercent = totalCost > 0 ? (totalPNL / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPNL,
      totalPNLPercent
    };
  }, [holdingsWithMetrics]);

  // Calculate asset allocation weights
  const allocationWeights = useMemo(() => {
    const total = portfolioSummary.totalValue || 1;
    const list = holdingsWithMetrics.map(h => {
      const weight = (h.totalValue / total) * 100;
      return {
        symbol: h.symbol,
        value: h.totalValue,
        weight,
        name: h.name
      };
    });
    // Sort descending by weight
    return list.sort((a, b) => b.weight - a.weight);
  }, [holdingsWithMetrics, portfolioSummary.totalValue]);

  // Premium colors array for thematic representation
  const thematicPalette = [
    { bg: 'bg-primary', stroke: '#2563eb' },
    { bg: 'bg-teal-500', stroke: '#14b8a6' },
    { bg: 'bg-indigo-500', stroke: '#6366f1' },
    { bg: 'bg-violet-500', stroke: '#8b5cf6' },
    { bg: 'bg-emerald-500', stroke: '#10b981' },
    { bg: 'bg-amber-500', stroke: '#f59e0b' },
    { bg: 'bg-rose-500', stroke: '#f43f5e' },
  ];

  // Calculate portfolio performance history
  const performanceChartData = useMemo(() => {
    if (holdingsWithMetrics.length === 0) return [];

    // Get common history dates from the first available holding stock
    const representativeStock = stocks.find(s => s.symbol === holdingsWithMetrics[0].symbol);
    if (!representativeStock || !representativeStock.history) return [];

    let daysToTake = 30;
    if (activePeriod === '3M') daysToTake = 90;
    if (activePeriod === '6M') daysToTake = 180;
    if (activePeriod === '1Y') daysToTake = 250; // max historical data length

    const historyLength = representativeStock.history.length;
    const startIndex = Math.max(0, historyLength - daysToTake);
    const dateSlices = representativeStock.history.slice(startIndex);

    // Compute portfolio value for each historic date
    return dateSlices.map((slice) => {
      const targetDate = slice.date;
      let dateTotalValue = 0;
      let dateTotalCost = 0;

      holdingsWithMetrics.forEach(h => {
        const holdingStock = stocks.find(s => s.symbol === h.symbol);
        if (holdingStock && holdingStock.history) {
          // Find matching date price or fallback to current
          const histItem = holdingStock.history.find(item => item.date === targetDate);
          const histPrice = histItem ? histItem.price : holdingStock.price;
          dateTotalValue += h.quantity * histPrice;
          dateTotalCost += h.quantity * h.costPrice;
        } else {
          dateTotalValue += h.quantity * h.costPrice;
          dateTotalCost += h.quantity * h.costPrice;
        }
      });

      const profit = dateTotalValue - dateTotalCost;
      const returnPercent = dateTotalCost > 0 ? (profit / dateTotalCost) * 100 : 0;

      return {
        date: targetDate,
        value: dateTotalValue,
        returnPercent,
      };
    });
  }, [holdingsWithMetrics, stocks, activePeriod]);

  // Compute performance SVG path
  const performanceChartPath = useMemo(() => {
    if (performanceChartData.length < 2) return { line: '', area: '', points: [], min: 0, max: 0 };
    const values = performanceChartData.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 180;
    const paddingLeft = 10;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 15;

    const points = performanceChartData.map((d, idx) => {
      const x = paddingLeft + (idx / (performanceChartData.length - 1)) * (width - paddingLeft - paddingRight);
      const y = height - paddingBottom - ((d.value - minVal) / range) * (height - paddingTop - paddingBottom);
      return { x, y, data: d };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

    return { line: linePath, area: areaPath, points, min: minVal, max: maxVal };
  }, [performanceChartData]);

  // Handle performance chart interactive hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!performanceChartPath.points || performanceChartPath.points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;

    let closest = performanceChartPath.points[0];
    let minDistance = Math.abs(closest.x - x);

    for (let i = 1; i < performanceChartPath.points.length; i++) {
      const dist = Math.abs(performanceChartPath.points[i].x - x);
      if (dist < minDistance) {
        minDistance = dist;
        closest = performanceChartPath.points[i];
      }
    }

    setHoveredPoint({
      x: closest.x,
      y: closest.y,
      date: closest.data.date,
      value: closest.data.value,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Pre-calculate currency format helper based on portfolio content
  const formatCurrency = (val: number) => `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">

      {/* 1. Header with Swappers & Creating New Portfolio */}
      <div className="p-4 md:p-5 border-b border-outline-variant/30 bg-bg-card/30 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase block mb-1">
              PORTFOLIO ANALYSIS & TRACKING CENTER
            </span>
            <div className="flex items-center gap-3">
              <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
                {activePortfolio?.name || 'My Portfolio'}
              </h2>

              {/* Delete active portfolio button */}
              {portfolios.length > 1 && (
                <button
                  onClick={() => handleDeletePortfolio(activePortfolio.id)}
                  title="Delete Portfolio"
                  className="p-1 text-text-muted hover:text-bear-red transition-colors rounded hover:bg-bg-card cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Creation form, portfolio selector, and journal button */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Direct Open Ledger journal link */}
            {onOpenTradingJournal && (
              <button
                onClick={onOpenTradingJournal}
                className="flex items-center gap-2 bg-primary/10 hover:bg-primary/15 text-primary px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans shadow-sm transition-all cursor-pointer border border-primary/25"
                title="Open Trading Journal"
              >
                <BookOpen className="w-4 h-4" />
                <span>Trading Journal</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!activePortfolio || activePortfolio.holdings.length === 0}
              className="flex items-center gap-2 bg-bg-base hover:bg-bg-card text-text-secondary px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans shadow-sm transition-all cursor-pointer border border-outline-variant/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export active portfolio holdings as CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV Export</span>
            </button>

            <label className="flex items-center gap-2 bg-bg-base hover:bg-bg-card text-text-secondary px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans shadow-sm transition-all cursor-pointer border border-outline-variant/40">
              <Upload className="w-4 h-4" />
              <span>{importingCsv ? 'Importing...' : 'CSV Import'}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importingCsv || !activePortfolio}
                onChange={handleImportCsv}
              />
            </label>

            {/* New Portfolio Creation Form */}
            <form onSubmit={handleCreatePortfolio} className="flex gap-2 bg-surface-container-low border border-outline-variant/30 p-1.5 rounded-xl">
              <input
                type="text"
                placeholder="Example: Added to the position after a confirmed support bounce..."
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="bg-bg-base border-none rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none w-36 font-sans"
              />
              <button
                type="submit"
                className="bg-primary text-bg-base px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-opacity hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Portfolio</span>
              </button>
            </form>

            {/* Selector Dropdown */}
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-xl shadow-sm">
              <Briefcase className="w-4 h-4 text-primary" />
              <select
                value={activePortfolioId}
                onChange={(e) => onSelectPortfolioId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-text-secondary focus:outline-none pr-1 font-sans cursor-pointer"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id} className="bg-bg-card text-text-primary">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Analytics & Ledger Dashboard Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* Aggregated Totals row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-bg-card border border-outline-variant/35 rounded-xl shadow-sm">
            <span className="text-[10px] font-label-caps text-text-muted uppercase tracking-wider">TOTAL PORTFOLIO VALUE</span>
            <div className="text-2xl font-black text-text-primary mt-1 font-data-mono">
              {formatCurrency(portfolioSummary.totalValue)}
            </div>
            <div className="text-[10px] text-text-secondary mt-1">Current market value weighted by sector liquidity</div>
          </div>
          <div className="p-4 bg-bg-card border border-outline-variant/35 rounded-xl shadow-sm">
            <span className="text-[10px] font-label-caps text-text-muted uppercase tracking-wider">TOTAL COST</span>
            <div className="text-2xl font-black text-text-secondary mt-1 font-data-mono">
              {formatCurrency(portfolioSummary.totalCost)}
            </div>
            <div className="text-[10px] text-text-secondary mt-1">Total invested capital</div>
          </div>
          <div className="p-4 bg-bg-card border border-outline-variant/35 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-label-caps text-text-muted uppercase tracking-wider">TOTAL NET PROFIT / LOSS</span>
              <div className={`text-2xl font-black mt-1 font-data-mono ${
                portfolioSummary.totalPNL >= 0 ? 'text-bull-green' : 'text-bear-red'
              }`}>
                {portfolioSummary.totalPNL >= 0 ? 'UP +' : 'DOWN '}{formatCurrency(portfolioSummary.totalPNL)}
              </div>
            </div>
            <div className={`text-[11px] font-bold mt-1 font-data-mono ${
              portfolioSummary.totalPNL >= 0 ? 'text-bull-green' : 'text-bear-red'
            }`}>
              {portfolioSummary.totalPNL >= 0 ? 'UP +' : 'DOWN '}
              {portfolioSummary.totalPNLPercent.toFixed(2)}% Return Rate
            </div>
          </div>
        </div>

        {/* Dynamic Split Screen: Left form & asset list, Right visual distribution and returns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT CONTAINER: Holdings Ledger and Add form */}
          <div className="space-y-6">

            {/* Holdings table list */}
            <div className="bg-bg-card border border-outline-variant/35 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-bg-card/45">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="font-headline text-xs font-bold text-text-primary uppercase tracking-wider">
                    Active Positions & Assets
                  </span>
                </div>
                <span className="text-[10px] font-data-mono text-text-muted">
                  {holdingsWithMetrics.length} Instruments
                </span>
              </div>

              <div className="overflow-x-auto">
                {holdingsWithMetrics.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted font-sans">
                    This portfolio has no positions yet. Use the panel below to add one.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-base/35 border-b border-outline-variant/20">
                        <th className="p-3 text-[10px] font-label-caps text-text-muted">Instrument</th>
                        <th className="p-3 text-[10px] font-label-caps text-text-muted text-right">Quantity</th>
                        <th className="p-3 text-[10px] font-label-caps text-text-muted text-right">Cost</th>
                        <th className="p-3 text-[10px] font-label-caps text-text-muted text-right">Last Price</th>
                        <th className="p-3 text-[10px] font-label-caps text-text-muted text-right">Value / P&L</th>
                        <th className="p-3 text-[10px] font-label-caps text-text-muted text-center">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 font-sans">
                      {holdingsWithMetrics.map(h => {
                        const isBullish = h.profitLoss >= 0;
                        return (
                          <tr key={h.symbol} className="hover:bg-bg-base/20 transition-colors">
                            <td className="p-3">
                              <div className="font-data-mono text-xs font-bold text-text-primary">
                                {h.symbol}
                              </div>
                              <div className="text-[9px] text-text-muted truncate max-w-[110px]" title={h.name}>
                                {h.name}
                              </div>
                            </td>
                            <td className="p-3 text-right font-data-mono text-xs text-text-primary">
                              {h.quantity}
                            </td>
                            <td className="p-3 text-right font-data-mono text-xs text-text-secondary">
                              {formatCurrency(h.costPrice)}
                            </td>
                            <td className="p-3 text-right font-data-mono text-xs text-text-primary">
                              {formatCurrency(h.currentPrice)}
                            </td>
                            <td className="p-3 text-right font-data-mono text-xs">
                              <div className="text-text-primary font-bold">{formatCurrency(h.totalValue)}</div>
                              <span className={`text-[9px] font-bold block ${isBullish ? 'UP +' : 'DOWN '}`}>
                                {isBullish ? 'UP +' : 'DOWN '}
                                {h.profitLossPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                {/* BUY ADD */}
                                <button
                                  onClick={() => handleOpenTradeModal(h.symbol, 'BUY')}
                                  title="Add Shares (BUY)"
                                  className="p-1 hover:bg-bull-green/10 rounded text-bull-green border border-bull-green/20 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                {/* SELL REDUCE */}
                                <button
                                  onClick={() => handleOpenTradeModal(h.symbol, 'SELL')}
                                  title="Reduce Shares (SELL)"
                                  className="p-1 hover:bg-amber-500/10 rounded text-amber-500 border border-amber-500/20 transition-all cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                {/* CLOSE FULLY */}
                                <button
                                  onClick={() => handleOpenTradeModal(h.symbol, 'SELL')}
                                  title="Close Position (Record Sell)"
                                  className="p-1 hover:bg-bear-red/10 rounded text-bear-red border border-bear-red/20 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* MODERN TRADING CONTROL CENTER */}
            <div className="bg-bg-card border border-outline-variant/35 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-outline-variant/15 pb-2.5">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="font-headline text-xs font-bold text-text-primary uppercase tracking-wider">
                  Trading & Portfolio Control Center
                </span>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed font-sans">
                All portfolio buy, sell, cost reduction, and position increase actions must be recorded in the <span className="text-primary font-bold">Trading Journal</span>. No instrument should be removed directly without a journal entry.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

                {/* Action 1: New Transaction Ticket */}
                <div className="p-4 rounded-xl bg-bg-base/30 border border-outline-variant/15 hover:border-primary/30 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-[11px] text-text-secondary leading-normal">
                      Select a stock or instrument to create a journal-integrated BUY or SELL order.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={selectedStockSymbol}
                      onChange={(e) => setSelectedStockSymbol(e.target.value)}
                      className="w-full bg-bg-base border border-outline-variant rounded-lg p-2 text-xs font-bold text-text-primary focus:outline-none focus:border-primary font-sans cursor-pointer"
                    >
                      {stocks.map(s => (
                        <option key={s.symbol} value={s.symbol}>
                          {s.symbol} - {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleOpenTradeModal(selectedStockSymbol, 'BUY')}
                      className="w-full py-2 bg-primary hover:opacity-95 text-bg-base text-xs font-bold rounded-lg shadow-sm transition-opacity flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Order</span>
                    </button>
                  </div>
                </div>
                {/* Action 2: Trading Journal */}
                <div className="p-4 rounded-xl bg-bg-base/30 border border-outline-variant/15 hover:border-primary/30 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-label-caps text-text-muted uppercase tracking-wider block mb-1">TRADING JOURNAL</span>
                    <p className="text-[11px] text-text-secondary leading-normal">
                      Review historical trades, cost records, investment theses, and performance details in the journal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenTradingJournal}
                    className="w-full py-2.5 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/25 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-sans mt-auto"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Trading Journal</span>
                  </button>
                </div>
                </div>

              </div>
            </div>


          {/* RIGHT CONTAINER: Visual allocation distribution & returns chart */}
          <div className="space-y-6">
            {/* Asset Allocation Charts */}

            <div className="bg-bg-card border border-outline-variant/35 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/15 pb-2.5">
                <PieChart className="w-4 h-4 text-primary" />
                <span className="font-headline text-xs font-bold text-text-primary uppercase tracking-wider">
                  Thematic Asset Allocation</span>
              </div>

              {allocationWeights.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted font-sans">
                  Add at least one stock position to draw sector allocation.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Styled Stacked Thematic Allocation Bar */}
                  <div className="w-full h-5 rounded-full overflow-hidden flex bg-surface-container-low shadow-sm">
                    {allocationWeights.map((item, idx) => {
                      const colorObj = thematicPalette[idx % thematicPalette.length];
                      return (
                        <div
                          key={item.symbol}
                          className={`${colorObj.bg} h-full transition-all duration-300`}
                          style={{ width: `${item.weight}%` }}
                          title={`${item.symbol}: %${item.weight.toFixed(1)}`}
                        ></div>
                      );
                    })}
                  </div>

                  {/* Allocation Weight Legend List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {allocationWeights.map((item, idx) => {
                      const colorObj = thematicPalette[idx % thematicPalette.length];
                      return (
                        <div
                          key={item.symbol}
                          className="p-3 rounded-lg bg-bg-base/30 border border-outline-variant/15 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: colorObj.stroke }}></span>
                            <div className="truncate">
                              <span className="font-data-mono text-xs font-black text-text-primary block leading-none">
                                {item.symbol}
                              </span>
                              <span className="text-[9px] text-text-muted truncate block mt-1" title={item.name}>
                                {item.name}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-data-mono text-xs font-black text-text-primary block">
                              %{item.weight.toFixed(1)}
                            </span>
                            <span className="text-[9px] text-text-secondary font-data-mono block mt-0.5">
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio performance chart */}
            <div className="bg-bg-card border border-outline-variant/35 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-outline-variant/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="font-headline text-xs font-bold text-text-primary uppercase tracking-wider">
                    Cumulative Portfolio Performance Chart</span>
                </div>

                {/* Period selection */}
                <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 shrink-0">
                  {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setActivePeriod(period)}
                      className={`px-2.5 py-1 rounded text-[9px] font-bold font-data-mono transition-all cursor-pointer ${
                        activePeriod === period
                          ? 'bg-primary text-bg-base shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {period === '1Y' ? '1Y' : period}
                    </button>
                  ))}
                </div>
              </div>

              {allocationWeights.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted font-sans">
                  Add assets to draw the performance and cumulative return chart.
                </div>
              ) : (
                <div className="relative mt-2">
                  {hoveredPoint && (
                    <div
                      className="absolute bg-surface-container border border-outline-variant rounded-lg p-2 text-[10px] pointer-events-none shadow-lg z-20"
                      style={{
                        left: `${(hoveredPoint.x / 600) * 100}%`,
                        top: `${(hoveredPoint.y / 180) * 100 - 35}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div className="font-bold text-text-muted">{hoveredPoint.date}</div>
                      <div className="font-data-mono text-primary font-extrabold mt-0.5">
                        {formatCurrency(hoveredPoint.value)}
                      </div>
                    </div>
                  )}

                  <svg
                    className="w-full h-40 overflow-visible cursor-crosshair"
                    viewBox="0 0 600 180"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <defs>
                      <linearGradient id="performanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Chart horizontal grid lines */}
                    <line x1="0" y1="15" x2="600" y2="15" stroke="#424753" strokeOpacity="0.1" />
                    <line x1="0" y1="90" x2="600" y2="90" stroke="#424753" strokeOpacity="0.1" />
                    <line x1="0" y1="165" x2="600" y2="165" stroke="#424753" strokeOpacity="0.1" />

                    {performanceChartPath.area && (
                      <path d={performanceChartPath.area} fill="url(#performanceGrad)" />
                    )}

                    {performanceChartPath.line && (
                      <path
                        d={performanceChartPath.line}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Interactive tracker dots */}
                    {hoveredPoint && (
                      <>
                        <line
                          x1={hoveredPoint.x}
                          y1="0"
                          x2={hoveredPoint.x}
                          y2="180"
                          stroke="#2563eb"
                          strokeOpacity="0.4"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={hoveredPoint.x}
                          cy={hoveredPoint.y}
                          r="5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </>
                    )}
                  </svg>

                  {/* Bounds indicator */}
                  <div className="flex justify-between items-center text-[9px] font-data-mono text-text-muted mt-2 border-t border-outline-variant/10 pt-1.5">
                    <span>MIN VALUE</span>
                    <span>{performanceChartData[0]?.date} - {performanceChartData[performanceChartData.length - 1]?.date}</span>
                    <span>MAX VALUE</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* 4. Elegant Inline Transaction Modal for quick BUY/SELL adjustments */}
      {tradeModalStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-bg-primary border border-outline-variant rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
                  Trade Stock: {tradeModalStock.symbol}
                </h3>
              </div>
              <button
                onClick={() => setTradeModalStock(null)}
                className="p-1.5 hover:bg-bg-card rounded-lg text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-outline-variant/30"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tradeModalQty <= 0 || tradeModalPrice <= 0) {
                  alert('Quantity and unit price must be greater than zero.');
                  return;
                }

                // Check sell constraint
                if (tradeModalType === 'SELL') {
                  const owned = activePortfolio?.holdings.find(h => h.symbol === tradeModalStock.symbol);
                  const ownedQty = owned ? owned.quantity : 0;
                  if (tradeModalQty > ownedQty) {
                    alert(`Insufficient quantity. You own ${ownedQty} shares of ${tradeModalStock.symbol}, but you are trying to sell ${tradeModalQty}.`);
                    return;
                  }
                }

                onExecuteTrade({
                  symbol: tradeModalStock.symbol,
                  type: tradeModalType,
                  quantity: tradeModalQty,
                  price: tradeModalPrice,
                  notes: tradeModalNotes.trim() || `${tradeModalStock.symbol} ${tradeModalType === 'BUY' ? 'increase' : 'reduction'} trade.`,
                  portfolioId: activePortfolio?.id
                });

                alert(`${tradeModalStock.symbol} trade was completed and saved to the journal.`);
                setTradeModalStock(null);
              }}
              className="p-5 space-y-4 text-xs"
            >
              {/* Type Switcher */}
              <div>
                <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                  Trade Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTradeModalType('BUY')}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      tradeModalType === 'BUY'
                        ? 'bg-bull-green/10 border-bull-green text-bull-green font-black'
                        : 'bg-bg-base border-outline-variant/50 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Add Shares (BUY)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeModalType('SELL')}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      tradeModalType === 'SELL'
                        ? 'bg-bear-red/10 border-bear-red text-bear-red font-black'
                        : 'bg-bg-base border-outline-variant/50 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Reduce Shares (SELL)
                  </button>
                </div>
              </div>

              {/* Qty & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                    Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={tradeModalQty}
                    onChange={(e) => setTradeModalQty(Math.max(0.0001, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                    required
                  />
                  {tradeModalType === 'SELL' && (
                    <span className="text-[9px] text-text-muted mt-1 block font-semibold text-amber-500">
                      Portfolio quantity: {activePortfolio?.holdings.find(h => h.symbol === tradeModalStock.symbol)?.quantity || 0} shares
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                    Unit Trade Price</label>
                  <input
                    type="number"
                    step="any"
                    value={tradeModalPrice}
                    onChange={(e) => setTradeModalPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                  Investment Thesis / Trade Note</label>
                <textarea
                  placeholder="Example: Added to the position after a confirmed support bounce..."
                  value={tradeModalNotes}
                  onChange={(e) => setTradeModalNotes(e.target.value)}
                  rows={2.5}
                  className="w-full bg-bg-base border border-outline-variant rounded-lg p-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              {/* Total estimation */}
              <div className="bg-bg-base/30 p-2.5 rounded border border-outline-variant/20 flex justify-between items-baseline font-data-mono">
                <span className="text-text-muted text-[10px]">ESTIMATED ORDER VALUE:</span>
                <span className="text-xs font-bold text-text-primary">
                  {formatCurrency(tradeModalQty * tradeModalPrice)}
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:opacity-95 text-bg-base font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer font-sans"
              >
                <span>Complete Trade and Save to Journal</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
