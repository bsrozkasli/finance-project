import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import type { Portfolio, Stock } from '../types';
import { useJournalTrades } from '../hooks/useJournalTrades';

interface TradingJournalViewProps {
  stocks: Stock[];
  portfolios: Portfolio[];
  onOpenTradeModal: (symbol: string) => void;
}

const asNumber = (value: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function TradingJournalView({
  stocks,
  portfolios,
  onOpenTradeModal,
}: TradingJournalViewProps) {
  const { trades, stats, loading, error, addTrade, removeTrade, reload } = useJournalTrades();
  const [symbol, setSymbol] = useState(stocks[0]?.symbol ?? 'AAPL');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(stocks[0]?.price ?? 1);
  const [notes, setNotes] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const portfolioNameById = useMemo(() => {
    const map: Record<string, string> = {};
    portfolios.forEach((portfolio) => {
      map[portfolio.id] = portfolio.name;
    });
    return map;
  }, [portfolios]);

  const filteredTrades = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return trades
      .filter((trade) => {
        if (!query) return true;
        return (
          trade.symbol.toLowerCase().includes(query) ||
          (trade.notes ?? '').toLowerCase().includes(query) ||
          (trade.strategy ?? '').toLowerCase().includes(query)
        );
      })
      .sort((left, right) => new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime());
  }, [filterQuery, trades]);

  const handleSelectSymbolChange = (nextSymbol: string) => {
    setSymbol(nextSymbol);
    const matchedStock = stocks.find((stock) => stock.symbol === nextSymbol);
    if (matchedStock) {
      setPrice(matchedStock.price);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (quantity <= 0 || price <= 0 || !symbol.trim()) {
      alert('Please enter a valid symbol, quantity, and price.');
      return;
    }

    setSaving(true);
    try {
      await addTrade({
        symbol,
        type,
        quantity,
        purchasePrice: price,
        currentPrice: price,
        openedAt: new Date().toISOString().slice(0, 10),
        status: 'OPEN',
        notes: notes.trim(),
        portfolioId: asNumber(portfolioId),
      });
      setNotes('');
      void reload();
    } catch (err) {
      console.error('Failed to add journal trade', err);
      alert('Trade could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Delete this journal trade?')) return;
    try {
      await removeTrade(id);
      void reload();
    } catch (err) {
      console.error('Failed to remove journal trade', err);
      alert('Trade could not be deleted. Please try again.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
            Trading Journal
          </h2>
          <p className="text-sm text-text-secondary">
            API-backed trading journal records with persistent add and delete actions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-card"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-outline-variant bg-bg-card p-4">
          <div className="text-[10px] uppercase text-text-muted font-label-caps">Total</div>
          <div className="mt-1 font-data-mono text-xl font-bold text-text-primary">{stats?.totalTrades ?? trades.length}</div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-bg-card p-4">
          <div className="text-[10px] uppercase text-text-muted font-label-caps">Open</div>
          <div className="mt-1 font-data-mono text-xl font-bold text-primary">{stats?.openTrades ?? 0}</div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-bg-card p-4">
          <div className="text-[10px] uppercase text-text-muted font-label-caps">Closed</div>
          <div className="mt-1 font-data-mono text-xl font-bold text-text-primary">{stats?.closedTrades ?? 0}</div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-bg-card p-4">
          <div className="text-[10px] uppercase text-text-muted font-label-caps">Avg Return</div>
          <div className="mt-1 font-data-mono text-xl font-bold text-text-primary">{(stats?.avgReturn ?? 0).toFixed(2)}%</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-bear-red/40 bg-bear-red/10 p-3 text-xs font-bold text-bear-red">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-outline-variant/30 pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              New Trade
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                Symbol
              </label>
              <select
                value={symbol}
                onChange={(event) => handleSelectSymbolChange(event.target.value)}
                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-bold focus:outline-none focus:border-primary"
              >
                {stocks.length === 0 && <option value={symbol}>{symbol}</option>}
                {stocks.map((stock) => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.name} (${stock.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                Portfolio
              </label>
              <select
                value={portfolioId}
                onChange={(event) => setPortfolioId(event.target.value)}
                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-bold focus:outline-none focus:border-primary"
              >
                <option value="">No portfolio link</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('BUY')}
                className={`py-2 rounded-lg font-bold border ${type === 'BUY' ? 'bg-bull-green/10 border-bull-green text-bull-green' : 'bg-bg-base border-outline-variant text-text-secondary'}`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setType('SELL')}
                className={`py-2 rounded-lg font-bold border ${type === 'SELL' ? 'bg-bear-red/10 border-bear-red text-bear-red' : 'bg-bg-base border-outline-variant text-text-secondary'}`}
              >
                SELL
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(parseFloat(event.target.value) || 0)}
                  className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">Price</label>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={(event) => setPrice(parseFloat(event.target.value) || 0)}
                  className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">Notes</label>
              <textarea
                placeholder="Trade thesis, risk notes, or execution context..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full bg-bg-base border border-outline-variant rounded-lg p-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-primary hover:bg-primary-container text-bg-base font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{saving ? 'Saving...' : 'Save Trade'}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-2">
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              Journal Records ({filteredTrades.length})
            </h3>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search notes or symbol..."
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                className="bg-bg-base border border-outline-variant rounded px-2 py-1 pl-7 text-xs text-text-primary placeholder:text-text-muted w-52 focus:outline-none focus:border-primary transition-all font-sans"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-xs text-text-muted font-sans">Loading journal trades...</div>
            ) : filteredTrades.length === 0 ? (
              <div className="text-center py-12 text-xs text-text-muted font-sans">
                No journal trades found.
              </div>
            ) : (
              filteredTrades.map((trade) => {
                const isBuy = trade.type === 'BUY';
                const totalCost = trade.quantity * trade.purchasePrice;
                const dateFormatted = new Date(trade.openedAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={trade.id}
                    className="p-4 bg-bg-base/50 border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-outline-variant transition-colors group relative"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] font-label-caps px-2 py-0.5 rounded border font-bold ${isBuy ? 'bg-bull-green/10 border-bull-green/35 text-bull-green' : 'bg-bear-red/10 border-bear-red/35 text-bear-red'}`}>
                          {trade.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenTradeModal(trade.symbol)}
                          className="font-data-mono text-sm font-bold text-primary hover:text-text-primary"
                        >
                          {trade.symbol}
                        </button>
                        <span className="text-[10px] text-text-muted font-sans">{dateFormatted}</span>
                        {trade.portfolioId != null && (
                          <span className="text-[10px] text-text-muted font-sans">
                            {portfolioNameById[String(trade.portfolioId)] ?? `Portfolio ${trade.portfolioId}`}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 font-data-mono text-xs text-text-secondary">
                        <div>Qty: <span className="text-text-primary font-bold">{trade.quantity}</span></div>
                        <div>Price: <span className="text-text-primary font-bold">${trade.purchasePrice.toFixed(2)}</span></div>
                        <div>Total: <span className="text-primary font-bold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        <div>PnL: <span className={(trade.pnl ?? 0) >= 0 ? 'text-bull-green font-bold' : 'text-bear-red font-bold'}>${(trade.pnl ?? 0).toFixed(2)}</span></div>
                      </div>

                      {(trade.notes || trade.strategy) && (
                        <div className="bg-bg-card/40 border border-outline-variant/20 p-2.5 rounded text-xs text-text-secondary font-sans leading-relaxed">
                          {trade.strategy && <span className="font-bold text-text-primary">{trade.strategy}: </span>}
                          {trade.notes}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => void handleRemove(trade.id)}
                      className="p-1.5 text-text-muted hover:text-bear-red rounded bg-bg-card hover:bg-bear-red/10 border border-outline-variant/35 transition-all self-end sm:self-start shrink-0"
                      title="Delete trade"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
