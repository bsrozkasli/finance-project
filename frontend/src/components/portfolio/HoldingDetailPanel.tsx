import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortfolioTransaction } from '../../api/client';
import type { PortfolioTransactionAction } from '../../api/client';
import { useCompanyReport } from '../../hooks/useCompanyReport';
import { fmt, fmtCurrency, fmtPct, positiveColor } from './portfolioUtils';
import type { EnrichedRow } from './portfolioUtils';

interface HoldingDetailPanelProps {
  row: EnrichedRow | null;
  portfolioId: number | null;
  onClose: () => void;
  onTransactionAdded: () => void;
}

const targetPosition = (low: number | undefined, current: number | null, high: number | undefined): number => {
  if (low == null || high == null || current == null || high <= low) return 50;
  return Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
};

export const HoldingDetailPanel = ({ row, portfolioId, onClose, onTransactionAdded }: HoldingDetailPanelProps) => {
  const symbol = row?.position.symbol ?? null;
  const { report, loading } = useCompanyReport(symbol);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [action, setAction] = useState<PortfolioTransactionAction>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setQuantity(String(row.position.quantity));
      setPrice(row.price != null ? String(row.price.toFixed(2)) : String(row.position.avgCostPrice));
      setNotes('');
      setError(null);
      setShowTradeForm(false);
    }
  }, [row]);

  const priceTarget = report?.priceTarget;
  const technical = report?.technical;
  const news = useMemo(() => (report?.recentNews ?? []).slice(0, 3), [report?.recentNews]);

  if (!row) return null;

  const submitTransaction = async () => {
    if (!portfolioId) {
      setError('Secili portfoy bulunamadi.');
      return;
    }
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Quantity ve price pozitif olmali.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPortfolioTransaction(portfolioId, {
        symbol: row.position.symbol,
        assetType: row.holding?.assetType ?? 'US_STOCK',
        action,
        quantity: parsedQuantity,
        price: parsedPrice,
        currency: row.holding?.currency ?? 'USD',
        fee: 0,
        fxRateToBase: 1,
        tradeDate: new Date().toISOString(),
        source: 'MANUAL',
        notes: notes.trim() || undefined,
      });
      setShowTradeForm(false);
      onTransactionAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Islem eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-30 w-full max-w-md overflow-y-auto border-l p-5 shadow-2xl" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Holding Detail</div>
          <h2 className="mt-1 font-mono text-xl font-bold" style={{ color: 'var(--color-accent-light)' }}>{row.position.symbol}</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.enriched?.company || row.position.notes || row.holding?.assetType || 'Portfolio holding'}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Kapat</button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DetailMetric label="Alis Tarihi" value={row.position.openedAt ? new Date(row.position.openedAt).toLocaleDateString() : '-'} />
        <DetailMetric label="Ortalama Maliyet" value={fmtCurrency(row.position.avgCostPrice)} />
        <DetailMetric label="Guncel Fiyat" value={row.price != null ? fmtCurrency(row.price) : '-'} />
        <DetailMetric label="P/L" value={row.unrealizedPnL != null ? `${row.unrealizedPnL >= 0 ? '+' : ''}${fmtCurrency(row.unrealizedPnL)}` : '-'} tone={row.unrealizedPnL} />
        <DetailMetric label="P/L%" value={fmtPct(row.totalReturn)} tone={row.totalReturn} />
        <DetailMetric label="Realized P/L" value={fmtCurrency(row.realizedPnl)} tone={row.realizedPnl} />
      </div>

      <section className="mt-5 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Mini Teknik Sinyal</h3>
        {loading ? <div className="skeleton mt-3 h-16 rounded" /> : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <DetailMetric label="RSI" value={fmt(technical?.rsi)} />
            <DetailMetric label="MACD" value={fmt(technical?.macd)} tone={technical?.macd} />
            <DetailMetric label="Signal" value={technical?.signalAction ?? '-'} />
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Analist Hedef Fiyat</h3>
        {priceTarget ? (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              <span>{fmtCurrency(priceTarget.targetLow)}</span>
              <span>{fmtCurrency(row.price)}</span>
              <span>{fmtCurrency(priceTarget.targetHigh)}</span>
            </div>
            <div className="relative mt-2 h-2 rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="absolute top-[-4px] h-4 w-1 rounded" style={{ left: `${targetPosition(priceTarget.targetLow, row.price, priceTarget.targetHigh)}%`, background: 'var(--color-accent)' }} />
            </div>
            <div className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Mean target: <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(priceTarget.targetMean)}</span></div>
          </div>
        ) : <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>Hedef fiyat verisi yok.</p>}
      </section>

      <section className="mt-5 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Son Haberler</h3>
        <div className="mt-3 space-y-3">
          {news.length > 0 ? news.map(item => (
            <a key={`${item.id}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="block text-xs leading-5" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</a>
          )) : <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Haber bulunamadi.</p>}
        </div>
      </section>

      <div className="mt-5 flex gap-2">
        <Link to={`/workspace/${row.position.symbol}`} className="flex-1 rounded px-3 py-2 text-center text-xs font-bold" style={{ background: 'var(--color-bg-card)', color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>
          Grafikte Goster
        </Link>
        <button type="button" onClick={() => setShowTradeForm(value => !value)} className="flex-1 rounded px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-accent)', color: '#fff' }}>
          Islem Ekle
        </button>
      </div>

      {showTradeForm && (
        <section className="mt-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <div className="grid grid-cols-2 gap-2">
            <select value={action} onChange={event => setAction(event.target.value as PortfolioTransactionAction)} className="rounded border px-2 py-2 text-xs outline-none" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
              <option value="DIVIDEND">DIVIDEND</option>
            </select>
            <input value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="Quantity" className="rounded border px-2 py-2 text-xs outline-none" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            <input value={price} onChange={event => setPrice(event.target.value)} placeholder="Price" className="rounded border px-2 py-2 text-xs outline-none" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            <input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Notes" className="rounded border px-2 py-2 text-xs outline-none" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          </div>
          {error && <p className="mt-2 text-xs" style={{ color: 'var(--color-bear)' }}>{error}</p>}
          <button type="button" disabled={saving} onClick={submitTransaction} className="mt-3 w-full rounded px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            {saving ? 'Kaydediliyor...' : 'Islemi Kaydet'}
          </button>
        </section>
      )}
    </aside>
  );
};

const DetailMetric = ({ label, value, tone }: { label: string; value: string; tone?: number | null }) => (
  <div className="rounded border p-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="mt-1 truncate font-mono text-xs font-bold" style={{ color: tone == null ? 'var(--color-text-primary)' : positiveColor(tone) }}>{value}</div>
  </div>
);