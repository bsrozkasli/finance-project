import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { EnrichedPosition } from '../../api/client';
import { fetchEnrichedPositions } from '../../api/client';
import { useWatchlists } from '../../hooks/useWatchlists';
import { CompareModal } from '../watchlist/CompareModal';
import { SymbolDetailPanel } from '../watchlist/SymbolDetailPanel';
import { WatchlistManager } from '../watchlist/WatchlistManager';
import { WatchlistTickerRow } from '../watchlist/WatchlistTickerRow';
import { fmtCurrency, readWatchlistSettings, writeWatchlistSettings } from '../watchlist/watchlistUtils';
import type { WatchlistAlert, WatchlistSettings } from '../watchlist/watchlistUtils';

const orderedSymbols = (symbols: string[], order: string[] | undefined) => {
  if (!order) return symbols;
  const inList = order.filter(symbol => symbols.includes(symbol));
  const missing = symbols.filter(symbol => !inList.includes(symbol));
  return [...inList, ...missing];
};

const uniquePortfolioSymbols = (positions: EnrichedPosition[]) => {
  const symbols = new Set<string>();
  positions.forEach(position => {
    if (position.symbol) symbols.add(position.symbol.toUpperCase());
  });
  return Array.from(symbols);
};

export const WatchlistView = () => {
  const { watchlists, loading, error, createList, addSymbol, removeSymbol, removeList } = useWatchlists();
  const [settings, setSettings] = useState<WatchlistSettings>(() => readWatchlistSettings());
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [addSymbolInput, setAddSymbolInput] = useState('');
  const [showCreateList, setShowCreateList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [dragSymbol, setDragSymbol] = useState<string | null>(null);
  const [portfolioPositions, setPortfolioPositions] = useState<EnrichedPosition[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [seedingPortfolio, setSeedingPortfolio] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    if (watchlists.length > 0 && activeWatchlistId === null) setActiveWatchlistId(watchlists[0].id);
  }, [activeWatchlistId, watchlists]);

  useEffect(() => {
    let cancelled = false;
    const loadPortfolioPositions = async () => {
      setPortfolioLoading(true);
      setPortfolioError(null);
      try {
        const data = await fetchEnrichedPositions();
        if (!cancelled) setPortfolioPositions(data);
      } catch (err) {
        if (!cancelled) setPortfolioError(err instanceof Error ? err.message : 'Failed to load portfolio positions');
      } finally {
        if (!cancelled) setPortfolioLoading(false);
      }
    };
    void loadPortfolioPositions();
    return () => { cancelled = true; };
  }, []);

  const activeWatchlist = watchlists.find(watchlist => watchlist.id === activeWatchlistId);
  const portfolioSymbols = useMemo(() => uniquePortfolioSymbols(portfolioPositions), [portfolioPositions]);
  const showPortfolioFallback = !activeWatchlist && !loading && watchlists.length === 0 && portfolioSymbols.length > 0;
  const symbols = useMemo(
    () => activeWatchlist ? orderedSymbols(activeWatchlist.symbols, settings.order[activeWatchlist.id]) : portfolioSymbols,
    [activeWatchlist, portfolioSymbols, settings.order]
  );
  const readOnlyRows = showPortfolioFallback;
  const portfolioValue = useMemo(() => portfolioPositions.reduce((sum, position) => sum + (position.marketValue ?? 0), 0), [portfolioPositions]);
  const positionBySymbol = useMemo(() => {
    const map = new Map<string, EnrichedPosition>();
    portfolioPositions.forEach(position => map.set(position.symbol.toUpperCase(), position));
    return map;
  }, [portfolioPositions]);

  const saveSettings = (next: WatchlistSettings) => {
    setSettings(next);
    writeWatchlistSettings(next);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const watchlist = await createList(newListName.trim());
      setActiveWatchlistId(watchlist.id);
      setNewListName('');
      setShowCreateList(false);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateFromPortfolio = async () => {
    if (portfolioSymbols.length === 0) return;
    setSeedingPortfolio(true);
    setSeedError(null);
    try {
      const watchlist = await createList('Portfolio Holdings');
      setActiveWatchlistId(watchlist.id);
      for (const symbol of portfolioSymbols) {
        await addSymbol(watchlist.id, symbol);
      }
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Could not create watchlist from portfolio');
    } finally {
      setSeedingPortfolio(false);
    }
  };

  const addSymbols = async (raw: string) => {
    if (!activeWatchlistId) return;
    const symbolsToAdd = raw.split(',').map(symbol => symbol.trim().toUpperCase()).filter(Boolean);
    for (const symbol of symbolsToAdd) {
      await addSymbol(activeWatchlistId, symbol);
    }
    setAddSymbolInput('');
  };

  const handleAddSymbol = async (event: FormEvent) => {
    event.preventDefault();
    if (!addSymbolInput.trim()) return;
    await addSymbols(addSymbolInput);
  };

  const toggleCompare = (symbol: string) => {
    setCompareSymbols(prev => {
      if (prev.includes(symbol)) return prev.filter(item => item !== symbol);
      if (prev.length >= 3) return prev;
      return [...prev, symbol];
    });
  };

  const reorder = (targetSymbol: string) => {
    if (!activeWatchlistId || !dragSymbol || dragSymbol === targetSymbol) return;
    const current = symbols;
    const next = [...current];
    const from = next.indexOf(dragSymbol);
    const to = next.indexOf(targetSymbol);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, dragSymbol);
    saveSettings({ ...settings, order: { ...settings.order, [activeWatchlistId]: next } });
  };

  const setColor = (id: number, color: string) => {
    saveSettings({ ...settings, colors: { ...settings.colors, [id]: color } });
  };

  const addAlert = (alert: Omit<WatchlistAlert, 'id' | 'createdAt'>) => {
    saveSettings({ ...settings, alerts: [...settings.alerts, { ...alert, id: `${alert.symbol}-${Date.now()}`, createdAt: new Date().toISOString() }] });
  };

  const removeAlert = (id: string) => {
    saveSettings({ ...settings, alerts: settings.alerts.filter(alert => alert.id !== id) });
  };

  const handleRemoveSymbol = async (symbol: string) => {
    if (!activeWatchlistId) return;
    await removeSymbol(activeWatchlistId, symbol);
    if (selectedSymbol === symbol) setSelectedSymbol(null);
    setCompareSymbols(prev => prev.filter(item => item !== symbol));
  };

  const emptyTitle = showPortfolioFallback ? 'Portfolio Holdings' : activeWatchlist ? activeWatchlist.name : 'Select a Watchlist';
  const emptySubtitle = showPortfolioFallback
    ? 'Using real enriched portfolio positions because no saved watchlist exists yet.'
    : 'Click a ticker to view detailed research';

  return (
    <div className="terminal-main flex animate-fade-in" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)' }}>
      <div className="flex w-72 shrink-0 flex-col border-r" style={{ borderColor: 'var(--color-border)', background: 'rgba(12, 16, 28, 0.92)' }}>
        <WatchlistManager
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          colors={settings.colors}
          loading={loading}
          error={error}
          showCreateList={showCreateList}
          newListName={newListName}
          creating={creating}
          onSelect={id => { setActiveWatchlistId(id); setSelectedSymbol(null); setCompareSymbols([]); }}
          onRemoveList={async id => { await removeList(id); if (activeWatchlistId === id) setActiveWatchlistId(null); }}
          onToggleCreate={() => setShowCreateList(value => !value)}
          onNewListNameChange={setNewListName}
          onCreateList={handleCreateList}
          onColorChange={setColor}
        />

        {showPortfolioFallback && (
          <div className="m-3 rounded-lg border p-3" style={{ borderColor: 'var(--color-accent-dim)', background: 'rgba(0, 229, 255, 0.06)' }}>
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent-light)' }}>Live portfolio fallback</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{portfolioSymbols.length} symbols - {fmtCurrency(portfolioValue)}</div>
            <button type="button" onClick={handleCreateFromPortfolio} disabled={seedingPortfolio} className="mt-3 w-full rounded px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: 'var(--color-accent)', color: '#fff' }}>
              {seedingPortfolio ? 'Creating...' : 'Save as watchlist'}
            </button>
            {seedError && <div className="mt-2 text-[11px]" style={{ color: 'var(--color-bear)' }}>{seedError}</div>}
          </div>
        )}

        <div className="border-b p-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => { setCompareMode(value => !value); setCompareSymbols([]); }} className="rounded px-3 py-1.5 text-xs font-bold" style={{ background: compareMode ? 'var(--color-accent-dim)' : 'var(--color-bg-card)', color: compareMode ? 'var(--color-accent-light)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Karsilastir</button>
            <button type="button" disabled={compareSymbols.length < 2} onClick={() => setShowCompare(true)} className="rounded px-3 py-1.5 text-xs font-bold disabled:opacity-40" style={{ background: 'var(--color-accent)', color: '#fff' }}>Ac ({compareSymbols.length})</button>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{readOnlyRows ? 'Portfolio fallback is read-only until saved.' : 'Drag rows to reorder. Paste comma-separated tickers below.'}</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {portfolioLoading && !activeWatchlist && <div className="p-4"><div className="skeleton h-10 rounded" /></div>}
          {portfolioError && !activeWatchlist && <div className="p-4 text-xs" style={{ color: 'var(--color-bear)' }}>Portfolio positions failed: {portfolioError}</div>}
          {activeWatchlist && symbols.length === 0 && <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No symbols yet. Add one below.</div>}
          {!loading && !portfolioLoading && !activeWatchlist && symbols.length === 0 && <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No watchlists or portfolio positions found.</div>}
          {symbols.map(symbol => { const position = positionBySymbol.get(symbol.toUpperCase()); return <WatchlistTickerRow key={symbol} symbol={symbol} selected={selectedSymbol === symbol} compareSelected={compareSymbols.includes(symbol)} compareMode={compareMode} draggable={!readOnlyRows} readOnly={readOnlyRows} fallbackPrice={position?.currentPrice ?? null} fallbackChangePct={position?.totalReturn ?? null} onSelect={() => setSelectedSymbol(prev => prev === symbol ? null : symbol)} onRemove={() => { if (!readOnlyRows) void handleRemoveSymbol(symbol); }} onToggleCompare={() => toggleCompare(symbol)} onDragStart={() => setDragSymbol(symbol)} onDragOver={() => { if (!readOnlyRows) reorder(symbol); }} />; })}
        </div>

        {activeWatchlistId && <form onSubmit={handleAddSymbol} className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}><div className="flex gap-1.5"><input value={addSymbolInput} onChange={event => setAddSymbolInput(event.target.value.toUpperCase())} placeholder="AAPL, MSFT, NVDA" className="flex-1 rounded px-2 py-1.5 text-xs outline-none" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }} /><button type="submit" className="rounded px-2.5 py-1.5 text-xs font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>+</button></div><div className="mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Share link: coming soon</div></form>}
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'rgba(12, 16, 28, 0.72)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.24)' }}>
          {selectedSymbol ? <SymbolDetailPanel symbol={selectedSymbol} alerts={settings.alerts} onAddAlert={addAlert} onRemoveAlert={removeAlert} /> : <div className="flex h-full flex-col items-center justify-center px-6 text-center" style={{ color: 'var(--color-text-muted)' }}><div className="mb-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{emptyTitle}</div><div className="max-w-sm text-xs leading-5">{emptySubtitle}</div>{showPortfolioFallback && <div className="mt-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Real portfolio data connected</div>}</div>}
        </div>
      </div>

      {showCompare && <CompareModal symbols={compareSymbols} onClose={() => setShowCompare(false)} />}
    </div>
  );
};
