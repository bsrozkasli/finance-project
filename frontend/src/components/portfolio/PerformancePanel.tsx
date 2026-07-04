import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PortfolioPerformanceResponse } from '../../api/client';
import { calculateVolatility, fmt, fmtCurrency, fmtPct, PERFORMANCE_PERIODS, performanceReturn, positiveColor, toNumber } from './portfolioUtils';
import type { EnrichedRow } from './portfolioUtils';

interface PerformancePanelProps {
  period: string;
  benchmark: string | undefined;
  performance: PortfolioPerformanceResponse | null;
  rows: EnrichedRow[];
  onPeriodChange: (period: string) => void;
  onBenchmarkChange: (benchmark: string | undefined) => void;
}

const benchmarkOptions = [
  { label: 'Kapali', value: undefined },
  { label: 'S&P500', value: 'SP500' },
  { label: 'NASDAQ', value: 'NASDAQ' },
  { label: 'BIST100', value: 'BIST100' },
];

const benchmarkLabel = (benchmark: string | undefined) => {
  if (!benchmark) return 'Kapali';
  return benchmarkOptions.find(option => option.value === benchmark)?.label ?? benchmark;
};

const chartData = (performance: PortfolioPerformanceResponse | null) => {
  const series = performance?.series ?? [];
  const firstPortfolio = toNumber(series[0]?.portfolioValue);
  const firstBenchmark = toNumber(series.find(point => point.benchmarkValue != null)?.benchmarkValue);
  return series.map(point => {
    const portfolio = toNumber(point.portfolioValue);
    const benchmark = point.benchmarkValue == null ? null : toNumber(point.benchmarkValue);
    const portfolioIndex = firstPortfolio > 0 ? (portfolio / firstPortfolio) * 100 : portfolio;
    const benchmarkIndex = benchmark != null && firstBenchmark > 0 ? (benchmark / firstBenchmark) * 100 : undefined;
    const diff = benchmarkIndex == null ? undefined : portfolioIndex - benchmarkIndex;
    return {
      date: point.date,
      portfolioIndex,
      benchmarkIndex,
      diffPositive: diff != null && diff >= 0 ? diff : undefined,
      diffNegative: diff != null && diff < 0 ? diff : undefined,
    };
  });
};

const bestWorst = (rows: EnrichedRow[]) => {
  const ranked = rows.filter(row => row.totalReturn != null).sort((a, b) => (b.totalReturn ?? 0) - (a.totalReturn ?? 0));
  return { best: ranked[0] ?? null, worst: ranked[ranked.length - 1] ?? null };
};

const benchmarkDelta = (data: ReturnType<typeof chartData>): number | null => {
  const latest = [...data].reverse().find(point => point.benchmarkIndex != null);
  if (!latest || latest.benchmarkIndex == null) return null;
  return latest.portfolioIndex - latest.benchmarkIndex;
};

export const PerformancePanel = ({
  period,
  benchmark,
  performance,
  rows,
  onPeriodChange,
  onBenchmarkChange,
}: PerformancePanelProps) => {
  const [customBenchmark, setCustomBenchmark] = useState('');
  const data = chartData(performance);
  const periodic = performanceReturn(performance);
  const volatility = calculateVolatility(performance);
  const { best, worst } = bestWorst(rows);
  const sharpe = performance?.metrics?.sharpe ?? null;
  const drawdown = performance?.metrics?.maxDrawdown ?? null;
  const delta = benchmarkDelta(data);
  const label = benchmarkLabel(benchmark);

  const applyCustomBenchmark = () => {
    const next = customBenchmark.trim().toUpperCase();
    if (next) onBenchmarkChange(next);
  };

  return (
    <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Donemsel Karlilik</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Portfoy performansi ve benchmark karsilastirmasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            {PERFORMANCE_PERIODS.map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => onPeriodChange(item.value)}
                className="rounded px-2 py-1 text-[10px] font-bold"
                style={{
                  background: period === item.value ? 'var(--color-accent-dim)' : 'transparent',
                  color: period === item.value ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            {benchmarkOptions.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => onBenchmarkChange(item.value)}
                className="rounded px-2 py-1 text-[10px] font-bold"
                style={{
                  background: benchmark === item.value ? 'var(--color-accent-dim)' : 'transparent',
                  color: benchmark === item.value ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <input
              value={customBenchmark}
              onChange={event => setCustomBenchmark(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') applyCustomBenchmark(); }}
              placeholder="Custom ETF"
              className="w-24 bg-transparent px-2 text-[10px] font-bold outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
            <button type="button" onClick={applyCustomBenchmark} className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Uygula</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="h-[280px] min-w-0">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="rgba(140,144,159,0.18)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis yAxisId="index" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={54} domain={['auto', 'auto']} />
                <YAxis yAxisId="diff" hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} formatter={(value, name) => {
                  const labelName = name === 'portfolioIndex' ? 'Portfolio' : name === 'benchmarkIndex' ? label : 'Fark';
                  return [`${Number(value).toFixed(2)}`, labelName];
                }} />
                <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 11 }} />
                <ReferenceLine yAxisId="diff" y={0} stroke="rgba(140,144,159,0.3)" />
                <Area yAxisId="diff" type="monotone" dataKey="diffPositive" name="Outperformance" fill="var(--color-bull-dim)" stroke="var(--color-bull)" fillOpacity={0.45} connectNulls />
                <Area yAxisId="diff" type="monotone" dataKey="diffNegative" name="Underperformance" fill="var(--color-bear-dim)" stroke="var(--color-bear)" fillOpacity={0.35} connectNulls />
                <Line yAxisId="index" type="monotone" dataKey="portfolioIndex" name="Portfolio" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                <Line yAxisId="index" type="monotone" dataKey="benchmarkIndex" name={label} stroke="var(--color-warning)" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="text-xs">Performans serisi henuz yok.</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Getiri" value={fmtPct(periodic.returnPct)} tone={periodic.returnPct} />
            <Metric label="P/L" value={periodic.pnl == null ? '-' : `${periodic.pnl >= 0 ? '+' : ''}${fmtCurrency(periodic.pnl)}`} tone={periodic.pnl} />
            <Metric label="Sharpe" value={fmt(sharpe)} tone={sharpe} />
            <Metric label="Max DD" value={drawdown == null ? '-' : `-${Math.abs(drawdown).toFixed(2)}%`} tone={drawdown == null ? null : -drawdown} />
            <Metric label="Volatilite" value={volatility == null ? '-' : `${volatility.toFixed(2)}%`} />
            <Metric label="Benchmark" value={label} />
          </div>
          <div className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label} Farki</div>
            <div className="mt-2 font-mono text-sm font-bold" style={{ color: delta == null ? 'var(--color-text-primary)' : positiveColor(delta) }}>
              {benchmark ? (delta == null ? '-' : `${label}'e gore ${fmtPct(delta)} ${delta >= 0 ? 'daha iyi' : 'daha kotu'}`) : 'Benchmark kapali'}
            </div>
          </div>
          <div className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>En Iyi / En Kotu</div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><span style={{ color: 'var(--color-text-secondary)' }}>{best?.position.symbol ?? '-'}</span><span className="font-mono" style={{ color: positiveColor(best?.totalReturn) }}>{fmtPct(best?.totalReturn)}</span></div>
              <div className="flex justify-between gap-3"><span style={{ color: 'var(--color-text-secondary)' }}>{worst?.position.symbol ?? '-'}</span><span className="font-mono" style={{ color: positiveColor(worst?.totalReturn) }}>{fmtPct(worst?.totalReturn)}</span></div>
            </div>
          </div>
          {benchmark && data.every(point => point.benchmarkIndex == null) && (
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Benchmark secimi API'ye gonderildi; seri donmezse cizgi bos kalir.</p>
          )}
        </div>
      </div>
    </section>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: number | null }) => (
  <div className="rounded border p-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="mt-1 font-mono text-xs font-bold" style={{ color: tone == null ? 'var(--color-text-primary)' : positiveColor(tone) }}>{value}</div>
  </div>
);
