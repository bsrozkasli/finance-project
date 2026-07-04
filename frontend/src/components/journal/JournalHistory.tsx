import { Link } from 'react-router-dom';
import type { JournalTrade } from '../../api/client';
import { SortTh } from './journalShared';
import { actionIcon, fmtCurrency, fmtPct, positiveColor, THEMES } from './journalUtils';
import type { JournalViewMode } from './journalUtils';
import type { JournalRecord } from './journalModels';

interface JournalHistoryProps {
  records: JournalRecord[];
  viewMode: JournalViewMode;
  loading: boolean;
  error: string | null;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  onEditTrade: (trade: JournalTrade) => void;
  onDeleteTrade: (trade: JournalTrade) => void;
  onEvaluateTrade: (trade: JournalTrade) => void;
}

export const JournalHistory = ({
  records,
  viewMode,
  loading,
  error,
  sortKey,
  sortDir,
  onSort,
  onEditTrade,
  onDeleteTrade,
  onEvaluateTrade,
}: JournalHistoryProps) => {
  if (loading) return <div className="space-y-3 p-8">{[0, 1, 2, 3, 4, 5].map(item => <div key={item} className="skeleton h-11 rounded" />)}</div>;
  if (error) return <div className="p-8 text-center"><div className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-bear)' }}>Failed to load trades</div><div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div></div>;
  if (records.length === 0) return <div className="p-16 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Filtrelere uygun islem yok.</div>;
  if (viewMode === 'grouped') return <Grouped records={records} onEditTrade={onEditTrade} onEvaluateTrade={onEvaluateTrade} />;
  if (viewMode === 'timeline') return <Timeline records={records} onEditTrade={onEditTrade} onEvaluateTrade={onEvaluateTrade} />;
  return <Table records={records} sortKey={sortKey} sortDir={sortDir} onSort={onSort} onEditTrade={onEditTrade} onDeleteTrade={onDeleteTrade} onEvaluateTrade={onEvaluateTrade} />;
};

const TypeBadge = ({ action }: { action: string }) => {
  const meta = actionIcon(action);
  return <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold" style={{ background: action === 'BUY' || action === 'ADD' ? 'var(--color-bull-dim)' : action === 'SELL' || action === 'REDUCE' ? 'var(--color-bear-dim)' : 'var(--color-bg-hover)', color: meta.color }}><span>{meta.icon}</span>{meta.label}</span>;
};

const PortfolioBadge = ({ record }: { record: JournalRecord }) => record.portfolioId ? (
  <Link to={`/portfolio/${record.portfolioId}`} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>
    {record.portfolioName ?? `Portfolio ${record.portfolioId}`}
  </Link>
) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>;

const TagList = ({ tags }: { tags: string[] }) => (
  <div className="mt-1 flex flex-wrap gap-1">
    {tags.filter(tag => !tag.startsWith('action:')).slice(0, 3).map(tag => <span key={tag} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: THEMES.includes(tag) ? 'var(--color-accent-dim)' : 'var(--color-bg-hover)', color: THEMES.includes(tag) ? 'var(--color-accent-light)' : 'var(--color-text-muted)' }}>{tag}</span>)}
  </div>
);

const Table = ({ records, sortKey, sortDir, onSort, onEditTrade, onDeleteTrade, onEvaluateTrade }: Omit<JournalHistoryProps, 'viewMode' | 'loading' | 'error'>) => (
  <div className="overflow-x-auto">
    <table className="market-table">
      <thead>
        <tr>
          <SortTh label="Ticker" k="symbol" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <th>Portfolio</th>
          <th>Type</th>
          <SortTh label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <th>Qty</th>
          <th>Price</th>
          <SortTh label="P/L" k="pnl" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <SortTh label="Return" k="returnPct" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          <th>Strategy</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {records.map(record => (
          <tr key={record.id} className="market-row">
            <td><div className="font-mono text-xs font-bold" style={{ color: 'var(--color-accent-light)' }}>{record.symbol}</div><TagList tags={record.tags} /></td>
            <td><PortfolioBadge record={record} /></td>
            <td><TypeBadge action={record.action} /></td>
            <td className="font-mono text-xs">{record.date}</td>
            <td className="font-mono text-xs">{record.quantity.toLocaleString()}</td>
            <td className="font-mono text-xs">{fmtCurrency(record.price)}</td>
            <td><span className="font-mono text-xs" style={{ color: positiveColor(record.pnl) }}>{record.pnl != null ? `${record.pnl >= 0 ? '+' : '-'}${fmtCurrency(record.pnl)}` : '-'}</span></td>
            <td><span className="font-mono text-xs" style={{ color: positiveColor(record.returnPct) }}>{fmtPct(record.returnPct)}</span></td>
            <td className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{record.strategy ?? '-'}</td>
            <td><span className="rounded-full px-2 py-0.5 text-xs" style={{ background: record.status === 'OPEN' ? 'var(--color-accent-dim)' : 'var(--color-bg-hover)', color: record.status === 'OPEN' ? 'var(--color-accent-light)' : 'var(--color-text-muted)' }}>{record.status ?? record.source}</span></td>
            <td>
              {record.trade && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onEditTrade(record.trade!)} className="rounded p-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Edit</button>
                  <button type="button" onClick={() => onEvaluateTrade(record.trade!)} className="rounded p-1.5 text-xs" style={{ color: 'var(--color-warning)' }}>Eval</button>
                  <button type="button" onClick={() => onDeleteTrade(record.trade!)} className="rounded p-1.5 text-xs" style={{ color: 'var(--color-bear)' }}>Del</button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Grouped = ({ records, onEditTrade, onEvaluateTrade }: { records: JournalRecord[]; onEditTrade: (trade: JournalTrade) => void; onEvaluateTrade: (trade: JournalTrade) => void }) => {
  const groups = new Map<string, JournalRecord[]>();
  records.forEach(record => groups.set(record.symbol, [...(groups.get(record.symbol) ?? []), record]));
  return (
    <div className="space-y-3 p-6">
      {Array.from(groups.entries()).map(([symbol, items]) => {
        const pnl = items.reduce((sum, item) => sum + (item.pnl ?? 0), 0);
        return (
          <section key={symbol} className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b p-3" style={{ borderColor: 'var(--color-border)' }}><span className="font-mono font-bold" style={{ color: 'var(--color-accent-light)' }}>{symbol}</span><span className="font-mono text-xs" style={{ color: positiveColor(pnl) }}>{pnl >= 0 ? '+' : '-'}{fmtCurrency(pnl)}</span></div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>{items.map(item => <CompactRow key={item.id} record={item} onEditTrade={onEditTrade} onEvaluateTrade={onEvaluateTrade} />)}</div>
          </section>
        );
      })}
    </div>
  );
};

const Timeline = ({ records, onEditTrade, onEvaluateTrade }: { records: JournalRecord[]; onEditTrade: (trade: JournalTrade) => void; onEvaluateTrade: (trade: JournalTrade) => void }) => (
  <div className="space-y-3 p-6">
    {records.map(record => <CompactRow key={record.id} record={record} timeline onEditTrade={onEditTrade} onEvaluateTrade={onEvaluateTrade} />)}
  </div>
);

const CompactRow = ({ record, timeline, onEditTrade, onEvaluateTrade }: { record: JournalRecord; timeline?: boolean; onEditTrade: (trade: JournalTrade) => void; onEvaluateTrade: (trade: JournalTrade) => void }) => (
  <div className={`flex flex-wrap items-center gap-3 p-3 ${timeline ? 'rounded-lg border' : ''}`} style={timeline ? { background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' } : undefined}>
    <TypeBadge action={record.action} />
    <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{record.date}</div>
    <div className="font-mono text-sm font-bold" style={{ color: 'var(--color-accent-light)' }}>{record.symbol}</div>
    <PortfolioBadge record={record} />
    <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{record.quantity} @ {fmtCurrency(record.price)}</div>
    <div className="ml-auto font-mono text-xs" style={{ color: positiveColor(record.pnl) }}>{record.pnl != null ? `${record.pnl >= 0 ? '+' : '-'}${fmtCurrency(record.pnl)}` : record.source}</div>
    {record.trade && <button type="button" onClick={() => onEvaluateTrade(record.trade!)} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-warning)', border: '1px solid var(--color-border)' }}>Eval</button>}
    {record.trade && <button type="button" onClick={() => onEditTrade(record.trade!)} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Edit</button>}
  </div>
);