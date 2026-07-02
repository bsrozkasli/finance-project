import type { DashboardSummary, PortfolioHealth } from './dashboardTransforms';
import { formatCurrency } from '../../../utils/formatters';

export const PortfolioHealthScore = ({ health, summary }: { health: PortfolioHealth; summary: DashboardSummary }) => {
  const scoreColor = health.score >= 70 ? 'var(--color-bull)' : health.score >= 45 ? 'var(--color-warning)' : 'var(--color-bear)';
  const pnlPositive = summary.totalPnL >= 0;

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Portfolio Health</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Diversification, concentration, and profitability</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold" style={{ color: scoreColor }}>{health.score}</div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>score</div>
        </div>
      </div>

      {health.concentrationWarning && (
        <div className="mb-3 rounded border px-3 py-2 text-xs font-semibold" style={{ color: 'var(--color-bear)', borderColor: 'rgba(255,84,81,0.35)', background: 'var(--color-bear-dim)' }}>
          {health.concentrationWarning}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Diversification</div>
          <div className="mt-2 font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{health.distinctAssets}</div>
          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>asset types</div>
        </div>
        <div className="rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Top Weight</div>
          <div className="mt-2 font-mono text-lg font-bold" style={{ color: health.topWeight >= 30 ? 'var(--color-bear)' : 'var(--color-text-primary)' }}>{health.topWeight.toFixed(1)}%</div>
          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>single holding</div>
        </div>
        <div className="rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Profitability</div>
          <div className="mt-2 font-mono text-lg font-bold" style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}>{formatCurrency(summary.totalPnL)}</div>
          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{health.profitabilityLabel}</div>
        </div>
      </div>
    </section>
  );
};
