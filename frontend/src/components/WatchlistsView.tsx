import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import type { WatchlistResearchRow, WatchlistResearchStatus } from '../api/client';
import { useWatchlistResearchSnapshot } from '../hooks/useWatchlistResearchSnapshot';
import type { Stock, Watchlist } from '../types';

interface WatchlistsViewProps {
  stocks: Stock[];
  watchlists: Watchlist[];
  onAddStockToWatchlist: (watchlistId: string, symbol: string) => void | Promise<void>;
  onAddWatchlist: (name: string) => void | Promise<string | void>;
  onOpenTradeModal: (symbol: string) => void;
  onSelectStock: (stock: Stock | null, symbol?: string, name?: string) => void;
}

const statusStyles: Record<WatchlistResearchStatus, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'border-bull-green/30 bg-bull-green/10 text-bull-green' },
  STALE: { label: 'Stale', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  EMPTY: { label: 'Empty', className: 'border-outline-variant bg-bg-base text-text-muted' },
  FAILED: { label: 'Failed', className: 'border-bear-red/30 bg-bear-red/10 text-bear-red' },
  RATE_LIMITED: { label: 'Rate limited', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  INSUFFICIENT_DATA: { label: 'Low data', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  PENDING_REFRESH: { label: 'Refreshing', className: 'border-primary/30 bg-primary/10 text-primary' },
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
};

const formatPercentRatio = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const pct = value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
};

const formatPercentPoints = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
};

const formatVolume = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const statusClass = (status: WatchlistResearchStatus) => statusStyles[status]?.className ?? statusStyles.FAILED.className;
const statusLabel = (status: WatchlistResearchStatus) => statusStyles[status]?.label ?? status;

export default function WatchlistsView({
  stocks,
  watchlists,
  onAddStockToWatchlist,
  onAddWatchlist,
  onOpenTradeModal,
  onSelectStock,
}: WatchlistsViewProps) {
  const [activeWatchlistId, setActiveWatchlistId] = useState(watchlists[0]?.id ?? '');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [tickerToAdd, setTickerToAdd] = useState('');
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [addingTicker, setAddingTicker] = useState(false);
  const [creatingWatchlist, setCreatingWatchlist] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeWatchlist = useMemo(
    () => watchlists.find((watchlist) => watchlist.id === activeWatchlistId) ?? watchlists[0] ?? null,
    [watchlists, activeWatchlistId],
  );

  const activeSymbols = activeWatchlist?.symbols ?? [];
  const activeWatchlistNumericId = activeWatchlist ? Number(activeWatchlist.id) : Number.NaN;
  const {
    snapshot: researchSnapshot,
    loading: researchLoading,
    error: researchError,
    reload: reloadResearchSnapshot,
  } = useWatchlistResearchSnapshot(
    Number.isFinite(activeWatchlistNumericId) ? activeWatchlistNumericId : null,
    { limit: 50, offset: 0 },
  );

  const researchRows = useMemo(() => researchSnapshot?.rows ?? [], [researchSnapshot]);
  const stockBySymbol = useMemo(() => new Map(stocks.map((stock) => [stock.symbol, stock])), [stocks]);
  const normalizedSearch = searchTerm.trim().toUpperCase();
  const visibleRows = useMemo(() => {
    if (!normalizedSearch) return researchRows;
    return researchRows.filter((row) => {
      const stock = stockBySymbol.get(row.symbol);
      const displayName = row.name ?? stock?.name ?? "";
      return row.symbol.includes(normalizedSearch) || displayName.toUpperCase().includes(normalizedSearch);
    });
  }, [normalizedSearch, researchRows, stockBySymbol]);

  const selectedDisplaySymbol = selectedSymbol || visibleRows[0]?.symbol || activeSymbols[0] || '';
  const selectedStock = selectedDisplaySymbol ? stockBySymbol.get(selectedDisplaySymbol) ?? null : null;
  const selectedResearchRow = researchRows.find((row) => row.symbol === selectedDisplaySymbol) ?? null;

  const statusCounts = useMemo(() => {
    return researchRows.reduce<Record<string, number>>((counts, row) => {
      counts[row.overallStatus] = (counts[row.overallStatus] ?? 0) + 1;
      return counts;
    }, {});
  }, [researchRows]);

  const localStocks = activeSymbols
    .map((symbol) => stockBySymbol.get(symbol))
    .filter((stock): stock is Stock => Boolean(stock));
  const averageChange = localStocks.length === 0
    ? null
    : localStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / localStocks.length;

  const handleAddTicker = async () => {
    if (!activeWatchlist || !tickerToAdd.trim()) return;
    const symbol = tickerToAdd.trim().toUpperCase();
    setAddingTicker(true);
    setActionError(null);
    try {
      await Promise.resolve(onAddStockToWatchlist(activeWatchlist.id, symbol));
      setTickerToAdd('');
      setSelectedSymbol(symbol);
    } catch (error) {
      console.error('Failed to add symbol to watchlist', error);
      setActionError(`Could not add ${symbol}.`);
    } finally {
      setAddingTicker(false);
    }
  };

  const handleCreateWatchlist = async () => {
    const name = newWatchlistName.trim();
    if (!name) return;
    setCreatingWatchlist(true);
    setActionError(null);
    try {
      const createdId = await Promise.resolve(onAddWatchlist(name));
      if (createdId) setActiveWatchlistId(createdId);
      setNewWatchlistName('');
    } catch (error) {
      console.error('Failed to create watchlist', error);
      setActionError(`Could not create ${name}.`);
    } finally {
      setCreatingWatchlist(false);
    }
  };

  const handleSelectWatchlist = (watchlistId: string) => {
    setActiveWatchlistId(watchlistId);
    setSelectedSymbol('');
    setSearchTerm('');
    setActionError(null);
  };

  if (watchlists.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6">
        <div className="rounded-lg border border-outline-variant bg-bg-card p-6 shadow-lg">
          <div className="max-w-xl">
            <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">Watchlists</div>
            <h2 className="mt-2 font-headline text-2xl font-bold text-text-primary">Create a Watchlist</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Build a focused list of symbols before loading research snapshots.
            </p>
            <div className="mt-5 flex max-w-md gap-2">
              <input
                value={newWatchlistName}
                onChange={(event) => setNewWatchlistName(event.target.value)}
                placeholder="Watchlist name"
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreateWatchlist}
                disabled={creatingWatchlist || !newWatchlistName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-bg-base shadow-sm disabled:opacity-60"
              >
                {creatingWatchlist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
            </div>
            {actionError ? <div className="mt-3 text-xs text-bear-red">{actionError}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">Watchlist Workspace</div>
          <h2 className="mt-1 font-headline text-2xl font-bold tracking-tight text-text-primary">Watchlist Research</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Screen symbol groups with price, technical, fundamental, earnings, and data-quality context.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newWatchlistName}
            onChange={(event) => setNewWatchlistName(event.target.value)}
            placeholder="New watchlist"
            className="rounded-lg border border-outline-variant bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreateWatchlist}
            disabled={creatingWatchlist || !newWatchlistName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-bg-base shadow-sm disabled:opacity-60"
          >
            {creatingWatchlist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-bear-red/30 bg-bear-red/10 px-4 py-3 text-sm text-bear-red">
          <AlertCircle className="h-4 w-4" />
          {actionError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-outline-variant bg-bg-card p-4 shadow-lg">
            <label className="mb-2 block text-[10px] font-label-caps uppercase tracking-wider text-text-muted">
              Active List
            </label>
            <select
              value={activeWatchlist?.id ?? ''}
              onChange={(event) => handleSelectWatchlist(event.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm font-bold text-text-primary focus:border-primary focus:outline-none"
            >
              {watchlists.map((watchlist) => (
                <option key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <SummaryTile label="Symbols" value={String(activeSymbols.length)} />
              <SummaryTile label="Loaded" value={String(researchRows.length)} />
              <SummaryTile
                label="Avg Change"
                value={averageChange == null ? 'N/A' : formatPercentPoints(averageChange)}
                tone={averageChange == null ? 'neutral' : averageChange >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </section>

          <section className="rounded-lg border border-outline-variant bg-bg-card p-4 shadow-lg">
            <label className="mb-2 block text-[10px] font-label-caps uppercase tracking-wider text-text-muted">
              Add Symbol
            </label>
            <div className="flex gap-2">
              <input
                value={tickerToAdd}
                onChange={(event) => setTickerToAdd(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleAddTicker();
                }}
                placeholder="AAPL, MSFT..."
                disabled={addingTicker}
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleAddTicker}
                disabled={addingTicker || !tickerToAdd.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-bg-base disabled:opacity-60"
                aria-label="Add symbol"
              >
                {addingTicker ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-outline-variant bg-bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">Symbols</div>
              <div className="rounded-full border border-outline-variant bg-bg-base px-2 py-1 font-data-mono text-[10px] text-text-muted">
                {activeSymbols.length}
              </div>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {activeSymbols.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant p-5 text-center text-xs text-text-muted">
                  Add a symbol to start tracking this watchlist.
                </div>
              ) : (
                activeSymbols.map((symbol) => {
                  const stock = stockBySymbol.get(symbol);
                  const row = researchRows.find((item) => item.symbol === symbol);
                  const active = selectedDisplaySymbol === symbol;
                  return (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-outline-variant/30 bg-bg-base/40 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-data-mono text-sm font-bold text-text-primary">{symbol}</div>
                          <div className="truncate text-[10px] text-text-muted">
                            {row?.name ?? stock?.name ?? 'Metadata unavailable'}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 font-data-mono text-[9px] font-bold ${statusClass(row?.overallStatus ?? 'EMPTY')}`}>
                          {statusLabel(row?.overallStatus ?? 'EMPTY')}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between font-data-mono text-xs">
                        <span className="text-text-primary">{formatCurrency(row?.price.data?.lastPrice ?? stock?.price)}</span>
                        <span className={stock && stock.changePercent < 0 ? 'text-bear-red' : 'text-bull-green'}>
                          {stock ? formatPercentPoints(stock.changePercent) : 'N/A'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-lg border border-outline-variant bg-bg-card shadow-lg">
            <div className="flex flex-col gap-4 border-b border-outline-variant/40 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">Research Snapshot</div>
                <h3 className="mt-1 font-headline text-xl font-bold text-text-primary">
                  {activeWatchlist?.name ?? 'Watchlist'} Coverage
                </h3>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search symbols"
                    className="w-full rounded-lg border border-outline-variant bg-bg-base py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none sm:w-56"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void reloadResearchSnapshot()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm font-bold text-text-primary hover:border-primary/40"
                >
                  <RefreshCw className={`h-4 w-4 ${researchLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-outline-variant/30 p-4 md:grid-cols-4">
              <SnapshotTile icon={<CheckCircle2 className="h-4 w-4" />} label="Healthy" value={`${statusCounts.OK ?? 0}/${researchRows.length}`} />
              <SnapshotTile icon={<Clock3 className="h-4 w-4" />} label="Generated" value={formatDateTime(researchSnapshot?.generatedAt)} />
              <SnapshotTile icon={<Activity className="h-4 w-4" />} label="Concurrency" value={researchSnapshot?.policy.providerConcurrencyLimit ? String(researchSnapshot.policy.providerConcurrencyLimit) : 'N/A'} />
              <SnapshotTile icon={<TrendingUp className="h-4 w-4" />} label="Timeout" value={researchSnapshot?.policy.providerTimeoutMillis ? `${researchSnapshot.policy.providerTimeoutMillis} ms` : 'N/A'} />
            </div>

            {researchError ? (
              <div className="m-4 flex items-center gap-2 rounded-lg border border-bear-red/30 bg-bear-red/10 p-4 text-sm text-bear-red">
                <AlertCircle className="h-4 w-4" />
                Snapshot could not be loaded. Watchlist controls remain available.
              </div>
            ) : researchLoading && researchRows.length === 0 ? (
              <div className="m-4 flex items-center justify-center gap-2 rounded-lg border border-outline-variant/40 bg-bg-base/40 p-8 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading research snapshot
              </div>
            ) : researchRows.length === 0 ? (
              <div className="m-4 rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-text-muted">
                No research rows are available for this watchlist yet.
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="m-4 rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-text-muted">
                No symbols match the current search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-left text-xs">
                  <thead className="sticky top-0 bg-bg-base/80 text-[10px] uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Last Price</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">RSI 14</th>
                      <th className="px-4 py-3">Signal</th>
                      <th className="px-4 py-3">ROE</th>
                      <th className="px-4 py-3">Debt / Equity</th>
                      <th className="px-4 py-3">Earnings</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const stock = stockBySymbol.get(row.symbol);
                      const active = selectedDisplaySymbol === row.symbol;
                      return (
                        <tr
                          key={row.symbol}
                          onClick={() => setSelectedSymbol(row.symbol)}
                          className={`cursor-pointer border-t border-outline-variant/25 transition-colors ${
                            active ? 'bg-primary/10' : 'hover:bg-bg-base/35'
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-data-mono font-bold text-text-primary">{row.symbol}</div>
                            <div className="max-w-40 truncate text-[10px] text-text-muted">{row.name ?? stock?.name ?? 'Metadata unavailable'}</div>
                          </td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatCurrency(row.price.data?.lastPrice)}</td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatVolume(row.price.data?.volume)}</td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatNumber(row.technical.data?.rsi14, 1)}</td>
                          <td className="px-4 py-4">
                            <div className="font-data-mono font-bold text-text-primary">{row.technical.data?.action ?? 'N/A'}</div>
                            <div className="text-[10px] text-text-muted">{formatPercentRatio(row.technical.data?.confidence)}</div>
                          </td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatPercentRatio(row.fundamentals.data?.roe)}</td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatNumber(row.fundamentals.data?.debtToEquity)}</td>
                          <td className="px-4 py-4">
                            <div className="font-data-mono text-text-primary">
                              {row.earnings.data?.quarters?.[0]?.period ?? 'N/A'}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {formatPercentRatio(row.earnings.data?.quarters?.[0]?.surprisePct)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill status={row.overallStatus} title={row.price.message ?? row.technical.message ?? row.fundamentals.message ?? undefined} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <SelectedInstrumentPanel
            row={selectedResearchRow}
            stock={selectedStock}
            symbol={selectedDisplaySymbol}
            onOpenTradeModal={onOpenTradeModal}
            onSelectStock={onSelectStock}
          />
        </main>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'negative' }) {
  const toneClass = tone === 'positive' ? 'text-bull-green' : tone === 'negative' ? 'text-bear-red' : 'text-text-primary';
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="text-[9px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 font-data-mono text-base font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SnapshotTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate font-data-mono text-sm font-bold text-text-primary">{value}</div>
    </div>
  );
}

function StatusPill({ status, title }: { status: WatchlistResearchStatus; title?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 font-data-mono text-[10px] font-bold ${statusClass(status)}`}
      title={title}
    >
      {statusLabel(status)}
    </span>
  );
}

function SelectedInstrumentPanel({
  row,
  stock,
  symbol,
  onOpenTradeModal,
  onSelectStock,
}: {
  row: WatchlistResearchRow | null;
  stock: Stock | null;
  symbol: string;
  onOpenTradeModal: (symbol: string) => void;
  onSelectStock: (stock: Stock | null, symbol?: string, name?: string) => void;
}) {
  if (!symbol) {
    return (
      <section className="rounded-lg border border-outline-variant bg-bg-card p-8 text-center text-sm text-text-muted shadow-lg">
        Select a symbol to inspect its latest research context.
      </section>
    );
  }

  const price = row?.price.data;
  const technical = row?.technical.data;
  const fundamentals = row?.fundamentals.data;
  const institutional = row?.institutional.data;

  return (
    <section className="rounded-lg border border-outline-variant bg-bg-card p-4 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">Selected Instrument</div>
          <h3 className="mt-1 truncate font-headline text-xl font-bold text-text-primary">
            {symbol}{stock ? ` - ${stock.name}` : ''}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {row ? <StatusPill status={row.overallStatus} /> : <StatusPill status="EMPTY" />}
            <span className="rounded-full border border-outline-variant bg-bg-base px-2 py-1 text-[10px] text-text-muted">
              Updated {formatDateTime(row?.price.observedAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectStock(stock, symbol, row?.name ?? undefined)}
            className="rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm font-bold text-text-primary hover:border-primary/40"
          >
            Open Details
          </button>
          <button
            type="button"
            onClick={() => onOpenTradeModal(symbol)}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-bg-base shadow-sm"
          >
            Trade
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Last Price" value={formatCurrency(price?.lastPrice ?? stock?.price)} />
        <Metric label="Day Range" value={`${formatCurrency(price?.low ?? stock?.low)} / ${formatCurrency(price?.high ?? stock?.high)}`} />
        <Metric label="Volume" value={formatVolume(price?.volume)} />
        <Metric label="RSI 14" value={formatNumber(technical?.rsi14, 1)} />
        <Metric label="Signal" value={technical?.action ?? 'N/A'} />
        <Metric label="ROE" value={formatPercentRatio(fundamentals?.roe ?? stock?.roe)} />
        <Metric label="Debt / Equity" value={formatNumber(fundamentals?.debtToEquity ?? stock?.debtEquity)} />
        <Metric label="Quality" value={formatNumber(institutional?.qualityComposite, 1)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ResearchSource label="Price" status={row?.price.status ?? 'EMPTY'} source={row?.price.source} message={row?.price.message} />
        <ResearchSource label="Technical" status={row?.technical.status ?? 'EMPTY'} source={row?.technical.source} message={row?.technical.message} />
        <ResearchSource label="Fundamentals" status={row?.fundamentals.status ?? 'EMPTY'} source={row?.fundamentals.source} message={row?.fundamentals.message} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="text-[9px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 truncate font-data-mono text-sm font-bold text-text-primary">{value}</div>
    </div>
  );
}

function ResearchSource({
  label,
  status,
  source,
  message,
}: {
  label: string;
  status: WatchlistResearchStatus;
  source?: string | null;
  message?: string | null;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{label}</div>
        <StatusPill status={status} />
      </div>
      <div className="mt-2 truncate text-xs text-text-secondary">{source ?? 'No provider'}</div>
      {message ? <div className="mt-1 truncate text-[10px] text-text-muted">{message}</div> : null}
    </div>
  );
}


