import { useEffect, useState, useCallback } from 'react';
import type { Asset } from '../../api/types';
import { usePortfolioPositions } from '../../hooks/usePortfolioPositions';
import { useLivePrice } from '../../hooks/useLivePrice';
import { fetchNews, fetchPriceHistory } from '../../api/client';
import type { NewsItem } from '../../api/client';

interface HomeViewProps {
  assets: Asset[];
  loading: boolean;
  onSelectAsset: (sym: string) => void;
  onOpenChart: (sym: string) => void;
}

const fmtPrice = (n: number | null) =>
  n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (n: number | null) =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

// ── Mini sparkline for positions ─────────────────────────────────────────────
const MiniSparkline = ({ symbol, positive }: { symbol: string; positive: boolean }) => {
  const [pts, setPts] = useState<number[]>([]);
  useEffect(() => {
    fetchPriceHistory(symbol, '1d', '1mo')
      .then(bars => setPts(bars.map((b: { close: number }) => b.close)))
      .catch(() => {});
  }, [symbol]);

  if (pts.length < 2) return <div style={{ width: 60, height: 24 }} />;
  const W = 60, H = 24;
  const min = Math.min(...pts), max = Math.max(...pts);
  const r = max - min || 1;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map(p => H - ((p - min) / r) * H);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const fill = `${d} L${W},${H} L0,${H} Z`;
  const color = positive ? '#4edea3' : '#ff4d6d';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`hv-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#hv-${symbol})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ── Position card row ─────────────────────────────────────────────────────────
const PositionRow = ({ position, onClick }: { position: { id: number; symbol: string; quantity: number; avgCostPrice: number; openedAt: string }; onClick: () => void }) => {
  const { data: live } = useLivePrice(position.symbol);
  const cost = position.quantity * position.avgCostPrice;
  const value = live?.price != null ? position.quantity * live.price : null;
  const pnl = value != null ? value - cost : null;
  const pnlPct = pnl != null && cost > 0 ? (pnl / cost) * 100 : null;
  const positive = (pnlPct ?? 0) >= 0;

  return (
    <tr
      className="cursor-pointer transition-colors"
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      <td className="py-2.5 px-4">
        <div className="font-mono font-bold text-xs" style={{ color: 'var(--color-text-primary)' }}>{position.symbol}</div>
        <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{position.quantity} adet</div>
      </td>
      <td className="py-2.5 px-4 text-right">
        <div className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {live?.price != null ? fmtPrice(live.price) : <span className="skeleton inline-block w-14 h-3 rounded" />}
        </div>
        <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>alış: {fmtPrice(position.avgCostPrice)}</div>
      </td>
      <td className="py-2.5 px-4 text-right">
        {pnl != null ? (
          <>
            <div className="font-mono text-xs font-bold" style={{ color: positive ? '#4edea3' : '#ff4d6d' }}>
              {pnl >= 0 ? '+' : ''}{fmtPrice(pnl)}
            </div>
            <div className="font-mono text-[9px]" style={{ color: positive ? '#4edea3' : '#ff4d6d' }}>
              {fmtPct(pnlPct)}
            </div>
          </>
        ) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
      </td>
      <td className="py-2.5 px-4">
        <MiniSparkline symbol={position.symbol} positive={positive} />
      </td>
    </tr>
  );
};

// ── Watchlist mini row ────────────────────────────────────────────────────────
const WatchRow = ({ asset, onClick, onChart }: { asset: Asset; onClick: () => void; onChart: () => void }) => {
  const { data: live } = useLivePrice(asset.symbol);
  const positive = (live?.changePct ?? 0) >= 0;
  return (
    <div
      className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors rounded-lg"
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      <div>
        <div className="font-mono font-bold text-xs" style={{ color: 'var(--color-text-primary)' }}>{asset.symbol}</div>
        <div className="text-[9px] truncate max-w-24" style={{ color: 'var(--color-text-muted)' }}>{asset.name}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
          {live?.price != null ? `$${live.price.toFixed(2)}` : '—'}
        </div>
        {live?.changePct != null && (
          <div className="font-mono text-[9px] font-bold" style={{ color: positive ? '#4edea3' : '#ff4d6d' }}>
            {positive ? '▲' : '▼'}{Math.abs(live.changePct).toFixed(2)}%
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onChart(); }}
        className="ml-2 p-1 rounded cursor-pointer text-[9px]"
        style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-card)' }}
        title="Grafik Aç"
      >
        📈
      </button>
    </div>
  );
};

// ── Home View ─────────────────────────────────────────────────────────────────
export const HomeView = ({ assets, onSelectAsset, onOpenChart }: HomeViewProps) => {
  const { positions } = usePortfolioPositions();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Portfolio summary via live prices
  const portfolioSymbols = [...new Set(positions.map(p => p.symbol))];

  // Load portfolio news
  const loadNews = useCallback(async () => {
    const syms = [...new Set([...portfolioSymbols, ...assets.slice(0, 3).map(a => a.symbol)])];
    if (syms.length === 0) return;
    setNewsLoading(true);
    try {
      const results = await Promise.allSettled(syms.slice(0, 5).map(s => fetchNews(s)));
      const all: NewsItem[] = [];
      results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
      const seen = new Set<string>();
      setNews(
        all
          .filter(n => { if (seen.has(n.headline)) return false; seen.add(n.headline); return true; })
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 12)
      );
    } catch { /* ignore */ }
    finally { setNewsLoading(false); }
  }, [portfolioSymbols.join(','), assets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadNews(); }, [loadNews]);

  return (
    <div className="terminal-main overflow-hidden" style={{ background: 'var(--color-bg-primary)', display: 'grid', gridTemplateColumns: '1fr 360px', gridTemplateRows: '1fr', gap: 0 }}>

      {/* LEFT: Portfolio positions + watchlist */}
      <div className="flex flex-col overflow-hidden border-r" style={{ borderColor: 'var(--color-border)' }}>
        {/* Portfolio summary header */}
        <PortfolioSummaryHeader positions={positions} />

        {/* Positions table */}
        {positions.length > 0 && (
          <div className="flex flex-col overflow-hidden" style={{ flex: positions.length > 0 ? '0 0 auto' : 0, maxHeight: '45%', borderBottom: '1px solid var(--color-border)' }}>
            <div className="px-4 py-2 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                📊 Portföy Pozisyonları ({positions.length})
              </span>
            </div>
            <div className="overflow-y-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Sembol', 'Fiyat', 'K / Z', 'Grafik'].map((h, i) => (
                      <th key={i} className="py-1.5 px-4 text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--color-text-muted)', textAlign: i === 0 ? 'left' : i === 3 ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => (
                    <PositionRow
                      key={pos.id}
                      position={pos}
                      onClick={() => onSelectAsset(pos.symbol)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Watchlist */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              👁️ İzleme Listesi ({assets.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <div className="text-2xl">📋</div>
                <div className="text-xs">Henüz hisse eklenmedi</div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {assets.map(a => (
                  <WatchRow
                    key={a.symbol}
                    asset={a}
                    onClick={() => onSelectAsset(a.symbol)}
                    onChart={() => onOpenChart(a.symbol)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: News */}
      <div className="flex flex-col overflow-hidden">
        <div className="px-4 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>📰 Haber Akışı</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Portföy & izleme listesi haberleri
            </div>
          </div>
          <button onClick={loadNews} className="text-xs px-2 py-1 rounded cursor-pointer" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-card)' }}>↻</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {newsLoading && [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton rounded-xl" style={{ height: 80 }} />
          ))}
          {!newsLoading && news.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-2xl">🗞️</div>
              <div className="text-xs text-center">Haber bulunamadı.<br />Portföye hisse ekleyin.</div>
            </div>
          )}
          {news.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg border transition-all"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,219,233,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
            >
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent-light)' }}>
                  {item.source}
                </span>
                {item.related && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(78,222,163,0.12)', color: '#4edea3' }}>
                    {item.related}
                  </span>
                )}
                <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(item.datetime * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                {item.headline}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Portfolio Summary Header ──────────────────────────────────────────────────
const PortfolioSummaryHeader = ({ positions }: { positions: Array<{ symbol: string; quantity: number; avgCostPrice: number }> }) => {
  // We need live prices for all positions — sum them up
  // Use a simple aggregation; each PositionRow also fetches live price
  const totalCost = positions.reduce((s, p) => s + p.quantity * p.avgCostPrice, 0);

  return (
    <div className="px-4 py-3 shrink-0 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Toplam Portföy Maliyeti
          </div>
          <div className="text-xl font-mono font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            {totalCost > 0 ? `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{positions.length} pozisyon</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};
