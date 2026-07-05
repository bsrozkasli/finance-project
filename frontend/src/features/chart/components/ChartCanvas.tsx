import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, LineStyle, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, UTCTimestamp, IPriceLine, ISeriesMarkersPluginApi, SeriesMarker, Time } from 'lightweight-charts';
import type { OHLCVData, PatternOverlayMarker, Range, SupportResistanceLevel } from '../types/chart.types';
import type { DrawingObject, DrawingType } from '../types/drawing.types';
import { DrawingOverlay } from './DrawingOverlay';

interface ChartCanvasProps {
  data: OHLCVData[];
  symbol: string;
  range: Range;
  showSMA20: boolean;
  sma20Data: { time: string; value: number }[];
  showSMA50: boolean;
  sma50Data: { time: string; value: number }[];
  // Drawings
  activeTool: DrawingType;
  drawings: DrawingObject[];
  currentDrawing: DrawingObject | null;
  onStartDrawing: (point: { x: number; y: number }, symbol: string, range: string) => void;
  onUpdateDrawing: (point: { x: number; y: number }) => void;
  onCompleteDrawing: () => void;
  patternMarkers?: PatternOverlayMarker[];
  supportResistanceLevels?: SupportResistanceLevel[];
}

export const ChartCanvas = ({
  data,
  symbol,
  range,
  showSMA20,
  sma20Data,
  showSMA50,
  sma50Data,
  activeTool,
  drawings,
  currentDrawing,
  onStartDrawing,
  onUpdateDrawing,
  onCompleteDrawing,
  patternMarkers = [],
  supportResistanceLevels = [],
}: ChartCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // Series refs
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const patternMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const supportResistanceLinesRef = useRef<IPriceLine[]>([]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const toUnix = (ts: string): UTCTimestamp => Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1, // Normal
      },
      timeScale: {
        timeVisible: true,
      },
    });
    
    chartRef.current = chart;

    // Candlesticks
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', // green
      downColor: '#ef4444', // red
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // Volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(255, 255, 255, 0.2)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        chart.applyOptions({ width: clientWidth, height: clientHeight });
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    candleSeriesRef.current.setData(data.map(d => ({
      time: toUnix(d.time),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })));

    volumeSeriesRef.current.setData(data.map(d => ({
      time: toUnix(d.time),
      value: d.volume,
      color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
    })));

    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Update Indicators
  useEffect(() => {
    if (!chartRef.current) return;

    if (showSMA20 && sma20Data.length > 0) {
      if (!sma20SeriesRef.current) {
        sma20SeriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2,
          crosshairMarkerVisible: false,
        });
      }
      sma20SeriesRef.current.setData(sma20Data.map(d => ({ time: toUnix(d.time), value: d.value })));
    } else if (sma20SeriesRef.current) {
      chartRef.current.removeSeries(sma20SeriesRef.current);
      sma20SeriesRef.current = null;
    }
  }, [showSMA20, sma20Data]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (showSMA50 && sma50Data.length > 0) {
      if (!sma50SeriesRef.current) {
        sma50SeriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: '#eab308',
          lineWidth: 2,
          crosshairMarkerVisible: false,
        });
      }
      sma50SeriesRef.current.setData(sma50Data.map(d => ({ time: toUnix(d.time), value: d.value })));
    } else if (sma50SeriesRef.current) {
      chartRef.current.removeSeries(sma50SeriesRef.current);
      sma50SeriesRef.current = null;
    }
  }, [showSMA50, sma50Data]);


  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;
    const markers: SeriesMarker<Time>[] = patternMarkers.map((marker) => ({
      time: toUnix(marker.time),
      position: marker.direction === 'BEARISH' ? 'aboveBar' : 'belowBar',
      shape: marker.direction === 'BEARISH' ? 'arrowDown' : marker.direction === 'BULLISH' ? 'arrowUp' : 'circle',
      color: marker.direction === 'BEARISH' ? '#ef4444' : marker.direction === 'BULLISH' ? '#10b981' : '#94a3b8',
      text: `${marker.label} ${Math.round(marker.confidence * 100)}%`,
    }));

    if (!patternMarkersRef.current) {
      patternMarkersRef.current = createSeriesMarkers(candleSeriesRef.current, markers, { zOrder: 'top' });
    } else {
      patternMarkersRef.current.setMarkers(markers);
    }
  }, [data, patternMarkers]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    for (const line of supportResistanceLinesRef.current) {
      candleSeriesRef.current.removePriceLine(line);
    }
    supportResistanceLinesRef.current = supportResistanceLevels.map((level) => candleSeriesRef.current!.createPriceLine({
      price: level.price,
      color: level.type === 'resistance' ? '#ef4444' : level.type === 'support' ? '#10b981' : '#eab308',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `${level.method} ${level.label}`,
    }));
  }, [supportResistanceLevels]);
  // Drawing Handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return;
    
    // In a full implementation, we'd map screen coordinates to price/time.
    // For this MVP, we store screen coordinates to render the SVG properly.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!currentDrawing) {
      onStartDrawing({ x, y }, symbol, range);
    } else {
      // Second click finishes basic tools (line, rect, etc)
      onUpdateDrawing({ x, y });
      onCompleteDrawing();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor' || !currentDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onUpdateDrawing({ x, y });
  };

  return (
    <div className="relative flex-1 w-full h-full" ref={containerRef}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <DrawingOverlay
          width={dimensions.width}
          height={dimensions.height}
          drawings={drawings.filter(d => d.symbol === symbol && d.range === range)}
          currentDrawing={currentDrawing}
          activeTool={activeTool}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => {}} // Could be used for drag-to-draw
        />
      )}
    </div>
  );
};
