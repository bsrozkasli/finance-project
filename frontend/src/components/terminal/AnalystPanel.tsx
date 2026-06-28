import type { AnalystData } from '../../hooks/useAnalystRatings';
import { LastUpdated } from '../shared/LastUpdated';

interface AnalystPanelProps {
  data: AnalystData | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  currentPrice?: number | null;
  onRefresh?: () => void;
}

const PanelHeader = ({
  title,
  lastFetched,
  onRefresh,
  loading,
}: {
  title: string;
  lastFetched: Date | null;
  onRefresh?: () => void;
  loading?: boolean;
}) => (
  <div className="flex items-center justify-between mb-3">
    <div
      className="text-[10px] font-bold uppercase tracking-widest"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {title}
    </div>
    <LastUpdated timestamp={lastFetched} onRefresh={onRefresh} loading={loading} />
  </div>
);

const ErrorBox = ({ message, detail, onRetry }: { message: string; detail?: string; onRetry?: () => void }) => (
  <div
    className="p-4 rounded-xl text-xs border space-y-2"
    style={{
      background: 'rgba(255,77,109,0.08)',
      color: 'var(--color-bear)',
      borderColor: 'rgba(255,77,109,0.3)',
    }}
  >
    <div className="font-bold text-sm">⚠️ {message}</div>
    {detail && (
      <div className="font-mono text-[10px] p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)', wordBreak: 'break-all' }}>
        {detail}
      </div>
    )}
    <div className="text-[10px] pt-1" style={{ color: 'var(--color-text-secondary)' }}>
      Olası nedenler:
      <ul className="list-disc ml-4 mt-1 space-y-0.5">
        <li>Backend çalışmıyor (port 8080)</li>
        <li><code className="text-[9px]">.env</code> dosyasında <code className="text-[9px]">FINNHUB_API_KEY</code> boş</li>
        <li>Finnhub rate limit aşıldı (30 req/s)</li>
      </ul>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer mt-1"
        style={{ background: 'rgba(255,77,109,0.15)', color: 'var(--color-bear)', border: '1px solid rgba(255,77,109,0.3)' }}
      >
        🔄 Tekrar Dene
      </button>
    )}
  </div>
);

export const AnalystPanel = ({
  data,
  loading,
  error,
  lastFetched,
  currentPrice,
  onRefresh,
}: AnalystPanelProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[80, 100, 120].map((h, i) => (
          <div key={i} className="skeleton rounded-xl" style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBox
        message="Analist Verisi Yüklenemedi"
        detail={error}
        onRetry={onRefresh}
      />
    );
  }

  if (!data || data.recommendations.length === 0) {
    return (
      <div
        className="p-5 text-center rounded-xl border border-dashed space-y-2"
        style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
      >
        <div className="text-2xl">📊</div>
        <div className="text-sm font-medium">Analist Verisi Bulunamadı</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Finnhub bu sembol için öneri döndürmedi.
          <br />
          Büyük borsalarda işlem gören hisseler için çalışır (NYSE, NASDAQ).
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs underline cursor-pointer"
            style={{ color: 'var(--color-accent-light)' }}
          >
            Tekrar dene
          </button>
        )}
      </div>
    );
  }

  const latest = data.recommendations[0];
  const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
  const bullish = latest.strongBuy + latest.buy;
  const bearish = latest.sell + latest.strongSell;

  const bullPct = total > 0 ? Math.round((bullish / total) * 100) : 0;
  const holdPct = total > 0 ? Math.round((latest.hold / total) * 100) : 0;
  const bearPct = total > 0 ? Math.round((bearish / total) * 100) : 0;

  const consensus = bullPct > 50 ? 'AL' : bearPct > 35 ? 'SAT' : 'TUT';
  const consensusColor =
    consensus === 'AL'
      ? 'var(--color-bull)'
      : consensus === 'SAT'
      ? 'var(--color-bear)'
      : 'var(--color-warning)';

  const pt = data.priceTarget;
  const upside =
    pt?.targetMean && currentPrice
      ? ((pt.targetMean - currentPrice) / currentPrice * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Consensus card */}
      <div>
        <PanelHeader
          title="Analist Konsensüsü"
          lastFetched={lastFetched}
          onRefresh={onRefresh}
          loading={loading}
        />
        <div
          className="p-3 rounded-xl border"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-mono font-extrabold text-2xl" style={{ color: consensusColor }}>
                {consensus}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {total} analist · {latest.period?.slice(0, 7)}
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div style={{ color: 'var(--color-bull)' }}>
                🟢 Güçlü Al: {latest.strongBuy} · Al: {latest.buy}
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                🟡 Tut: {latest.hold}
              </div>
              <div style={{ color: 'var(--color-bear)' }}>
                🔴 Sat: {latest.sell} · Güçlü Sat: {latest.strongSell}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            <div
              style={{ width: `${bullPct}%`, background: 'var(--color-bull)', borderRadius: 2 }}
              title={`AL: ${bullPct}%`}
            />
            <div
              style={{ width: `${holdPct}%`, background: 'var(--color-warning)', borderRadius: 2 }}
              title={`TUT: ${holdPct}%`}
            />
            <div
              style={{ width: `${bearPct}%`, background: 'var(--color-bear)', borderRadius: 2 }}
              title={`SAT: ${bearPct}%`}
            />
          </div>
          <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>AL {bullPct}%</span>
            <span>TUT {holdPct}%</span>
            <span>SAT {bearPct}%</span>
          </div>
        </div>
      </div>

      {/* Price target */}
      {pt?.targetMean && (
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Hedef Fiyat
          </div>
          <div
            className="p-3 rounded-xl border"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                  ${pt.targetMean.toFixed(2)}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  ${pt.targetLow?.toFixed(2)} — ${pt.targetHigh?.toFixed(2)}
                </div>
                {pt.numberOfAnalysts && (
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {pt.numberOfAnalysts} analist
                  </div>
                )}
              </div>
              {upside !== null && (
                <div
                  className="font-mono font-bold text-base px-3 py-1.5 rounded-xl"
                  style={{
                    color: Number(upside) >= 0 ? 'var(--color-bull)' : 'var(--color-bear)',
                    background:
                      Number(upside) >= 0 ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)',
                  }}
                >
                  {Number(upside) >= 0 ? '▲' : '▼'} {Math.abs(Number(upside))}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {data.recommendations.length > 1 && (
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Öneri Geçmişi
          </div>
          <div className="space-y-1">
            {data.recommendations.slice(0, 4).map(rec => {
              const t =
                rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
              const b = rec.strongBuy + rec.buy;
              const bp = t > 0 ? Math.round((b / t) * 100) : 0;
              const c = bp > 50 ? 'AL' : (t - b - rec.hold) / (t || 1) > 0.35 ? 'SAT' : 'TUT';
              const cc =
                c === 'AL'
                  ? 'var(--color-bull)'
                  : c === 'SAT'
                  ? 'var(--color-bear)'
                  : 'var(--color-warning)';
              return (
                <div
                  key={rec.period}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg-card)' }}
                >
                  <span
                    className="text-[10px] w-16 shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {rec.period?.slice(0, 7)}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-bg-primary)' }}
                  >
                    <div
                      style={{
                        width: `${bp}%`,
                        height: '100%',
                        background: cc,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold w-8 text-right"
                    style={{ color: cc }}
                  >
                    {c}
                  </span>
                  <span
                    className="text-[10px] font-mono w-6 text-right"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {t}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
