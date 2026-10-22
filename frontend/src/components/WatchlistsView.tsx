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
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { WatchlistResearchRow, WatchlistResearchStatus } from '../api/client';
import { useWatchlistResearchSnapshot } from '../hooks/useWatchlistResearchSnapshot';
import type { Stock, Watchlist } from '../types';
import CompanyLogo from './CompanyLogo';

interface WatchlistsViewProps {
  stocks: Stock[];
  watchlists: Watchlist[];
  onAddStockToWatchlist: (watchlistId: string, symbol: string) => void | Promise<void>;
  onRemoveStockFromWatchlist: (watchlistId: string, symbol: string) => void | Promise<void>;
  onAddWatchlist: (name: string) => void | Promise<string | void>;
  onOpenTradeModal: (symbol: string) => void;
  onSelectStock: (stock: Stock | null, symbol?: string, name?: string) => void;
}

const statusStyles: Record<WatchlistResearchStatus, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'border-bull-green/30 bg-bull-green/10 text-bull-green' },
  STALE: { label: 'Eski veri', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  EMPTY: { label: 'Veri yok', className: 'border-outline-variant bg-bg-base text-text-muted' },
  FAILED: { label: 'Yüklenemedi', className: 'border-bear-red/30 bg-bear-red/10 text-bear-red' },
  RATE_LIMITED: { label: 'İstek sınırı', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  INSUFFICIENT_DATA: { label: 'Yetersiz geçmiş', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  PENDING_REFRESH: { label: 'Yenileniyor', className: 'border-primary/30 bg-primary/10 text-primary' },
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
};

const formatPercentRatio = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
};

const formatPercentPoints = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
};

const formatVolume = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
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
  onRemoveStockFromWatchlist,
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
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
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
      setActionError(`${symbol} eklenemedi.`);
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
      setActionError(`${name} oluşturulamadı.`);
    } finally {
      setCreatingWatchlist(false);
    }
  };

  const handleRemoveTicker = async (symbol: string) => {
    if (!activeWatchlist || removingSymbol) return;
    setRemovingSymbol(symbol);
    setActionError(null);
    try {
      await Promise.resolve(onRemoveStockFromWatchlist(activeWatchlist.id, symbol));
      if (selectedDisplaySymbol === symbol) {
        setSelectedSymbol(activeSymbols.find((candidate) => candidate !== symbol) ?? '');
      }
      await reloadResearchSnapshot();
    } catch (error) {
      console.error('Failed to remove symbol from watchlist', error);
      setActionError(`${symbol} kaldırılamadı.`);
    } finally {
      setRemovingSymbol(null);
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
            <div className="text-xs font-label-caps uppercase tracking-wider text-text-muted">İzleme listeleri</div>
            <h2 className="mt-2 font-headline text-2xl font-bold text-text-primary">İzleme listesi oluşturun</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Araştırmak istediğiniz sembolleri bir listede toplayın.
            </p>
            <div className="mt-5 flex max-w-md gap-2">
              <input
                value={newWatchlistName}
                onChange={(event) => setNewWatchlistName(event.target.value)}
                placeholder="Liste adı"
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreateWatchlist}
                disabled={creatingWatchlist || !newWatchlistName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-bg-base  disabled:opacity-60"
              >
                {creatingWatchlist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Oluştur
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
          <div className="text-xs font-label-caps uppercase tracking-wider text-text-muted">İzleme alanı</div>
          <h2 className="mt-1 font-headline text-2xl font-bold tracking-tight text-text-primary">İzleme listem</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Varlıkları fiyat, teknik, temel veri ve veri kalitesi bağlamında inceleyin.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newWatchlistName}
            onChange={(event) => setNewWatchlistName(event.target.value)}
            placeholder="Yeni liste adı"
            className="rounded-lg border border-outline-variant bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreateWatchlist}
            disabled={creatingWatchlist || !newWatchlistName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-bg-base  disabled:opacity-60"
          >
            {creatingWatchlist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Oluştur
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
            <label htmlFor="active-watchlist" className="mb-2 block text-xs font-label-caps uppercase tracking-wider text-text-muted">
              Aktif liste
            </label>
            <select
              id="active-watchlist"
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
              <SummaryTile label="Sembol" value={String(activeSymbols.length)} />
              <SummaryTile label="Yüklenen" value={String(researchRows.length)} />
              <SummaryTile
                label="Ort. değişim"
                value={averageChange == null ? '—' : formatPercentPoints(averageChange)}
                tone={averageChange == null ? 'neutral' : averageChange >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </section>

          <section className="rounded-lg border border-outline-variant bg-bg-card p-4 shadow-lg">
            <label className="mb-2 block text-xs font-label-caps uppercase tracking-wider text-text-muted">
              Sembol ekle
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
                aria-label="Sembol ekle"
              >
                {addingTicker ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-outline-variant bg-bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-label-caps uppercase tracking-wider text-text-muted">Symbols</div>
              <div className="rounded-full border border-outline-variant bg-bg-base px-2 py-1 font-data-mono text-xs text-text-muted">
                {activeSymbols.length}
              </div>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {activeSymbols.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant p-5 text-center text-xs text-text-muted">
                  Veri yok: bu listeyi izlemeye başlamak için sembol ekleyin.
                </div>
              ) : (
                activeSymbols.map((symbol) => {
                  const stock = stockBySymbol.get(symbol);
                  const row = researchRows.find((item) => item.symbol === symbol);
                  const active = selectedDisplaySymbol === symbol;
                  return (
                    <div
                      key={symbol}
                      className={`flex w-full items-stretch rounded-lg border transition-colors ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-outline-variant/30 bg-bg-base/40 hover:border-primary/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSymbol(symbol)}
                        className="min-w-0 flex-1 p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <CompanyLogo symbol={symbol} logoUrl={stock?.logoUrl} className="h-8 w-8" />
                            <div className="min-w-0">
                              <div className="font-data-mono text-sm font-bold text-text-primary">{symbol}</div>
                              <div className="truncate text-xs text-text-muted">
                                {row?.name ?? stock?.name ?? 'Şirket bilgisi yok'}
                              </div>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 font-data-mono text-xs font-bold ${statusClass(row?.overallStatus ?? 'EMPTY')}`}>
                            {statusLabel(row?.overallStatus ?? 'EMPTY')}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between font-data-mono text-xs">
                          <span className="text-text-primary">{formatCurrency(row?.price.data?.lastPrice ?? stock?.price)}</span>
                          <span className={stock && stock.changePercent < 0 ? 'text-bear-red' : 'text-bull-green'}>
                            {stock ? formatPercentPoints(stock.changePercent) : '—'}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveTicker(symbol)}
                        disabled={removingSymbol !== null}
                        aria-label={`${symbol} sembolünü listeden kaldır`}
                        title={`${symbol} sembolünü kaldır`}
                        className="flex w-10 shrink-0 items-center justify-center border-l border-outline-variant/30 text-text-muted hover:text-bear-red disabled:opacity-50"
                      >
                        {removingSymbol === symbol ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
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
                <div className="text-xs font-label-caps uppercase tracking-wider text-text-muted">Research Snapshot</div>
                <h3 className="mt-1 font-headline text-xl font-bold text-text-primary">
                  {activeWatchlist?.name ?? 'İzleme listesi'} kapsamı
                </h3>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Sembol ara"
                    className="w-full rounded-lg border border-outline-variant bg-bg-base py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none sm:w-56"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void reloadResearchSnapshot()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-sm font-bold text-text-primary hover:border-primary/40"
                >
                  <RefreshCw className={`h-4 w-4 ${researchLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-outline-variant/30 p-4 md:grid-cols-4">
              <SnapshotTile icon={<CheckCircle2 className="h-4 w-4" />} label="Sağlıklı" value={`${statusCounts.OK ?? 0}/${researchRows.length}`} />
              <SnapshotTile icon={<Clock3 className="h-4 w-4" />} label="Oluşturulma" value={formatDateTime(researchSnapshot?.generatedAt)} />
              <SnapshotTile icon={<Activity className="h-4 w-4" />} label="Eşzamanlılık" value={researchSnapshot?.policy?.providerConcurrencyLimit ? String(researchSnapshot.policy.providerConcurrencyLimit) : '—'} />
              <SnapshotTile icon={<TrendingUp className="h-4 w-4" />} label="Zaman aşımı" value={researchSnapshot?.policy?.providerTimeoutMillis ? `${researchSnapshot.policy.providerTimeoutMillis} ms` : '—'} />
            </div>

            {researchError ? (
              <div className="m-4 flex items-center gap-2 rounded-lg border border-bear-red/30 bg-bear-red/10 p-4 text-sm text-bear-red">
                <AlertCircle className="h-4 w-4" />
                Araştırma özeti yüklenemedi. İzleme listesi kullanılabilir.
              </div>
            ) : researchLoading && researchRows.length === 0 ? (
              <div className="m-4 flex items-center justify-center gap-2 rounded-lg border border-outline-variant/40 bg-bg-base/40 p-8 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Araştırma özeti yükleniyor
              </div>
            ) : researchRows.length === 0 ? (
              <div className="m-4 rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-text-muted">
                Veri yok: bu liste için henüz araştırma satırı yok.
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="m-4 rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-text-muted">
                Veri yok: aramayla eşleşen sembol yok.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-left text-xs">
                  <thead className="sticky top-0 bg-bg-base/80 text-xs uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Sembol</th>
                      <th className="px-4 py-3">Son fiyat</th>
                      <th className="px-4 py-3">Hacim</th>
                      <th className="px-4 py-3">RSI 14</th>
                      <th className="px-4 py-3">Sinyal</th>
                      <th className="px-4 py-3">ROE</th>
                      <th className="px-4 py-3">Borç / özsermaye</th>
                      <th className="px-4 py-3">Kazanç</th>
                      <th className="px-4 py-3">Durum</th>
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
                            <div className="flex items-center gap-2">
                              <CompanyLogo symbol={row.symbol} logoUrl={stock?.logoUrl} className="h-8 w-8" />
                              <div className="min-w-0">
                                <div className="font-data-mono font-bold text-text-primary">{row.symbol}</div>
                                <div className="max-w-40 truncate text-xs text-text-muted">{row.name ?? stock?.name ?? 'Şirket bilgisi yok'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatCurrency(row.price.data?.lastPrice)}</td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatVolume(row.price.data?.volume)}</td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatNumber(row.technical.data?.rsi14, 1)}</td>
                          <td className="px-4 py-4">
                            <div className="font-data-mono font-bold text-text-primary">{row.technical.data?.action ?? '—'}</div>
                            <div className="text-xs text-text-muted">{formatPercentRatio(row.technical.data?.confidence)}</div>
                          </td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatPercentRatio(row.fundamentals.data?.roe)}</td>
                          <td className="px-4 py-4 font-data-mono text-text-primary">{formatNumber(row.fundamentals.data?.debtToEquity)}</td>
                          <td className="px-4 py-4">
                            <div className="font-data-mono text-text-primary">
                              {row.earnings.data?.quarters?.[0]?.period ?? 'N/A'}
                            </div>
                            <div className="text-xs text-text-muted">
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
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 font-data-mono text-base font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SnapshotTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
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
      className={`inline-flex rounded-full border px-2 py-1 font-data-mono text-xs font-bold ${statusClass(status)}`}
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
        Son araştırma bağlamını incelemek için bir sembol seçin.
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
          <div className="text-xs font-label-caps uppercase tracking-wider text-text-muted">Seçili varlık</div>
          <h3 className="mt-1 truncate font-headline text-xl font-bold text-text-primary">
            {symbol}{stock ? ` - ${stock.name}` : ''}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {row ? <StatusPill status={row.overallStatus} /> : <StatusPill status="EMPTY" />}
            <span className="rounded-full border border-outline-variant bg-bg-base px-2 py-1 text-xs text-text-muted">
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
            Ayrıntıları aç
          </button>
          <button
            type="button"
            onClick={() => onOpenTradeModal(symbol)}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-bg-base "
          >
            İşlem kaydı ekle
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Son fiyat" value={formatCurrency(price?.lastPrice ?? stock?.price)} />
        <Metric label="Gün aralığı" value={`${formatCurrency(price?.low ?? stock?.low)} / ${formatCurrency(price?.high ?? stock?.high)}`} />
        <Metric label="Hacim" value={formatVolume(price?.volume)} />
        <Metric label="RSI 14" value={formatNumber(technical?.rsi14, 1)} />
        <Metric label="Sinyal" value={technical?.action ?? '—'} />
        <Metric label="ROE" value={formatPercentRatio(fundamentals?.roe ?? stock?.roe)} />
        <Metric label="Borç / özsermaye" value={formatNumber(fundamentals?.debtToEquity ?? stock?.debtEquity)} />
        <Metric label="Kalite" value={formatNumber(institutional?.qualityComposite, 1)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ResearchSource label="Fiyat" status={row?.price.status ?? 'EMPTY'} source={row?.price.source} message={row?.price.message} />
        <ResearchSource label="Teknik" status={row?.technical.status ?? 'EMPTY'} source={row?.technical.source} message={row?.technical.message} />
        <ResearchSource label="Temel veriler" status={row?.fundamentals.status ?? 'EMPTY'} source={row?.fundamentals.source} message={row?.fundamentals.message} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
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
        <div className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</div>
        <StatusPill status={status} />
      </div>
      <div className="mt-2 truncate text-xs text-text-secondary">{source ?? 'Sağlayıcı yok'}</div>
      {message ? <div className="mt-1 truncate text-xs text-text-muted">{message}</div> : null}
    </div>
  );
}


