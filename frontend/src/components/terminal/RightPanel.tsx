import { useState } from 'react';
import type { Asset } from '../../api/types';
import { useLivePrice } from '../../hooks/useLivePrice';
import { useSparkline } from '../../hooks/useSparkline';
import { useAgentAnalysis } from '../../hooks/useAgentAnalysis';
import { AgentInsightsPanel } from './AgentInsightsPanel';

interface RightPanelProps {
  selectedSymbol: string | null;
  assets: Asset[];
}

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

export const RightPanel = ({ selectedSymbol, assets }: RightPanelProps) => {
  const [tab, setTab] = useState<'analysis' | 'agents'>('analysis');
  const { data: liveData, loading } = useLivePrice(selectedSymbol);
  const { points } = useSparkline(selectedSymbol);
  const {
    data: agentData,
    loading: agentLoading,
    error: agentError,
    invalidateAndRefetch,
  } = useAgentAnalysis(tab === 'agents' ? selectedSymbol : null);

  const asset = assets.find((a) => a.symbol === selectedSymbol);
  const positive = liveData ? liveData.changePct >= 0 : true;
  const changeColor = positive ? 'var(--color-bull)' : 'var(--color-bear)';

  return (
    <div
      className="terminal-right"
      style={{ background: 'var(--color-bg-primary)', borderLeft: '1px solid var(--color-border)' }}
    >
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                  </>
                )}
              </div>
            </div>
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
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Bir varlık seçin</div>
          </div>
        )}
      </div>

      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {(['analysis', 'agents'] as const).map((t) => (
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
            {t === 'analysis' ? '📊 Piyasa' : '🤖 Agent Insights'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!selectedSymbol ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}
          >
            <div className="text-xs">Sol tablodaki bir satıra tıklayarak analiz görüntüleyin.</div>
          </div>
        ) : tab === 'analysis' ? (
          <div className="space-y-4 animate-fade-in">
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
          </div>
        ) : (
          <AgentInsightsPanel
            data={agentData}
            loading={agentLoading}
            error={agentError}
            onInvalidate={invalidateAndRefetch}
          />
        )}
      </div>
    </div>
  );
};
