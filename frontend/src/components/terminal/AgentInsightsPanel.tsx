import { useState } from 'react';
import type { AgentAnalysis } from '../../hooks/useAgentAnalysis';

interface AgentInsightsPanelProps {
  data: AgentAnalysis | null;
  loading: boolean;
  error: string | null;
  onInvalidate?: () => void;
}

const Styles = () => (
  <style>{`
    @keyframes glow-pulse-BUY {
      0%, 100% { box-shadow: 0 0 10px rgba(0, 212, 160, 0.15), inset 0 0 8px rgba(0, 212, 160, 0.05); border-color: rgba(0, 212, 160, 0.3); }
      50% { box-shadow: 0 0 20px rgba(0, 212, 160, 0.45), inset 0 0 12px rgba(0, 212, 160, 0.15); border-color: rgba(0, 212, 160, 0.6); }
    }
    @keyframes glow-pulse-SELL {
      0%, 100% { box-shadow: 0 0 10px rgba(255, 77, 109, 0.15), inset 0 0 8px rgba(255, 77, 109, 0.05); border-color: rgba(255, 77, 109, 0.3); }
      50% { box-shadow: 0 0 20px rgba(255, 77, 109, 0.45), inset 0 0 12px rgba(255, 77, 109, 0.15); border-color: rgba(255, 77, 109, 0.6); }
    }
    @keyframes glow-pulse-HOLD {
      0%, 100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.15), inset 0 0 8px rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.3); }
      50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.45), inset 0 0 12px rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.6); }
    }
    .glow-BUY { animation: glow-pulse-BUY 3s infinite ease-in-out; }
    .glow-SELL { animation: glow-pulse-SELL 3s infinite ease-in-out; }
    .glow-HOLD { animation: glow-pulse-HOLD 3s infinite ease-in-out; }
  `}</style>
);

const FundamentalIcon = () => (
  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const TechnicalIcon = () => (
  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const RiskIcon = () => (
  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ReasoningIcon = () => (
  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const AccordionSection = ({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl overflow-hidden border transition-all duration-200"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: isOpen ? 'var(--color-accent-dim)' : 'var(--color-border)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-xs transition-colors hover:bg-[var(--color-bg-hover)] cursor-pointer"
        style={{
          color: 'var(--color-text-primary)',
          background: isOpen ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
        }}
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span style={{ letterSpacing: '0.04em' }}>{title}</span>
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <div
          className="p-3.5 text-xs leading-relaxed border-t"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-bg-primary)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const ThesisPanel = ({ bullCase, bearCase }: { bullCase: string; bearCase: string }) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Bull Case */}
      <div
        className="p-4 rounded-xl border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 160, 0.03) 0%, rgba(13, 17, 23, 0.6) 100%)',
          borderColor: 'rgba(0, 212, 160, 0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="p-1 rounded-lg"
            style={{ background: 'var(--color-bull-dim)', color: 'var(--color-bull)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-bull)' }}>
            Bull Thesis
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
          {bullCase}
        </p>
      </div>

      {/* Bear Case */}
      <div
        className="p-4 rounded-xl border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 77, 109, 0.03) 0%, rgba(13, 17, 23, 0.6) 100%)',
          borderColor: 'rgba(255, 77, 109, 0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="p-1 rounded-lg"
            style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <span className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-bear)' }}>
            Bear Thesis
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
          {bearCase}
        </p>
      </div>
    </div>
  );
};

const formatMetricKey = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/Rsi/i, 'RSI')
    .replace(/Macd/i, 'MACD')
    .replace(/Pe\b/i, 'P/E')
    .replace(/Peg\b/i, 'PEG')
    .replace(/Eps\b/i, 'EPS')
    .replace(/Sma/i, 'SMA')
    .replace(/Ebitda/i, 'EBITDA')
    .replace(/Fcf\b/i, 'FCF')
    .replace(/Roe\b/i, 'ROE');
};

const formatMetricValue = (val: unknown): string => {
  if (typeof val === 'number') {
    if (val > 1e12) return (val / 1e12).toFixed(2) + 'T';
    if (val > 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val > 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (val % 1 !== 0) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString();
  }
  if (typeof val === 'boolean') {
    return val ? 'YES' : 'NO';
  }
  if (val == null) return '—';
  return String(val);
};

const MetricsGrid = ({ metrics }: { metrics: Record<string, unknown> | null | undefined }) => {
  if (!metrics || Object.keys(metrics).length === 0) return null;
  return (
    <div>
      <div
        className="text-[10px] font-bold mb-2 uppercase tracking-widest"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Metrics Used
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(metrics).map(([key, val]) => (
          <div
            key={key}
            className="p-2.5 rounded-lg border flex flex-col justify-between"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              {formatMetricKey(key)}
            </span>
            <span className="font-mono text-xs font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {formatMetricValue(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AgentInsightsPanel = ({ data, loading, error, onInvalidate }: AgentInsightsPanelProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton rounded-xl" style={{ height: 110 }} />
        <div className="skeleton rounded-xl" style={{ height: 42 }} />
        <div className="skeleton rounded-xl" style={{ height: 140 }} />
        <div className="skeleton rounded-xl" style={{ height: 180 }} />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton rounded-xl" style={{ height: 48 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 rounded-xl text-xs border"
          style={{
            background: 'var(--color-bear-dim)',
            color: 'var(--color-bear)',
            borderColor: 'rgba(255, 77, 109, 0.25)',
          }}
        >
          <div className="font-bold uppercase tracking-wider mb-1">Analysis Error</div>
          {error}
        </div>
        {onInvalidate && (
          <button
            onClick={onInvalidate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-[var(--color-bg-hover)] cursor-pointer"
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-accent-light)',
            }}
          >
            <svg className="w-3.5 h-3.5 animate-spin-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center rounded-xl border border-dashed text-xs" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
        Select a symbol to load agent analysis insights.
      </div>
    );
  }

  const normalizedDecision = (data.decision || 'HOLD').toUpperCase();
  const decisionColor =
    normalizedDecision === 'BUY'
      ? 'var(--color-bull)'
      : normalizedDecision === 'SELL'
        ? 'var(--color-bear)'
        : 'var(--color-warning)';

  const glowClass = `glow-${normalizedDecision}`;

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      <Styles />

      {/* Decision Card with Glow and Confidence Gauge */}
      <div
        className={`relative overflow-hidden p-4 rounded-xl border flex flex-col gap-3 ${glowClass}`}
        style={{
          background: 'var(--color-bg-card)',
          transition: 'all 0.3s ease',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Final Decision
            </div>
            <div
              className="font-mono font-extrabold text-2xl tracking-wider uppercase"
              style={{
                color: decisionColor,
                textShadow: `0 0 10px ${decisionColor}40`,
              }}
            >
              {normalizedDecision}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Confidence
            </div>
            <div className="font-mono font-extrabold text-2xl" style={{ color: 'var(--color-text-primary)' }}>
              {data.confidence}%
            </div>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div>
          <div className="flex justify-between items-center text-[9px] font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            <span>CONSERVATIVE</span>
            <span>AGRESSIVE</span>
          </div>
          <div className="w-full h-2 rounded-full relative overflow-hidden" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${data.confidence}%`,
                background: `linear-gradient(90deg, ${decisionColor}33 0%, ${decisionColor} 100%)`,
                boxShadow: `0 0 8px ${decisionColor}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Cache Status and Invalidate Button */}
      <div
        className="flex items-center justify-between p-3 rounded-xl border"
        style={{
          background: data.from_cache ? 'rgba(245, 158, 11, 0.04)' : 'rgba(99, 102, 241, 0.04)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${data.from_cache ? 'bg-warning animate-pulse' : 'bg-success'}`} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {data.from_cache ? `Cached result (${new Date(data.generated_at).toLocaleTimeString()})` : 'Live analysis results'}
          </span>
        </div>
        {onInvalidate && (
          <button
            onClick={onInvalidate}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-150 hover:bg-[var(--color-bg-hover)] active:scale-95 cursor-pointer"
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-accent-light)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            {loading ? 'Analyzing...' : 'Re-Analyze'}
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <MetricsGrid metrics={data.metrics_used} />

      {/* Bull/Bear Thesis Panel */}
      <ThesisPanel bullCase={data.bull_case} bearCase={data.bear_case} />

      {/* Accordion-Style Collapsible Sections for each agent */}
      <div className="space-y-2">
        <AccordionSection title="Fundamental Analysis" icon={<FundamentalIcon />} defaultOpen={true}>
          {data.fundamental_summary || 'No fundamental analysis available.'}
        </AccordionSection>

        <AccordionSection title="Technical Analysis" icon={<TechnicalIcon />} defaultOpen={false}>
          {data.technical_summary || 'No technical analysis available.'}
        </AccordionSection>

        <AccordionSection title="Risk Analysis" icon={<RiskIcon />} defaultOpen={false}>
          {data.risk_summary || 'No risk analysis available.'}
        </AccordionSection>

        <AccordionSection title="Portfolio Manager Reasoning" icon={<ReasoningIcon />} defaultOpen={true}>
          {data.portfolio_manager_reasoning || 'No PM decision reasoning available.'}
        </AccordionSection>
      </div>
    </div>
  );
};
