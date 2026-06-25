import React from 'react';
import { useSmartReport, type PeerComparison } from '../../hooks/useSmartReport';

interface SmartReportPanelProps {
  symbol: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const gradeColor = (score: number | null | undefined) => {
  if (score == null) return 'var(--color-text-muted)';
  if (score >= 75) return 'var(--color-bull)';
  if (score >= 50) return 'var(--color-warning)';
  return 'var(--color-bear)';
};

const gradeBg = (score: number | null | undefined) => {
  if (score == null) return 'rgba(255,255,255,0.04)';
  if (score >= 75) return 'var(--color-bull-dim)';
  if (score >= 50) return 'rgba(245,158,11,0.12)';
  return 'var(--color-bear-dim)';
};

const recLabel: Record<string, string> = {
  STRONG_BUY: 'Güçlü Al',
  BUY: 'Al',
  HOLD: 'Tut',
  SELL: 'Sat',
  STRONG_SELL: 'Güçlü Sat',
};

const fmt = (v: number | null | undefined, decimals = 2) =>
  v == null || isNaN(v) ? '—' : v.toFixed(decimals);

// ── Sub-components ────────────────────────────────────────────────────────────

const ScoreRing = ({ score, grade }: { score: number; grade: string }) => {
  const color = gradeColor(score);
  const bg = gradeBg(score);
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}60)`, transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono font-extrabold text-2xl" style={{ color }}>{score}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>/ 100</span>
        </div>
      </div>
      <div className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: bg, color }}>
        {grade} Notu
      </div>
    </div>
  );
};

const BreakdownBar = ({ label, score }: { label: string; score: number | null | undefined }) => {
  const color = gradeColor(score);
  const val = score ?? 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${val}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <div className="w-8 text-right font-mono text-xs font-bold" style={{ color }}>
        {score == null ? '—' : score}
      </div>
    </div>
  );
};

const DataNotice = ({ isFallback }: { isFallback: boolean }) => {
  if (!isFallback) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-warning)' }}>
      <span className="shrink-0 text-sm">⚠️</span>
      <div>
        <div className="font-bold mb-0.5">Kısmi Veri Modu</div>
        <div style={{ color: 'var(--color-text-secondary)' }}>
          FastAPI data-service erişilemedi. Skor yalnızca Finnhub temel metrikleri kullanılarak hesaplandı.
          Tam analiz için <code className="text-[10px] px-1 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>data-service</code> (port 8000) çalıştırın.
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const SmartReportPanel: React.FC<SmartReportPanelProps> = ({ symbol }) => {
  const { report, loading, error } = useSmartReport(symbol);

  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <div className="skeleton rounded-full" style={{ width: 120, height: 120 }} />
          <div className="flex-1 space-y-3">
            <div className="skeleton rounded-xl" style={{ height: 32, width: '60%' }} />
            <div className="skeleton rounded-xl" style={{ height: 24, width: '40%' }} />
          </div>
        </div>
        <div className="skeleton rounded-2xl" style={{ height: 180 }} />
        <div className="skeleton rounded-2xl" style={{ height: 140 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Fallback Notice */}
        <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-warning)' }}>
          <span className="shrink-0 text-sm">⚠️</span>
          <div>
            <div className="font-bold mb-0.5">Kısmi Veri Modu (Fallback)</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              Akıllı analiz hizmetine ulaşılamıyor (data-service bağlı değil). Temel fiyat verileri kullanılıyor.
            </div>
          </div>
        </div>

        {/* Basic Fallback Info */}
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {symbol} — Temel Özet
          </div>
          <div className="text-xs space-y-2" style={{ color: 'var(--color-text-muted)' }}>
            <p>Akıllı analiz (AI notlandırması, hedef fiyatlar, büyüme ve risk skorları) şu anda hesaplanamıyor.</p>
            <p>Bunun yerine sağ paneldeki <b>Piyasa</b> ve <b>Teknik</b> sekmelerini kullanarak varlık durumunu inceleyebilirsiniz.</p>
          </div>
        </div>

        {/* Subtle Error Message at bottom */}
        <div className="text-[10px] opacity-60 font-mono mt-4" style={{ color: 'var(--color-bear)' }}>
          Hata detayı: {error}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { overallScore, grade, recommendation, breakdown, peers } = report;
  const recColor = gradeColor(overallScore);
  const recLabelText = recLabel[recommendation] ?? recommendation;
  const isFallback = breakdown.valuationScore == null && breakdown.growthScore == null;

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Score Header Card */}
      <div className="p-5 rounded-2xl border flex items-center gap-6" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <ScoreRing score={overallScore} grade={grade} />
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {symbol} — AI Analiz Puanı
          </div>
          <div className="font-extrabold text-2xl mb-2" style={{ color: recColor }}>
            {recLabelText}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Not', value: grade },
              { label: 'Puan', value: String(overallScore) },
            ].map(m => (
              <div key={m.label} className="px-3 py-1.5 rounded-xl text-center" style={{ background: gradeBg(overallScore), border: `1px solid ${recColor}30` }}>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{m.label}</div>
                <div className="font-mono font-extrabold text-base" style={{ color: recColor }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fallback Notice */}
      <DataNotice isFallback={isFallback} />

      {/* Score Breakdown */}
      <div className="p-4 rounded-2xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Skor Dağılımı
        </div>
        <div className="space-y-3">
          <BreakdownBar label="Temel" score={breakdown.fundamentalScore} />
          <BreakdownBar label="Değerleme" score={breakdown.valuationScore} />
          <BreakdownBar label="Kalite" score={breakdown.qualityScore} />
          <BreakdownBar label="Büyüme" score={breakdown.growthScore} />
          <BreakdownBar label="Momentum" score={breakdown.momentumScore} />
          <BreakdownBar label="Risk" score={breakdown.riskScore} />
          <BreakdownBar label="Kazanç" score={breakdown.earningsScore} />
          <BreakdownBar label="Sentiment" score={breakdown.sentimentScore} />
        </div>
      </div>

      {/* Peer Comparison */}
      {peers && peers.length > 0 && (
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Rakip Karşılaştırması
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Sembol', 'F/K', 'PD/DD', 'Borç/Öz', 'Net Kar %', 'ROE %'].map(h => (
                    <th key={h} className="pb-2 text-right font-bold text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', paddingRight: 8 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peers.map((peer: PeerComparison, i: number) => (
                  <tr
                    key={peer.symbol}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      background: i === 0 ? 'rgba(0,219,233,0.04)' : 'transparent',
                    }}
                  >
                    <td className="py-2 font-mono font-bold text-xs" style={{ color: i === 0 ? 'var(--color-accent-light)' : 'var(--color-text-primary)', paddingRight: 8 }}>
                      {peer.symbol}{i === 0 && <span className="ml-1 text-[8px] opacity-60">(hedef)</span>}
                    </td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)', paddingRight: 8 }}>{fmt(peer.peRatio, 1)}</td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)', paddingRight: 8 }}>{fmt(peer.pbRatio, 2)}</td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)', paddingRight: 8 }}>{fmt(peer.debtToEquity, 2)}</td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: peer.netProfitMargin != null && peer.netProfitMargin > 0 ? 'var(--color-bull)' : 'var(--color-bear)', paddingRight: 8 }}>
                      {peer.netProfitMargin != null ? (peer.netProfitMargin * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="py-2 text-right font-mono text-xs" style={{ color: peer.roe != null && peer.roe > 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                      {peer.roe != null ? (peer.roe).toFixed(1) + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
