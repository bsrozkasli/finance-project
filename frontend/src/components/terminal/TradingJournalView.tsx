import { useState, useMemo } from 'react';
import { useJournalTrades } from '../../hooks/useJournalTrades';
import type { JournalTrade, JournalTradeType, AddJournalTradeRequest } from '../../api/client';

// ─── SortTh — must be declared outside the component ─────────────────────────
const SortTh = ({
  label,
  sortKey,
  k,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  k: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}) => (
  <th onClick={() => onSort(k)} style={{ cursor: 'pointer' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {label}
      {sortKey === k && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: 0.7 }}>
          {sortDir === 'desc' ? <path d="M4 6L0 2h8z" /> : <path d="M4 2l4 4H0z" />}
        </svg>
      )}
    </span>
  </th>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtCurrency = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtPct = (v: number | null | undefined): string =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const today = () => new Date().toISOString().slice(0, 10);

const STRATEGIES = ['Growth', 'Value', 'Momentum', 'Swing Trade', 'Scalp', 'Hedge', 'Dividend', 'Speculative', 'Other'];

// ─── InputGroup — module-level to satisfy react-hooks/static-components ───────
const InputGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label
      className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {label}
    </label>
    {children}
  </div>
);

// ─── inputStyle — module-level constant ───────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: '7px 10px',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  outline: 'none',
};

// ─── Add Trade Modal ──────────────────────────────────────────────────────────
interface ModalProps {
  onClose: () => void;
  onSubmit: (req: AddJournalTradeRequest) => Promise<void>;
  initial?: JournalTrade | null;
}

const TradeModal = ({ onClose, onSubmit, initial }: ModalProps) => {
  const [form, setForm] = useState({
    symbol: initial?.symbol ?? '',
    type: (initial?.type ?? 'BUY') as JournalTradeType,
    quantity: initial?.quantity ?? 0,
    purchasePrice: initial?.purchasePrice ?? 0,
    openedAt: initial?.openedAt ?? today(),
    commission: initial?.commission ?? 0,
    strategy: initial?.strategy ?? '',
    notes: initial?.notes ?? '',
    tags: initial?.tags?.join(', ') ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    if (!form.symbol.trim()) return setFieldError('Ticker is required');
    if (form.quantity <= 0) return setFieldError('Quantity must be > 0');
    if (form.purchasePrice <= 0) return setFieldError('Price must be > 0');

    setSubmitting(true);
    try {
      await onSubmit({
        symbol: form.symbol.toUpperCase().trim(),
        type: form.type,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        openedAt: form.openedAt,
        commission: form.commission > 0 ? Number(form.commission) : undefined,
        strategy: form.strategy || undefined,
        notes: form.notes || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      });
      onClose();
    } catch {
      setFieldError('Failed to save trade. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(6,14,32,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
              {initial ? 'Edit Trade' : 'Log New Trade'}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Record your transaction details
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Buy / Sell Toggle + Ticker row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <InputGroup label="Ticker">
                <input
                  style={INPUT_STYLE}
                  placeholder="AAPL"
                  value={form.symbol}
                  onChange={e => set('symbol', e.target.value.toUpperCase())}
                  maxLength={10}
                  autoFocus
                />
              </InputGroup>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}>Type</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                {(['BUY', 'SELL'] as JournalTradeType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className="px-4 py-2 text-xs font-bold transition-all"
                    style={{
                      background: form.type === t
                        ? (t === 'BUY' ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)')
                        : 'var(--color-bg-base)',
                      color: form.type === t
                        ? (t === 'BUY' ? 'var(--color-bull)' : 'var(--color-bear)')
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quantity + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="Quantity">
              <input
                style={INPUT_STYLE}
                type="number"
                min="0"
                step="1"
                placeholder="100"
                value={form.quantity || ''}
                onChange={e => set('quantity', parseFloat(e.target.value) || 0)}
              />
            </InputGroup>
            <InputGroup label="Purchase Price ($)">
              <input
                style={INPUT_STYLE}
                type="number"
                min="0"
                step="0.01"
                placeholder="145.50"
                value={form.purchasePrice || ''}
                onChange={e => set('purchasePrice', parseFloat(e.target.value) || 0)}
              />
            </InputGroup>
          </div>

          {/* Date + Commission row */}
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="Date">
              <input
                style={INPUT_STYLE}
                type="date"
                value={form.openedAt}
                onChange={e => set('openedAt', e.target.value)}
              />
            </InputGroup>
            <InputGroup label="Commission ($)">
              <input
                style={INPUT_STYLE}
                type="number"
                min="0"
                step="0.01"
                placeholder="9.99"
                value={form.commission || ''}
                onChange={e => set('commission', parseFloat(e.target.value) || 0)}
              />
            </InputGroup>
          </div>

          {/* Strategy */}
          <InputGroup label="Strategy">
            <select
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={form.strategy}
              onChange={e => set('strategy', e.target.value)}
            >
              <option value="">— Select strategy —</option>
              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </InputGroup>

          {/* Tags */}
          <InputGroup label="Tags (comma separated)">
            <input
              style={INPUT_STYLE}
              placeholder="tech, largecap, earnings"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
            />
          </InputGroup>

          {/* Notes */}
          <InputGroup label="Notes">
            <textarea
              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 72 }}
              placeholder="Investment thesis, entry reason..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </InputGroup>

          {/* Trade summary preview */}
          {form.quantity > 0 && form.purchasePrice > 0 && (
            <div
              className="rounded-lg px-4 py-3 flex justify-between items-center"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Value</span>
              <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {fmtCurrency(form.quantity * form.purchasePrice + (form.commission || 0))}
              </span>
            </div>
          )}

          {fieldError && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)' }}>
              {fieldError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: form.type === 'BUY' ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)',
                color: form.type === 'BUY' ? 'var(--color-bull)' : 'var(--color-bear)',
                border: `1px solid ${form.type === 'BUY' ? 'rgba(78,222,163,0.3)' : 'rgba(255,84,81,0.3)'}`,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Saving…' : initial ? 'Update Trade' : `Log ${form.type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
const DeleteConfirm = ({ trade, onConfirm, onCancel }: {
  trade: JournalTrade;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(6,14,32,0.8)', backdropFilter: 'blur(6px)' }}
    onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
  >
    <div
      className="w-80 rounded-2xl p-6 animate-fade-in"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete Trade</div>
      <div className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Remove {trade.type} {trade.quantity} × {trade.symbol} from your journal?
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)', border: '1px solid rgba(255,84,81,0.3)' }}>
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Stats Row ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div
    className="flex-1 min-w-0 px-4 py-3 rounded-xl border"
    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
  >
    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="font-mono font-bold text-base" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const TradingJournalView = () => {
  const { trades, stats, loading, error, addTrade, editTrade, removeTrade } = useJournalTrades();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<JournalTrade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalTrade | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [sortKey, setSortKey] = useState('openedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    return trades
      .filter(t => {
        if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        let av: number | string = 0;
        let bv: number | string = 0;
        if (sortKey === 'openedAt') { av = a.openedAt; bv = b.openedAt; }
        else if (sortKey === 'symbol') { av = a.symbol; bv = b.symbol; }
        else if (sortKey === 'pnl') { av = a.pnl ?? 0; bv = b.pnl ?? 0; }
        else if (sortKey === 'returnPct') { av = a.returnPct ?? 0; bv = b.returnPct ?? 0; }
        else if (sortKey === 'marketValue') { av = a.marketValue ?? 0; bv = b.marketValue ?? 0; }

        if (typeof av === 'string') {
          const left = av;
          const right = typeof bv === 'string' ? bv : String(bv);
          return sortDir === 'desc' ? right.localeCompare(left) : left.localeCompare(right);
        }
        return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
      });
  }, [trades, search, filterType, filterStatus, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };



  return (
    <div className="terminal-main overflow-y-auto animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ── Modals ── */}
      {(showModal || editTarget) && (
        <TradeModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSubmit={async req => {
            if (editTarget) await editTrade(editTarget.id, req);
            else await addTrade(req);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          trade={deleteTarget}
          onConfirm={async () => { await removeTrade(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Trading Journal</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Track and analyze all your trades</div>
        </div>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="px-6 py-4 flex gap-3 flex-wrap border-b" style={{ borderColor: 'var(--color-border)' }}>
          <StatCard label="Total Trades" value={String(stats.totalTrades)} />
          <StatCard label="Open" value={String(stats.openTrades)} color="var(--color-accent-light)" />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color="var(--color-bull)" />
          <StatCard label="Avg Return" value={fmtPct(stats.avgReturn)} color={stats.avgReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)'} />
          {stats.bestTrade && <StatCard label="Best Trade" value={stats.bestTrade} color="var(--color-bull)" />}
          {stats.worstTrade && <StatCard label="Worst Trade" value={stats.worstTrade} color="var(--color-bear)" />}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 h-8"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', minWidth: 180 }}
        >
          <svg width="12" height="12" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker..."
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>

        {/* Type filter */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {(['ALL', 'BUY', 'SELL'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 h-8 text-xs font-semibold transition-all"
              style={{
                background: filterType === t ? 'var(--color-accent-dim)' : 'var(--color-bg-card)',
                color: filterType === t ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {(['ALL', 'OPEN', 'CLOSED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 h-8 text-xs font-semibold transition-all"
              style={{
                background: filterStatus === s ? 'var(--color-accent-dim)' : 'var(--color-bg-card)',
                color: filterStatus === s ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 flex flex-col gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-11 rounded" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-bear)' }}>Failed to load trades</div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <svg width="44" height="44" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.2" viewBox="0 0 24 24" className="mx-auto mb-3">
              <path d="M6 3h9l3 3v15H6z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 12h6M9 16h4M14 3v4h4" strokeLinecap="round" />
            </svg>
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>No trades logged</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click the + button to log your first trade</div>
          </div>
        ) : (
          <table className="market-table">
            <thead>
              <tr>
                <SortTh label="Ticker" k="symbol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th>Type</th>
                <SortTh label="Date" k="openedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th>Qty</th>
                <th>Buy Price</th>
                <th>Cur. Price</th>
                <SortTh label="Mkt Value" k="marketValue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="P/L" k="pnl" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Return" k="returnPct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th>Holding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(trade => {
                const pnlPos = (trade.pnl ?? 0) >= 0;
                return (
                  <tr key={trade.id} className="market-row">
                    {/* Ticker */}
                    <td>
                      <div>
                        <div className="font-bold text-xs" style={{ color: 'var(--color-accent-light)', fontFamily: 'var(--font-mono)' }}>
                          {trade.symbol}
                        </div>
                        {trade.strategy && (
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{trade.strategy}</div>
                        )}
                      </div>
                    </td>
                    {/* Type badge */}
                    <td>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: trade.type === 'BUY' ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)',
                          color: trade.type === 'BUY' ? 'var(--color-bull)' : 'var(--color-bear)',
                        }}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{trade.openedAt}</td>
                    <td className="font-mono text-xs">{trade.quantity.toLocaleString()}</td>
                    <td className="font-mono text-xs">{fmtCurrency(trade.purchasePrice)}</td>
                    <td className="font-mono text-xs">{trade.currentPrice != null ? fmtCurrency(trade.currentPrice) : '—'}</td>
                    <td className="font-mono text-xs">{trade.marketValue != null ? fmtCurrency(trade.marketValue) : '—'}</td>
                    {/* P/L */}
                    <td>
                      <span className="font-mono text-xs" style={{ color: pnlPos ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {trade.pnl != null ? `${pnlPos ? '+' : ''}${fmtCurrency(trade.pnl)}` : '—'}
                      </span>
                    </td>
                    {/* Return */}
                    <td>
                      <span className="font-mono text-xs" style={{ color: pnlPos ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {fmtPct(trade.returnPct)}
                      </span>
                    </td>
                    {/* Holding days */}
                    <td className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {trade.holdingDays != null ? `${trade.holdingDays}d` : '—'}
                    </td>
                    {/* Status */}
                    <td>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: trade.status === 'OPEN' ? 'var(--color-accent-dim)' : 'var(--color-bg-hover)',
                          color: trade.status === 'OPEN' ? 'var(--color-accent-light)' : 'var(--color-text-muted)',
                        }}
                      >
                        {trade.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditTarget(trade)}
                          className="p-1.5 rounded transition-colors"
                          title="Edit"
                          style={{ color: 'var(--color-text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(trade)}
                          className="p-1.5 rounded transition-colors"
                          title="Delete"
                          style={{ color: 'var(--color-text-secondary)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bear-dim)'; e.currentTarget.style.color = 'var(--color-bear)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6M9 6V4h6v2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        id="journal-add-trade-btn"
        onClick={() => { setEditTarget(null); setShowModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all z-40"
        style={{
          background: 'var(--color-accent)',
          color: '#fff',
          boxShadow: '0 4px 24px rgba(77,142,255,0.4)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="Log New Trade"
      >
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
