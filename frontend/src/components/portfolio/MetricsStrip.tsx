import type { PortfolioPerformanceResponse } from '../../api/client';
import { fmt, fmtCurrency, fmtPct, positiveColor, sparkPath, toNumber } from './portfolioUtils';
import type { PortfolioTotals } from './portfolioUtils';

interface MetricsStripProps {
  totals: PortfolioTotals;
  beta: number | null;
  sharpe: number | null;
  performance: PortfolioPerformanceResponse | null;
}

const MetricCard = ({ label, value, toneValue, sparkValues }: { label: string; value: string; toneValue?: number | null; sparkValues: number[] }) => {
  const path = sparkPath(sparkValues);
  return (
    <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
          <div className="mt-1 font-mono text-base font-bold" style={{ color: toneValue == null ? 'var(--color-text-primary)' : positiveColor(toneValue) }}>
            {value}
          </div>
        </div>
        <svg width="90" height="28" viewBox="0 0 90 28" aria-hidden="true">
          {path && <path d={path} fill="none" stroke={toneValue == null ? 'var(--color-accent-light)' : positiveColor(toneValue)} strokeWidth="1.5" />}
        </svg>
      </div>
    </div>
  );
};

export const MetricsStrip = ({ totals, beta, sharpe, performance }: MetricsStripProps) => {
  const values = performance?.series.map(point => toNumber(point.portfolioValue)).filter(value => value > 0) ?? [];
  const fallbackSpark = values.length > 0 ? values : [totals.totalMarketValue || 0, totals.totalMarketValue || 0];

  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-7">
      <MetricCard label="Toplam Deger" value={fmtCurrency(totals.totalMarketValue)} sparkValues={fallbackSpark} />
      <MetricCard label="Gunluk P/L" value={`${totals.dailyPnL >= 0 ? '+' : ''}${fmtCurrency(totals.dailyPnL)}`} toneValue={totals.dailyPnL} sparkValues={fallbackSpark} />
      <MetricCard label="Toplam P/L" value={`${totals.totalPnL >= 0 ? '+' : ''}${fmtCurrency(totals.totalPnL)}`} toneValue={totals.totalPnL} sparkValues={fallbackSpark} />
      <MetricCard label="Toplam Getiri" value={fmtPct(totals.totalReturn)} toneValue={totals.totalReturn} sparkValues={fallbackSpark} />
      <MetricCard label="Varlik Sayisi" value={String(totals.assetCount)} sparkValues={fallbackSpark} />
      <MetricCard label="Beta" value={fmt(beta, '', '', 2)} sparkValues={fallbackSpark} />
      <MetricCard label="Sharpe" value={fmt(sharpe, '', '', 2)} toneValue={sharpe} sparkValues={fallbackSpark} />
    </div>
  );
};