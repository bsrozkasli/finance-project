import type { Watchlist } from '../../api/client';
import { WATCHLIST_COLORS } from './watchlistUtils';

interface WatchlistManagerProps {
  watchlists: Watchlist[];
  activeWatchlistId: number | null;
  colors: Record<number, string>;
  loading: boolean;
  error: string | null;
  showCreateList: boolean;
  newListName: string;
  creating: boolean;
  onSelect: (id: number) => void;
  onRemoveList: (id: number) => void;
  onToggleCreate: () => void;
  onNewListNameChange: (value: string) => void;
  onCreateList: () => void;
  onColorChange: (id: number, color: string) => void;
}

export const WatchlistManager = ({
  watchlists,
  activeWatchlistId,
  colors,
  loading,
  error,
  showCreateList,
  newListName,
  creating,
  onSelect,
  onRemoveList,
  onToggleCreate,
  onNewListNameChange,
  onCreateList,
  onColorChange,
}: WatchlistManagerProps) => (
  <div className="border-b px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
    <div className="mb-2 flex items-center justify-between">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Watchlists</div>
      <button type="button" onClick={onToggleCreate} className="rounded p-1" style={{ color: 'var(--color-text-secondary)' }} title="New Watchlist">+</button>
    </div>

    {showCreateList && (
      <div className="mb-2 flex gap-1">
        <input value={newListName} onChange={event => onNewListNameChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onCreateList(); }} placeholder="List name..." className="flex-1 rounded px-2 py-1.5 text-xs outline-none" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-accent)', color: 'var(--color-text-primary)' }} autoFocus />
        <button type="button" onClick={onCreateList} disabled={creating} className="rounded px-2 py-1.5 text-xs font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>+</button>
      </div>
    )}

    {loading && <div className="skeleton mb-1 h-6 rounded" />}
    {error && <div className="text-xs" style={{ color: 'var(--color-bear)' }}>Failed to load</div>}

    <div className="space-y-0.5">
      {watchlists.map(watchlist => {
        const color = colors[watchlist.id] ?? WATCHLIST_COLORS[watchlist.id % WATCHLIST_COLORS.length];
        return (
          <div key={watchlist.id} className="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-all" style={{ background: activeWatchlistId === watchlist.id ? 'var(--color-accent-dim)' : 'transparent', color: activeWatchlistId === watchlist.id ? 'var(--color-accent-light)' : 'var(--color-text-secondary)' }} onClick={() => onSelect(watchlist.id)}>
            <div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /><span className="truncate text-xs font-semibold">{watchlist.name}</span></div>
            <div className="flex items-center gap-1">
              <select value={color} onChange={event => { event.stopPropagation(); onColorChange(watchlist.id, event.target.value); }} onClick={event => event.stopPropagation()} className="h-5 w-6 rounded border text-xs" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)', color }}>
                {WATCHLIST_COLORS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{watchlist.symbols.length}</span>
              <button type="button" onClick={event => { event.stopPropagation(); onRemoveList(watchlist.id); }} className="rounded p-0.5 opacity-0 group-hover:opacity-100" style={{ color: 'var(--color-text-muted)' }}>x</button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);