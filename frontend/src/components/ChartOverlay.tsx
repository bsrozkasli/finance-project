import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useAssetPrice } from '../hooks/useAssetPrice';
import { formatCurrency, formatVolume, formatDate } from '../utils/formatters';

interface ChartOverlayProps {
  symbol: string;
  onClose: () => void;
}

const INTERVALS = [
  { label: '1H',  value: '1h',  range: '5d'  },
  { label: '1D',  value: '1d',  range: '1mo' },
  { label: '1W',  value: '1wk', range: '6mo' },
  { label: '1M',  value: '1mo', range: '2y'  },
  { label: '1Y',  value: '1y',  range: '5y'  },
] as const;

type IntervalValue = typeof INTERVALS[number]['value'];

export const ChartOverlay = ({ symbol, onClose }: ChartOverlayProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedInterval, setSelectedInterval] = useState<IntervalValue>('1d');
  const [selectedRange, setSelectedRange] = useState('1mo');

  const { prices, loading, error } = useAssetPrice(symbol, selectedInterval, selectedRange);

  // Latest bar used for the stats panel
  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;

  useEffect(() => {
    if (!chartContainerRef.current || prices.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Candlestick series (primary scale)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Volume histogram (secondary overlay scale)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(255, 255, 255, 0.2)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Convert ISO timestamp → unix seconds (UTCTimestamp) for the time scale
    const toUnix = (ts: string): UTCTimestamp =>
      Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp;

    candlestickSeries.setData(
      prices.map((p) => ({
        time:  toUnix(p.timestamp),
        open:  p.open,
        high:  p.high,
        low:   p.low,
        close: p.close,
      }))
    );

    volumeSeries.setData(
      prices.map((p) => ({
        time:  toUnix(p.timestamp),
        value: p.volume,
        color:
          p.close >= p.open
            ? 'rgba(16, 185, 129, 0.4)'
            : 'rgba(239, 68, 68, 0.4)',
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [prices]);

  const handleIntervalChange = (value: IntervalValue, range: string) => {
    setSelectedInterval(value);
    setSelectedRange(range);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0f1117]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={{ background: 'var(--color-bg-card)' }}
      >
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{symbol}</h2>
            <p className="text-sm text-white/50">Price Chart</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            &#x2715;
          </button>
        </div>

        <div className="p-6">
          {/* Time Interval Selector */}
          <div className="flex gap-2 mb-4">
            {INTERVALS.map(({ label, value, range }) => (
              <button
                key={value}
                onClick={() => handleIntervalChange(value, range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedInterval === value
                    ? 'text-white'
                    : 'bg-black/20 text-white/50 hover:text-white hover:bg-white/10'
                }`}
                style={
                  selectedInterval === value
                    ? { background: 'var(--color-accent)' }
                    : {}
                }
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center items-center h-[400px]">
              <div
                className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
                style={{ borderColor: 'var(--color-accent)' }}
              />
            </div>
          )}

          {error && (
            <div className="flex justify-center items-center h-[400px] text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {!loading && !error && prices.length === 0 && (
            <div className="flex justify-center items-center h-[400px] text-white/30">
              No price data available for this interval.
            </div>
          )}

          {!loading && !error && latestPrice && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">Open</div>
                  <div className="font-mono text-lg">{formatCurrency(latestPrice.open)}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">High</div>
                  <div className="font-mono text-lg text-[var(--color-success)]">
                    {formatCurrency(latestPrice.high)}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">Low</div>
                  <div className="font-mono text-lg text-[var(--color-danger)]">
                    {formatCurrency(latestPrice.low)}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">Volume</div>
                  <div className="font-mono text-lg">{formatVolume(latestPrice.volume)}</div>
                </div>
              </div>

              {/* Candlestick + Volume Chart */}
              <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                <div ref={chartContainerRef} className="w-full" />
              </div>

              <div className="mt-4 text-xs text-white/30 text-right">
                Last updated: {formatDate(latestPrice.timestamp)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

