import type { CategorizedNewsItem } from '../../api/client';
import { getNewsTimestampMs, PRIORITY_COLORS, relatedSymbolsOf, SENTIMENT_COLORS, sentimentIcon } from './newsUtils';

interface NewsCardProps {
  item: CategorizedNewsItem;
  portfolioImpacts: string[];
  onSelect: (item: CategorizedNewsItem) => void;
}

export const NewsCard = ({ item, portfolioImpacts, onSelect }: NewsCardProps) => {
  const priority = item.priority;
  const sentiment = item.sentiment;
  const date = new Date(getNewsTimestampMs(item));
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const symbols = relatedSymbolsOf(item);

  return (
    <button type="button" onClick={() => onSelect(item)} className="block w-full animate-fade-in text-left" style={{ textDecoration: 'none' }}>
      <div className="flex gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--color-bg-hover)]" style={{ borderColor: 'var(--color-border-subtle)' }}>
        {priority && <div className="w-0.5 shrink-0 rounded-full" style={{ background: PRIORITY_COLORS[priority], minHeight: 48 }} />}
        {item.image && <img src={item.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--color-border)' }} onError={event => { event.currentTarget.style.display = 'none'; }} />}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-accent-light)' }}>{item.source}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{dateStr} · {timeStr}</span>
            {priority && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${PRIORITY_COLORS[priority]}22`, color: PRIORITY_COLORS[priority] }}>{priority}</span>}
            {sentiment && <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: `${SENTIMENT_COLORS[sentiment]}22`, color: SENTIMENT_COLORS[sentiment] }}>{sentimentIcon(sentiment)} {sentiment}</span>}
            {portfolioImpacts.length > 0 && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Portfolio: {portfolioImpacts.slice(0, 2).join(', ')}</span>}
          </div>
          <div className="mb-1 text-xs font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</div>
          {item.summary && <div className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.summary}</div>}
          {symbols.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{symbols.slice(0, 5).map(symbol => <span key={symbol} className="rounded px-1.5 py-0.5 text-[9px] font-mono" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>{symbol}</span>)}</div>}
        </div>
      </div>
    </button>
  );
};