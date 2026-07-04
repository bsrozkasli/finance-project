import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, HelpCircle, Plus } from 'lucide-react';
import { Stock, Holding, Trade } from '../types';

interface TradeActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  stocks: Stock[];
  holdings: Holding[];
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => void;
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
  const [price, setPrice] = useState<number>(100);
  const [notes, setNotes] = useState('');

  const activeStock = stocks.find((s) => s.symbol === symbol) || stocks[0];

  useEffect(() => {
    if (activeStock) {
      setPrice(activeStock.price);
    }
  }, [activeStock]);

  if (!isOpen || !activeStock) return null;

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 || price <= 0) {
      alert('Geçersiz adet veya birim fiyat.');
      return;
    }

    // Check if selling more than owned
    if (type === 'SELL') {
      const owned = holdings.find((h) => h.symbol === symbol);
      if (!owned || owned.quantity < quantity) {
        alert(
          `Yetersiz bakiye! Elinizde sadece ${
            owned ? owned.quantity.toFixed(4) : 0
          } adet ${symbol} var, ancak ${quantity} adet satmak istiyorsunuz.`
        );
        return;
      }
    }

    onExecuteTrade({
      symbol,
      type,
      quantity,
      price,
      notes: notes.trim() || `${symbol} üzerinde manuel işlem emri tetiklendi.`,
    });

    alert(`${symbol} işlemi başarıyla tamamlandı ve deftere kaydedildi!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-bg-primary border border-outline-variant rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              Emir Giriş Ekranı ({symbol})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExecute} className="p-5 space-y-4 text-xs">
          {/* Stock general stats */}
          <div className="flex items-center justify-between bg-bg-base/50 border border-outline-variant/35 p-3 rounded-lg font-data-mono">
            <div>
              <span className="text-text-muted text-[9px] block">ENSTRÜMAN</span>
              <span className="text-xs font-bold text-text-primary">{activeStock.name}</span>
            </div>
            <div className="text-right">
              <span className="text-text-muted text-[9px] block">AKSES SON FİYAT</span>
              <span className="text-xs font-bold text-primary">${activeStock.price.toFixed(2)}</span>
            </div>
          </div>

          {/* Trade Type BUY or SELL */}
          <div>
            <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
              Emir Yönü (Type)
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

          {/* Qty & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                Adet Miktarı
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
                İşlem Limit Fiyatı ($)
              </label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Note thesis */}
          <div>
            <label className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
              İşlem Notu / Yatırım Tezi
            </label>
            <textarea
              placeholder="Örn: Fibonacci desteğinden geri dönüş teyit edildiği için pozisyon artırıldı..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-bg-base border border-outline-variant rounded-lg p-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Summary stats */}
          <div className="bg-bg-base/30 p-2.5 rounded border border-outline-variant/20 flex justify-between items-baseline font-data-mono">
            <span className="text-text-muted text-[10px]">TAHMİNİ EMİR TUTARI:</span>
            <span className="text-xs font-bold text-text-primary">
              ${(quantity * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Action trigger */}
          <button
            type="submit"
            className="w-full py-2.5 bg-primary hover:bg-primary-container text-bg-base font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            <span>Emri Borsaya Gönder</span>
          </button>
        </form>
      </div>
    </div>
  );
}
