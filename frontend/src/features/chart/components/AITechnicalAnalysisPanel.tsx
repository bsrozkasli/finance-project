import type { AgentAnalysis } from '../../../hooks/useAgentAnalysis';

const decisionColor = (decision?: string) => {
  const upper = decision?.toUpperCase();
  if (upper === 'BUY') return 'var(--color-bull)';
  if (upper === 'SELL') return 'var(--color-bear)';
  return 'var(--color-warning)';
};

const Section = ({ title, children }: { title: string; children: string }) => (
  <div className="rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
    <p className="text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>{children || 'No analysis available.'}</p>
  </div>
);

export const AITechnicalAnalysisPanel = ({
  data,
  loading,
  error,
  onRefresh,
}: {
  data: AgentAnalysis | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) => {
  const confidence = data?.confidence ?? 0;
  const confidencePct = confidence <= 1 ? confidence * 100 : confidence;
  const color = decisionColor(data?.decision);

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>AI Analysis</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Agent technical, risk, bull/bear cases</p>
        </div>
        <button type="button" onClick={onRefresh} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>Refresh AI</button>
      </div>

      {loading && <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>}
      {!loading && error && <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{error}</div>}
      {!loading && !error && data && (
        <div className="space-y-3">
          <div className="rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded px-3 py-1 text-xs font-bold" style={{ color, border: `1px solid ${color}` }}>{data.decision}</span>
              <span className="font-mono text-lg font-bold" style={{ color }}>{confidencePct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, confidencePct))}%`, background: color }} />
            </div>
            <div className="mt-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{data.from_cache ? 'Served from cache' : 'Fresh agent run'}</div>
          </div>
          <Section title="Technical Summary">{data.technical_summary}</Section>
          <Section title="Risk Assessment">{data.risk_summary}</Section>
          <Section title="Bull Case">{data.bull_case}</Section>
          <Section title="Bear Case">{data.bear_case}</Section>
          <Section title="Portfolio Manager">{data.portfolio_manager_reasoning}</Section>
        </div>
      )}
      {!loading && !error && !data && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No AI analysis for this symbol.</div>}
    </section>
  );
};
