import React, { useEffect, useState } from 'react';
import { X, DollarSign, TrendingUp } from 'lucide-react';
import type { Stock, Holding, Trade } from '../types';

interface TradeActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  stocks: Stock[];
  holdings: Holding[];
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => Promise<void> | void;
}

export default function TradeActionModal({
  isOpen,
  onClose,
  symbol,
  stocks,
  holdings,
  onExecuteTrade,
}: TradeActionModalProps) {
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const activeStock = stocks.find((stock) => stock.symbol === symbol);

  useEffect(() => {
    setPrice(activeStock?.price ?? 0);
  }, [activeStock]);

  if (!isOpen) return null;

  const handleExecute = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError('');
    if (quantity <= 0 || price <= 0) {
      alert('Geçerli miktar ve birim fiyat girin.');
      return;
    }

    if (type === 'SELL') {
      const owned = holdings.find((holding) => holding.symbol === symbol);
      if (!owned || owned.quantity < quantity) {
        alert(`Yetersiz miktar. ${symbol} için ${owned ? owned.quantity.toFixed(4) : 0} adet var; ${quantity} adet satılamaz.`);
        return;
      }
    }

    setSaving(true);
    try {
      await onExecuteTrade({
        symbol,
        type,
        quantity,
        price,
        notes: notes.trim() || `${symbol} için manuel işlem kaydı.`,
      });
      onClose();
    } catch {
      setSaveError('İşlem kaydedilemedi. Bilgileri kontrol edip yeniden deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-bg-primary border border-outline-variant rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              İşlem kaydı ({symbol})
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleExecute} className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between bg-bg-base/50 border border-outline-variant/35 p-3 rounded-lg font-data-mono">
            <div>
              <span className="text-text-muted text-[9px] block">VARLIK</span>
              <span className="text-xs font-bold text-text-primary">{activeStock?.name ?? symbol}</span>
            </div>
            <div className="text-right">
              <span className="text-text-muted text-[9px] block">SON FİYAT</span>
              <span className="text-xs font-bold text-primary">{activeStock ? `$${activeStock.price.toFixed(2)}` : 'Fiyat yok'}</span>
            </div>
          </div>

          <div>
            <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                İşlem yönü
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
                Alış
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
                Satış
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                Miktar
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(parseFloat(event.target.value) || 0)}
                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                Birim fiyat ($)
              </label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(event) => setPrice(parseFloat(event.target.value) || 0)}
                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                İşlem notu / yatırım tezi
            </label>
            <textarea
              placeholder="İşlem gerekçenizi yazın..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full bg-bg-base border border-outline-variant rounded-lg p-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div className="bg-bg-base/30 p-2.5 rounded border border-outline-variant/20 flex justify-between items-baseline font-data-mono">
            <span className="text-text-muted text-[10px]">İŞLEM TUTARI:</span>
            <span className="text-xs font-bold text-text-primary">
              ${(quantity * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {saveError && <p role="alert" className="rounded-lg border border-bear-red/40 bg-bear-red/10 p-3 text-bear-red">{saveError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-primary hover:bg-primary-container text-bg-base font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? 'Kaydediliyor…' : 'İşlemi kaydet'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
