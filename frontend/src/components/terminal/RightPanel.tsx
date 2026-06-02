import { useState } from 'react';
import type { Asset } from '../../api/types';
import { useLivePrice } from '../../hooks/useLivePrice';
import { useSparkline } from '../../hooks/useSparkline';

interface RightPanelProps {
  selectedSymbol: string | null;
  assets: Asset[];
}

/* ── Helpers ────────────────────────────────────────────────────── */
function fmt(n: number | undefined | null, dec = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtVol(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

/* ── Mini bar chart ─────────────────────────────────────────────── */
const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, (value / max) * 100)}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  </div>
);

/* ── Mock analyst target data (deterministic by symbol) ─────────── */
function getAnalystData(symbol: string, price: number | undefined) {
  const seed = symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 65);
  const spread = 0.1 + (seed % 15) / 100;
  const base = price ?? 100;
  return {
    low: base * (1 - spread * 0.4),
    median: base * (1 + spread * 0.6),
    high: base * (1 + spread * 1.4),
    rating: seed % 5 === 0 ? 'SAT' : seed % 3 === 0 ? 'TUTE' : 'AL',
    score: 40 + (seed % 50),
    analystCount: 8 + (seed % 25),
  };
}

/* ── Mock news items ────────────────────────────────────────────── */
const NEWS_TEMPLATES = [
  { title: '{SYM} güçlü çeyrek sonuçlarıyla beklentileri aştı', source: 'Reuters', ago: '2s önce' },
  { title: '{SYM} için analistler hedef fiyatı yükseltti', source: 'Bloomberg', ago: '1s önce' },
  { title: '{SYM} yeni ürün lansmanını duyurdu', source: 'CNBC', ago: '3s önce' },
  { title: 'Fed kararı {SYM} hissesini nasıl etkiledi?', source: 'MarketWatch', ago: '5s önce' },
  { title: '{SYM} piyasa değeri rekor kırdı', source: 'Financial Times', ago: '7s önce' },
  { title: '{SYM} için kurumsal alım sinyali güçlendi', source: 'Seeking Alpha', ago: '12s önce' },
];

function getMockNews(symbol: string) {
  const seed = symbol.charCodeAt(0);
  return NEWS_TEMPLATES.slice(seed % 3, (seed % 3) + 4).map((t) => ({
    ...t,
    title: t.title.replace(/{SYM}/g, symbol),
  }));
}

/* ── Signal Badge ───────────────────────────────────────────────── */
const SignalBadge = ({ rating, score }: { rating: string; score: number }) => {
  const colors: Record<string, [string, string]> = {
    AL:   ['var(--color-bull)', 'var(--color-bull-dim)'],
    TUTE: ['var(--color-warning)', 'rgba(245,158,11,0.15)'],
    SAT:  ['var(--color-bear)', 'var(--color-bear-dim)'],
  };
  const [fg, bg] = colors[rating] ?? colors.TUTE;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: bg, border: `1px solid ${fg}33` }}>
      <div className="text-center">
        <div className="font-bold text-lg" style={{ color: fg, fontFamily: 'var(--font-mono)' }}>{rating}</div>
        <div style={{ fontSize: 10, color: fg, opacity: 0.8 }}>sinyal</div>
      </div>
      <div className="flex-1">
        {/* Score gauge */}
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Teknik Skor</span>
          <span className="font-mono font-bold text-xs" style={{ color: fg }}>{score}/100</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: fg, borderRadius: 4, transition: 'width 0.8s ease' }} />
        </div>
      </div>
    </div>
  );
};

/* ── Key Metrics ────────────────────────────────────────────────── */
const KeyMetric = ({ label, value, subLabel }: { label: string; value: string; subLabel?: string }) => (
  <div
    className="p-3 rounded-lg"
    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
  >
    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{label}</div>
    <div className="font-mono font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    {subLabel && <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{subLabel}</div>}
  </div>
);

/* ── Analyst Target Bar ─────────────────────────────────────────── */
const AnalystTargetBar = ({
  low, median, high, current,
}: {
  low: number; median: number; high: number; current: number;
}) => {
  const range = high - low || 1;
  const currentPct = Math.min(100, Math.max(0, ((current - low) / range) * 100));
  const medianPct = ((median - low) / range) * 100;

  return (
    <div className="px-1">
      <div className="flex justify-between mb-1" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
        <span>${fmt(low)}</span>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Hedef: ${fmt(median)}</span>
        <span>${fmt(high)}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
        {/* Range fill */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--color-bear-dim), var(--color-bull-dim))', borderRadius: 4 }} />
        {/* Median marker */}
        <div style={{
          position: 'absolute', top: -2, width: 2, height: 10,
          background: 'var(--color-warning)', borderRadius: 2,
          left: `${medianPct}%`, transform: 'translateX(-50%)',
        }} />
        {/* Current price marker */}
        <div style={{
          position: 'absolute', top: -3, width: 10, height: 10,
          background: 'white', borderRadius: '50%', border: '2px solid var(--color-accent)',
          left: `${currentPct}%`, transform: 'translateX(-50%)',
          boxShadow: '0 0 6px rgba(99,102,241,0.6)',
          transition: 'left 0.5s ease',
        }} />
      </div>
      <div className="mt-1 text-right" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
        Mevcut: ${fmt(current)}
      </div>
    </div>
  );
};

/* ── Main Right Panel ───────────────────────────────────────────── */
export const RightPanel = ({ selectedSymbol, assets }: RightPanelProps) => {
  const [tab, setTab] = useState<'analysis' | 'news'>('analysis');
  const { data: liveData, loading } = useLivePrice(selectedSymbol);
  const { points } = useSparkline(selectedSymbol);

  const asset = assets.find((a) => a.symbol === selectedSymbol);
  const analystData = selectedSymbol ? getAnalystData(selectedSymbol, liveData?.price) : null;
  const news = selectedSymbol ? getMockNews(selectedSymbol) : [];

  const positive = liveData ? liveData.changePct >= 0 : true;
  const changeColor = positive ? 'var(--color-bull)' : 'var(--color-bear)';

  return (
    <div
      className="terminal-right"
      style={{ background: 'var(--color-bg-primary)', borderLeft: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {selectedSymbol && asset ? (
          <div className="animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-base" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedSymbol}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)', maxWidth: 180 }}>
                  {asset.name}
                </div>
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="skeleton rounded" style={{ width: 80, height: 20 }} />
                ) : (
                  <>
                    <div className="font-mono font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                      ${fmt(liveData?.price)}
                    </div>
                    <div className="font-mono text-xs font-semibold" style={{ color: changeColor }}>
                      {liveData ? (positive ? '▲' : '▼') : ''} {fmt(liveData?.changePct)}%
                    </div>
                    {liveData?.timestamp && (
                      <div className="text-[9px] mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(liveData.timestamp).toLocaleDateString('tr-TR')} {new Date(liveData.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Mini sparkline in header */}
            {points.length > 1 && (
              <div className="mt-2">
                {(() => {
                  const W = 260, H = 32;
                  const min = Math.min(...points), max = Math.max(...points);
                  const range = max - min || 1;
                  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
                  const ys = points.map((p) => H - ((p - min) / range) * H);
                  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
                  const fillD = `${d} L${W},${H} L0,${H} Z`;
                  const color = positive ? 'var(--color-bull)' : 'var(--color-bear)';
                  return (
                    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="hdr-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={fillD} fill="url(#hdr-grad)" />
                      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Analiz Paneli</div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Bir varlık seçin
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {(['analysis', 'news'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-xs font-semibold transition-colors"
            style={{
              color: tab === t ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
              background: 'transparent',
              marginBottom: -1,
            }}
          >
            {t === 'analysis' ? '📊 Detaylı Analiz' : '📰 Haberler'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!selectedSymbol ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}
          >
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ opacity: 0.2 }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Varlık Seçilmedi
              </div>
              <div className="text-xs">Sol tablodaki bir satıra tıklayarak detaylı analiz görüntüleyin.</div>
            </div>
          </div>
        ) : tab === 'analysis' ? (
          <div className="space-y-4 animate-fade-in">
            {/* Signal card */}
            {analystData && <SignalBadge rating={analystData.rating} score={analystData.score} />}

            {/* Key metrics */}
            <div>
              <div className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>
                Temel Veriler
              </div>
              <div className="grid grid-cols-2 gap-2">
                <KeyMetric label="Son Fiyat" value={`$${fmt(liveData?.price)}`} subLabel="USD" />
                <KeyMetric label="Günlük Aralık" value={`$${fmt(liveData?.low)} – $${fmt(liveData?.high)}`} />
                <KeyMetric label="Açılış" value={`$${fmt(liveData?.open)}`} />
                <KeyMetric label="Hacim" value={fmtVol(liveData?.volume)} subLabel="paylaşım" />
              </div>
            </div>

            {/* Financial summary bars */}
            <div>
              <div className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>
                Finansal Özet <span style={{ fontSize: 9, textTransform: 'none', color: 'var(--color-text-muted)' }}>(Mock)</span>
              </div>
              <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                {[
                  { label: 'Gelir', value: liveData ? liveData.volume * liveData.price * 0.00012 : 0, max: liveData ? liveData.volume * liveData.price * 0.0002 : 100, color: 'var(--color-accent)' },
                  { label: 'Net Kar', value: liveData ? liveData.volume * liveData.price * 0.000028 : 0, max: liveData ? liveData.volume * liveData.price * 0.00008 : 100, color: 'var(--color-bull)' },
                  { label: 'Borç/Özsermaye', value: 35 + (selectedSymbol.charCodeAt(0) % 45), max: 100, color: 'var(--color-warning)' },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{m.label}</span>
                      <span className="font-mono" style={{ fontSize: 10, color: m.color }}>
                        {m.label === 'Borç/Özsermaye' ? `${m.value.toFixed(1)}%` : `$${fmtVol(m.value)}`}
                      </span>
                    </div>
                    <MiniBar value={m.value} max={m.max} color={m.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Analyst target */}
            {analystData && liveData && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>
                    Analist Fiyat Hedefi <span style={{ fontSize: 9, textTransform: 'none', color: 'var(--color-text-muted)' }}>(Mock)</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {analystData.analystCount} analist
                  </span>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                  <AnalystTargetBar
                    low={analystData.low}
                    median={analystData.median}
                    high={analystData.high}
                    current={liveData.price}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* News tab */
          <div className="space-y-2 animate-fade-in">
            <div className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedSymbol} için son haberler
            </div>
            {news.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg cursor-pointer transition-colors"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              >
                <div className="text-xs font-medium mb-2 leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {item.title}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)', fontSize: 9 }}
                  >
                    {item.source}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.ago}</span>
                </div>
              </div>
            ))}
            <div
              className="text-center py-2 rounded-lg"
              style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
              Gerçek zamanlı haber akışı için API entegrasyonu gereklidir
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
