import { Link } from 'react-router-dom';
import type { CategorizedNewsItem } from '../../api/client';
import { getNewsTimestampMs, relatedSymbolsOf, SENTIMENT_COLORS, sentimentIcon } from './newsUtils';

interface NewsDetailPanelProps {
  item: CategorizedNewsItem | null;
  similar: CategorizedNewsItem[];
  portfolioImpacts: string[];
  onClose: () => void;
  onSelectSimilar: (item: CategorizedNewsItem) => void;
}

export const NewsDetailPanel = ({ item, similar, portfolioImpacts, onClose, onSelectSimilar }: NewsDetailPanelProps) => {
  if (!item) return null;
  const symbols = relatedSymbolsOf(item);
  const date = new Date(getNewsTimestampMs(item));

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-40 w-full max-w-lg overflow-y-auto border-l p-5 shadow-2xl" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>News Detail</div><h2 className="mt-2 text-base font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</h2></div>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>Close</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span style={{ color: 'var(--color-accent-light)' }}>{item.source}</span><span>{date.toLocaleString()}</span>{item.sentiment && <span style={{ color: SENTIMENT_COLORS[item.sentiment] }}>{sentimentIcon(item.sentiment)} {item.sentiment}</span>}
      </div>
      {item.image && <img src={item.image} alt="" className="mt-4 max-h-56 w-full rounded-lg object-cover" style={{ border: '1px solid var(--color-border)' }} />}
      <section className="mt-4 rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Summary</div>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--color-text-primary)' }}>{item.summary || 'Summary unavailable.'}</p>
      </section>
      {portfolioImpacts.length > 0 && <section className="mt-4 rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}><div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Portfolio Impact</div><div className="mt-2 text-sm" style={{ color: 'var(--color-accent-light)' }}>Portfoyunuzdeki varliklarla ilgili: {portfolioImpacts.join(', ')}</div></section>}
      <section className="mt-4 rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Related Symbols</div>
        <div className="mt-3 flex flex-wrap gap-2">{symbols.length > 0 ? symbols.map(symbol => <Link key={symbol} to={`/workspace/${symbol}`} className="rounded px-2 py-1 text-xs font-mono" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>{symbol}</Link>) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No related symbols.</span>}</div>
      </section>
      <section className="mt-4 rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Similar News</div>
        <div className="mt-3 space-y-2">{similar.length > 0 ? similar.map(story => <button key={`${story.id}-${story.datetime}`} type="button" onClick={() => onSelectSimilar(story)} className="block w-full text-left text-xs leading-5" style={{ color: 'var(--color-text-primary)' }}>{story.headline}</button>) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No similar stories in current feed.</span>}</div>
      </section>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-lg px-3 py-2 text-center text-xs font-bold" style={{ background: 'var(--color-accent)', color: '#fff' }}>Open Original</a>
    </aside>
  );
};