import { useState } from 'react';
import type { Asset } from '../../api/types';
import type { AddPositionRequest } from '../../api/client';

interface AddPositionModalProps {
  assets: Asset[];
  onAdd: (req: AddPositionRequest) => Promise<void>;
  onClose: () => void;
}

export const AddPositionModal = ({ assets, onAdd, onClose }: AddPositionModalProps) => {
  const [symbol, setSymbol] = useState('');
  const [mode, setMode] = useState<'amount' | 'quantity'>('amount');
  const [totalAmountPaid, setTotalAmountPaid] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [quantity, setQuantity] = useState('');
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedQuantity = mode === 'amount' && totalAmountPaid && pricePerShare
    ? (parseFloat(totalAmountPaid) / parseFloat(pricePerShare)).toFixed(6) : quantity;
  const computedTotal = mode === 'quantity' && quantity && pricePerShare
    ? (parseFloat(quantity) * parseFloat(pricePerShare)).toFixed(2) : totalAmountPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) { setError('Lütfen bir sembol seçin.'); return; }
    if (!pricePerShare || parseFloat(pricePerShare) <= 0) { setError('Alış fiyatı zorunludur.'); return; }
    let finalQuantity: number;
    if (mode === 'amount') {
      if (!totalAmountPaid || parseFloat(totalAmountPaid) <= 0) { setError('Toplam yatırım tutarı zorunludur.'); return; }
      finalQuantity = parseFloat(totalAmountPaid) / parseFloat(pricePerShare);
    } else {
      if (!quantity || parseFloat(quantity) <= 0) { setError('Adet zorunludur.'); return; }
      finalQuantity = parseFloat(quantity);
    }
    setSaving(true); setError(null);
    try {
      await onAdd({ symbol: symbol.toUpperCase(), quantity: finalQuantity, avgCostPrice: parseFloat(pricePerShare), openedAt, notes: notes || undefined });
      onClose();
    } catch { setError('Pozisyon eklenemedi. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  };

  const selectedAsset = assets.find(a => a.symbol === symbol);
  const estimatedQty = mode === 'amount' && totalAmountPaid && pricePerShare && parseFloat(pricePerShare) > 0
    ? parseFloat(totalAmountPaid) / parseFloat(pricePerShare) : null;
  const estimatedCost = mode === 'quantity' && quantity && pricePerShare && parseFloat(pricePerShare) > 0
    ? parseFloat(quantity) * parseFloat(pricePerShare) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,219,233,0.05)',
        }}
      >
        {/* Gradient top accent */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, var(--color-accent), var(--color-bull), var(--color-accent))' }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Pozisyon Ekle</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {selectedAsset ? `${selectedAsset.symbol} — ${selectedAsset.name}` : 'Alım işleminizin detaylarını girin'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105"
            style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Symbol selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Hisse Senedi
            </label>
            <select
              value={symbol}
              onChange={e => { setSymbol(e.target.value); setPricePerShare(''); }}
              className="w-full px-3 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
              required
            >
              <option value="">— Watchlist'ten seçin —</option>
              {assets.map(a => (
                <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>
              ))}
            </select>
          </div>

          {/* Mode toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Giriş Yöntemi
            </label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { id: 'amount', icon: '💰', label: 'Toplam Tutar' },
                { id: 'quantity', icon: '📊', label: 'Adet / Lot' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as 'amount' | 'quantity')}
                  className="flex-1 py-2.5 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: mode === m.id
                      ? 'linear-gradient(135deg, rgba(0,219,233,0.2), rgba(0,219,233,0.08))'
                      : 'rgba(255,255,255,0.02)',
                    color: mode === m.id ? 'var(--color-accent-light)' : 'var(--color-text-muted)',
                    borderRight: m.id === 'amount' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price + Amount/Qty in 2 cols */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Alış Fiyatı ($)
              </label>
              <input
                type="number" min="0.0001" step="any"
                value={pricePerShare}
                onChange={e => setPricePerShare(e.target.value)}
                placeholder={selectedAsset ? '185.50' : '—'}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', outline: 'none' }}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {mode === 'amount' ? 'Toplam Yatırım ($)' : 'Adet / Lot'}
              </label>
              {mode === 'amount' ? (
                <input
                  type="number" min="0.01" step="any"
                  value={totalAmountPaid}
                  onChange={e => setTotalAmountPaid(e.target.value)}
                  placeholder="1500.00"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', outline: 'none' }}
                  required
                />
              ) : (
                <input
                  type="number" min="0.000001" step="any"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', outline: 'none' }}
                  required
                />
              )}
            </div>
          </div>

          {/* Live preview */}
          {(estimatedQty !== null || estimatedCost !== null) && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(0,219,233,0.06)', border: '1px solid rgba(0,219,233,0.15)' }}>
              <span style={{ color: 'var(--color-accent-light)' }}>≈</span>
              {estimatedQty !== null && (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{estimatedQty.toFixed(4)}</span> adet hisse
                </span>
              )}
              {estimatedCost !== null && (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Toplam maliyet: <span className="font-mono font-bold" style={{ color: 'var(--color-bull)' }}>${estimatedCost.toFixed(2)}</span>
                </span>
              )}
            </div>
          )}

          {/* Date + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Alım Tarihi
              </label>
              <input
                type="date" value={openedAt}
                onChange={e => setOpenedAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', outline: 'none' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Not (İsteğe Bağlı)
              </label>
              <input
                type="text" value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Örn: Bölünmeden önce alım"
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          {/* Summary */}
          {symbol && pricePerShare && (mode === 'amount' ? totalAmountPaid : quantity) && (
            <div className="p-3 rounded-xl space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Özet</div>
              {[
                { k: 'Sembol', v: symbol, bold: true },
                { k: 'Alış Fiyatı', v: `$${pricePerShare}` },
                { k: 'Adet', v: computedQuantity },
                { k: 'Toplam Maliyet', v: `$${mode === 'amount' ? parseFloat(totalAmountPaid || '0').toFixed(2) : parseFloat(computedTotal || '0').toFixed(2)}`, accent: true },
                { k: 'Tarih', v: openedAt },
              ].map(row => (
                <div key={row.k} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-muted)' }}>{row.k}</span>
                  <span className="font-mono" style={{ color: row.accent ? 'var(--color-accent-light)' : 'var(--color-text-primary)', fontWeight: row.bold ? 700 : 400 }}>{row.v}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-xs p-3 rounded-xl" style={{ background: 'rgba(255,77,109,0.08)', color: 'var(--color-bear)', border: '1px solid rgba(255,77,109,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              İptal
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), rgba(0,183,195,0.8))', color: '#000', boxShadow: saving ? 'none' : '0 4px 20px rgba(0,219,233,0.3)' }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Kaydediliyor...
                </span>
              ) : '✅ Alımı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
