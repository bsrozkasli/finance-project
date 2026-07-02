import { useEffect, useState } from 'react';
import type { OHLCVData, Range, Interval } from '../types/chart.types';
import { marketDataService } from '../services/marketDataService';
import { calculateSMA } from '../utils/indicatorCalculations';

const FRAMES: { label: string; interval: Interval; range: Range; mainRange: Range }[] = [
  { label: '1H', interval: '1h', range: '5D', mainRange: '5D' },
  { label: '4H', interval: '4h', range: '1M', mainRange: '1M' },
  { label: '1D', interval: '1d', range: '3M', mainRange: '3M' },
  { label: '1W', interval: '1w', range: '1Y', mainRange: '1Y' },
];

const MiniChart = ({ data }: { data: OHLCVData[] }) => {
  if (data.length < 2) return <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</div>;
  const rows = data.slice(-24);
  const ma = calculateSMA(rows, Math.min(8, rows.length));
  const high = Math.max(...rows.map((row) => row.high));
  const low = Math.min(...rows.map((row) => row.low));
  const span = high - low || 1;
  const x = (index: number) => 8 + (index / Math.max(1, rows.length - 1)) * 128;
  const y = (price: number) => 54 - ((price - low) / span) * 44;
  const maPoints = ma.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');

  return (
    <svg viewBox="0 0 144 60" className="h-16 w-full" aria-hidden="true">
      {rows.map((row, index) => {
        const cx = x(index);
        const openY = y(row.open);
        const closeY = y(row.close);
        const color = row.close >= row.open ? 'var(--color-bull)' : 'var(--color-bear)';
        return (
          <g key={`${row.time}-${index}`}>
            <line x1={cx} x2={cx} y1={y(row.high)} y2={y(row.low)} stroke={color} strokeWidth="1" />
            <rect x={cx - 2} y={Math.min(openY, closeY)} width="4" height={Math.max(2, Math.abs(closeY - openY))} fill={color} />
          </g>
        );
      })}
      <polyline points={maPoints} fill="none" stroke="var(--color-accent-light)" strokeWidth="1.2" />
    </svg>
  );
};

export const MultiTimeframeStrip = ({ symbol, activeRange, onSelectRange }: { symbol: string; activeRange: Range; onSelectRange: (range: Range) => void }) => {
  const [dataByFrame, setDataByFrame] = useState<Record<string, OHLCVData[]>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const settled = await Promise.allSettled(
        FRAMES.map(async (frame) => ({
          label: frame.label,
          data: await marketDataService.getCandles({ symbol, range: frame.range, interval: frame.interval }),
        }))
      );
      if (cancelled) return;
      const next: Record<string, OHLCVData[]> = {};
      for (const result of settled) {
        if (result.status === 'fulfilled') next[result.value.label] = result.value.data;
      }
      setDataByFrame(next);
    };
    void load();
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div className="grid grid-cols-2 gap-2 border-t p-2 lg:grid-cols-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
      {FRAMES.map((frame) => (
        <button key={frame.label} type="button" onClick={() => onSelectRange(frame.mainRange)} className="rounded border p-2 text-left" style={{ borderColor: activeRange === frame.mainRange ? 'var(--color-accent)' : 'var(--color-border-subtle)', background: activeRange === frame.mainRange ? 'var(--color-accent-dim)' : 'var(--color-bg-card)' }}>
          <div className="mb-1 text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{frame.label}</div>
          <MiniChart data={dataByFrame[frame.label] ?? []} />
        </button>
      ))}
    </div>
  );
};
