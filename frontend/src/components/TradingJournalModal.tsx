import { useMemo, useState } from 'react';
import { X, Trash2, BookOpen } from 'lucide-react';
import type { Trade, Stock, Portfolio } from '../types';

interface TradingJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  stocks: Stock[];
  portfolios: Portfolio[];
  onRemoveTrade: (id: string) => void;
  onOpenTradeModal: (symbol: string) => void;
}

export default function TradingJournalModal({
  isOpen,
  onClose,
  trades,
  stocks,
  portfolios,
  onRemoveTrade,
  onOpenTradeModal,
}: TradingJournalModalProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const symbols = useMemo(() => {
    const list = new Set<string>();
    trades.forEach((trade) => list.add(trade.symbol));
    stocks.forEach((stock) => list.add(stock.symbol));
    return Array.from(list).sort();
  }, [trades, stocks]);

  const portfolioMap = useMemo(() => {
    const map: Record<string, string> = {};
    portfolios.forEach((portfolio) => {
      map[portfolio.id] = portfolio.name;
    });
    return map;
  }, [portfolios]);

  const filteredTrades = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return trades.filter((trade) => {
      const matchesType = selectedType === 'ALL' || trade.type === selectedType;
      const matchesSymbol = selectedSymbol === 'ALL' || trade.symbol === selectedSymbol;
      const matchesPortfolio = selectedPortfolio === 'ALL' || trade.portfolioId === selectedPortfolio;
      const matchesSearch = !query || trade.notes.toLowerCase().includes(query) || trade.symbol.toLowerCase().includes(query);
      return matchesType && matchesSymbol && matchesPortfolio && matchesSearch;
    });
  }, [trades, selectedType, selectedSymbol, selectedPortfolio, searchQuery]);

  const stats = useMemo(() => {
    return filteredTrades.reduce(
      (acc, trade) => {
        const value = trade.quantity * trade.price;
        acc.totalCount += 1;
        if (trade.type === 'BUY') acc.totalBuys += value;
        if (trade.type === 'SELL') acc.totalSells += value;
        return acc;
      },
      { totalCount: 0, totalBuys: 0, totalSells: 0 },
    );
  }, [filteredTrades]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-bg-primary border border-outline-variant rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-outline-variant bg-bg-card/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-container/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-text-primary uppercase tracking-wide">
                Trading Journal
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Filter, review, and manage all buy and sell orders across your portfolios.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-outline-variant/35 bg-bg-card/15 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/30 shrink-0 text-xs">
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Trade Count</span>
            <span className="font-data-mono text-lg font-bold text-text-primary mt-1">{stats.totalCount}</span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Total Buy Value</span>
            <span className="font-data-mono text-lg font-bold text-bull-green mt-1">
              ${stats.totalBuys.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Total Sell Value</span>
            <span className="font-data-mono text-lg font-bold text-bear-red mt-1">
              ${stats.totalSells.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Quick Trade Entry</span>
            <select
              onChange={(event) => {
                if (event.target.value !== 'SELECT') {
                  onOpenTradeModal(event.target.value);
                  event.target.value = 'SELECT';
                }
              }}
              defaultValue="SELECT"
              className="mt-1 w-full bg-bg-base border border-outline-variant rounded px-2 py-1 text-[11px] font-bold text-primary focus:outline-none focus:border-primary"
            >
              <option value="SELECT" disabled>Select Instrument...</option>
              {stocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 bg-bg-base/40 border-b border-outline-variant/30 flex flex-col sm:flex-row gap-3 items-center shrink-0 text-xs">
          <div className="w-full sm:w-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Portfolio</label>
            <select
              value={selectedPortfolio}
              onChange={(event) => setSelectedPortfolio(event.target.value)}
              className="w-full sm:w-40 bg-bg-card border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary font-medium"
            >
              <option value="ALL">All Portfolios</option>
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Trade Side</label>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as 'ALL' | 'BUY' | 'SELL')}
              className="w-full sm:w-36 bg-bg-card border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary font-medium"
            >
              <option value="ALL">All (BUY/SELL)</option>
              <option value="BUY">Buys (BUY)</option>
              <option value="SELL">Sells (SELL)</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Instrument</label>
            <select
              value={selectedSymbol}
              onChange={(event) => setSelectedSymbol(event.target.value)}
              className="w-full sm:w-32 bg-bg-card border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary font-medium"
            >
              <option value="ALL">All Stocks</option>
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:flex-1 sm:ml-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Search Notes</label>
            <input
              type="text"
              placeholder="Search thesis, notes, or description..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-bg-card border border-outline-variant rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="border border-outline-variant rounded-xl overflow-hidden bg-bg-card/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-base border-b border-outline-variant/40 text-[9px] font-label-caps text-text-muted tracking-wider uppercase">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Portfolio</th>
                  <th className="py-2.5 px-4">Symbol</th>
                  <th className="py-2.5 px-4">Trade Side</th>
                  <th className="py-2.5 px-4 text-right">Quantity</th>
                  <th className="py-2.5 px-4 text-right">Trade Price</th>
                  <th className="py-2.5 px-4 text-right">Total Value</th>
                  <th className="py-2.5 px-4">Investment Thesis / Notes</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-text-muted font-sans text-xs">
                      No trade records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const totalCost = trade.quantity * trade.price;
                    const dateFormatted = new Date(trade.date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={trade.id} className="hover:bg-bg-base/30 transition-colors font-sans">
                        <td className="py-3 px-4 font-data-mono text-text-secondary whitespace-nowrap">{dateFormatted}</td>
                        <td className="py-3 px-4 font-bold text-text-secondary whitespace-nowrap">
                          {portfolioMap[trade.portfolioId || ''] || 'Technology Portfolio'}
                        </td>
                        <td className="py-3 px-4 font-data-mono font-bold text-primary">{trade.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trade.type === 'BUY' ? 'bg-bull-green/10 text-bull-green' : 'bg-bear-red/10 text-bear-red'}`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-data-mono font-bold text-text-primary">{trade.quantity.toFixed(4)}</td>
                        <td className="py-3 px-4 text-right font-data-mono text-text-secondary">${trade.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-data-mono font-bold text-text-primary">${totalCost.toFixed(2)}</td>
                        <td className="py-3 px-4 text-text-secondary max-w-xs truncate" title={trade.notes}>{trade.notes}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (confirm('Delete this trade? The portfolio position will be recalculated automatically.')) {
                                onRemoveTrade(trade.id);
                              }
                            }}
                            className="p-1.5 text-text-muted hover:text-bear-red hover:bg-bear-red/10 rounded-lg transition-colors"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant bg-bg-card/45 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary-container text-on-primary-container hover:opacity-95 text-xs font-bold rounded-lg shadow-md transition-all uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
