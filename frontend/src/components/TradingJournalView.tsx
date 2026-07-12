import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  DollarSign,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { createPortfolioTransaction } from '../api/client';
import type { Portfolio, Stock } from '../types';
import { useJournalTrades } from '../hooks/useJournalTrades';

interface TradingJournalViewProps {
  stocks: Stock[];
  portfolios: Portfolio[];
  onOpenTradeModal: (symbol: string) => void;
}

type TradeSide = 'BUY' | 'SELL';
type EntryMode = 'AMOUNT' | 'QUANTITY';

const asNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toPositiveNumber = (value: string): number | null => {
  const parsed = asNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
};

const formatNumber = (value: number | null | undefined, digits = 4) => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TradingJournalView({
  stocks,
  portfolios,
  onOpenTradeModal,
}: TradingJournalViewProps) {
  const { trades, stats, loading, error, addTrade, removeTrade, reload } = useJournalTrades();
  const [symbolInput, setSymbolInput] = useState(stocks[0]?.symbol ?? 'AAPL');
  const [type, setType] = useState<TradeSide>('BUY');
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [linkPortfolio, setLinkPortfolio] = useState(Boolean(portfolios[0]?.id));
  const [entryMode, setEntryMode] = useState<EntryMode>('AMOUNT');
  const [amountInput, setAmountInput] = useState('1000');
  const [quantityInput, setQuantityInput] = useState('1');
  const [priceInput, setPriceInput] = useState(stocks[0]?.price ? String(stocks[0].price) : '1');
  const [commissionInput, setCommissionInput] = useState('0');
  const [tradeDate, setTradeDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);

  const normalizedSymbol = symbolInput.trim().toUpperCase();
  const stockBySymbol = useMemo(() => new Map(stocks.map((stock) => [stock.symbol, stock])), [stocks]);
  const matchedStock = normalizedSymbol ? stockBySymbol.get(normalizedSymbol) ?? null : null;

  const symbolSuggestions = useMemo(() => {
    const portfolioSymbols = portfolios.flatMap((portfolio) => portfolio.holdings.map((holding) => holding.symbol));
    const symbols = Array.from(new Set([...stocks.map((stock) => stock.symbol), ...portfolioSymbols]));
    const query = normalizedSymbol;
    return symbols
      .filter((candidate) => !query || candidate.includes(query) || stockBySymbol.get(candidate)?.name.toUpperCase().includes(query))
      .slice(0, 8);
  }, [normalizedSymbol, portfolios, stockBySymbol, stocks]);

  const portfolioNameById = useMemo(() => {
    const map: Record<string, string> = {};
    portfolios.forEach((portfolio) => {
      map[portfolio.id] = portfolio.name;
    });
    return map;
  }, [portfolios]);

  const price = toPositiveNumber(priceInput);
  const amount = toPositiveNumber(amountInput);
  const manualQuantity = toPositiveNumber(quantityInput);
  const commission = asNumber(commissionInput) ?? 0;
  const calculatedQuantity = entryMode === 'AMOUNT' && amount != null && price != null ? amount / price : manualQuantity;
  const calculatedGross = entryMode === 'QUANTITY' && manualQuantity != null && price != null ? manualQuantity * price : amount;
  const calculatedNet = calculatedGross != null ? calculatedGross + Math.max(commission, 0) : null;
  const selectedPortfolioId = asNumber(portfolioId);
  const canLinkPortfolio = linkPortfolio && selectedPortfolioId != null;

  const filteredTrades = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return trades
      .filter((trade) => {
        if (!query) return true;
        return (
          trade.symbol.toLowerCase().includes(query) ||
          (trade.notes ?? '').toLowerCase().includes(query) ||
          (trade.strategy ?? '').toLowerCase().includes(query) ||
          (trade.status ?? '').toLowerCase().includes(query)
        );
      })
      .sort((left, right) => new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime());
  }, [filterQuery, trades]);

  const selectSymbol = (nextSymbol: string) => {
    const symbol = nextSymbol.trim().toUpperCase();
    setSymbolInput(symbol);
    const stock = stockBySymbol.get(symbol);
    if (stock?.price) {
      setPriceInput(String(stock.price));
    }
  };

  const validate = () => {
    if (!normalizedSymbol) return 'Symbol is required.';
    if (!price) return 'Purchase price must be greater than zero.';
    if (!calculatedQuantity || calculatedQuantity <= 0) return 'Quantity must be greater than zero.';
    if (!calculatedGross || calculatedGross <= 0) return 'Trade amount must be greater than zero.';
    if (commission < 0) return 'Commission cannot be negative.';
    if (!tradeDate) return 'Trade date is required.';
    if (linkPortfolio && selectedPortfolioId == null) return 'Select a portfolio or switch to journal-only mode.';
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const quantity = Number(calculatedQuantity?.toFixed(8));
    const purchasePrice = price ?? 0;
    const notes = description.trim();
    const journalNotes = notes || `${normalizedSymbol} ${type} trade`;

    setSaving(true);
    setFormError(null);
    try {
      if (canLinkPortfolio && selectedPortfolioId != null) {
        await createPortfolioTransaction(selectedPortfolioId, {
          symbol: normalizedSymbol,
          action: type,
          quantity,
          price: purchasePrice,
          fee: Math.max(commission, 0),
          tradeDate,
          source: 'MANUAL',
          notes,
          journalNotes,
        });
      } else {
        await addTrade({
          symbol: normalizedSymbol,
          type,
          quantity,
          purchasePrice,
          currentPrice: matchedStock?.price ?? purchasePrice,
          commission: Math.max(commission, 0),
          openedAt: tradeDate,
          status: type === 'SELL' ? 'CLOSED' : 'OPEN',
          notes: journalNotes,
          portfolioId: undefined,
        });
      }
      setDescription('');
      setAmountInput('');
      setQuantityInput('');
      void reload();
    } catch (err) {
      console.error('Failed to save journal trade', err);
      setFormError('Trade could not be saved. Check the selected portfolio and symbol, then try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeTrade(id);
      setDeleteCandidateId(null);
      void reload();
    } catch (err) {
      console.error('Failed to remove journal trade', err);
      setFormError('Trade could not be deleted. Please try again.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-label-caps uppercase tracking-wider text-text-muted">Execution Ledger</div>
          <h2 className="mt-1 font-headline text-2xl font-bold tracking-tight text-text-primary">Trading Journal</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Record journal-only trades or link executions to a portfolio ledger with calculated quantity and cost.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-bg-card px-3 py-2 text-sm font-bold text-text-secondary hover:text-text-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total" value={String(stats?.totalTrades ?? trades.length)} />
        <StatTile label="Open" value={String(stats?.openTrades ?? 0)} tone="primary" />
        <StatTile label="Closed" value={String(stats?.closedTrades ?? 0)} />
        <StatTile label="Avg Return" value={`${(stats?.avgReturn ?? 0).toFixed(2)}%`} tone={(stats?.avgReturn ?? 0) >= 0 ? 'positive' : 'negative'} />
      </div>

      {(error || formError) ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-bear-red/40 bg-bear-red/10 p-3 text-sm font-bold text-bear-red">
          <AlertCircle className="h-4 w-4" />
          {formError ?? error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        <section className="rounded-lg border border-outline-variant bg-bg-card p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-text-primary">New Trade Ticket</h3>
            </div>
            <span className="rounded-full border border-outline-variant bg-bg-base px-2 py-1 text-[10px] text-text-muted">
              {canLinkPortfolio ? 'Portfolio linked' : 'Journal only'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block text-[10px] font-label-caps uppercase tracking-wide text-text-muted">Symbol</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={symbolInput}
                  onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                  onBlur={() => selectSymbol(symbolInput)}
                  placeholder="Search or type ticker"
                  aria-label="Symbol"
                  className="w-full rounded-lg border border-outline-variant bg-bg-base py-2 pl-9 pr-3 font-data-mono font-bold text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              {symbolSuggestions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {symbolSuggestions.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => selectSymbol(candidate)}
                      className="rounded-full border border-outline-variant bg-bg-base px-2 py-1 font-data-mono text-[10px] font-bold text-text-secondary hover:border-primary/50 hover:text-text-primary"
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              ) : null}
              {!matchedStock && normalizedSymbol ? (
                <div className="mt-2 text-[10px] text-warning-amber">Symbol is not in the local market list; it will be saved as typed.</div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <SideButton active={type === 'BUY'} tone="positive" onClick={() => setType('BUY')}>BUY</SideButton>
              <SideButton active={type === 'SELL'} tone="negative" onClick={() => setType('SELL')}>SELL</SideButton>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-[10px] font-label-caps uppercase tracking-wide text-text-muted">Portfolio</label>
                <select
                  value={portfolioId}
                  aria-label="Portfolio"
                  onChange={(event) => {
                    setPortfolioId(event.target.value);
                    setLinkPortfolio(Boolean(event.target.value));
                  }}
                  className="w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 font-bold text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">No portfolio</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-outline-variant bg-bg-base px-3 py-2 text-xs font-bold text-text-secondary sm:self-end">
                <input
                  type="checkbox"
                  checked={linkPortfolio}
                  disabled={!portfolioId}
                  onChange={(event) => setLinkPortfolio(event.target.checked)}
                  className="accent-primary"
                />
                Link ledger
              </label>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-label-caps uppercase tracking-wide text-text-muted">Entry Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <ModeButton active={entryMode === 'AMOUNT'} onClick={() => setEntryMode('AMOUNT')}>Amount</ModeButton>
                <ModeButton active={entryMode === 'QUANTITY'} onClick={() => setEntryMode('QUANTITY')}>Quantity</ModeButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Purchase Price" value={priceInput} onChange={setPriceInput} prefix="$" />
              {entryMode === 'AMOUNT' ? (
                <NumberField label="Trade Amount" value={amountInput} onChange={setAmountInput} prefix="$" />
              ) : (
                <NumberField label="Quantity" value={quantityInput} onChange={setQuantityInput} />
              )}
              <NumberField label="Commission" value={commissionInput} onChange={setCommissionInput} prefix="$" />
              <div>
                <label className="mb-1 block text-[10px] font-label-caps uppercase tracking-wide text-text-muted">Trade Date</label>
                <input
                  type="date"
                  aria-label="Trade Date"
                  value={tradeDate}
                  onChange={(event) => setTradeDate(event.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 font-data-mono font-bold text-text-primary focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-outline-variant/40 bg-bg-base/45 p-3">
              <CalcTile label="Quantity" value={formatNumber(calculatedQuantity)} />
              <CalcTile label="Gross" value={formatCurrency(calculatedGross)} />
              <CalcTile label="Net Cost" value={formatCurrency(calculatedNet)} />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-label-caps uppercase tracking-wide text-text-muted">Description</label>
              <textarea
                placeholder="Trade thesis, execution reason, risk note, exit condition..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                aria-label="Description"
                className="w-full rounded-lg border border-outline-variant bg-bg-base p-3 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-bg-base shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving...' : canLinkPortfolio ? 'Save to Portfolio Ledger' : 'Save Journal Trade'}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-outline-variant bg-bg-card p-4 shadow-lg">
          <div className="mb-4 flex flex-col gap-3 border-b border-outline-variant/30 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-text-primary">Journal Records</h3>
              <div className="mt-1 text-xs text-text-muted">{filteredTrades.length} visible of {trades.length} loaded</div>
            </div>
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search symbol, status, notes"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-bg-base py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none sm:w-72"
              />
            </label>
          </div>

          <div className="max-h-[680px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading journal trades
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="rounded-lg border border-dashed border-outline-variant p-10 text-center text-sm text-text-muted">
                No journal trades found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className="sticky top-0 bg-bg-base/80 text-[10px] uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="px-3 py-3">Trade</th>
                      <th className="px-3 py-3">Portfolio</th>
                      <th className="px-3 py-3">Quantity</th>
                      <th className="px-3 py-3">Entry</th>
                      <th className="px-3 py-3">Total</th>
                      <th className="px-3 py-3">PnL</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((trade) => {
                      const isBuy = trade.type === 'BUY';
                      const totalCost = trade.quantity * trade.purchasePrice + (trade.commission ?? 0);
                      const dateFormatted = new Date(trade.openedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      });
                      const deleting = deleteCandidateId === trade.id;

                      return (
                        <tr key={trade.id} className="border-t border-outline-variant/25 align-top hover:bg-bg-base/35">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`rounded border px-2 py-0.5 text-[9px] font-bold ${isBuy ? 'border-bull-green/35 bg-bull-green/10 text-bull-green' : 'border-bear-red/35 bg-bear-red/10 text-bear-red'}`}>
                                {trade.type}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenTradeModal(trade.symbol)}
                                className="font-data-mono text-sm font-bold text-primary hover:text-text-primary"
                              >
                                {trade.symbol}
                              </button>
                            </div>
                            <div className="mt-1 text-[10px] text-text-muted">{dateFormatted}</div>
                          </td>
                          <td className="px-3 py-4 text-text-secondary">
                            {trade.portfolioId != null ? (
                              <span className="inline-flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                {portfolioNameById[String(trade.portfolioId)] ?? `Portfolio ${trade.portfolioId}`}
                              </span>
                            ) : 'Journal only'}
                          </td>
                          <td className="px-3 py-4 font-data-mono font-bold text-text-primary">{formatNumber(trade.quantity)}</td>
                          <td className="px-3 py-4 font-data-mono text-text-primary">{formatCurrency(trade.purchasePrice)}</td>
                          <td className="px-3 py-4 font-data-mono font-bold text-primary">{formatCurrency(totalCost)}</td>
                          <td className="px-3 py-4 font-data-mono">
                            <div className={(trade.pnl ?? 0) >= 0 ? 'text-bull-green' : 'text-bear-red'}>{formatCurrency(trade.pnl ?? 0)}</div>
                            <div className={(trade.returnPct ?? 0) >= 0 ? 'text-bull-green' : 'text-bear-red'}>{(trade.returnPct ?? 0).toFixed(2)}%</div>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${trade.status === 'OPEN' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-outline-variant bg-bg-base text-text-secondary'}`}>
                              {trade.status}
                            </span>
                          </td>
                          <td className="max-w-72 px-3 py-4 text-text-secondary">
                            <div className="line-clamp-2">{trade.notes || trade.strategy || 'No description'}</div>
                          </td>
                          <td className="px-3 py-4 text-right">
                            {deleting ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleRemove(trade.id)}
                                  className="rounded border border-bear-red/35 bg-bear-red/10 px-2 py-1 text-[10px] font-bold text-bear-red"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteCandidateId(null)}
                                  className="rounded border border-outline-variant bg-bg-base p-1 text-text-muted hover:text-text-primary"
                                  aria-label="Cancel delete"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteCandidateId(trade.id)}
                                className="rounded border border-outline-variant/35 bg-bg-base p-1.5 text-text-muted transition-colors hover:border-bear-red/35 hover:bg-bear-red/10 hover:text-bear-red"
                                title="Delete trade"
                                aria-label={`Delete ${trade.symbol} trade`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'primary' | 'positive' | 'negative' }) {
  const toneClass = tone === 'primary' ? 'text-primary' : tone === 'positive' ? 'text-bull-green' : tone === 'negative' ? 'text-bear-red' : 'text-text-primary';
  return (
    <div className="rounded-lg border border-outline-variant bg-bg-card p-4">
      <div className="text-[10px] font-label-caps uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 font-data-mono text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SideButton({ active, tone, onClick, children }: { active: boolean; tone: 'positive' | 'negative'; onClick: () => void; children: ReactNode }) {
  const activeClass = tone === 'positive'
    ? 'border-bull-green bg-bull-green/10 text-bull-green'
    : 'border-bear-red bg-bear-red/10 text-bear-red';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border py-2 font-bold ${active ? activeClass : 'border-outline-variant bg-bg-base text-text-secondary hover:text-text-primary'}`}
    >
      {children}
    </button>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border py-2 font-bold ${active ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-bg-base text-text-secondary hover:text-text-primary'}`}
    >
      {children}
    </button>
  );
}

function NumberField({ label, value, onChange, prefix }: { label: string; value: string; onChange: (value: string) => void; prefix?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-label-caps uppercase tracking-wide text-text-muted">{label}</label>
      <div className="relative">
        {prefix ? <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" /> : null}
        <input
          type="number"
          aria-label={label}
          min="0"
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border border-outline-variant bg-bg-base px-3 py-2 font-data-mono font-bold text-text-primary focus:border-primary focus:outline-none ${prefix ? 'pl-8' : ''}`}
        />
      </div>
    </div>
  );
}

function CalcTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 truncate font-data-mono text-sm font-bold text-text-primary">{value}</div>
    </div>
  );
}
