import { useState, useEffect, useCallback } from 'react';
import { fetchAllNews, fetchNews } from '../../api/client';
import type { CategorizedNewsItem, NewsCategory, NewsPriority } from '../../api/client';

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES: { id: NewsCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All News' },
  { id: 'BREAKING', label: '🔴 Breaking' },
  { id: 'PORTFOLIO', label: 'Portfolio' },
  { id: 'WATCHLIST', label: 'Watchlist' },
  { id: 'ECONOMY', label: 'Economy' },
  { id: 'INFLATION', label: 'Inflation' },
  { id: 'INTEREST_RATES', label: 'Rate' },
  { id: 'CENTRAL_BANKS', label: 'Central Banks' },
  { id: 'AI', label: 'AI' },
  { id: 'TECHNOLOGY', label: 'Tech' },
  { id: 'DEFENSE', label: 'Defense' },
  { id: 'ENERGY', label: 'Energy' },
  { id: 'HEALTHCARE', label: 'Healthcare' },
];

const PRIORITY_COLORS: Record<NewsPriority, string> = {
  HIGH: 'var(--color-bear)',
  MEDIUM: 'var(--color-warning)',
  LOW: 'var(--color-text-muted)',
};

const SENTIMENT_COLORS = {
  BULLISH: 'var(--color-bull)',
  BEARISH: 'var(--color-bear)',
  NEUTRAL: 'var(--color-text-muted)',
};

// ─── News Card ────────────────────────────────────────────────────────────────
const NewsCard = ({ item }: { item: CategorizedNewsItem }) => {
  const priority = item.priority;
  const sentiment = item.sentiment;
  const date = new Date(item.datetime * 1000);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block animate-fade-in"
      style={{ textDecoration: 'none' }}
    >
      <div
        className="flex gap-3 px-4 py-3 border-b transition-colors"
        style={{ borderColor: 'var(--color-border-subtle)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Priority Bar */}
        {priority && (
          <div
            className="w-0.5 shrink-0 rounded-full"
            style={{ background: PRIORITY_COLORS[priority], minHeight: 40 }}
          />
        )}

        {/* Thumbnail */}
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="w-16 h-12 object-cover rounded-lg shrink-0"
            style={{ border: '1px solid var(--color-border)' }}
            onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-accent-light)' }}>
              {item.source}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {dateStr} · {timeStr}
            </span>
            {priority && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                style={{
                  background: `${PRIORITY_COLORS[priority]}22`,
                  color: PRIORITY_COLORS[priority],
                  fontSize: 9,
                }}
              >
                {priority}
              </span>
            )}
            {sentiment && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                style={{
                  background: `${SENTIMENT_COLORS[sentiment]}22`,
                  color: SENTIMENT_COLORS[sentiment],
                  fontSize: 9,
                }}
              >
                {sentiment}
              </span>
            )}
            {item.relatedSymbols && item.relatedSymbols.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {item.relatedSymbols.slice(0, 3).map(sym => (
                  <span
                    key={sym}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                  >
                    {sym}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Headline */}
          <div className="font-semibold text-xs leading-snug mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {item.headline}
          </div>

          {/* Summary */}
          {item.summary && (
            <div className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {item.summary}
            </div>
          )}
        </div>
      </div>
    </a>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const NewsView = ({ symbol }: { symbol: string | null }) => {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [news, setNews] = useState<CategorizedNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try the categorized endpoint first; fall back to symbol-specific or general
      try {
        const resp = await fetchAllNews(
          activeCategory !== 'ALL' ? activeCategory : undefined,
          0,
          40,
          symbol ? [symbol] : undefined
        );
        setNews(resp.content ?? []);
        setTotal(resp.totalElements ?? 0);
      } catch {
        // Fallback: use the existing symbol-specific endpoint
        if (symbol) {
          const items = await fetchNews(symbol);
          setNews(items as CategorizedNewsItem[]);
          setTotal(items.length);
        } else {
          setNews([]);
          setTotal(0);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, symbol]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? news.filter(n =>
        n.headline.toLowerCase().includes(search.toLowerCase()) ||
        n.source.toLowerCase().includes(search.toLowerCase()) ||
        (n.summary || '').toLowerCase().includes(search.toLowerCase())
      )
    : news;

  return (
    <div className="terminal-main flex flex-col animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>News Hub</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {total > 0 ? `${total} stories` : 'Market intelligence feed'}
            {symbol ? ` · ${symbol}` : ''}
          </div>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-card)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Refresh"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Category Filter Bar ── */}
      <div
        className="px-4 py-2 border-b flex items-center gap-1 overflow-x-auto"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as NewsCategory | 'ALL')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0"
            style={{
              background: activeCategory === cat.id ? 'var(--color-accent-dim)' : 'transparent',
              color: activeCategory === cat.id ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              border: activeCategory === cat.id ? '1px solid rgba(77,142,255,0.25)' : '1px solid transparent',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="flex items-center gap-2 rounded-lg px-3 h-8 max-w-sm"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <svg width="12" height="12" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search headlines..."
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--color-text-muted)' }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── News Feed ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-3 px-1 py-2">
                <div className="skeleton w-16 h-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-2.5 rounded w-1/3" />
                  <div className="skeleton h-4 rounded" />
                  <div className="skeleton h-3 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-bear)' }}>Failed to load news</div>
            <div className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg width="40" height="40" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.2" viewBox="0 0 24 24" className="mx-auto mb-3">
              <path d="M4 19V5h14a2 2 0 012 2v12H4z" strokeLinecap="round" />
              <path d="M8 9h8M8 13h6M4 19a2 2 0 01-2-2v-7" strokeLinecap="round" />
            </svg>
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>No stories found</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {!symbol && activeCategory === 'ALL'
                ? 'Select a symbol in the top search bar or choose a category'
                : search
                ? 'Try a different search term'
                : 'No news for this category'}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((item, i) => (
              <NewsCard key={`${item.id}-${i}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
