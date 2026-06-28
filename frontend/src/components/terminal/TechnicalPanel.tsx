import type { TechnicalResult } from '../../api/client';
import { LastUpdated } from '../shared/LastUpdated';

interface TechnicalPanelProps {
  data: TechnicalResult | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  onRefresh?: () => void;
}

const PanelHeader = ({ title, lastFetched, onRefresh, loading }: { title: string; lastFetched: Date | null; onRefresh?: () => void; loading?: boolean }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>
    <LastUpdated timestamp={lastFetched} onRefresh={onRefresh} loading={loading} />
  </div>
);

const Gauge = ({ value, min = 0, max = 100, label }: { value: number; min?: number; max?: number; label: string }) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = value > 70 ? 'var(--color-bear)' : value < 30 ? 'var(--color-bull)' : 'var(--color-warning)';
  const zone = value > 70 ? 'Aşırı Alım' : value < 30 ? 'Aşırı Satım' : 'Nötr';
  return (
    <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color }}>{zone}</span>
          <span className="font-mono font-bold text-sm" style={{ color }}>{value.toFixed(1)}</span>
        </div>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="absolute inset-y-0 left-0 right-1/3 opacity-20 rounded-full" style={{ background: 'var(--color-bull)' }} />
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 rounded-full" style={{ background: 'var(--color-bear)' }} />
        <div className="absolute top-0 h-full w-1 rounded-full transition-all" style={{ left: `${pct}%`, transform: 'translateX(-50%)', background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
        <span>Aşırı Satım</span><span>Nötr</span><span>Aşırı Alım</span>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, suffix = '' }: { label: string; value: number | null | undefined; suffix?: string }) => (
  <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
      {value != null ? `${value.toFixed(2)}${suffix}` : '—'}
    </span>
  </div>
);

export const TechnicalPanel = ({ data, loading, error, lastFetched, onRefresh }: TechnicalPanelProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton rounded-xl" style={{ height: 80 }} />
        <div className="skeleton rounded-xl" style={{ height: 80 }} />
        <div className="skeleton rounded-xl" style={{ height: 120 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-xl text-xs border space-y-2"
        style={{ background: 'rgba(255,77,109,0.08)', color: 'var(--color-bear)', borderColor: 'rgba(255,77,109,0.3)' }}
      >
        <div className="font-bold text-sm">⚠️ Teknik Analiz Yüklenemedi</div>
        <div className="font-mono text-[10px] p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)', wordBreak: 'break-all' }}>
          {error}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
          Olası nedenler:
          <ul className="list-disc ml-4 mt-1 space-y-0.5">
            <li>FastAPI data-service çalışmıyor (port 8000)</li>
            <li>Spring Boot backend çalışmıyor (port 8080)</li>
            <li>Bu sembol için yeterli fiyat geçmişi yok (min. 30 mum)</li>
          </ul>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
            style={{ background: 'rgba(255,77,109,0.15)', color: 'var(--color-bear)', border: '1px solid rgba(255,77,109,0.3)' }}
          >
            🔄 Tekrar Dene
          </button>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center rounded-xl border border-dashed text-xs" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
        Teknik analiz verisi bekleniyor...
      </div>
    );
  }

  const signal = data.signalAction?.toUpperCase();
  const signalColor = signal === 'BUY' ? 'var(--color-bull)' : signal === 'SELL' ? 'var(--color-bear)' : 'var(--color-warning)';
  const signalTR = signal === 'BUY' ? 'AL' : signal === 'SELL' ? 'SAT' : 'TUT';

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Overall signal */}
      {signal && (
        <div className="p-3 rounded-xl border flex items-center justify-between" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div>
            <div className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Genel Sinyal</div>
            <div className="font-mono font-extrabold text-xl" style={{ color: signalColor }}>{signalTR}</div>
          </div>
          {data.signalConfidence != null && (
            <div className="text-right">
              <div className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Güven</div>
              <div className="font-mono font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{(data.signalConfidence * 100).toFixed(0)}%</div>
            </div>
          )}
          <LastUpdated timestamp={lastFetched} onRefresh={onRefresh} loading={loading} />
        </div>
      )}

      {/* RSI Gauge */}
      {data.rsi != null && <Gauge value={data.rsi} label="RSI (14)" />}

      {/* MACD */}
      {(data.macd != null || data.macdSignal != null) && (
        <div>
          <PanelHeader title="MACD" lastFetched={!signal ? lastFetched : null} onRefresh={!signal ? onRefresh : undefined} loading={loading} />
          <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <MetricRow label="MACD" value={data.macd} />
            <MetricRow label="Sinyal" value={data.macdSignal} />
            <MetricRow label="Histogram" value={data.macdHistogram} />
          </div>
        </div>
      )}

      {/* Bollinger Bands */}
      {data.bbUpper != null && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>Bollinger Bantları</div>
          <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <MetricRow label="Üst Bant" value={data.bbUpper} suffix="$" />
            <MetricRow label="Orta (SMA)" value={data.bbMiddle} suffix="$" />
            <MetricRow label="Alt Bant" value={data.bbLower} suffix="$" />
            {data.atr != null && <MetricRow label="ATR (Volatilite)" value={data.atr} />}
          </div>
        </div>
      )}

      {/* SMA / EMA */}
      {(data.sma != null || data.ema != null) && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>Hareketli Ortalamalar</div>
          <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <MetricRow label="SMA (20)" value={data.sma} suffix="$" />
            <MetricRow label="EMA (20)" value={data.ema} suffix="$" />
          </div>
        </div>
      )}
    </div>
  );
};
