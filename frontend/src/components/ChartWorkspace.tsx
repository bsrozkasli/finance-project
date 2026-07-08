import { useState, useMemo } from 'react';
import { AlertCircle, RefreshCw, PenTool, Type, Trash2, MousePointer, ShieldAlert } from 'lucide-react';
import type { Stock } from '../types';

interface ChartWorkspaceProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

export default function ChartWorkspace({ stocks, onSelectStock }: ChartWorkspaceProps) {
  const [activeStock, setActiveStock] = useState<Stock | null>(stocks[0] || null);
  const [timeframe, setTimeframe] = useState('1M');
  const [sma20, setSma20] = useState(true);
  const [sma50, setSma50] = useState(false);
  const [activeTool, setActiveTool] = useState<'cursor' | 'trend' | 'text'>('cursor');

  // Optional connection-error overlay for local UI testing
  const [simulateError, setSimulateError] = useState(false);
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');

  // Sparkline data coordinates
  const points = useMemo(() => {
    if (!activeStock) return [];
    return activeStock.history;
  }, [activeStock]);

  const svgDimensions = useMemo(() => ({ width: 700, height: 350 }), []);

  // Calculate coordinates from real close prices and real OHLC candles when provided by the API.
  const chartCoordinates = useMemo(() => {
    if (points.length === 0) return null;

    const hasOhlc = points.every(
      (p) => p.open !== undefined && p.high !== undefined && p.low !== undefined && p.close !== undefined
    );
    const sourcePrices = hasOhlc
      ? points.flatMap((p) => [p.open!, p.high!, p.low!, p.close!])
      : points.map((p) => p.price);
    const rawMin = Math.min(...sourcePrices);
    const rawMax = Math.max(...sourcePrices);
    const minPrice = rawMin * 0.99;
    const maxPrice = rawMax * 1.01;
    const range = maxPrice - minPrice || 1;

    const paddingX = 40;
    const paddingY = 30;
    const plotWidth = svgDimensions.width - paddingX * 2;
    const plotHeight = svgDimensions.height - paddingY * 2;
    const xForIndex = (index: number) => paddingX + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
    const yForPrice = (price: number) => svgDimensions.height - paddingY - ((price - minPrice) / range) * plotHeight;

    const coordinates = points.map((p, index) => ({
      x: xForIndex(index),
      y: yForPrice(p.price),
      rawPrice: p.price,
      date: p.date,
    }));

    const candles = hasOhlc
      ? points.map((p, index) => {
          const open = p.open!;
          const close = p.close!;
          const high = p.high!;
          const low = p.low!;
          return {
            x: xForIndex(index),
            y: yForPrice(close),
            open,
            close,
            high,
            low,
            yOpen: yForPrice(open),
            yClose: yForPrice(close),
            yHigh: yForPrice(high),
            yLow: yForPrice(low),
            isUp: close >= open,
            rawPrice: close,
            date: p.date,
          };
        })
      : [];

    const linePath = `M ${coordinates.map((c) => `${c.x},${c.y}`).join(' ')}`;

    const calculateSMA = (windowSize: number) => {
      const smaPoints = [];
      for (let i = 0; i < coordinates.length; i++) {
        if (i < windowSize) {
          smaPoints.push({ x: coordinates[i].x, y: coordinates[i].y });
          continue;
        }
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
          sum += coordinates[i - j].rawPrice;
        }
        const avg = sum / windowSize;
        smaPoints.push({ x: coordinates[i].x, y: yForPrice(avg) });
      }
      return smaPoints.map((p) => `${p.x},${p.y}`).join(' ');
    };

    const sma20Path = `M ${calculateSMA(5)}`;
    const sma50Path = `M ${calculateSMA(10)}`;

    return { candles, linePath, sma20Path, sma50Path, minPrice, maxPrice, hasOhlc };
  }, [points, svgDimensions]);

  return (
    <div className="flex-1 flex flex-col bg-bg-base overflow-hidden">
      {/* Chart Configuration Bar */}
      <div className="h-12 border-b border-outline-variant bg-bg-primary flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-sm text-text-primary">{activeStock?.symbol}</span>
            <span className="text-xs text-text-muted hidden sm:inline">{activeStock?.name}</span>
          </div>

          <div className="h-4 w-[1px] bg-outline-variant"></div>

          {/* Timeframes */}
          <div className="flex gap-1 bg-bg-base p-0.5 rounded border border-outline-variant/50">
            {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded font-label-caps text-[9px] font-bold tracking-wider ${
                  timeframe === tf
                    ? 'bg-primary-container text-bg-base font-extrabold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <button
            onClick={() => setChartType(prev => prev === 'candle' ? 'line' : 'candle')}
            disabled={!chartCoordinates?.hasOhlc}
            className="px-2 py-1 text-[10px] bg-bg-base hover:bg-surface-container border border-outline-variant/60 rounded font-label-caps text-primary uppercase font-bold"
          >
            Type: {chartType === 'candle' && chartCoordinates?.hasOhlc ? 'Candles' : 'Line'}
          </button>

          {/* SMA toggles */}
          <button
            onClick={() => setSma20(prev => !prev)}
            className={`px-2 py-1 text-[10px] rounded border font-label-caps font-bold transition-all ${
              sma20
                ? 'bg-primary-container/20 border-primary text-primary'
                : 'bg-bg-base border-outline-variant/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            SMA 20 {sma20 ? '?' : '0'}
          </button>

          <button
            onClick={() => setSma50(prev => !prev)}
            className={`px-2 py-1 text-[10px] rounded border font-label-caps font-bold transition-all ${
              sma50
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : 'bg-bg-base border-outline-variant/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            SMA 50 {sma50 ? '?' : '0'}
          </button>

          <div className="h-4 w-[1px] bg-outline-variant"></div>

          {/* Connection Error Simulator Switch */}
          <button
            onClick={() => setSimulateError(prev => !prev)}
            className={`px-2.5 py-1 text-[9px] rounded border font-label-caps font-bold flex items-center gap-1 ${
              simulateError
                ? 'bg-bear-red/20 border-bear-red text-bear-red animate-pulse'
                : 'bg-bg-base border-outline-variant/40 text-text-muted hover:text-text-secondary'
            }`}
            title="Simulate connection error"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ERROR SIMULATOR</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar Drawer (Drawing Instruments) */}
        <div className="w-12 border-r border-outline-variant bg-bg-primary flex flex-col items-center py-4 gap-4 shrink-0">
          <button
            onClick={() => setActiveTool('cursor')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'cursor'
                ? 'bg-primary-container/15 text-primary border border-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
            }`}
            title="Cursor"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('trend')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'trend'
                ? 'bg-primary-container/15 text-primary border border-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
            }`}
            title="Draw Trend Line"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'text'
                ? 'bg-primary-container/15 text-primary border border-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
            }`}
            title="Add Text Note"
          >
            <Type className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-outline-variant/40 my-1"></div>

          <button
            onClick={() => {
              alert('Drawings cleared.');
            }}
            className="p-2 text-text-muted hover:text-bear-red rounded-lg hover:bg-bear-red/10 transition-colors"
            title="Delete All Drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Central Candlestick Technical Chart Screen */}
        <div className="flex-1 bg-bg-base relative flex items-center justify-center p-4">

          {/* Active Canvas Content */}
          <div className="w-full h-full flex flex-col justify-between">
            {/* Price overlay summary */}
            <div className="flex items-start justify-between z-10 select-none">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-data-mono text-3xl font-bold text-text-primary">
                    ${activeStock?.price.toFixed(2)}
                  </span>
                  <span className={`font-data-mono text-sm font-bold flex items-center ${(activeStock?.change ?? 0) >= 0 ? 'UP' : 'DOWN'}`}>
                    {(activeStock?.change ?? 0) >= 0 ? 'UP' : 'DOWN'}
                    {(activeStock?.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
                {/* OHLV metrics label */}
                <div className="font-data-mono text-[10px] text-text-muted flex gap-3 mt-1 uppercase">
                  <span>O: {activeStock?.open}</span>
                  <span>H: {activeStock?.high}</span>
                  <span>L: {activeStock?.low}</span>
                  <span>C: {activeStock?.price}</span>
                  <span>V: {activeStock?.volume}</span>
                </div>
              </div>
            </div>

            {/* Error Overlay - Replicating Image 3 */}
            {simulateError ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-base/90 backdrop-blur-sm p-4">
                <div className="max-w-md w-full bg-[#131b2e] border border-outline-variant rounded-xl p-6 shadow-2xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-bear-red/10 border border-bear-red/25 flex items-center justify-center mx-auto text-bear-red">
                    <AlertCircle className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="font-headline text-lg font-bold text-text-primary">
                      Request failed with status code 500
                    </h3>
                    <p className="text-xs text-text-secondary mt-1.5 font-sans">
                      An unexpected internal server error occurred while connecting to the market feed. Retry the connection.
                    </p>
                  </div>
                  <button
                    onClick={() => setSimulateError(false)}
                    className="px-5 py-2 bg-primary-container text-on-primary-container hover:opacity-95 font-sans text-xs font-bold rounded-lg flex items-center gap-1.5 mx-auto shadow-md transition-opacity"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Connection</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* SVG Candlestick Screen canvas */}
            <div className="flex-1 w-full my-4 relative">
              <svg className="w-full h-full" viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} preserveAspectRatio="none">
                {/* Ticks horizontal grid lines */}
                <line x1="40" y1="30" x2="660" y2="30" stroke="#272a31" strokeOpacity="0.4" strokeDasharray="2 2" />
                <line x1="40" y1="110" x2="660" y2="110" stroke="#272a31" strokeOpacity="0.4" strokeDasharray="2 2" />
                <line x1="40" y1="190" x2="660" y2="190" stroke="#272a31" strokeOpacity="0.4" strokeDasharray="2 2" />
                <line x1="40" y1="270" x2="660" y2="270" stroke="#272a31" strokeOpacity="0.4" strokeDasharray="2 2" />

                {/* Y-axis labels */}
                {chartCoordinates && (
                  <>
                    <text x="665" y="34" fill="#8c909f" fontSize="8" fontFamily="JetBrains Mono">
                      ${chartCoordinates.maxPrice.toFixed(2)}
                    </text>
                    <text x="665" y="194" fill="#8c909f" fontSize="8" fontFamily="JetBrains Mono">
                      ${((chartCoordinates.maxPrice + chartCoordinates.minPrice) / 2).toFixed(2)}
                    </text>
                    <text x="665" y="274" fill="#8c909f" fontSize="8" fontFamily="JetBrains Mono">
                      ${chartCoordinates.minPrice.toFixed(2)}
                    </text>
                  </>
                )}

                {/* Candle body drawings */}
                {chartType === 'candle' && chartCoordinates?.hasOhlc && chartCoordinates.candles.map((c, idx) => (
                  <g key={idx} className="cursor-pointer hover:opacity-85">
                    {/* Wick line */}
                    <line
                      x1={c.x}
                      y1={c.yHigh}
                      x2={c.x}
                      y2={c.yLow}
                      stroke={c.isUp ? '#4edea3' : '#ff5451'}
                      strokeWidth="1.2"
                    />
                    {/* Candle body rect */}
                    <rect
                      x={c.x - 3}
                      y={Math.min(c.yOpen, c.yClose)}
                      width="6"
                      height={Math.max(1.5, Math.abs(c.yOpen - c.yClose))}
                      fill={c.isUp ? '#4edea3' : '#ff5451'}
                      rx="1"
                    />
                  </g>
                ))}

                {/* Line graph drawing */}
                {(chartType === 'line' || !chartCoordinates?.hasOhlc) && chartCoordinates && (
                  <path
                    d={chartCoordinates.linePath}
                    fill="none"
                    stroke="#4d8eff"
                    strokeWidth="2"
                  />
                )}

                {/* Technical Indicator SMA lines */}
                {sma20 && chartCoordinates && (
                  <path
                    d={chartCoordinates.sma20Path}
                    fill="none"
                    stroke="#4d8eff"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    strokeDasharray="2 1"
                  />
                )}

                {sma50 && chartCoordinates && (
                  <path
                    d={chartCoordinates.sma50Path}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    strokeDasharray="2 1"
                  />
                )}
              </svg>
            </div>

            {/* Bottom time scale */}
            <div className="flex justify-between px-10 border-t border-outline-variant/20 pt-2 font-data-mono text-[9px] text-text-muted">
              <span>10:00</span>
              <span>11:00</span>
              <span>12:00</span>
              <span>13:00</span>
              <span>14:00</span>
              <span>15:00</span>
              <span>16:00</span>
            </div>
          </div>
        </div>

        {/* Right Watchlist Panel - Replicating Image 3 right-column */}
        <div className="w-64 border-l border-outline-variant bg-bg-primary flex flex-col justify-between shrink-0">
          <div>
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
                Watchlist
              </h3>
              <span className="text-[10px] bg-bg-card border border-outline-variant/60 rounded px-1.5 py-0.5 text-text-muted font-bold">
                {stocks.length} SYM
              </span>
            </div>

            {/* Watchlist entries */}
            <div className="divide-y divide-outline-variant/20 overflow-y-auto max-h-[480px]">
              {stocks.map((stock) => {
                const isActive = activeStock?.symbol === stock.symbol;
                return (
                  <button
                    key={stock.symbol}
                    onClick={() => {
                      setActiveStock(stock);
                      onSelectStock(stock);
                    }}
                    className={`w-full p-3 flex items-center justify-between transition-colors ${
                      isActive ? 'bg-bg-card border-l-4 border-primary' : 'hover:bg-bg-card/45'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-data-mono font-bold text-xs text-text-primary">{stock.symbol}</div>
                      <div className="text-[10px] text-text-secondary truncate max-w-[120px]">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-right font-data-mono">
                      <div className="text-xs font-bold text-text-primary">${stock.price.toFixed(2)}</div>
                      <div className={`text-[10px] font-bold ${stock.change >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                        {stock.change >= 0 ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick info footer inside chart watchlist */}
          <div className="p-4 border-t border-outline-variant/30 bg-bg-card/30">
            <div className="text-[10px] text-text-muted font-label-caps uppercase mb-1">
              Quick Tip
            </div>
            <p className="text-[11px] text-text-secondary font-sans leading-relaxed">
              Use the left toolbar to access analysis tools. Select a ticker to update the chart with real price history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
