import { fmtPct } from './portfolioUtils';
import type { PortfolioRiskAlert } from './portfolioRisk';

interface RiskAlertsPanelProps {
  alerts: PortfolioRiskAlert[];
}

const tone = (severity: PortfolioRiskAlert['severity']) => severity === 'danger'
  ? { bg: 'var(--color-bear-dim)', color: 'var(--color-bear)', label: 'Kirmizi' }
  : { bg: 'rgba(245,158,11,0.14)', color: 'var(--color-warning)', label: 'Sari' };

export const RiskAlertsPanel = ({ alerts }: RiskAlertsPanelProps) => {
  const primary = alerts[0];

  if (!primary) {
    return (
      <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Risk Uyari Sistemi</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Tek hisse ve sektor konsantrasyonu esiklerin altinda.</p>
          </div>
          <span className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: 'var(--color-bull-dim)', color: 'var(--color-bull)' }}>Temiz</span>
        </div>
      </section>
    );
  }

  const primaryTone = tone(primary.severity);

  return (
    <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: primaryTone.color }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Risk Uyari Sistemi</h2>
          <p className="mt-1 text-xs" style={{ color: primaryTone.color }}>Dikkat: {primary.message}</p>
        </div>
        <span className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: primaryTone.bg, color: primaryTone.color }}>{alerts.length} Uyari</span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {alerts.map(alert => {
          const itemTone = tone(alert.severity);
          return (
            <article key={alert.id} className="rounded border p-3" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{alert.type === 'asset' ? 'Tek Hisse' : 'Sektor'}</div>
                  <div className="mt-1 truncate font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{alert.target}</div>
                </div>
                <span className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: itemTone.bg, color: itemTone.color }}>{itemTone.label}</span>
              </div>
              <div className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{alert.message}</div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--color-text-muted)' }}>Allocation</span>
                <span className="font-mono font-bold" style={{ color: itemTone.color }}>{fmtPct(alert.allocation)}</span>
              </div>
              <div className="mt-3 rounded p-2 text-[11px]" style={{ background: itemTone.bg, color: 'var(--color-text-secondary)' }}>{alert.action}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
