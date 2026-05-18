import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import { useAssetPrice } from '../hooks/useAssetPrice';
import { formatCurrency, formatVolume, formatDate } from '../utils/formatters';

interface ChartOverlayProps {
  symbol: string;
  onClose: () => void;
}

export const ChartOverlay = ({ symbol, onClose }: ChartOverlayProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { price, loading, error } = useAssetPrice(symbol);

  useEffect(() => {
    if (!chartContainerRef.current || !price) return;

    // We only have one data point right now (latest price), but lightweight charts
    // can render a single candlestick if needed.
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
      height: 300,
      timeScale: {
        timeVisible: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Lightweight charts requires time as string (YYYY-MM-DD) or unix timestamp
    const dateStr = price.timestamp.split('T')[0];
    
    candlestickSeries.setData([
      {
        time: dateStr,
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
      },
    ]);

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
  }, [price]);

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
            <p className="text-sm text-white/50">Latest Market Data</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            &#x2715;
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-center items-center h-[300px] text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {!loading && !error && price && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">Open</div>
                  <div className="font-mono text-lg">{formatCurrency(price.open)}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">High</div>
                  <div className="font-mono text-lg text-[var(--color-success)]">{formatCurrency(price.high)}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">Low</div>
                  <div className="font-mono text-lg text-[var(--color-danger)]">{formatCurrency(price.low)}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-white/50 mb-1">Volume</div>
                  <div className="font-mono text-lg">{formatVolume(price.volume)}</div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                <div ref={chartContainerRef} className="w-full h-[300px]" />
              </div>
              
              <div className="mt-4 text-xs text-white/30 text-right">
                Last updated: {formatDate(price.timestamp)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
