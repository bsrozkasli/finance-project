import type { TechnicalResult, TechnicalSignalSummary } from '../../../api/client';

const badgeColor = (action?: string) => {
  const upper = action?.toUpperCase();
  if (upper === 'BUY') return 'var(--color-bull)';
  if (upper === 'SELL') return 'var(--color-bear)';
  return 'var(--color-warning)';
};

const fmt = (value: number | null | undefined, digits = 2) => value == null ? '-' : value.toFixed(digits);

const Gauge = ({ value, color }: { value: number; color: string }) => (
  <div className="h-2 rounded-full" style={{ background: 'var(--color-bg-base)' }}>
    <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
  </div>
);

const MacdBars = ({ value }: { value?: number | null }) => {
  const center = 5;
  const active = Math.max(-5, Math.min(5, Math.round((value ?? 0) * 10)));
  return (
    <div className="flex h-10 items-end gap-1">
      {Array.from({ length: 11 }, (_, index) => {
        const offset = index - center;
        const filled = active >= 0 ? offset > 0 && offset <= active : offset < 0 && offset >= active;
        return <div key={index} className="w-2 rounded-sm" style={{ height: `${8 + Math.abs(offset) * 5}px`, background: filled ? (active >= 0 ? 'var(--color-bull)' : 'var(--color-bear)') : 'var(--color-bg-hover)' }} />;
      })}
    </div>
  );
};

export const TechnicalSignalCard = ({
  technical,
  signals,
  loading,
  error,
  onRefresh,
}: {
  technical: TechnicalResult | null;
  signals: TechnicalSignalSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) => {
  const rsi = technical?.rsi ?? 50;
  const rsiColor = rsi < 30 ? 'var(--color-bull)' : rsi > 70 ? 'var(--color-bear)' : 'var(--color-warning)';
  const action = technical?.signalAction ?? signals?.signal.action ?? 'HOLD';
  const confidenceRaw = technical?.signalConfidence ?? signals?.signal.confidence ?? 0;
  const confidence = confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw;
  const bbPosition = technical?.bbUpper != null && technical.bbLower != null && technical.bbUpper !== technical.bbLower
    ? ((technical.bbMiddle ?? technical.bbLower) - technical.bbLower) / (technical.bbUpper - technical.bbLower) * 100
    : null;

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Technical Signal</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>RSI, MACD, Bollinger, ATR</p>
        </div>
        <button type="button" onClick={onRefresh} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>Refresh</button>
      </div>
      {loading && <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>}
      {!loading && error && <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{error}</div>}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Signal</span>
              <span className="rounded px-3 py-1 text-xs font-bold" style={{ color: badgeColor(action), border: `1px solid ${badgeColor(action)}` }}>{action}</span>
            </div>
            <Gauge value={confidence} color={badgeColor(action)} />
            <div className="mt-1 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{confidence.toFixed(0)}% confidence</div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><span style={{ color: 'var(--color-text-muted)' }}>RSI</span><span className="font-mono" style={{ color: rsiColor }}>{fmt(technical?.rsi, 1)}</span></div>
            <Gauge value={rsi} color={rsiColor} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>MACD Hist</div>
              <MacdBars value={technical?.macdHistogram} />
              <div className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmt(technical?.macdHistogram, 3)}</div>
            </div>
            <div className="rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ATR Volatility</div>
              <div className="mt-3 font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(technical?.atr)}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>SMA {fmt(technical?.sma)} / EMA {fmt(technical?.ema)}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><span style={{ color: 'var(--color-text-muted)' }}>Bollinger position</span><span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{bbPosition == null ? '-' : `${bbPosition.toFixed(0)}%`}</span></div>
            <Gauge value={bbPosition ?? 50} color="var(--color-accent)" />
          </div>
        </div>
      )}
    </section>
  );
};
