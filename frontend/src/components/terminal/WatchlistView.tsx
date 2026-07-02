import { useState, useEffect } from 'react';
import { useWatchlists } from '../../hooks/useWatchlists';
import { useLivePrice } from '../../hooks/useLivePrice';
import { useAgentAnalysis } from '../../hooks/useAgentAnalysis';
import { useAnalystRatings } from '../../hooks/useAnalystRatings';
import { useTechnicalAnalysis } from '../../hooks/useTechnicalAnalysis';
import { fetchNews } from '../../api/client';
import type { NewsItem, TechnicalResult } from '../../api/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtCurrency = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtPct = (v: number | null | undefined): string =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtNum = (v: number | null | undefined, dec = 2): string =>
  v == null ? '—' : v.toFixed(dec);

type WatchlistTab = 'overview' | 'technical' | 'analyst' | 'news' | 'ai';

// ─── Watchlist Ticker Row ─────────────────────────────────────────────────────
const WatchlistTickerRow = ({
  symbol,
  selected,
  onSelect,
  onRemove,
}: {
  symbol: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) => {
  const { data, loading } = useLivePrice(symbol);
  const positive = (data?.changePct ?? 0) >= 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const price = (data as any)?.price ?? null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all rounded-lg mx-1 mb-0.5 group`}
      style={{
        background: selected ? 'var(--color-accent-dim)' : 'transparent',
        borderLeft: selected ? '2px solid var(--color-accent)' : '2px solid transparent',
      }}
      onClick={onSelect}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-bold text-xs" style={{ color: selected ? 'var(--color-accent-light)' : 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
          {symbol}
        </div>
        {loading ? (
          <div className="skeleton h-2.5 w-14 rounded mt-0.5" />
        ) : price != null ? (
          <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {fmtCurrency(price)}
          </div>
        ) : null}
      </div>
      {data && !loading && (
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: positive ? 'var(--color-bull)' : 'var(--color-bear)' }}
        >
          {fmtPct(data.changePct)}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
        title="Remove"
      >
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

// ─── Ratio Grid ───────────────────────────────────────────────────────────────
const RatioCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
    <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
  </div>
);

// ─── Technical Tab ────────────────────────────────────────────────────────────
const TechnicalTab = ({ symbol }: { symbol: string }) => {
  const { data, loading } = useTechnicalAnalysis(symbol);
  const techData = data as TechnicalResult | null;

  if (loading) return <div className="p-6 flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>;
  if (!techData) return <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No technical data</div>;

  const signalColor = techData.signalAction === 'BUY' ? 'var(--color-bull)' : techData.signalAction === 'SELL' ? 'var(--color-bear)' : 'var(--color-warning)';

  return (
    <div className="p-4 space-y-4">
      {/* Signal */}
      {techData.signalAction && (
        <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Signal</div>
            <div className="font-bold text-sm mt-0.5" style={{ color: signalColor }}>{techData.signalAction}</div>
          </div>
          {techData.signalConfidence != null && (
            <div className="text-right">
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Confidence</div>
              <div className="font-mono font-bold text-sm mt-0.5" style={{ color: signalColor }}>
                {(techData.signalConfidence * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <RatioCard label="RSI (14)" value={fmtNum(techData.rsi)} />
        <RatioCard label="MACD" value={fmtNum(techData.macd)} />
        <RatioCard label="MACD Signal" value={fmtNum(techData.macdSignal)} />
        <RatioCard label="ATR" value={fmtNum(techData.atr)} />
        <RatioCard label="SMA" value={fmtCurrency(techData.sma)} />
        <RatioCard label="EMA" value={fmtCurrency(techData.ema)} />
        <RatioCard label="BB Upper" value={fmtCurrency(techData.bbUpper)} />
        <RatioCard label="BB Lower" value={fmtCurrency(techData.bbLower)} />
      </div>
    </div>
  );
};

// ─── Analyst Tab ─────────────────────────────────────────────────────────────
const AnalystTab = ({ symbol }: { symbol: string }) => {
  const { data: analystData, loading } = useAnalystRatings(symbol);
  const recommendations = analystData?.recommendations;
  const priceTarget = analystData?.priceTarget;

  if (loading) return <div className="p-6 flex flex-col gap-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Price Target */}
      {priceTarget && (
        <div className="p-4 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Price Target</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Low</div>
              <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-bear)' }}>{fmtCurrency(priceTarget.targetLow)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mean</div>
              <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(priceTarget.targetMean)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>High</div>
              <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-bull)' }}>{fmtCurrency(priceTarget.targetHigh)}</div>
            </div>
          </div>
          {priceTarget.numberOfAnalysts && (
            <div className="text-center text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Based on {priceTarget.numberOfAnalysts} analyst{priceTarget.numberOfAnalysts !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>Recommendations</div>
          {recommendations.slice(0, 4).map((rec, i) => {
            const total = (rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell) || 1;
            const buyPct = ((rec.strongBuy + rec.buy) / total) * 100;
            return (
              <div key={i} className="mb-3 p-3 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{rec.period}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: buyPct > 60 ? 'var(--color-bull)' : buyPct < 40 ? 'var(--color-bear)' : 'var(--color-warning)' }}>
                    {buyPct.toFixed(0)}% Buy
                  </span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                  {[
                    { v: rec.strongBuy, c: '#22c55e' },
                    { v: rec.buy, c: '#4edea3' },
                    { v: rec.hold, c: '#f59e0b' },
                    { v: rec.sell, c: '#f87171' },
                    { v: rec.strongSell, c: '#ff5451' },
                  ].map((seg, si) => (
                    <div key={si} style={{ flex: seg.v / total, background: seg.c, opacity: 0.85 }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>SB:{rec.strongBuy}</span>
                  <span>B:{rec.buy}</span>
                  <span>H:{rec.hold}</span>
                  <span>S:{rec.sell}</span>
                  <span>SS:{rec.strongSell}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── News Tab ─────────────────────────────────────────────────────────────────
const NewsTab = ({ symbol }: { symbol: string }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetchNews(symbol)
      .then(d => setNews(d || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="p-6 flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded" />)}</div>;
  if (news.length === 0) return <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No recent news</div>;

  return (
    <div className="p-4 space-y-3">
      {news.slice(0, 15).map(item => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border transition-colors"
          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--color-accent-light)' }}>
            {item.source} · {new Date(item.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="font-semibold text-xs leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            {item.headline}
          </div>
          {item.summary && (
            <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{item.summary}</div>
          )}
        </a>
      ))}
    </div>
  );
};

// ─── AI Summary Tab ───────────────────────────────────────────────────────────
const AISummaryTab = ({ symbol }: { symbol: string }) => {
  const { data: analysis, loading, error, refetch: trigger } = useAgentAnalysis(symbol);
  const lastFetched = analysis?.generated_at ? new Date(analysis.generated_at).toLocaleTimeString() : null;

  return (
    <div className="p-4">
      {!analysis && !loading && (
        <div className="text-center py-8">
          <svg width="40" height="40" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.2" viewBox="0 0 24 24" className="mx-auto mb-3">
            <path d="M12 3v3M12 18v3M4.6 5.6l2.1 2.1M17.3 16.3l2.1 2.1M3 12h3M18 12h3" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>AI Analysis</div>
          <div className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Generate an AI-powered multi-agent analysis for {symbol}
          </div>
          <button
            onClick={trigger}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)', border: '1px solid rgba(77,142,255,0.3)' }}
          >
            Generate Analysis
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent)' }} />
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Running multi-agent analysis...</div>
        </div>
      )}

      {error && (
        <div className="text-xs p-3 rounded-lg mb-3" style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)' }}>
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>AI Report</div>
            <div className="flex items-center gap-2">
              {lastFetched && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lastFetched}</span>}
              <button
                onClick={trigger}
                className="text-xs px-2.5 py-1 rounded transition-all"
                style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}
              >
                Regenerate
              </button>
            </div>
          </div>

          {/* Decision */}
          {analysis.decision && (
            <div className="p-3 rounded-xl border" style={{
              background: analysis.decision === 'BUY' ? 'var(--color-bull-dim)' : analysis.decision === 'SELL' ? 'var(--color-bear-dim)' : 'rgba(245,158,11,0.1)',
              borderColor: analysis.decision === 'BUY' ? 'rgba(78,222,163,0.3)' : analysis.decision === 'SELL' ? 'rgba(255,84,81,0.3)' : 'rgba(245,158,11,0.3)',
            }}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Decision</div>
              <div className="font-bold text-sm" style={{
                color: analysis.decision === 'BUY' ? 'var(--color-bull)' : analysis.decision === 'SELL' ? 'var(--color-bear)' : 'var(--color-warning)',
              }}>
                {analysis.decision}
                {analysis.confidence != null && ` — ${(analysis.confidence * 100).toFixed(0)}% confidence`}
              </div>
            </div>
          )}

          {/* Portfolio Manager Reasoning */}
          {analysis.portfolio_manager_reasoning && (
            <div className="text-xs leading-relaxed p-3 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              {analysis.portfolio_manager_reasoning}
            </div>
          )}

          {/* Bull / Bear */}
          {(analysis.bull_case || analysis.bear_case) && (
            <div className="grid grid-cols-1 gap-2">
              {analysis.bull_case && (
                <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bull-dim)', borderColor: 'rgba(78,222,163,0.2)' }}>
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-bull)' }}>🟢 Bull Case</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{analysis.bull_case}</div>
                </div>
              )}
              {analysis.bear_case && (
                <div className="p-3 rounded-xl border" style={{ background: 'var(--color-bear-dim)', borderColor: 'rgba(255,84,81,0.2)' }}>
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-bear)' }}>🔴 Bear Case</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{analysis.bear_case}</div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────
const SymbolDetailPanel = ({ symbol }: { symbol: string }) => {
  const { data: liveData } = useLivePrice(symbol);
  const [activeTab, setActiveTab] = useState<WatchlistTab>('overview');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveAny = liveData as any;

  const TABS: { id: WatchlistTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'technical', label: 'Technical' },
    { id: 'analyst', label: 'Analyst' },
    { id: 'news', label: 'News' },
    { id: 'ai', label: 'AI Summary' },
  ];

  const positive = (liveAny?.changePct ?? 0) >= 0;

  return (
    <div className="flex flex-col h-full">
      {/* Symbol header */}
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-bold text-xl" style={{ color: 'var(--color-accent-light)', fontFamily: 'var(--font-mono)' }}>
              {symbol}
            </div>
          </div>
          {liveAny && (
            <div className="text-right">
              <div className="font-mono font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
                {fmtCurrency(liveAny.price)}
              </div>
              <div
                className="font-mono text-sm font-semibold"
                style={{ color: positive ? 'var(--color-bull)' : 'var(--color-bear)' }}
              >
                {positive ? '▲' : '▼'} {fmtPct(liveAny.changePct)}
              </div>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 mt-3 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? 'var(--color-accent-dim)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                border: activeTab === tab.id ? '1px solid rgba(77,142,255,0.3)' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-3">
            {liveAny && (
              <div className="grid grid-cols-2 gap-2">
                <RatioCard label="Last Price" value={fmtCurrency(liveAny.price)} />
                <RatioCard label="Daily Change" value={fmtPct(liveAny.changePct)} />
                {liveAny.volume != null && <RatioCard label="Volume" value={Number(liveAny.volume).toLocaleString()} />}
              </div>
            )}
            <div className="text-xs p-3 rounded-xl border text-center" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              Switch to Technical, Analyst, or AI tabs for deep analysis
            </div>
          </div>
        )}
        {activeTab === 'technical' && <TechnicalTab symbol={symbol} />}
        {activeTab === 'analyst' && <AnalystTab symbol={symbol} />}
        {activeTab === 'news' && <NewsTab symbol={symbol} />}
        {activeTab === 'ai' && <AISummaryTab symbol={symbol} />}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const WatchlistView = () => {
  const { watchlists, loading, error, createList, addSymbol, removeSymbol, removeList } = useWatchlists();

  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [addSymbolInput, setAddSymbolInput] = useState('');
  const [showCreateList, setShowCreateList] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-select first watchlist
  useEffect(() => {
    if (watchlists.length > 0 && activeWatchlistId === null) {
      setActiveWatchlistId(watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId]);

  const activeWatchlist = watchlists.find(wl => wl.id === activeWatchlistId);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const wl = await createList(newListName.trim());
      setActiveWatchlistId(wl.id);
      setNewListName('');
      setShowCreateList(false);
    } finally {
      setCreating(false);
    }
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSymbolInput.trim() || !activeWatchlistId) return;
    await addSymbol(activeWatchlistId, addSymbolInput.trim().toUpperCase());
    setAddSymbolInput('');
  };

  return (
    <div className="terminal-main flex animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ── Left: Watchlist selector + symbols ── */}
      <div
        className="w-64 shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}
      >
        {/* Watchlist tabs */}
        <div className="border-b px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Watchlists</div>
            <button
              onClick={() => setShowCreateList(v => !v)}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              title="New Watchlist"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent-light)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {showCreateList && (
            <div className="flex gap-1 mb-2">
              <input
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateList()}
                placeholder="List name..."
                className="flex-1 text-xs px-2 py-1.5 rounded outline-none"
                style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-accent)', color: 'var(--color-text-primary)' }}
                autoFocus
              />
              <button
                onClick={handleCreateList}
                disabled={creating}
                className="px-2 py-1.5 rounded text-xs font-bold"
                style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}
              >
                +
              </button>
            </div>
          )}

          {loading && <div className="skeleton h-6 rounded mb-1" />}
          {error && <div className="text-xs" style={{ color: 'var(--color-bear)' }}>Failed to load</div>}

          <div className="space-y-0.5">
            {watchlists.map(wl => (
              <div
                key={wl.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all group"
                style={{
                  background: activeWatchlistId === wl.id ? 'var(--color-accent-dim)' : 'transparent',
                  color: activeWatchlistId === wl.id ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                }}
                onClick={() => { setActiveWatchlistId(wl.id); setSelectedSymbol(null); }}
                onMouseEnter={e => { if (activeWatchlistId !== wl.id) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                onMouseLeave={e => { if (activeWatchlistId !== wl.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="text-xs font-semibold truncate">{wl.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{wl.symbols.length}</span>
                  <button
                    onClick={async e => { e.stopPropagation(); await removeList(wl.id); if (activeWatchlistId === wl.id) setActiveWatchlistId(null); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Symbol list */}
        <div className="flex-1 overflow-y-auto">
          {activeWatchlist && activeWatchlist.symbols.length === 0 && (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No symbols yet. Add one below.
            </div>
          )}
          {activeWatchlist?.symbols.map(sym => (
            <WatchlistTickerRow
              key={sym}
              symbol={sym}
              selected={selectedSymbol === sym}
              onSelect={() => setSelectedSymbol(prev => prev === sym ? null : sym)}
              onRemove={async () => {
                await removeSymbol(activeWatchlistId!, sym);
                if (selectedSymbol === sym) setSelectedSymbol(null);
              }}
            />
          ))}
        </div>

        {/* Add symbol input */}
        {activeWatchlistId && (
          <form
            onSubmit={handleAddSymbol}
            className="border-t p-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex gap-1.5">
              <input
                value={addSymbolInput}
                onChange={e => setAddSymbolInput(e.target.value.toUpperCase())}
                placeholder="Add ticker..."
                className="flex-1 text-xs px-2 py-1.5 rounded outline-none"
                style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                maxLength={10}
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded text-xs font-bold transition-all"
                style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}
              >
                +
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Right: Detail Panel ── */}
      <div className="flex-1 overflow-hidden">
        {selectedSymbol ? (
          <SymbolDetailPanel symbol={selectedSymbol} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mb-3 opacity-40">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {activeWatchlist ? `${activeWatchlist.name}` : 'Select a Watchlist'}
            </div>
            <div className="text-xs">
              {activeWatchlist
                ? 'Click a ticker to view detailed analysis'
                : 'Create or select a watchlist to get started'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
