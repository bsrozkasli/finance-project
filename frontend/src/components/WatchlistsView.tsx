import { useMemo, useState } from 'react';
import { Activity, Plus, Newspaper, Target } from 'lucide-react';
import type { Stock, Watchlist } from '../types';

interface WatchlistsViewProps {
  stocks: Stock[];
  watchlists: Watchlist[];
  onAddStockToWatchlist: (watchlistId: string, symbol: string) => void | Promise<void>;
  onAddWatchlist: (name: string) => void | Promise<string | void>;
  onOpenTradeModal: (symbol: string) => void;
  onSelectStock: (stock: Stock) => void;
}

const currency = (value: number) => `$${value.toFixed(2)}`;

export default function WatchlistsView({
  stocks,
  watchlists,
  onAddStockToWatchlist,
  onAddWatchlist,
  onOpenTradeModal,
  onSelectStock,
}: WatchlistsViewProps) {
  const [activeWatchlistId, setActiveWatchlistId] = useState(watchlists[0]?.id ?? 'default');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [tickerToAdd, setTickerToAdd] = useState('');
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [addingTicker, setAddingTicker] = useState(false);
  const [creatingWatchlist, setCreatingWatchlist] = useState(false);

  const activeWatchlist = useMemo(
    () => watchlists.find((watchlist) => watchlist.id === activeWatchlistId) ?? watchlists[0] ?? null,
    [watchlists, activeWatchlistId],
  );

  const activeStocks = useMemo(() => {
    if (!activeWatchlist) return [];
    return stocks.filter((stock) => activeWatchlist.symbols.includes(stock.symbol));
  }, [stocks, activeWatchlist]);

  const activeSymbols = activeWatchlist?.symbols ?? [];

  const selectedStock = useMemo(() => {
    return stocks.find((stock) => stock.symbol === selectedSymbol) ?? activeStocks[0] ?? null;
  }, [stocks, selectedSymbol, activeStocks]);

  const averageChange = activeStocks.length === 0
    ? 0
    : activeStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / activeStocks.length;

  const handleAddTicker = async () => {
    if (!activeWatchlist || !tickerToAdd.trim()) return;
    const symbol = tickerToAdd.trim().toUpperCase();
    setAddingTicker(true);
    try {
      await Promise.resolve(onAddStockToWatchlist(activeWatchlist.id, symbol));
      setTickerToAdd('');
      setSelectedSymbol(symbol);
    } catch (error) {
      console.error('Failed to add symbol to watchlist', error);
      alert(`Could not add symbol: ${symbol}.`);
    } finally {
      setAddingTicker(false);
    }
  };

  const handleCreateWatchlist = async () => {
    const name = newWatchlistName.trim();
    if (!name) return;
    setCreatingWatchlist(true);
    try {
      const createdId = await Promise.resolve(onAddWatchlist(name));
      if (createdId) setActiveWatchlistId(createdId);
      setNewWatchlistName('');
    } catch (error) {
      console.error('Failed to create watchlist', error);
      alert('Watchlist could not be created. Please try again.');
    } finally {
      setCreatingWatchlist(false);
    }
  };

  const renderSparkline = (values: number[], positive: boolean) => {
    if (values.length < 2) return null;
    const width = 160;
    const height = 48;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg className="h-12 w-40" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={positive ? 'var(--color-bull-green)' : 'var(--color-bear-red)'}
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
            Terminal Watchlist Panel
          </h2>
          <p className="text-sm text-text-secondary">
            Track instrument groups, inspect current price context, and open trade tickets from a single workspace.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newWatchlistName}
            onChange={(event) => setNewWatchlistName(event.target.value)}
            placeholder="New watchlist name..."
            className="rounded-lg border border-outline-variant bg-bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreateWatchlist}
            disabled={creatingWatchlist}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-bg-base shadow-sm disabled:opacity-60"
          >
            {creatingWatchlist ? 'Creating...' : 'Create Watchlist'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-outline-variant bg-bg-card p-4 shadow-lg">
            <label className="mb-2 block text-[10px] font-label-caps uppercase tracking-wider text-text-muted">
              Selected Watchlist
            </label>
            <select
              value={activeWatchlist?.id ?? ''}
              onChange={(event) => setActiveWatchlistId(event.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-xs font-bold text-text-primary focus:border-primary focus:outline-none"
            >
              {watchlists.map((watchlist) => (
                <option key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-outline-variant/30 bg-bg-base/50 p-3">
                <div className="text-[9px] uppercase text-text-muted">Active Instruments</div>
                <div className="mt-1 font-data-mono text-lg font-bold text-text-primary">{activeSymbols.length}</div>
              </div>
              <div className="rounded-lg border border-outline-variant/30 bg-bg-base/50 p-3">
                <div className="text-[9px] uppercase text-text-muted">Average Change</div>
                <div className={`mt-1 font-data-mono text-lg font-bold ${averageChange >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                  {averageChange >= 0 ? '+' : ''}{averageChange.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-bg-card p-4 shadow-lg">
            <label className="mb-2 block text-[10px] font-label-caps uppercase tracking-wider text-text-muted">
              Add Instrument
            </label>
            <div className="flex gap-2">
              <input
                value={tickerToAdd}
                onChange={(event) => setTickerToAdd(event.target.value)}
                placeholder="Add stock/ETF..."
                disabled={addingTicker}
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleAddTicker}
                disabled={addingTicker}
                className="rounded-lg bg-primary px-3 py-2 text-bg-base disabled:opacity-60"
                aria-label="Add instrument"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-bg-card p-3 shadow-lg">
            <div className="mb-2 text-[10px] font-label-caps uppercase tracking-wider text-text-muted">
              Watchlist Instruments
            </div>
            <div className="space-y-2">
              {activeSymbols.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant p-6 text-center text-xs text-text-muted">
                  This watchlist has no instruments yet. Add one from the panel above.
                </div>
              ) : (
                activeSymbols.map((symbol) => {
                  const stock = stocks.find((item) => item.symbol === symbol);
                  if (!stock) {
                    return (
                      <div
                        key={symbol}
                        className="w-full rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3 text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-data-mono text-sm font-bold text-text-primary">{symbol}</div>
                            <div className="max-w-44 truncate text-[10px] text-text-muted">Market data unavailable</div>
                          </div>
                          <div className="text-right font-data-mono text-xs text-text-muted">No price</div>
                        </div>
                      </div>
                    );
                  }
                  const positive = stock.changePercent >= 0;
                  return (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        selectedStock?.symbol === stock.symbol
                          ? 'border-primary bg-primary-container/10'
                          : 'border-outline-variant/30 bg-bg-base/40 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-data-mono text-sm font-bold text-text-primary">{stock.symbol}</div>
                          <div className="max-w-44 truncate text-[10px] text-text-muted">{stock.name}</div>
                        </div>
                        <div className="text-right font-data-mono text-xs">
                          <div className="font-bold text-text-primary">{currency(stock.price)}</div>
                          <div className={positive ? 'text-bull-green' : 'text-bear-red'}>
                            {positive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          {!selectedStock ? (
            <div className="rounded-xl border border-outline-variant bg-bg-card p-10 text-center text-xs text-text-muted">
              Select a stock or ETF from the left side to view details.
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-outline-variant bg-bg-card p-5 shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">
                      Instrument Overview
                    </div>
                    <h3 className="mt-1 font-headline text-2xl font-bold text-text-primary">
                      {selectedStock.symbol} - {selectedStock.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedStock.sector} - {selectedStock.industry || 'Industry unavailable'}
                    </p>
                  </div>
                  <div className="text-right font-data-mono">
                    <div className="text-3xl font-black text-text-primary">{currency(selectedStock.price)}</div>
                    <div className={selectedStock.changePercent >= 0 ? 'text-bull-green' : 'text-bear-red'}>
                      {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Metric label="Day Low" value={currency(selectedStock.low)} />
                  <Metric label="Day High" value={currency(selectedStock.high)} />
                  <Metric label="Volume" value={selectedStock.volume} />
                  <Metric label="Market Cap" value={selectedStock.marketCap ?? 'Unavailable'} />
                </div>

                <div className="mt-6 rounded-xl border border-outline-variant/30 bg-bg-base/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-primary">
                    <Activity className="h-4 w-4 text-primary" />
                    Interactive Price Chart
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    {renderSparkline(selectedStock.sparkline, selectedStock.changePercent >= 0)}
                    <div className="text-right text-[10px] text-text-muted">
                      <div>MIN: {currency(Math.min(...selectedStock.sparkline))}</div>
                      <div>MAX: {currency(Math.max(...selectedStock.sparkline))}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-outline-variant bg-bg-card p-5 shadow-lg">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-primary">
                    <Target className="h-4 w-4 text-primary" />
                    Technical Details
                  </div>
                  <div className="space-y-3 text-xs text-text-secondary">
                    <Row label="RSI" value={selectedStock.technicals ? `${selectedStock.technicals.rsi} - ${selectedStock.technicals.rsiStatus}` : 'No data'} />
                    <Row label="MACD" value={selectedStock.technicals ? `${selectedStock.technicals.macd} - ${selectedStock.technicals.macdStatus}` : 'No data'} />
                    <Row label="50-Day SMA" value={selectedStock.technicals ? currency(selectedStock.technicals.sma50) : 'No data'} />
                  </div>
                </div>

                <div className="rounded-xl border border-outline-variant bg-bg-card p-5 shadow-lg">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-primary">
                    <Target className="h-4 w-4 text-primary" />
                    Consensus Analyst Recommendations
                  </div>
                  <div className="space-y-3 text-xs text-text-secondary">
                    <Row label="Target Price" value={selectedStock.analystRating?.targetPrice ? currency(selectedStock.analystRating.targetPrice) : 'No data'} />
                    <Row label="Consensus" value={selectedStock.analystRating?.consensus ?? 'No data'} />
                    <Row label="Buy Ratio" value={selectedStock.analystRating?.buyPercent == null ? 'No data' : `${selectedStock.analystRating.buyPercent}% analysts recommend buying`} />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-outline-variant bg-bg-card p-5 shadow-lg">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-primary">
                  <Newspaper className="h-4 w-4 text-primary" />
                  Instrument News Feed
                </div>
                {selectedStock.news.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-outline-variant p-6 text-center text-xs text-text-muted">
                    No current news is available for this instrument.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedStock.news.slice(0, 5).map((item) => (
                      <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3 hover:border-primary/40">
                        <div className="text-xs font-bold text-text-primary">{item.title}</div>
                        <div className="mt-1 text-[10px] text-text-muted">{item.source} - {item.time}</div>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onSelectStock(selectedStock)}
                  className="rounded-lg border border-outline-variant bg-bg-card px-4 py-2 text-xs font-bold text-text-primary hover:border-primary/40"
                >
                  Open Detail Modal
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTradeModal(selectedStock.symbol)}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-bg-base shadow-sm"
                >
                  Open Trade Ticket
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3">
      <div className="text-[9px] uppercase text-text-muted">{label}</div>
      <div className="mt-1 font-data-mono text-sm font-bold text-text-primary">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/15 py-2 last:border-0">
      <span>{label}</span>
      <span className="font-data-mono font-bold text-text-primary">{value}</span>
    </div>
  );
}
