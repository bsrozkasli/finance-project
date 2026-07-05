import type { DashboardSummary } from './dashboardTransforms';
import { formatCurrency } from '../../../utils/formatters';

const pct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const signedCurrency = (value: number) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;

export const PortfolioKpiStrip = ({ summary, loading }: { summary: DashboardSummary; loading: boolean }) => {
  const cards = [
    { label: 'Portfolio Value', value: formatCurrency(summary.totalValue), color: 'var(--color-text-primary)' },
    { label: 'Unrealized P/L', value: signedCurrency(summary.totalPnL), color: summary.totalPnL >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' },
    { label: 'Total Return', value: pct(summary.totalReturn), color: summary.totalReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' },
    { label: 'Holdings', value: String(summary.holdingsCount), color: 'var(--color-text-primary)' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
          <div className="mt-2 font-mono text-xl font-bold" style={{ color: card.color }}>
            {loading ? <span className="skeleton inline-block h-6 w-28" /> : card.value}
          </div>
        </div>
      ))}
    </div>
  );
};
