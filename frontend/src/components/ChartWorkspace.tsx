import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CandlestickChart,
  ChartLine,
  Layers,
} from 'lucide-react';
import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from 'lightweight-charts';
import type { Stock, StockHistoryItem } from '../types';
import { canonicalizePriceHistory } from '../utils/marketData';

interface ChartWorkspaceProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
  symbol?: string;
}

type ChartMode = 'candles' | 'heikin' | 'line' | 'area';
type OverlayMode = 'sma20' | 'sma50';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

const chartRanges = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'] as const;

const toUnixTime = (date: string): Time => Math.floor(new Date(date).getTime() / 1000) as Time;

const fmt = (value?: number) => (Number.isFinite(value) ? value!.toFixed(2) : '-');
const compact = (value?: number) => {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value!);
};

function hasOhlc(point: StockHistoryItem) {
  return [point.open, point.high, point.low, point.close].every(Number.isFinite);
}

function toCandleData(history: StockHistoryItem[]): CandlestickData[] {
  return history
    .filter(hasOhlc)
    .map((point) => ({
      time: toUnixTime(point.date),
      open: point.open!,
      high: point.high!,
      low: point.low!,
      close: point.close!,
    }));
}

function toHeikinAshiData(history: StockHistoryItem[]): CandlestickData[] {
  const candles = toCandleData(history);
  let previousOpen: number | undefined;
  let previousClose: number | undefined;

  return candles.map((candle) => {
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open = previousOpen === undefined || previousClose === undefined
      ? (candle.open + candle.close) / 2
      : (previousOpen + previousClose) / 2;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);
    previousOpen = open;
    previousClose = close;
    return { time: candle.time, open, high, low, close };
  });
}

function toLineData(history: StockHistoryItem[]): LineData[] {
  return history
    .filter((point) => Number.isFinite(point.price) || Number.isFinite(point.close))
    .map((point) => ({ time: toUnixTime(point.date), value: point.close ?? point.price }));
}

function toVolumeData(history: StockHistoryItem[]): HistogramData[] {
  return history
    .filter((point) => Number.isFinite(point.volume))
    .map((point) => ({
      time: toUnixTime(point.date),
      value: point.volume!,
      color: (point.close ?? point.price) >= (point.open ?? point.price) ? 'rgba(78, 222, 163, 0.35)' : 'rgba(255, 84, 81, 0.35)',
    }));
}

function movingAverage(history: StockHistoryItem[], period: number): LineData[] {
  const closes = history.map((point) => point.close ?? point.price).filter(Number.isFinite);
  if (closes.length < period) return [];
  return history.slice(period - 1).map((point, index) => {
    const window = closes.slice(index, index + period);
    const value = window.reduce((sum, item) => sum + item, 0) / period;
    return { time: toUnixTime(point.date), value };
  });
}

export default function ChartWorkspace({ stocks, onSelectStock, symbol }: ChartWorkspaceProps) {
  const [activeStock, setActiveStock] = useState<Stock | null>(
    stocks.find((stock) => stock.symbol.toUpperCase() === symbol?.toUpperCase()) ?? (symbol ? null : stocks[0] ?? null),
  );
  const [timeframe, setTimeframe] = useState<(typeof chartRanges)[number]>('1M');
  const [chartMode, setChartMode] = useState<ChartMode>('candles');
  const [overlays, setOverlays] = useState<OverlayMode[]>(['sma20']);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, date: '', close: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!activeStock || !stocks.some((stock) => stock.symbol === activeStock.symbol)) {
      setActiveStock(stocks.find((stock) => stock.symbol.toUpperCase() === symbol?.toUpperCase()) ?? (symbol ? null : stocks[0] ?? null));
    }
  }, [activeStock, stocks, symbol]);

  const visibleHistory = useMemo(() => {
    const history = canonicalizePriceHistory(activeStock?.history ?? []);
    if (timeframe === '1D') return history.slice(-1);
    if (timeframe === '5D') return history.slice(-5);
    if (timeframe === '1M') return history.slice(-30);
    if (timeframe === '3M') return history.slice(-90);
    if (timeframe === '6M') return history.slice(-180);
    if (timeframe === 'YTD') {
      const currentYear = new Date().getFullYear();
      return history.filter((point) => new Date(point.date).getFullYear() === currentYear);
    }
    return history.slice(-252);
  }, [activeStock, timeframe]);

  const canRenderOhlc = visibleHistory.length > 0 && visibleHistory.every(hasOhlc);
  const latestPoint = visibleHistory[visibleHistory.length - 1];
  const latestUpdated = latestPoint?.date ? new Date(latestPoint.date).toLocaleString('tr-TR') : 'Veri yok';

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !activeStock || visibleHistory.length === 0) return;

    const chart = createChart(element, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#a7b4c5' },
      grid: {
        vertLines: { color: 'rgba(66, 71, 83, 0.18)' },
        horzLines: { color: 'rgba(66, 71, 83, 0.18)' },
      },
      rightPriceScale: { borderColor: 'rgba(66, 71, 83, 0.45)' },
      timeScale: { borderColor: 'rgba(66, 71, 83, 0.45)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    let primarySeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;
    const candleData = chartMode === 'heikin' ? toHeikinAshiData(visibleHistory) : toCandleData(visibleHistory);
    const lineData = toLineData(visibleHistory);

    if ((chartMode === 'candles' || chartMode === 'heikin') && canRenderOhlc) {
      primarySeries = chart.addSeries(CandlestickSeries, {
        upColor: '#76caa8',
        downColor: '#f28f98',
        borderUpColor: '#76caa8',
        borderDownColor: '#f28f98',
        wickUpColor: '#76caa8',
        wickDownColor: '#f28f98',
      });
      primarySeries.setData(candleData);
    } else if (chartMode === 'area') {
      primarySeries = chart.addSeries(AreaSeries, {
        lineColor: '#7fa6ff',
        topColor: 'rgba(77, 142, 255, 0.35)',
        bottomColor: 'rgba(77, 142, 255, 0.02)',
      });
      primarySeries.setData(lineData);
    } else {
      primarySeries = chart.addSeries(LineSeries, { color: '#7fa6ff', lineWidth: 2 });
      primarySeries.setData(lineData);
    }

    const volume = toVolumeData(visibleHistory);
    if (volume.length > 0) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volumeSeries.setData(volume);
    }

    if (overlays.includes('sma20')) {
      const sma20 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, priceLineVisible: false });
      sma20.setData(movingAverage(visibleHistory, 20));
    }

    if (overlays.includes('sma50')) {
      const sma50 = chart.addSeries(LineSeries, { color: '#14b8a6', lineWidth: 1, priceLineVisible: false });
      sma50.setData(movingAverage(visibleHistory, 50));
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setTooltip((current) => ({ ...current, visible: false }));
        return;
      }
      const seriesData = param.seriesData.get(primarySeries) as CandlestickData | LineData | undefined;
      if (!seriesData) return;
      const raw = visibleHistory.find((point) => toUnixTime(point.date) === param.time);
      const close = 'close' in seriesData ? seriesData.close : seriesData.value;
      setTooltip({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        date: raw?.date ?? String(param.time),
        open: 'open' in seriesData ? seriesData.open : raw?.open,
        high: 'high' in seriesData ? seriesData.high : raw?.high,
        low: 'low' in seriesData ? seriesData.low : raw?.low,
        close,
        volume: raw?.volume,
      });
    });

    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [activeStock, canRenderOhlc, chartMode, overlays, visibleHistory]);

  const toggleOverlay = (overlay: OverlayMode) => {
    setOverlays((current) => current.includes(overlay) ? current.filter((item) => item !== overlay) : [...current, overlay]);
  };

  return (
    <div className="chart-workspace flex-1 flex flex-col bg-bg-card overflow-hidden">
      <div className="chart-toolbar border-b border-outline-variant bg-bg-primary flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-headline font-bold text-sm text-text-primary">{activeStock?.symbol ?? symbol ?? 'Sembol seçin'}</span>
            <span className="text-xs text-text-muted hidden sm:inline truncate max-w-48">{activeStock?.name}</span>
          </div>

          <div className="h-4 w-[1px] bg-outline-variant" />

          <div className="flex gap-1 bg-bg-base p-0.5 rounded border border-outline-variant/50">
            {chartRanges.map((tf) => (
              <button type="button"
                key={tf}
                onClick={() => setTimeframe(tf)}
                aria-pressed={timeframe === tf}
                className={`px-2 py-0.5 rounded font-label-caps text-xs font-bold tracking-wider ${
                  timeframe === tf ? 'bg-primary-container text-bg-base font-extrabold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-base border border-outline-variant/60 rounded p-0.5">
            {([
              ['candles', CandlestickChart, 'Mum'],
              ['heikin', BarChart3, 'Heikin Ashi'],
              ['line', ChartLine, 'Çizgi'],
              ['area', Layers, 'Alan'],
            ] as const).map(([mode, Icon, label]) => (
              <button type="button"
                key={mode}
                onClick={() => setChartMode(mode)}
                disabled={(mode === 'candles' || mode === 'heikin') && !canRenderOhlc}
                className={`p-1.5 rounded ${chartMode === mode ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary'} disabled:opacity-40`}
                title={label}
                aria-label={label}
                aria-pressed={chartMode === mode}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <button type="button"
            onClick={() => toggleOverlay('sma20')}
            aria-pressed={overlays.includes('sma20')}
            className={`px-2 py-1 text-xs rounded border font-label-caps font-bold ${overlays.includes('sma20') ? 'bg-amber-400/15 border-amber-400 text-amber-300' : 'bg-bg-base border-outline-variant/60 text-text-secondary'}`}
          >
            SMA 20
          </button>
          <button type="button"
            onClick={() => toggleOverlay('sma50')}
            aria-pressed={overlays.includes('sma50')}
            className={`px-2 py-1 text-xs rounded border font-label-caps font-bold ${overlays.includes('sma50') ? 'bg-teal-400/15 border-teal-400 text-teal-300' : 'bg-bg-base border-outline-variant/60 text-text-secondary'}`}
          >
            SMA 50
          </button>

        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-bg-base relative flex flex-col p-4 min-w-0">
          <div className="flex items-start justify-between z-10 select-none gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-data-mono text-3xl font-bold text-text-primary">{activeStock ? `$${fmt(activeStock.price)}` : '—'}</span>
                <span className={`font-data-mono text-sm font-bold ${(activeStock?.change ?? 0) >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                  {activeStock ? `${activeStock.change >= 0 ? '+' : ''}${fmt(activeStock.changePercent)}%` : '—'}
                </span>
              </div>
              <div className="font-data-mono text-xs text-text-muted flex flex-wrap gap-3 mt-1 uppercase">
                <span>O: {fmt(latestPoint?.open ?? activeStock?.open)}</span>
                <span>H: {fmt(latestPoint?.high ?? activeStock?.high)}</span>
                <span>L: {fmt(latestPoint?.low ?? activeStock?.low)}</span>
                <span>C: {fmt(latestPoint?.close ?? activeStock?.price)}</span>
                <span>V: {compact(latestPoint?.volume)}</span>
              </div>
            </div>
            <div className="text-right text-xs text-text-muted font-data-mono">
              <div>Son veri zamanı</div>
              <div className="text-text-secondary">{latestUpdated}</div>
            </div>
          </div>

          <p className="desk-help mt-3">Günlük gözlemler · 1D / 5D son 1 / 5 gözlemi gösterir. Heikin Ashi dönüştürülmüş mum gösterimidir.</p>
          <div className="relative flex-1 min-h-[360px] mt-4 border border-outline-variant/20 bg-bg-primary/35">
            {visibleHistory.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-text-muted">
                {activeStock ? 'Bu sembol için fiyat geçmişi bulunamadı.' : 'Sembol için kullanılabilir piyasa verisi yok.'}
              </div>
            ) : (
              <div ref={containerRef} className="absolute inset-0" />
            )}
            {tooltip.visible && (
              <div
                className="absolute z-30 bg-surface-container border border-outline-variant rounded p-2 text-xs shadow-xl pointer-events-none font-data-mono min-w-44"
                style={{ left: Math.min(Math.max(tooltip.x + 12, 8), 620), top: Math.max(tooltip.y + 12, 8) }}
              >
                <div className="text-text-muted mb-1">{tooltip.date}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-text-secondary">
                  <span>O {fmt(tooltip.open)}</span><span>H {fmt(tooltip.high)}</span>
                  <span>L {fmt(tooltip.low)}</span><span>C {fmt(tooltip.close)}</span>
                  <span className="col-span-2">V {compact(tooltip.volume)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="chart-symbols w-64 border-l border-outline-variant bg-bg-primary flex flex-col justify-between shrink-0">
          <div>
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">Semboller</h3>
              <span className="text-xs bg-bg-card border border-outline-variant/60 rounded px-1.5 py-0.5 text-text-muted font-bold">{stocks.length} sembol</span>
            </div>
            <div className="divide-y divide-outline-variant/20 overflow-y-auto max-h-[520px]">
              {stocks.map((stock) => {
                const isActive = activeStock?.symbol === stock.symbol;
                return (
                  <button type="button"
                    key={stock.symbol}
                    onClick={() => {
                      setActiveStock(stock);
                      onSelectStock(stock);
                    }}
                    className={`w-full p-3 flex items-center justify-between transition-colors ${isActive ? 'bg-bg-card border-l-4 border-primary' : 'hover:bg-bg-card/45'}`}
                  >
                    <div className="text-left min-w-0">
                      <div className="font-data-mono font-bold text-xs text-text-primary">{stock.symbol}</div>
                      <div className="text-xs text-text-secondary truncate max-w-[120px]">{stock.name}</div>
                    </div>
                    <div className="text-right font-data-mono shrink-0">
                      <div className="text-xs font-bold text-text-primary">${fmt(stock.price)}</div>
                      <div className={`text-xs font-bold ${stock.change >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>{stock.change >= 0 ? '+' : ''}{fmt(stock.changePercent)}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t border-outline-variant/30 bg-bg-card/30">
            <div className="text-xs text-text-muted font-label-caps uppercase mb-1">Veri kaynağı</div>
            <p className="text-xs text-text-secondary font-sans leading-relaxed">
              Mumlar, hacim ve katmanlar API'den gelen OHLCV verisiyle çizilir. Heikin Ashi bu çubuklardan yerelde türetilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
