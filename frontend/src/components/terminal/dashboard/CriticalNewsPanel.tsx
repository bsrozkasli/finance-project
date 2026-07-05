import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CategorizedNewsItem } from '../../../api/client';
import { fetchAllNews } from '../../../api/client';

const sentimentColor = (sentiment?: CategorizedNewsItem['sentiment']) => {
  if (sentiment === 'BULLISH') return 'var(--color-bull)';
  if (sentiment === 'BEARISH') return 'var(--color-bear)';
  return 'var(--color-text-muted)';
};

const timeLabel = (seconds: number) => new Date(seconds * 1000).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const CriticalNewsPanel = ({ symbols }: { symbols: string[] }) => {
  const [items, setItems] = useState<CategorizedNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbolKey = useMemo(() => symbols.slice().sort().join(','), [symbols]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (symbols.length === 0) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllNews('BREAKING', 0, 6, symbols);
        if (!cancelled) setItems(data.content ?? []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : 'News unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [symbolKey, symbols]);

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Critical News</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Breaking news scoped to current holdings</p>
        </div>
        <Link to="/news" className="text-xs font-bold" style={{ color: 'var(--color-accent-light)' }}>View All</Link>
      </div>
      {loading && Array.from({ length: 3 }, (_, index) => <div key={index} className="skeleton mb-3 h-16 rounded" />)}
      {error && <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{error}</div>}
      {!loading && !error && items.length === 0 && <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No breaking portfolio news found.</div>}
      <div className="space-y-3">
        {items.slice(0, 6).map((item) => {
          const related = item.relatedSymbols?.[0] ?? item.related;
          return (
            <a key={`${item.source}-${item.datetime}-${item.headline}`} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {related && <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>{related}</span>}
                {item.sentiment && <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: sentimentColor(item.sentiment), border: `1px solid ${sentimentColor(item.sentiment)}` }}>{item.sentiment}</span>}
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{timeLabel(item.datetime)}</span>
              </div>
              <div className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{item.source}</div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
