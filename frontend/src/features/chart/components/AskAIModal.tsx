import { useState } from 'react';
import type { DecisionSupportResponse } from '../../../api/client';
import { fetchDecisionSupport } from '../../../api/client';

const QUESTIONS = [
  'Support and resistance levels?',
  'Is there RSI divergence?',
  'Short-term outlook?',
];

const signalColor = (signal?: string) => {
  const upper = signal?.toUpperCase();
  if (upper === 'BUY') return 'var(--color-bull)';
  if (upper === 'SELL') return 'var(--color-bear)';
  return 'var(--color-warning)';
};

export const AskAIModal = ({ symbol }: { symbol: string }) => {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState(QUESTIONS[0]);
  const [data, setData] = useState<DecisionSupportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (nextScenario = scenario) => {
    setScenario(nextScenario);
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDecisionSupport({ symbol, userScenario: nextScenario });
      setData(response);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Decision support unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void ask('Analyze this symbol from a technical trading perspective.')}
        className="absolute bottom-5 right-5 z-30 rounded-full px-4 py-3 text-xs font-bold shadow-lg"
        style={{ background: 'var(--color-accent)', color: '#001a42' }}
      >
        Ask AI
      </button>
      {open && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-lg border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>AI Decision Support</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{symbol} / {scenario}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Close</button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {QUESTIONS.map((question) => (
                <button key={question} type="button" onClick={() => void ask(question)} className="rounded px-3 py-1.5 text-xs" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>{question}</button>
              ))}
            </div>
            {loading && <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>}
            {!loading && error && <div className="text-sm" style={{ color: 'var(--color-warning)' }}>{error}</div>}
            {!loading && data && (
              <div className="space-y-4">
                <div className="rounded border p-4" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="rounded px-3 py-1 text-xs font-bold" style={{ color: signalColor(data.primarySignal), border: `1px solid ${signalColor(data.primarySignal)}` }}>{data.primarySignal}</span>
                    <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{data.convictionLevel}/100 conviction</span>
                  </div>
                  <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{data.executiveSummary}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <div className="mb-2 text-xs font-bold uppercase" style={{ color: 'var(--color-bull)' }}>Bull Case</div>
                    <ul className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{data.bullCase.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div className="rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <div className="mb-2 text-xs font-bold uppercase" style={{ color: 'var(--color-bear)' }}>Bear Case</div>
                    <ul className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{data.bearCase.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
                <div className="rounded border p-3 text-xs leading-5" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-subtle)' }}>{data.fullAnalysis}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
