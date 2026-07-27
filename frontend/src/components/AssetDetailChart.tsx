import { useEffect, useMemo, useRef, useState } from 'react';
import { AreaSeries, CandlestickSeries, createChart, HistogramSeries, type Time } from 'lightweight-charts';
import type { PriceHistory } from '../api/types';
import { canonicalizePriceHistory } from '../utils/marketData';

interface AssetDetailChartProps {
  bars: PriceHistory[];
  symbol: string;
}

type Range = '5D' | '1M' | '3M' | '6M' | '1Y';
type Mode = 'candles' | 'line';

const counts: Record<Range, number> = { '5D': 5, '1M': 31, '3M': 93, '6M': 186, '1Y': 370 };
const toTime = (timestamp: string) => Math.floor(new Date(timestamp).getTime() / 1000) as Time;

export default function AssetDetailChart({ bars, symbol }: AssetDetailChartProps) {
  const [range, setRange] = useState<Range>('3M');
  const [mode, setMode] = useState<Mode>('candles');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const visibleBars = useMemo(
    () => canonicalizePriceHistory(bars).slice(-counts[range]),
    [bars, range],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host || visibleBars.length === 0) return;
    const chart = createChart(host, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#8c909f' },
      grid: { vertLines: { color: 'rgba(66,71,83,.16)' }, horzLines: { color: 'rgba(66,71,83,.16)' } },
      rightPriceScale: { borderColor: 'rgba(66,71,83,.45)' },
      timeScale: { borderColor: 'rgba(66,71,83,.45)', timeVisible: true },
      crosshair: { mode: 1 },
    });
    if (mode === 'candles') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#4edea3', downColor: '#ff5451', borderVisible: false, wickUpColor: '#4edea3', wickDownColor: '#ff5451',
      });
      series.setData(visibleBars.map((bar) => ({ time: toTime(bar.timestamp), open: bar.open, high: bar.high, low: bar.low, close: bar.close })));
    } else {
      const series = chart.addSeries(AreaSeries, { lineColor: '#4d8eff', topColor: 'rgba(77,142,255,.28)', bottomColor: 'rgba(77,142,255,0)' });
      series.setData(visibleBars.map((bar) => ({ time: toTime(bar.timestamp), value: bar.close })));
    }
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(visibleBars.filter((bar) => bar.volume != null).map((bar) => ({
      time: toTime(bar.timestamp), value: bar.volume, color: bar.close >= bar.open ? 'rgba(78,222,163,.32)' : 'rgba(255,84,81,.32)',
    })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [mode, visibleBars]);

  return (
    <section className="border border-outline-variant/30 bg-bg-card p-4 rounded-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">{symbol} Price Chart</div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(counts) as Range[]).map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`px-2 py-1 text-[10px] font-bold ${range === value ? 'bg-primary/15 text-primary' : 'text-text-muted'}`}>{value}</button>)}
          <button type="button" onClick={() => setMode(mode === 'candles' ? 'line' : 'candles')} className="ml-2 border border-outline-variant px-2 py-1 text-[10px] font-bold text-text-secondary">{mode === 'candles' ? 'Line' : 'Candles'}</button>
        </div>
      </div>
      <div className="relative h-72 border border-outline-variant/20 bg-bg-base/30">
        {visibleBars.length ? <div ref={hostRef} className="absolute inset-0" /> : <div className="flex h-full items-center justify-center text-xs text-text-muted">No provider-backed chart data.</div>}
      </div>
    </section>
  );
}