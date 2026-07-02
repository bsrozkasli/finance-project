import { useEffect, useMemo, useRef } from 'react';
import { AreaSeries, ColorType, createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export interface PerformancePoint {
  date: string;
  value: number;
}

export const PerformanceChart = ({ series }: { series: PerformancePoint[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const chartData = useMemo(() => series.map((point) => ({ time: point.date as Time, value: point.value })), [series]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8c909f' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;
    seriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: '#4d8eff',
      topColor: 'rgba(77,142,255,0.28)',
      bottomColor: 'rgba(77,142,255,0)',
      lineWidth: 2,
    });

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(chartData);
    chartRef.current.timeScale().fitContent();
  }, [chartData]);

  if (series.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Not enough price history for this portfolio yet.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
};
