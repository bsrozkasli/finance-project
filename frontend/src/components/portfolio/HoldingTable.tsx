import { CHART_COLORS, fmtCurrency, fmtPct, positiveColor } from './portfolioUtils';
import type { EnrichedRow } from './portfolioUtils';

interface HoldingTableProps {
  rows: EnrichedRow[];
  loading: boolean;
  selectedSymbol: string | null;
  search: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onSort: (key: string) => void;
  onSelect: (symbol: string) => void;
}

const SortTh = ({ label, k, sortKey, sortDir, onSort }: { label: string; k: string; sortKey: string; sortDir: 'asc' | 'desc'; onSort: (key: string) => void }) => (
  <th onClick={() => onSort(k)}>
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

export const HoldingTable = ({
  rows,
  loading,
  selectedSymbol,
  search,
  sortKey,
  sortDir,
  onSearchChange,
  onSort,
  onSelect,
}: HoldingTableProps) => (
  <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
      <div>
        <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Detayli Holdingler</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Satira tiklayarak detay panelini ac.</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
        <svg width="12" height="12" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Holding filtrele..." className="w-48 bg-transparent text-xs outline-none" style={{ color: 'var(--color-text-primary)' }} />
      </div>
    </div>

    <div className="overflow-x-auto">
      {loading ? (
        <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map(item => <div key={item} className="skeleton h-11 rounded" />)}</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Holding bulunamadi.</div>
      ) : (
        <table className="market-table">
          <thead>
            <tr>
              <SortTh label="Company" k="symbol" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Shares" k="quantity" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Avg Cost" k="avgCost" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Last Price" k="lastPrice" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Cost Basis" k="costBasis" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Mkt Value" k="marketValue" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Daily Chg" k="changePct" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="Total Ret" k="totalReturn" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh label="P/L" k="unrealizedPnL" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.position.symbol}-${row.position.id}`} className={`market-row ${selectedSymbol === row.position.symbol ? 'selected' : ''}`} onClick={() => onSelect(row.position.symbol)}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <div>
                      <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-accent-light)' }}>{row.position.symbol}</div>
                      <div className="max-w-[140px] truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.enriched?.company || row.position.notes || row.holding?.assetType || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="font-mono text-xs">{row.position.quantity.toLocaleString()}</td>
                <td className="font-mono text-xs">{fmtCurrency(row.position.avgCostPrice)}</td>
                <td className="font-mono text-xs">{row.price != null ? fmtCurrency(row.price) : '-'}</td>
                <td className="font-mono text-xs">{fmtCurrency(row.costBasis)}</td>
                <td className="font-mono text-xs">{row.marketValue != null ? fmtCurrency(row.marketValue) : '-'}</td>
                <td><span className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ color: positiveColor(row.changePct), background: (row.changePct ?? 0) >= 0 ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)' }}>{fmtPct(row.changePct)}</span></td>
                <td><span className="font-mono text-xs" style={{ color: positiveColor(row.totalReturn) }}>{fmtPct(row.totalReturn)}</span></td>
                <td><span className="font-mono text-xs" style={{ color: positiveColor(row.unrealizedPnL) }}>{row.unrealizedPnL != null ? `${row.unrealizedPnL >= 0 ? '+' : ''}${fmtCurrency(row.unrealizedPnL)}` : '-'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </section>
);