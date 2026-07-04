import type { JournalTrade } from '../../api/client';

export const DeleteConfirm = ({ trade, onConfirm, onCancel }: { trade: JournalTrade; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6,14,32,0.8)', backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="w-80 rounded-2xl p-6 animate-fade-in" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
      <div className="mb-2 font-bold" style={{ color: 'var(--color-text-primary)' }}>Delete Trade</div>
      <div className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Remove {trade.type} {trade.quantity} x {trade.symbol} from your journal?</div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg py-2 text-sm font-semibold" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Cancel</button>
        <button type="button" onClick={onConfirm} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)', border: '1px solid rgba(255,84,81,0.3)' }}>Delete</button>
      </div>
    </div>
  </div>
);