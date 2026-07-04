import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Newspaper, 
  Activity, 
  Layers, 
  CheckCircle, 
  Target, 
  Sparkles, 
  Compass, 
  Info, 
  Search, 
  Plus,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Stock, Watchlist } from '../types';

interface WatchlistsViewProps {
  stocks: Stock[];
  watchlists: Watchlist[];
  onAddStockToWatchlist: (watchlistId: string, symbol: string) => void;
  onAddWatchlist: (name: string) => void;
  onOpenTradeModal: (symbol: string) => void;
  onSelectStock: (stock: Stock) => void;
}

export default function WatchlistsView({
  stocks,
  watchlists,
  onAddStockToWatchlist,
  onAddWatchlist,
  onOpenTradeModal,
  onSelectStock,
}: WatchlistsViewProps) {
  // Ensure we have active watchlists
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(
    watchlists.find(w => w.name.includes('BIST'))?.id || watchlists[0]?.id || 'w1'
  );
  
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('');
  const [activePeriod, setActivePeriod] = useState<'1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1M');
  const [tickerToAdd, setTickerToAdd] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; price: number } | null>(null);

  const handlePrevWatchlist = () => {
    if (watchlists.length <= 1) return;
    const currentIndex = watchlists.findIndex((w) => w.id === activeWatchlistId);
    const prevIndex = (currentIndex - 1 + watchlists.length) % watchlists.length;
    setActiveWatchlistId(watchlists[prevIndex].id);
  };

  const handleNextWatchlist = () => {
    if (watchlists.length <= 1) return;
    const currentIndex = watchlists.findIndex((w) => w.id === activeWatchlistId);
    const nextIndex = (currentIndex + 1) % watchlists.length;
    setActiveWatchlistId(watchlists[nextIndex].id);
  };

  // Find active watchlist
  const activeWatchlist = useMemo(() => {
    return watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];
  }, [watchlists, activeWatchlistId]);

  // Active stocks in this watchlist
  const activeStocks = useMemo(() => {
    if (!activeWatchlist) return [];
    return stocks.filter((s) => activeWatchlist.symbols.includes(s.symbol));
  }, [stocks, activeWatchlist]);

  // Selected Stock for detailed view
  const selectedStock = useMemo(() => {
    if (selectedStockSymbol) {
      const found = stocks.find((s) => s.symbol === selectedStockSymbol);
      if (found) return found;
    }
    return activeStocks[0] || stocks[0];
  }, [stocks, selectedStockSymbol, activeStocks]);

  // Automatically update selected stock symbol when watchlist changes
  React.useEffect(() => {
    if (activeStocks.length > 0) {
      setSelectedStockSymbol(activeStocks[0].symbol);
    }
  }, [activeWatchlistId]);

  // Aggregate Stats for Active Watchlist
  const watchlistStats = useMemo(() => {
    if (activeStocks.length === 0) return { avgChange: 0, totalCap: '0' };
    const sumChange = activeStocks.reduce((sum, s) => sum + s.changePercent, 0);
    const avgChange = sumChange / activeStocks.length;
    return {
      avgChange,
      totalCount: activeStocks.length
    };
  }, [activeStocks]);

  // Sparkline generator
  const renderSparkline = (sparklineData: number[], isBullish: boolean) => {
    if (!sparklineData || sparklineData.length === 0) return null;
    const width = 80;
    const height = 24;
    const padding = 2;
    const minVal = Math.min(...sparklineData);
    const maxVal = Math.max(...sparklineData);
    const range = maxVal - minVal || 1;

    const points = sparklineData
      .map((val, idx) => {
        const x = padding + (idx / (sparklineData.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg className="w-16 h-6 select-none" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={isBullish ? '#4edea3' : '#ff5451'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Add stock to active watchlist handler
  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const symbolUpper = tickerToAdd.trim().toUpperCase();
    if (!symbolUpper) return;

    const stockExists = stocks.some((s) => s.symbol === symbolUpper);
    if (!stockExists) {
      alert(`Sembol bulunamadı: ${symbolUpper}.`);
      return;
    }

    if (activeWatchlist && activeWatchlist.symbols.includes(symbolUpper)) {
      alert(`${symbolUpper} zaten bu listede var.`);
      return;
    }

    if (activeWatchlist) {
      onAddStockToWatchlist(activeWatchlist.id, symbolUpper);
      setSelectedStockSymbol(symbolUpper);
    }
    setTickerToAdd('');
  };

  // Slice historical prices according to period
  const chartData = useMemo(() => {
    if (!selectedStock || !selectedStock.history) return [];
    const hist = selectedStock.history;
    switch (activePeriod) {
      case '1D': return hist.slice(-10);
      case '5D': return hist.slice(-20);
      case '1M': return hist.slice(-30);
      case '3M': return hist.slice(-90);
      case '6M': return hist.slice(-180);
      case '1Y':
      case 'ALL':
      default:
        return hist;
    }
  }, [selectedStock, activePeriod]);

  // Compute SVG chart parameters
  const chartPath = useMemo(() => {
    if (chartData.length < 2) return { line: '', area: '', points: [], min: 0, max: 0 };
    const prices = chartData.map((d) => d.price);
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 180;
    const paddingLeft = 10;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 15;

    const points = chartData.map((d, idx) => {
      const x = paddingLeft + (idx / (chartData.length - 1)) * (width - paddingLeft - paddingRight);
      const y = height - paddingBottom - ((d.price - minVal) / range) * (height - paddingTop - paddingBottom);
      return { x, y, data: d };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

    return { line: linePath, area: areaPath, points, min: minVal, max: maxVal };
  }, [chartData]);

  // Handle interactive hover over detailed SVG chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartPath.points || chartPath.points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;

    let closest = chartPath.points[0];
    let minDistance = Math.abs(closest.x - x);

    for (let i = 1; i < chartPath.points.length; i++) {
      const dist = Math.abs(chartPath.points[i].x - x);
      if (dist < minDistance) {
        minDistance = dist;
        closest = chartPath.points[i];
      }
    }

    setHoveredPoint({
      x: closest.x,
      y: closest.y,
      date: closest.data.date,
      price: closest.data.price,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
      
      {/* 1. Header: Quick switcher & aggregates */}
      <div className="p-4 md:p-5 border-b border-outline-variant/30 bg-bg-card/30 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-label-caps text-text-muted tracking-widest uppercase block mb-1">
              Terminal İzleme Listesi Paneli
            </span>
            <div className="flex items-center gap-4">
              <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
                {activeWatchlist?.name}
              </h2>
              {watchlistStats.totalCount > 0 && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-xs font-bold text-primary font-sans">
                    {watchlistStats.totalCount} Enstrüman Aktif
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Combined Watchlist Switcher Up/Down Controls */}
          <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-xl p-2 shadow-sm">
            <span className="text-xs font-bold text-text-secondary font-sans px-2">
              Seçili Liste: <span className="text-primary font-black">{activeWatchlist?.name}</span>
            </span>
            <div className="flex items-center gap-1 border-l border-outline-variant/30 pl-2">
              <button
                onClick={handlePrevWatchlist}
                title="Önceki İzleme Listesi"
                className="p-1.5 hover:bg-primary/10 rounded-lg text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextWatchlist}
                title="Sonraki İzleme Listesi"
                className="p-1.5 hover:bg-primary/10 rounded-lg text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout: List of selected watchlist on the left, full rich overview screen on the right */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left column: Watchlist Stocks List */}
        <div className="w-full lg:w-[40%] border-r border-outline-variant/35 flex flex-col bg-bg-base/40 overflow-hidden shrink-0">
          
          {/* Quick Filter & Add Stock Bar */}
          <div className="p-3 border-b border-outline-variant/20 bg-bg-card/25 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[10px] font-label-caps text-text-secondary tracking-wider font-bold">
              LİSTEDEKİ ENSTRÜMANLAR
            </span>
            
            <form onSubmit={handleAddSymbol} className="flex gap-1">
              <input
                type="text"
                placeholder="Hisse/ETF ekle..."
                value={tickerToAdd}
                onChange={(e) => setTickerToAdd(e.target.value)}
                className="bg-bg-base border border-outline-variant rounded-md px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted w-32 focus:outline-none focus:border-primary font-sans"
              />
              <button
                type="submit"
                className="bg-primary hover:opacity-90 text-bg-base p-1 rounded-md shadow-sm transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Listeye Ekle"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* List/Table */}
          <div className="flex-1 overflow-y-auto">
            {activeStocks.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted font-sans">
                Bu izleme listesinde henüz enstrüman bulunmuyor. Sağ üstteki panelden ekleyebilirsiniz.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/15">
                {activeStocks.map((stock) => {
                  const isSelected = selectedStock?.symbol === stock.symbol;
                  const isBullish = stock.change >= 0;
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => setSelectedStockSymbol(stock.symbol)}
                      className={`w-full text-left p-4 transition-all flex items-center justify-between border-l-4 cursor-pointer ${
                        isSelected 
                          ? 'bg-primary-container/10 border-primary shadow-sm' 
                          : 'border-transparent hover:bg-bg-card/20'
                      }`}
                    >
                      {/* Name & Ticker */}
                      <div className="flex items-center gap-3 truncate pr-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isBullish ? 'bg-bull-green' : 'bg-bear-red'} shrink-0`}></span>
                        <div className="truncate">
                          <div className="font-data-mono text-xs font-bold text-text-primary flex items-center gap-1.5">
                            <span>{stock.symbol}</span>
                            <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-surface-container-low text-text-muted uppercase">
                              {stock.sector}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-secondary truncate mt-0.5">
                            {stock.name}
                          </div>
                        </div>
                      </div>

                      {/* Sparkline & Pricing */}
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        {renderSparkline(stock.sparkline, isBullish)}
                        <div className="min-w-[70px]">
                          <div className="font-data-mono text-xs font-bold text-text-primary">
                            {stock.symbol === 'THYAO' || stock.symbol === 'ASELS' || stock.symbol === 'EREGL' ? '₺' : '$'}
                            {stock.price.toFixed(2)}
                          </div>
                          <span className={`font-data-mono text-[10px] font-bold block mt-0.5 ${
                            isBullish ? 'text-bull-green' : 'text-bear-red'
                          }`}>
                            {isBullish ? '▲ +' : '▼ '}
                            {stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Dynamic Overview panel containing exactly the 5 requested sections */}
        <div className="hidden lg:flex flex-1 flex-col bg-bg-base/20 overflow-y-auto">
          {selectedStock ? (
            <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
              
              {/* SECTION 1: OVERVIEW KISMI */}
              <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="font-headline text-3xl font-extrabold text-text-primary tracking-tight">
                        {selectedStock.symbol}
                      </h1>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary leading-tight">
                          {selectedStock.name}
                        </span>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5 font-label-caps">
                          {selectedStock.sector} • {selectedStock.industry}
                        </span>
                      </div>
                    </div>
                    
                    {/* Visual Business summary/description */}
                    <p className="text-xs text-text-secondary leading-relaxed mt-3 max-w-2xl border-t border-outline-variant/20 pt-2.5">
                      {selectedStock.symbol === 'THYAO' && 'Türkiye’nin bayrak taşıyıcı havayolu şirketi olan Türk Hava Yolları, küresel uçuş ağı, modern geniş gövdeli filosu ve kargo operasyonları ile dünyanın en çok ülkesine uçan havayoludur.'}
                      {selectedStock.symbol === 'ASELS' && 'Aselsan, Türk Silahlı Kuvvetlerini Güçlendirme Vakfı’na bağlı bir savunma sanayi kuruluşudur. Haberleşme, radar, elektronik harp, mikroelektronik güdümlü ve elektro-optik sistemler tasarlar ve üretir.'}
                      {selectedStock.symbol === 'EREGL' && 'Ereğli Demir ve Çelik Fabrikaları, Türkiye’nin en büyük entegre yassı çelik üreticisidir. Otomotiv, beyaz eşya, boru-profil ve gemi yapımı sanayilerine ham ve yarı mamul çelik tedarik eder.'}
                      {selectedStock.symbol === 'SPY' && 'The SPDR S&P 500 ETF Trust is one of the world’s largest and most heavily traded exchange traded funds. It designed to track the stock performance of the S&P 500 Index, representing large-cap US companies.'}
                      {selectedStock.symbol === 'QQQ' && 'Invesco QQQ is an exchange-traded fund that tracks the Nasdaq-100 Index. The fund includes 100 of the largest non-financial companies listed on the Nasdaq Stock Market, heavily weighted toward technology leaders.'}
                      {!['THYAO', 'ASELS', 'EREGL', 'SPY', 'QQQ'].includes(selectedStock.symbol) && `${selectedStock.name}, kendi sektöründe küresel pazar liderleri arasında yer alan, yüksek likidite ve sermaye rasyolarına sahip öncü bir enstrümandır.`}
                    </p>
                  </div>

                  <div className="text-right shrink-0 bg-surface-container-low/50 border border-outline-variant/25 p-3 rounded-xl min-w-[140px]">
                    <div className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase font-semibold">
                      GÜNCEL DEĞER
                    </div>
                    <div className="font-data-mono text-2xl font-black text-text-primary mt-1">
                      {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}
                      {selectedStock.price.toFixed(2)}
                    </div>
                    <div className={`font-data-mono text-xs font-bold mt-1.5 flex items-center justify-end gap-1 ${
                      selectedStock.change >= 0 ? 'text-bull-green' : 'text-bear-red'
                    }`}>
                      {selectedStock.change >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>
                        {selectedStock.change >= 0 ? '+' : ''}
                        {selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Technical Overview Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-outline-variant/20">
                  <div className="p-2.5 rounded bg-bg-base/40">
                    <span className="text-[9px] font-label-caps text-text-muted block">GÜNÜN EN DÜŞÜĞÜ</span>
                    <span className="font-data-mono text-xs text-text-primary font-bold mt-0.5 block">
                      {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}
                      {selectedStock.low.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-bg-base/40">
                    <span className="text-[9px] font-label-caps text-text-muted block">GÜNÜN EN YÜKSEĞİ</span>
                    <span className="font-data-mono text-xs text-text-primary font-bold mt-0.5 block">
                      {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}
                      {selectedStock.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-bg-base/40">
                    <span className="text-[9px] font-label-caps text-text-muted block">HACİM</span>
                    <span className="font-data-mono text-xs text-text-primary font-bold mt-0.5 block">
                      {selectedStock.volume}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-bg-base/40">
                    <span className="text-[9px] font-label-caps text-text-muted block">PIYASA DEĞERI</span>
                    <span className="font-data-mono text-xs text-text-primary font-bold mt-0.5 block">
                      {selectedStock.marketCap}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: GRAFİK (Price History Line Chart) */}
              <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="font-headline text-sm font-bold text-text-primary uppercase tracking-wider">
                      İnteraktif Fiyat Grafiği
                    </span>
                  </div>

                  {/* Period selection tab list */}
                  <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                    {(['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setActivePeriod(period)}
                        className={`px-2 py-1 rounded text-[10px] font-bold font-data-mono transition-all cursor-pointer ${
                          activePeriod === period
                            ? 'bg-primary text-bg-base shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Responsive SVG Chart with interactive coordinates */}
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
                        {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}
                        {hoveredPoint.price.toFixed(2)}
                      </div>
                    </div>
                  )}

                  <svg 
                    className="w-full h-44 overflow-visible cursor-crosshair" 
                    viewBox="0 0 600 180"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Area fill under curve */}
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Chart horizontal grid lines */}
                    <line x1="0" y1="15" x2="600" y2="15" stroke="#424753" strokeOpacity="0.1" />
                    <line x1="0" y1="90" x2="600" y2="90" stroke="#424753" strokeOpacity="0.1" />
                    <line x1="0" y1="165" x2="600" y2="165" stroke="#424753" strokeOpacity="0.1" />

                    {chartPath.area && (
                      <path d={chartPath.area} fill="url(#areaGrad)" />
                    )}

                    {chartPath.line && (
                      <path 
                        d={chartPath.line} 
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
                </div>

                {/* Min / Max bounds indicator */}
                <div className="flex justify-between items-center text-[9px] font-data-mono text-text-muted mt-2 border-t border-outline-variant/10 pt-1.5">
                  <span>MİN: {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}{chartPath.min.toFixed(2)}</span>
                  <span>{chartData[0]?.date} • {chartData[chartData.length - 1]?.date}</span>
                  <span>MAK: {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}{chartPath.max.toFixed(2)}</span>
                </div>
              </div>

              {/* SECTION 3: TEKNİK BİLGİLER */}
              <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="font-headline text-sm font-bold text-text-primary uppercase tracking-wider">
                    Teknik Bilgiler (Indicators)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* RSI Card */}
                  <div className="p-3.5 bg-bg-base/50 border border-outline-variant/20 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-label-caps text-text-muted">
                        <span>RSI (14)</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          selectedStock.technicals.rsi > 70 
                            ? 'bg-bear-red/10 text-bear-red' 
                            : selectedStock.technicals.rsi < 30 
                            ? 'bg-bull-green/10 text-bull-green' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {selectedStock.technicals.rsiStatus}
                        </span>
                      </div>
                      <div className="font-data-mono text-xl font-bold text-text-primary mt-1.5">
                        {selectedStock.technicals.rsi.toFixed(1)}
                      </div>
                    </div>
                    {/* Custom Gauge representation */}
                    <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden relative">
                      <div 
                        className="bg-primary h-full rounded-full" 
                        style={{ width: `${selectedStock.technicals.rsi}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* MACD Card */}
                  <div className="p-3.5 bg-bg-base/50 border border-outline-variant/20 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-label-caps text-text-muted">
                        <span>MACD (12, 26)</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary">
                          {selectedStock.technicals.macdStatus}
                        </span>
                      </div>
                      <div className="font-data-mono text-xl font-bold text-text-primary mt-1.5">
                        {selectedStock.technicals.macd}
                      </div>
                    </div>
                    <div className="text-[9px] text-text-muted mt-3">
                      Sinyal çizgisi ile trend kesişim gücü.
                    </div>
                  </div>

                  {/* SMA50 Card */}
                  <div className="p-3.5 bg-bg-base/50 border border-outline-variant/20 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-label-caps text-text-muted">
                        <span>50 GÜNLÜK ORTALAMA (SMA)</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-bull-green/10 text-bull-green">
                          {selectedStock.technicals.sma50Status}
                        </span>
                      </div>
                      <div className="font-data-mono text-xl font-bold text-text-primary mt-1.5">
                        {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}
                        {selectedStock.technicals.sma50.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-[9px] text-text-muted mt-3">
                      Orta vadeli hareket ve direnç rasyosu.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ANALYST ÖNERİLERİ */}
              <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-headline text-sm font-bold text-text-primary uppercase tracking-wider">
                      Konsensüs Analyst Önerileri
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-label-caps text-text-muted block">HEDEF FİYAT</span>
                    <span className="font-data-mono text-sm font-bold text-primary">
                      {selectedStock.symbol === 'THYAO' || selectedStock.symbol === 'ASELS' || selectedStock.symbol === 'EREGL' ? '₺' : '$'}
                      {selectedStock.analystRating.targetPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-6">
                  {/* Consensus score */}
                  <div className="bg-bg-base/40 border border-outline-variant/20 rounded-lg p-4 flex flex-col justify-center items-center text-center shrink-0 min-w-[140px]">
                    <span className="text-[9px] font-label-caps text-text-muted uppercase">GENEL KANAAT</span>
                    <span className="text-lg font-black text-primary mt-1 tracking-tight">
                      {selectedStock.analystRating.consensus === 'STRONG BUY' && 'GÜÇLÜ AL'}
                      {selectedStock.analystRating.consensus === 'BUY' && 'AL'}
                      {selectedStock.analystRating.consensus === 'HOLD' && 'TUT'}
                      {selectedStock.analystRating.consensus === 'SELL' && 'SAT'}
                    </span>
                    <span className="text-[10px] text-text-muted mt-1 leading-tight">
                      {selectedStock.analystRating.buyPercent}% Analyst Alım Tavsiye Ediyor
                    </span>
                  </div>

                  {/* Rating distribution bar chart */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between text-[10px] text-text-muted font-bold font-sans mb-1.5">
                      <span>DAĞILIM ORANLARI</span>
                      <span className="text-text-secondary">Toplam 24 Analyst Raporu</span>
                    </div>
                    
                    {/* Visual Segmented distribution bar */}
                    <div className="w-full h-4 rounded-full overflow-hidden flex bg-surface-container-low">
                      <div 
                        className="bg-bull-green h-full" 
                        style={{ width: `${selectedStock.analystRating.buyPercent}%` }} 
                        title={`Al: ${selectedStock.analystRating.buyPercent}%`}
                      ></div>
                      <div 
                        className="bg-warning-amber h-full" 
                        style={{ width: `${selectedStock.analystRating.holdPercent}%` }}
                        title={`Tut: ${selectedStock.analystRating.holdPercent}%`}
                      ></div>
                      <div 
                        className="bg-bear-red h-full" 
                        style={{ width: `${selectedStock.analystRating.sellPercent}%` }}
                        title={`Sat: ${selectedStock.analystRating.sellPercent}%`}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[9px] font-data-mono text-text-muted mt-2">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-bull-green"></span> Al ({selectedStock.analystRating.buyPercent}%)</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning-amber"></span> Tut ({selectedStock.analystRating.holdPercent}%)</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-bear-red"></span> Sat ({selectedStock.analystRating.sellPercent}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: HİSSE İLE İLGİLİ HABERLER */}
              <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-4 h-4 text-primary" />
                  <span className="font-headline text-sm font-bold text-text-primary uppercase tracking-wider">
                    Enstrüman Özel Haber Akışı
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedStock.news && selectedStock.news.length > 0 ? (
                    selectedStock.news.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-bg-base/30 border border-outline-variant/15 p-3 rounded-lg hover:border-outline-variant/40 transition-colors"
                      >
                        <div className="flex justify-between items-center text-[9px] font-data-mono text-text-muted uppercase">
                          <span>{item.source}</span>
                          <span>{item.time}</span>
                        </div>
                        <h4 className="text-xs font-bold text-text-primary mt-1.5 leading-snug">
                          {item.title}
                        </h4>
                        {item.summary && (
                          <p className="text-[10px] text-text-secondary leading-normal mt-1.5">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-text-muted">
                      Bu enstrümana ilişkin güncel haber bulunmamaktadır.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Info className="w-8 h-8 text-text-muted mb-2 animate-bounce" />
              <p className="text-xs text-text-muted font-sans">
                Detayları görüntülemek için sol taraftan bir hisse senedi veya ETF seçin.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
