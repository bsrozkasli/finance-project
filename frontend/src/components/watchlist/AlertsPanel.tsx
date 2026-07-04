import { useState } from 'react';
import type { WatchlistAlert } from './watchlistUtils';

interface AlertsPanelProps {
  symbol: string;
  alerts: WatchlistAlert[];
  onAddAlert: (alert: Omit<WatchlistAlert, 'id' | 'createdAt'>) => void;
  onRemoveAlert: (id: string) => void;
}

export const AlertsPanel = ({ symbol, alerts, onAddAlert, onRemoveAlert }: AlertsPanelProps) => {
  const [type, setType] = useState<WatchlistAlert['type']>('PRICE_ABOVE');
  const [threshold, setThreshold] = useState('');
  const symbolAlerts = alerts.filter(alert => alert.symbol === symbol);

  const submit = () => {
    const value = Number(threshold);
    if (!Number.isFinite(value)) return;
    onAddAlert({ symbol, type, threshold: value });
    setThreshold('');
  };

  return (
    <section className="rounded-xl border p-3" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Frontend Alerts</div>
      <div className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
        <select value={type} onChange={event => setType(event.target.value as WatchlistAlert['type'])} className="rounded px-2 py-2 text-xs outline-none" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          <option value="PRICE_ABOVE">Price above</option><option value="PRICE_BELOW">Price below</option><option value="RSI_ABOVE">RSI above</option><option value="RSI_BELOW">RSI below</option>
        </select>
        <input value={threshold} onChange={event => setThreshold(event.target.value)} placeholder="Threshold" className="rounded px-2 py-2 text-xs outline-none" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        <button type="button" onClick={submit} className="rounded px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Add</button>
      </div>
      <div className="mt-3 space-y-1.5">
        {symbolAlerts.length > 0 ? symbolAlerts.map(alert => <div key={alert.id} className="flex items-center justify-between rounded px-2 py-1.5 text-xs" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}><span>{alert.type.replace('_', ' ')} {alert.threshold}</span><button type="button" onClick={() => onRemoveAlert(alert.id)} style={{ color: 'var(--color-bear)' }}>Remove</button></div>) : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No alerts for {symbol}.</div>}
      </div>
    </section>
  );
};