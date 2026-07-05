import { useEffect, useMemo, useState } from 'react';
import type { MacroSnapshot } from '../../../api/client';
import { fetchMacroSnapshot } from '../../../api/client';

const formatValue = (value: number | null | undefined, suffix = '%') => (
  value == null ? '-' : `${value.toFixed(2)}${suffix}`
);

export const MacroSnapshotPanel = () => {
  const [snapshot, setSnapshot] = useState<MacroSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMacroSnapshot();
        if (!cancelled) setSnapshot(data);
      } catch (e) {
        if (!cancelled) {
          setSnapshot(null);
          setError(e instanceof Error ? e.message : 'Macro snapshot unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const cards = useMemo(() => [
    { label: 'Fed Funds', value: formatValue(snapshot?.fedFundsRate), note: 'Policy rate' },
    { label: 'CPI YoY', value: formatValue(snapshot?.cpiYoy), note: 'Inflation' },
    { label: 'GDP Growth', value: formatValue(snapshot?.gdpGrowth), note: 'Growth' },
    { label: 'Unemployment', value: formatValue(snapshot?.unemploymentRate), note: 'Labor' },
    { label: '10Y Treasury', value: formatValue(snapshot?.treasury10y), note: 'Long yield' },
    { label: '2Y-10Y Spread', value: formatValue(snapshot?.yieldCurveSpread), note: 'Yield curve' },
  ], [snapshot]);

  const inverted = (snapshot?.yieldCurveSpread ?? 0) < 0;

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Macro State</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>FRED snapshot, cached by data-service</p>
        </div>
        {loading && <span className="skeleton h-6 w-16" />}
      </div>

      {error && <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{error}</div>}
      {!error && inverted && (
        <div className="mb-3 rounded border px-3 py-2 text-xs font-semibold" style={{ color: 'var(--color-bear)', borderColor: 'rgba(255,84,81,0.35)', background: 'var(--color-bear-dim)' }}>
          Yield curve inversion detected.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <span className="font-mono text-lg font-bold" style={{ color: card.label === '2Y-10Y Spread' && inverted ? 'var(--color-bear)' : 'var(--color-text-primary)' }}>
                {loading ? '-' : card.value}
              </span>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{'->'}</span>
            </div>
            <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{card.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
};


