import React, { useState } from 'react';
import { X, Briefcase, Plus, Trash2, ArrowUpRight } from 'lucide-react';
import type { Stock, Holding, Trade } from '../types';

interface ManageAssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  holdings: Holding[];
  portfolioId?: string;
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => void | Promise<void>;
}

export default function ManageAssetsDrawer({
  isOpen,
  onClose,
  stocks,
  holdings,
  portfolioId,
  onExecuteTrade,
}: ManageAssetsDrawerProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(132.85);

  if (!isOpen) return null;

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    const matched = stocks.find((s) => s.symbol === sym);
    if (matched) {
      setCostPrice(matched.price);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 || costPrice <= 0) {
      alert('Enter a valid quantity and cost basis.');
      return;
    }

    try {
      await onExecuteTrade({
        symbol: selectedSymbol,
        type: 'BUY',
        quantity,
        price: costPrice,
        notes: selectedSymbol + ' position added from portfolio drawer.',
        portfolioId,
      });
      alert(selectedSymbol + ' was saved to the backend portfolio ledger.');
    } catch (error) {
      console.error('Failed to save portfolio position', error);
      alert('Position could not be saved. Please try again.');
    }
  };

  const handleRemoveAsset = async (symbol: string) => {
    const holding = holdings.find((item) => item.symbol === symbol);
    if (!holding) return;
    if (!confirm('Record a SELL transaction to close ' + symbol + '?')) return;

    const stock = stocks.find((item) => item.symbol === symbol);
    try {
      await onExecuteTrade({
        symbol,
        type: 'SELL',
        quantity: holding.quantity,
        price: stock?.price ?? holding.costPrice,
        notes: symbol + ' position closed from portfolio drawer.',
        portfolioId,
      });
    } catch (error) {
      console.error('Failed to close portfolio position', error);
      alert('Position could not be closed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-bg-base/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md">
          <div className="h-full flex flex-col bg-bg-primary border-l border-outline-variant shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="font-headline text-base font-bold text-text-primary uppercase tracking-wide">
                  Portfolio Holdings
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-bg-card rounded-lg border border-outline-variant text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              <div className="bg-bg-card border border-outline-variant/50 p-4 rounded-xl space-y-4">
                <h4 className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-1.5 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-bull-green" />
                  <span>Add Position</span>
                </h4>

                <form onSubmit={handleAddAsset} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                      Instrument
                    </label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => handleSelectSymbol(e.target.value)}
                      className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-bold focus:outline-none focus:border-primary"
                    >
                      {stocks.map((s) => (
                        <option key={s.symbol} value={s.symbol}>
                          {s.symbol} - {s.name} (${s.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                        Average Cost ($)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={costPrice}
                        onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-primary hover:bg-primary-container text-bg-base font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-md shadow-primary/10"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Save to Portfolio</span>
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-1.5">
                  Active Positions ({holdings.length})
                </h4>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {holdings.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-muted font-sans italic">
                      This portfolio has no positions yet. Use the form above to add one.
                    </div>
                  ) : (
                    holdings.map((h) => {
                      const stock = stocks.find((s) => s.symbol === h.symbol);
                      const currentVal = h.quantity * (stock?.price || h.costPrice);
                      return (
                        <div
                          key={h.symbol}
                          className="p-3 bg-bg-card/50 border border-outline-variant/20 rounded-lg flex items-center justify-between gap-4 hover:border-outline-variant transition-all group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-data-mono font-bold text-xs text-text-primary">{h.symbol}</span>
                              <span className="text-[10px] text-text-muted">
                                {h.quantity.toFixed(4)} shares
                              </span>
                            </div>
                            <div className="text-[10px] text-text-secondary mt-1 font-data-mono">
                              Cost: ${h.costPrice.toFixed(2)} | Value: <span className="text-primary font-bold">${currentVal.toFixed(2)}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveAsset(h.symbol)}
                            className="p-1 text-text-muted hover:text-bear-red rounded hover:bg-bear-red/10 transition-colors"
                            title="Close Position"
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

            <div className="p-6 border-t border-outline-variant bg-bg-card/45">
              <div className="text-[10px] text-text-muted font-label-caps uppercase mb-2">
                Notice
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
                Portfolio holdings are persisted through backend ledger transactions. Live market prices come from the market feed when available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
