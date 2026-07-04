import React, { useState } from 'react';
import { BookOpen, Search, ArrowUpRight, ArrowDownRight, Tag, Calendar, Plus, Trash2 } from 'lucide-react';
import { Trade, Stock } from '../types';

interface TradingJournalViewProps {
  trades: Trade[];
  stocks: Stock[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'date'>) => void;
  onRemoveTrade: (id: string) => void;
}

export default function TradingJournalView({
  trades,
  stocks,
  onAddTrade,
  onRemoveTrade,
}: TradingJournalViewProps) {
  const [symbol, setSymbol] = useState('MSFT');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(412.55);
  const [notes, setNotes] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 || price <= 0) {
      alert('Lütfen geçerli miktar ve fiyat giriniz.');
      return;
    }
    onAddTrade({
      symbol,
      type,
      quantity,
      price,
      notes: notes.trim() || 'No additional investment notes provided.',
    });
    setNotes('');
    alert('İşlem başarıyla borsa defterine eklendi!');
  };

  const handleSelectSymbolChange = (sym: string) => {
    setSymbol(sym);
    const matchedStock = stocks.find((s) => s.symbol === sym);
    if (matchedStock) {
      setPrice(matchedStock.price);
    }
  };

  // Filtered trades
  const filteredTrades = trades.filter(
    (t) =>
      t.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.notes.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      {/* View Header */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
          İşlem Defteri (Trading Journal)
        </h2>
        <p className="text-sm text-text-secondary">
          Borsa portföy alım-satım geçmişinizi kayıt altına alın ve yatırım tezlerinizi not edin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Add Trade Record */}
        <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-outline-variant/30 pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              Yeni İşlem Kaydı
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            {/* Ticker Symbol Selector */}
            <div>
              <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                Yatırım Enstrümanı
              </label>
              <select
                value={symbol}
                onChange={(e) => handleSelectSymbolChange(e.target.value)}
                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-bold focus:outline-none focus:border-primary"
              >
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} - {s.name} (${s.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Type BUY or SELL */}
            <div>
              <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                İşlem Türü
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('BUY')}
                  className={`py-2 text-center rounded-lg font-bold border transition-all ${
                    type === 'BUY'
                      ? 'bg-bull-green/10 border-bull-green text-bull-green'
                      : 'bg-bg-base border-outline-variant/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  ALIM (BUY)
                </button>
                <button
                  type="button"
                  onClick={() => setType('SELL')}
                  className={`py-2 text-center rounded-lg font-bold border transition-all ${
                    type === 'SELL'
                      ? 'bg-bear-red/10 border-bear-red text-bear-red'
                      : 'bg-bg-base border-outline-variant/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  SATIM (SELL)
                </button>
              </div>
            </div>

            {/* Price & Quantity Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                  Miktar (Adet)
                </label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                  Birim Fiyat ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-2 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Thesis investment notes */}
            <div>
              <label className="block text-text-muted font-label-caps text-[10px] uppercase mb-1">
                İşlem Tezi ve Notlar
              </label>
              <textarea
                placeholder="Örn: Azure bulut büyümesi ve yapay zeka entegrasyonu beklentisiyle portföy ağırlığı artırıldı..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-bg-base border border-outline-variant rounded-lg p-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-container text-bg-base font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Kayıt Defterine İşle</span>
            </button>
          </form>
        </div>

        {/* Right column: Ledger Table log list */}
        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-2">
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              İşlem Kayıtları ({filteredTrades.length})
            </h3>

            {/* Quick search filter */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Tez veya sembol ara..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-bg-base border border-outline-variant rounded px-2 py-1 pl-7 text-xs text-text-primary placeholder:text-text-muted w-44 focus:outline-none focus:border-primary transition-all font-sans"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredTrades.length === 0 ? (
              <div className="text-center py-12 text-xs text-text-muted font-sans">
                Kayıtlı işlem bulunamadı. Sol panelden ilk alım-satım işleminizi kaydedin.
              </div>
            ) : (
              [...filteredTrades].reverse().map((trade) => {
                const isBuy = trade.type === 'BUY';
                const totalCost = trade.quantity * trade.price;
                const formattedDate = new Date(trade.date).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={trade.id}
                    className="p-4 bg-bg-base/50 border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-outline-variant transition-colors group relative"
                  >
                    <div className="space-y-1.5 flex-1">
                      {/* Badge / Header */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-label-caps px-2 py-0.5 rounded border font-bold ${
                            isBuy
                              ? 'bg-bull-green/10 border-bull-green/35 text-bull-green'
                              : 'bg-bear-red/10 border-bear-red/35 text-bear-red'
                          }`}
                        >
                          {isBuy ? 'ALIM (BUY)' : 'SATIM (SELL)'}
                        </span>
                        <span className="font-data-mono text-sm font-bold text-text-primary">
                          {trade.symbol}
                        </span>
                        <span className="text-[10px] text-text-muted font-sans">• {formattedDate}</span>
                      </div>

                      {/* Trade details */}
                      <div className="flex gap-4 font-data-mono text-xs text-text-secondary">
                        <div>
                          Miktar: <span className="text-text-primary font-bold">{trade.quantity}</span>
                        </div>
                        <div>
                          Birim Fiyat: <span className="text-text-primary font-bold">${trade.price.toFixed(2)}</span>
                        </div>
                        <div>
                          Toplam: <span className="text-primary font-bold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Investment Thesis notes */}
                      <div className="bg-bg-card/40 border border-outline-variant/20 p-2.5 rounded text-xs text-text-secondary font-sans italic leading-relaxed">
                        {trade.notes}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        if (confirm('Bu işlem kaydını defterden silmek istediğinize emin misiniz?')) {
                          onRemoveTrade(trade.id);
                        }
                      }}
                      className="p-1.5 text-text-muted hover:text-bear-red rounded bg-bg-card hover:bg-bear-red/10 border border-outline-variant/35 transition-all self-end sm:self-start shrink-0"
                      title="Kaydı Sil"
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
