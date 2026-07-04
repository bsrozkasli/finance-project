import { useState } from 'react';
import type { DetectedPattern, PatternDetectionResponse, TechnicalResult, TechnicalSignalSummary } from '../../../api/client';
import type { AgentAnalysis } from '../../../hooks/useAgentAnalysis';
import { AITechnicalAnalysisPanel } from './AITechnicalAnalysisPanel';
import { TechnicalSignalCard } from './TechnicalSignalCard';

type Tab = 'technical' | 'ai' | 'patterns';

const TABS: { id: Tab; label: string }[] = [
  { id: 'technical', label: 'Technical' },
  { id: 'ai', label: 'AI Analysis' },
  { id: 'patterns', label: 'Patterns' },
];

const directionColor = (direction?: string) => {
  if (direction === 'BULLISH') return 'var(--color-bull)';
  if (direction === 'BEARISH') return 'var(--color-bear)';
  return 'var(--color-text-muted)';
};

const PatternList = ({ data, loading, error, onRefresh }: { data: PatternDetectionResponse | null; loading: boolean; error: string | null; onRefresh: () => void }) => (
  <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Pattern Detection</h3>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Classical chart patterns and confidence</p>
      </div>
      <button type="button" onClick={onRefresh} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>Refresh</button>
    </div>
    {loading && <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>}
    {!loading && error && <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{error}</div>}
    {!loading && !error && (!data || data.patterns.length === 0) && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No detected patterns for this range.</div>}
    {!loading && data && data.patterns.length > 0 && (
      <div className="space-y-3">
        {data.patterns.map((pattern: DetectedPattern) => (
          <div key={`${pattern.patternType}-${pattern.startIndex}-${pattern.endIndex}`} className="rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{pattern.patternType.replaceAll('_', ' ')}</span>
              <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ color: directionColor(pattern.direction), border: `1px solid ${directionColor(pattern.direction)}` }}>{Math.round(pattern.confidence * 100)}%</span>
            </div>
            <div className="text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>{pattern.description}</div>
            {pattern.priceTarget != null && <div className="mt-1 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>Target {pattern.priceTarget.toFixed(2)}</div>}
          </div>
        ))}
      </div>
    )}
  </section>
);

export const WorkspaceAnalysisPanel = ({
  technical,
  signals,
  technicalLoading,
  technicalError,
  onRefreshTechnical,
  agentData,
  agentLoading,
  agentError,
  onRefreshAgent,
  patterns,
  patternsLoading,
  patternsError,
  onRefreshPatterns,
}: {
  technical: TechnicalResult | null;
  signals: TechnicalSignalSummary | null;
  technicalLoading: boolean;
  technicalError: string | null;
  onRefreshTechnical: () => void;
  agentData: AgentAnalysis | null;
  agentLoading: boolean;
  agentError: string | null;
  onRefreshAgent: () => void;
  patterns: PatternDetectionResponse | null;
  patternsLoading: boolean;
  patternsError: string | null;
  onRefreshPatterns: () => void;
}) => {
  const [tab, setTab] = useState<Tab>('technical');
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button type="button" onClick={() => setCollapsed(false)} className="w-9 border-l text-xs font-bold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-light)', background: 'var(--color-bg-card)' }}>
        AI
      </button>
    );
  }

  return (
    <aside className="w-96 shrink-0 overflow-hidden border-l" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
      <div className="flex items-center justify-between border-b p-3" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex rounded border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}>
          {TABS.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className="rounded px-2 py-1 text-xs font-bold" style={{ background: tab === item.id ? 'var(--color-bg-hover)' : 'transparent', color: tab === item.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{item.label}</button>
          ))}
        </div>
        <button type="button" onClick={() => setCollapsed(true)} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Collapse</button>
      </div>
      <div className="h-full overflow-y-auto p-3 pb-20">
        {tab === 'technical' && <TechnicalSignalCard technical={technical} signals={signals} loading={technicalLoading} error={technicalError} onRefresh={onRefreshTechnical} />}
        {tab === 'ai' && <AITechnicalAnalysisPanel data={agentData} loading={agentLoading} error={agentError} onRefresh={onRefreshAgent} />}
        {tab === 'patterns' && <PatternList data={patterns} loading={patternsLoading} error={patternsError} onRefresh={onRefreshPatterns} />}
      </div>
    </aside>
  );
};
