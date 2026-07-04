import { useLivePrice } from '../../hooks/useLivePrice';
import { fmtCurrency, fmtPct, positiveColor } from './watchlistUtils';

interface WatchlistTickerRowProps {
  symbol: string;
  selected: boolean;
  compareSelected: boolean;
  compareMode: boolean;
  draggable?: boolean;
  readOnly?: boolean;
  fallbackPrice?: number | null;
  fallbackChangePct?: number | null;
  onSelect: () => void;
  onRemove: () => void;
  onToggleCompare: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
}

export const WatchlistTickerRow = ({
  symbol,
  selected,
  compareSelected,
  compareMode,
  draggable,
  readOnly = false,
  fallbackPrice = null,
  fallbackChangePct = null,
  onSelect,
  onRemove,
  onToggleCompare,
  onDragStart,
  onDragOver,
}: WatchlistTickerRowProps) => {
  const { data, loading } = useLivePrice(symbol);
  const price = data?.price ?? fallbackPrice;
  const changePct = data?.changePct ?? fallbackChangePct;
  const hasFallback = !data && fallbackPrice != null;

  return (
    <div
      draggable={draggable && !readOnly}
      onDragStart={onDragStart}
      onDragOver={event => { event.preventDefault(); onDragOver(); }}
      className="group mx-1 mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-all"
      style={{ background: selected ? 'var(--color-accent-dim)' : 'transparent', borderLeft: selected ? '2px solid var(--color-accent)' : '2px solid transparent' }}
      onClick={compareMode ? onToggleCompare : onSelect}
      onMouseEnter={event => { if (!selected) event.currentTarget.style.background = 'var(--color-bg-hover)'; }}
      onMouseLeave={event => { if (!selected) event.currentTarget.style.background = 'transparent'; }}
    >
      {compareMode && <input type="checkbox" checked={compareSelected} onChange={onToggleCompare} onClick={event => event.stopPropagation()} />}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs font-bold" style={{ color: selected ? 'var(--color-accent-light)' : 'var(--color-text-primary)' }}>{symbol}</div>
        {loading && price == null ? <div className="skeleton mt-0.5 h-2.5 w-14 rounded" /> : price != null ? <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtCurrency(price)}{hasFallback ? ' pos' : ''}</div> : <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No price</div>}
      </div>
      {changePct != null && <span className="font-mono text-xs font-semibold" style={{ color: positiveColor(changePct) }}>{fmtPct(changePct)}</span>}
      {!readOnly && <button type="button" onClick={event => { event.stopPropagation(); onRemove(); }} className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--color-text-muted)' }} title="Remove">x</button>}
    </div>
  );
};