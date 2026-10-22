import React, { useEffect, useRef, useState } from 'react';
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

// A cost or sale price is only prefilled from a real provider price; otherwise the field stays empty.
const knownPrice = (stock: Stock | undefined) =>
  stock && Number.isFinite(stock.price) && stock.price > 0 ? String(stock.price) : '';

const parsePositive = (value: string) => {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export default function ManageAssetsDrawer({
  isOpen,
  onClose,
  stocks,
  holdings,
  portfolioId,
  onExecuteTrade,
}: ManageAssetsDrawerProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || '');
  const [quantity, setQuantity] = useState('1');
  const [costPrice, setCostPrice] = useState(() => knownPrice(stocks[0]));
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const [closePrice, setClosePrice] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // The drawer stays mounted while closed, often before prices load; on opening, fall back
  // to the first loaded stock and its real price when the remembered symbol is not available.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen && !stocks.some((stock) => stock.symbol === selectedSymbol)) {
      setSelectedSymbol(stocks[0]?.symbol || '');
      setCostPrice(knownPrice(stocks[0]));
    }
  }
  // The parent passes a new onClose on every render; reading it through a ref keeps the
  // focus effect tied to opening and closing only, so a re-render never moves focus.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    setCostPrice(knownPrice(stocks.find((s) => s.symbol === sym)));
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const parsedQuantity = parsePositive(quantity);
    const parsedCost = parsePositive(costPrice);
    if (!selectedSymbol || parsedQuantity == null || parsedCost == null) {
      setFormError('Geçerli bir miktar ve maliyet girin.');
      return;
    }

    setFormError(null);
    try {
      await onExecuteTrade({
        symbol: selectedSymbol,
        type: 'BUY',
        quantity: parsedQuantity,
        price: parsedCost,
        notes: selectedSymbol + ' position added from portfolio drawer.',
        portfolioId,
      });
      setStatusMessage(`${selectedSymbol} portföy defterine kaydedildi.`);
    } catch (error) {
      console.error('Failed to save portfolio position', error);
      setFormError('Pozisyon kaydedilemedi. Tekrar deneyin.');
    }
  };

  const startClosing = (symbol: string) => {
    setStatusMessage(null);
    setCloseError(null);
    setClosingSymbol(symbol);
    setClosePrice(knownPrice(stocks.find((item) => item.symbol === symbol)));
  };

  const cancelClosing = () => {
    setClosingSymbol(null);
    setCloseError(null);
  };

  const confirmClosing = async () => {
    const holding = holdings.find((item) => item.symbol === closingSymbol);
    if (!holding) return;
    const salePrice = parsePositive(closePrice);
    if (salePrice == null) {
      setCloseError('Geçerli bir satış fiyatı girin.');
      return;
    }
    try {
      await onExecuteTrade({
        symbol: holding.symbol,
        type: 'SELL',
        quantity: holding.quantity,
        price: salePrice,
        notes: holding.symbol + ' position closed from portfolio drawer.',
        portfolioId,
      });
      setClosingSymbol(null);
      setCloseError(null);
      setStatusMessage(`${holding.symbol} pozisyonu kapatıldı.`);
    } catch (error) {
      console.error('Failed to close portfolio position', error);
      setCloseError('Pozisyon kapatılamadı. Tekrar deneyin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-bg-base/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div role="dialog" aria-modal="true" aria-labelledby="manage-assets-title" className="w-screen max-w-md">
          <div className="h-full flex flex-col bg-bg-primary border-l border-outline-variant shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 id="manage-assets-title" className="font-headline text-base font-bold text-text-primary uppercase tracking-wide">
                  Portföy pozisyonları
                </h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="p-1 hover:bg-bg-card rounded-lg border border-outline-variant text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              {statusMessage && (
                <p role="status" className="rounded-lg border border-bull-green/30 bg-bull-green/10 px-3 py-2 text-xs text-text-primary">
                  {statusMessage}
                </p>
              )}

              <div className="bg-bg-card border border-outline-variant/50 p-4 rounded-xl space-y-4">
                <h4 className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-1.5 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-bull-green" aria-hidden="true" />
                  <span>Pozisyon ekle</span>
                </h4>

                <form onSubmit={handleAddAsset} className="space-y-4 text-xs" noValidate>
                  <div>
                    <label htmlFor="manage-assets-symbol" className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                      Varlık
                    </label>
                    <select
                      id="manage-assets-symbol"
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
                      <label htmlFor="manage-assets-quantity" className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                        Miktar
                      </label>
                      <input
                        id="manage-assets-quantity"
                        type="number"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="manage-assets-cost" className="block text-text-muted font-label-caps text-[9px] uppercase mb-1">
                        Ortalama maliyet (USD)
                      </label>
                      <input
                        id="manage-assets-cost"
                        type="number"
                        step="any"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  {formError && (
                    <p role="alert" className="rounded-lg border border-bear-red/30 bg-bear-red/10 px-3 py-2 text-bear-red">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-primary hover:bg-primary-container text-bg-base font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-md shadow-primary/10"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    <span>Portföye kaydet</span>
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-1.5">
                  Aktif pozisyonlar ({holdings.length})
                </h4>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {holdings.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-muted font-sans italic">
                      Veri yok: bu portföyde pozisyon yok. Yukarıdaki formla ekleyebilirsiniz.
                    </div>
                  ) : (
                    holdings.map((h) => {
                      const stock = stocks.find((s) => s.symbol === h.symbol);
                      const currentVal = stock ? h.quantity * stock.price : null;
                      const isClosing = closingSymbol === h.symbol;
                      return (
                        <div
                          key={h.symbol}
                          className="p-3 bg-bg-card/50 border border-outline-variant/20 rounded-lg hover:border-outline-variant transition-all group space-y-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-data-mono font-bold text-xs text-text-primary">{h.symbol}</span>
                                <span className="text-[10px] text-text-muted">
                                  {h.quantity.toFixed(4)} adet
                                </span>
                              </div>
                              <div className="text-[10px] text-text-secondary mt-1 font-data-mono">
                                Maliyet: ${h.costPrice.toFixed(2)} | Değer: <span className="text-primary font-bold">{currentVal == null ? 'Fiyat yok' : `$${currentVal.toFixed(2)}`}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => startClosing(h.symbol)}
                              aria-label={`${h.symbol} pozisyonunu kapat`}
                              title={`${h.symbol} pozisyonunu kapat`}
                              className="p-1 text-text-muted hover:text-bear-red rounded hover:bg-bear-red/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>

                          {isClosing && (
                            <div className="rounded-lg border border-bear-red/30 bg-bear-red/5 p-3 space-y-2 text-xs">
                              <p className="text-text-secondary">
                                {h.symbol} için {h.quantity.toFixed(4)} adetlik satış işlemi kaydedilir.
                              </p>
                              <label htmlFor={`close-price-${h.symbol}`} className="block text-text-muted font-label-caps text-[9px] uppercase">
                                {h.symbol} satış birim fiyatı (USD)
                              </label>
                              <input
                                id={`close-price-${h.symbol}`}
                                type="number"
                                step="any"
                                value={closePrice}
                                onChange={(e) => setClosePrice(e.target.value)}
                                className="w-full bg-bg-base border border-outline-variant rounded-lg px-3 py-1.5 text-text-primary font-data-mono font-bold focus:outline-none focus:border-primary"
                              />
                              {closeError && (
                                <p role="alert" className="text-bear-red">{closeError}</p>
                              )}
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={cancelClosing} className="px-3 py-1.5 rounded-lg border border-outline-variant text-text-secondary hover:text-text-primary">
                                  Vazgeç
                                </button>
                                <button type="button" onClick={() => void confirmClosing()} className="px-3 py-1.5 rounded-lg bg-bear-red text-white font-bold">
                                  Satışı kaydet
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant bg-bg-card/45">
              <div className="text-[10px] text-text-muted font-label-caps uppercase mb-2">
                Bilgi
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
                Portföy pozisyonları backend işlem defteri kayıtlarıyla saklanır. Güncel fiyatlar, varsa piyasa verisinden gelir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
