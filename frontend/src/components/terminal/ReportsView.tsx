import { useEffect, useRef, useState } from 'react';
import type { Asset } from '../../api/types';
import { useCompanyReport } from '../../hooks/useCompanyReport';
import { LastUpdated } from '../shared/LastUpdated';
import { SmartReportPanel } from '../report/SmartReportPanel';
import { SmartReportChat } from '../report/SmartReportChat';
import { BacktestPanel } from '../report/BacktestPanel';

interface ReportsViewProps {
  assets: Asset[];
  initialSymbol?: string | null;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>{children}</div>
    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
  </div>
);

const MetricCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
    <div className="font-mono font-bold text-sm" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
  </div>
);

// Isolated error boundary pattern — errors don't crash the parent
const SafeSmartReport = ({ symbol }: { symbol: string }) => {
  try {
    return <SmartReportPanel symbol={symbol} />;
  } catch {
    return (
      <div className="p-4 rounded-xl text-sm border" style={{ background: 'rgba(255,77,109,0.06)', borderColor: 'rgba(255,77,109,0.2)', color: 'var(--color-bear)' }}>
        ⚠️ Akıllı rapor yüklenemedi. Data-service (port 8000) çalışıyor mu?
      </div>
    );
  }
};

export const ReportsView = ({ assets, initialSymbol }: ReportsViewProps) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol ?? assets[0]?.symbol ?? '');

  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
      return;
    }

    if (!selectedSymbol && assets[0]?.symbol) {
      setSelectedSymbol(assets[0].symbol);
    }
  }, [assets, initialSymbol, selectedSymbol]);

  const { report, loading, error, lastFetched, refetch } = useCompanyReport(selectedSymbol || null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = () => { window.print(); };

  const fmt = (v: unknown, prefix = '', suffix = '', dec = 2) => {
    if (v == null) return '—';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(1)}T${suffix}`;
    if (Math.abs(n) >= 1e9) return `${prefix}${(n / 1e9).toFixed(1)}B${suffix}`;
    if (Math.abs(n) >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M${suffix}`;
    return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${suffix}`;
  };

  return (
    <div className="terminal-main flex overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* LEFT: Company list */}
      <div className="w-48 shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
        <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Şirketler</div>
        {assets.length === 0 && (
          <div className="px-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>Watchlist boş</div>
        )}
        {assets.map(a => (
          <button
            key={a.symbol}
            onClick={() => setSelectedSymbol(a.symbol)}
            className="w-full text-left px-3 py-2.5 transition-all cursor-pointer"
            style={{
              background: selectedSymbol === a.symbol ? 'var(--color-bg-selected)' : 'transparent',
              borderLeft: selectedSymbol === a.symbol ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: selectedSymbol === a.symbol ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <div className="font-mono font-bold text-xs">{a.symbol}</div>
            <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{a.name}</div>
          </button>
        ))}
      </div>

      {/* RIGHT: Report content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedSymbol ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-muted)' }}>
            <div className="text-4xl">📋</div>
            <div className="text-sm">Sol listeden bir şirket seçin.</div>
          </div>
        ) : (
          <div className="p-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedSymbol} Şirket Raporu
                </h2>
                <LastUpdated timestamp={lastFetched} onRefresh={refetch} loading={loading} />
              </div>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                📄 PDF İndir
              </button>
            </div>

            {/* Smart Report — always shown, errors isolated inside component */}
            <div className="mb-8">
              <SectionTitle>🌟 Akıllı Analiz Karnesi</SectionTitle>
              <SafeSmartReport symbol={selectedSymbol} />
            </div>

            {/* Backtest Panel */}
            <div className="mb-8">
              <SectionTitle>⏳ Geçmişe Dönük Analiz</SectionTitle>
              <BacktestPanel symbol={selectedSymbol} />
            </div>

            {/* Loading for company report */}
            {loading && (
              <div className="space-y-4">
                {[90, 120, 100, 150].map((h, i) => <div key={i} className="skeleton rounded-xl" style={{ height: h }} />)}
              </div>
            )}

            {/* Non-critical error — shows warning but page still works */}
            {error && !loading && (
              <div className="p-4 rounded-xl text-sm mb-6 border" style={{ background: 'rgba(255,183,77,0.06)', borderColor: 'rgba(255,183,77,0.2)', color: 'var(--color-warning)' }}>
                ⚠️ Şirket verileri yüklenemedi: {error}
                <div className="text-[11px] mt-1 opacity-75">SmartReport ve Backtest yukarıda gösterilmektedir.</div>
              </div>
            )}

            {/* Company report sections */}
            {report && !loading && (
              <div ref={reportRef} className="space-y-6">

                {/* Technical overview */}
                {report.technical && (
                  <div>
                    <SectionTitle>📈 Teknik Görünüm</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard
                        label="RSI (14)"
                        value={report.technical.rsi != null
                          ? `${report.technical.rsi.toFixed(1)} ${report.technical.rsi > 70 ? '🔴' : report.technical.rsi < 30 ? '🟢' : '🟡'}`
                          : '—'}
                        color={report.technical.rsi != null
                          ? (report.technical.rsi > 70 ? 'var(--color-bear)' : report.technical.rsi < 30 ? 'var(--color-bull)' : undefined)
                          : undefined}
                      />
                      <MetricCard label="MACD" value={fmt(report.technical.macd)} />
                      <MetricCard
                        label="Sinyal"
                        value={report.technical.signalAction ?? '—'}
                        color={report.technical.signalAction === 'BUY'
                          ? 'var(--color-bull)'
                          : report.technical.signalAction === 'SELL'
                            ? 'var(--color-bear)'
                            : undefined}
                      />
                    </div>
                  </div>
                )}

                {/* Analyst consensus */}
                {(report.recommendations?.length ?? 0) > 0 && (() => {
                  const recommendations = report.recommendations ?? [];
                  const rec = recommendations[0];
                  const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
                  const bullish = rec.strongBuy + rec.buy;
                  const bearish = rec.sell + rec.strongSell;
                  const bullPct = total > 0 ? Math.round(bullish / total * 100) : 0;
                  const holdPct = total > 0 ? Math.round(rec.hold / total * 100) : 0;
                  const bearPct = total > 0 ? Math.round(bearish / total * 100) : 0;
                  return (
                    <div>
                      <SectionTitle>👥 Analist Konsensüsü</SectionTitle>
                      <div className="p-4 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                        <div className="flex gap-6 mb-3 text-sm">
                          <span style={{ color: 'var(--color-bull)' }}>AL: {bullish} ({bullPct}%)</span>
                          <span style={{ color: 'var(--color-warning)' }}>TUT: {rec.hold} ({holdPct}%)</span>
                          <span style={{ color: 'var(--color-bear)' }}>SAT: {bearish} ({bearPct}%)</span>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                          <div style={{ width: `${bullPct}%`, background: 'var(--color-bull)', borderRadius: 2 }} />
                          <div style={{ width: `${holdPct}%`, background: 'var(--color-warning)', borderRadius: 2 }} />
                          <div style={{ width: `${bearPct}%`, background: 'var(--color-bear)', borderRadius: 2 }} />
                        </div>
                        {report.priceTarget?.targetMean && (
                          <div className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Hedef Fiyat: <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              ${report.priceTarget.targetMean.toFixed(2)}
                            </span>
                            {' '}(${report.priceTarget.targetLow?.toFixed(2)} — ${report.priceTarget.targetHigh?.toFixed(2)})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Recent news */}
                {(report.recentNews?.length ?? 0) > 0 && (
                  <div>
                    <SectionTitle>📰 Son Haberler</SectionTitle>
                    <div className="space-y-2">
                      {(report.recentNews ?? []).map((item, i) => (
                        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                          className="block p-3 rounded-xl border transition-colors cursor-pointer hover:opacity-80"
                          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                          <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            {item.source} · {new Date(item.datetime * 1000).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RAG Chat Widget */}
      {selectedSymbol && <SmartReportChat symbol={selectedSymbol} />}
    </div>
  );
};
