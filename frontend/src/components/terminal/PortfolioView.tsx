import { useState, useMemo } from 'react';
import { usePortfolioPositions } from '../../hooks/usePortfolioPositions';
import { useLivePrice } from '../../hooks/useLivePrice';
import type { PortfolioPosition } from '../../api/client';

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
const fmt = (v: number | null | undefined, prefix = '', suffix = '', dec = 2): string => {
  if (v == null || isNaN(v)) return '—';
  return `${prefix}${v.toFixed(dec)}${suffix}`;
};
const fmtCurrency = (v: number | null | undefined): string => fmt(v, '$', '', 2);
const fmtPct = (v: number | null | undefined): string =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const CHART_COLORS = [
  '#4d8eff', '#4edea3', '#f59e0b', '#a78bfa', '#fb923c',
  '#34d399', '#60a5fa', '#f472b6', '#facc15', '#38bdf8',
];

const PERIODS = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

// ─── Enriched row via live price ──────────────────────────────────────────────
interface EnrichedRow {
  position: PortfolioPosition;
  price: number | null;
  changePct: number | null;
  marketValue: number | null;
  unrealizedPnL: number | null;
  totalReturn: number | null;
}

const PositionRow = ({
  row,
  index,
  selected,
  onSelect,
}: {
  row: EnrichedRow;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) => {
  const { position, price, changePct, marketValue, unrealizedPnL, totalReturn } = row;
  const positive = (changePct ?? 0) >= 0;
  const pnlPositive = (unrealizedPnL ?? 0) >= 0;

  return (
    <tr
      className={`market-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Company */}
      <td>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
          />
          <div>
            <div className="font-bold text-xs" style={{ color: 'var(--color-accent-light)', fontFamily: 'var(--font-mono)' }}>
              {position.symbol}
            </div>
            <div className="text-xs truncate max-w-[140px]" style={{ color: 'var(--color-text-muted)' }}>
              {position.notes || '—'}
            </div>
          </div>
        </div>
      </td>
      {/* Shares */}
      <td className="font-mono text-xs">{position.quantity.toLocaleString()}</td>
      {/* Avg Cost */}
      <td className="font-mono text-xs">{fmtCurrency(position.avgCostPrice)}</td>
      {/* Current Price */}
      <td className="font-mono text-xs">{price != null ? fmtCurrency(price) : <span className="skeleton inline-block w-14 h-3 rounded" />}</td>
      {/* Cost Basis */}
      <td className="font-mono text-xs">{fmtCurrency(position.quantity * position.avgCostPrice)}</td>
      {/* Market Value */}
      <td className="font-mono text-xs">{marketValue != null ? fmtCurrency(marketValue) : '—'}</td>
      {/* Daily Change */}
      <td>
        <span
          className="font-mono text-xs px-1.5 py-0.5 rounded"
          style={{
            color: positive ? 'var(--color-bull)' : 'var(--color-bear)',
            background: positive ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)',
          }}
        >
          {fmtPct(changePct)}
        </span>
      </td>
      {/* Total Return */}
      <td>
        <span
          className="font-mono text-xs"
          style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}
        >
          {fmtPct(totalReturn)}
        </span>
      </td>
      {/* Unrealized P/L */}
      <td>
        <span
          className="font-mono text-xs"
          style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}
        >
          {unrealizedPnL != null ? `${pnlPositive ? '+' : ''}${fmtCurrency(unrealizedPnL)}` : '—'}
        </span>
      </td>
    </tr>
  );
};

// Probe component to gather live price for a single position
const PositionLiveProbe = ({
  position,
  onEnriched,
}: {
  position: PortfolioPosition;
  onEnriched: (sym: string, price: number, changePct: number) => void;
}) => {
  const { data } = useLivePrice(position.symbol);
  if (data) {
    onEnriched(position.symbol, data.price, data.changePct);
  }
  return null;
};

// ─── Donut Chart (SVG) ───────────────────────────────────────────────────────
interface DonutSlice { name: string; value: number; color: string }

const DonutChart = ({ slices, size = 140 }: { slices: DonutSlice[]; size?: number }) => {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const r = size * 0.38;
  const strokeWidth = size * 0.14;
  const circ = 2 * Math.PI * r;

  const { arcs } = slices.reduce(
    (acc, sl) => {
      const pct = sl.value / total;
      const dash = pct * circ;
      const gap = circ - dash;
      const offset = circ * (1 - acc.cumulativePct);
      acc.cumulativePct += pct;
      acc.arcs.push({ ...sl, dash, gap, offset });
      return acc;
    },
    { arcs: [] as (DonutSlice & { dash: number; gap: number; offset: number })[], cumulativePct: 0 }
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={arc.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const PortfolioView = () => {
  const { positions, loading, error } = usePortfolioPositions();

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activePeriod, setActivePeriod] = useState('1M');
  const [sortKey, setSortKey] = useState<string>('marketValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [liveMap, setLiveMap] = useState<Record<string, { price: number; changePct: number }>>({});

  const handleEnriched = (sym: string, price: number, changePct: number) => {
    setLiveMap(prev => {
      if (prev[sym]?.price === price) return prev;
      return { ...prev, [sym]: { price, changePct } };
    });
  };

  const enrichedRows: EnrichedRow[] = useMemo(() => {
    return positions
      .filter(p => search.trim() === '' || p.symbol.toLowerCase().includes(search.toLowerCase()))
      .map(position => {
        const live = liveMap[position.symbol];
        const price = live?.price ?? null;
        const changePct = live?.changePct ?? null;
        const marketValue = price != null ? price * position.quantity : null;
        const costBasis = position.avgCostPrice * position.quantity;
        const unrealizedPnL = marketValue != null ? marketValue - costBasis : null;
        const totalReturn = marketValue != null ? ((marketValue - costBasis) / costBasis) * 100 : null;
        return { position, price, changePct, marketValue, unrealizedPnL, totalReturn };
      });
  }, [positions, search, liveMap]);

  const sorted = useMemo(() => {
    return [...enrichedRows].sort((a, b) => {
      const getVal = (row: EnrichedRow): number => {
        if (sortKey === 'symbol') return 0;
        if (sortKey === 'marketValue') return row.marketValue ?? 0;
        if (sortKey === 'changePct') return row.changePct ?? 0;
        if (sortKey === 'totalReturn') return row.totalReturn ?? 0;
        if (sortKey === 'unrealizedPnL') return row.unrealizedPnL ?? 0;
        if (sortKey === 'quantity') return row.position.quantity;
        if (sortKey === 'avgCost') return row.position.avgCostPrice;
        return 0;
      };
      const diff = getVal(a) - getVal(b);
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [enrichedRows, sortKey, sortDir]);

  const totalMarketValue = enrichedRows.reduce((s, r) => s + (r.marketValue ?? 0), 0);
  const totalPnL = enrichedRows.reduce((s, r) => s + (r.unrealizedPnL ?? 0), 0);
  const totalCostBasis = positions.reduce((s, p) => s + p.avgCostPrice * p.quantity, 0);
  const totalReturn = totalCostBasis > 0 ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100 : 0;

  // Allocation donut slices by symbol
  const allocationSlices: DonutSlice[] = useMemo(() => {
    if (totalMarketValue <= 0) return [];
    return sorted
      .filter(r => r.marketValue != null)
      .map((r, i) => ({
        name: r.position.symbol,
        value: (r.marketValue! / totalMarketValue) * 100,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [sorted, totalMarketValue]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };



  if (error) {
    return (
      <div className="terminal-main flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="text-center p-6 rounded-xl border" style={{ background: 'rgba(255,84,81,0.08)', borderColor: 'rgba(255,84,81,0.2)' }}>
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-bear)' }}>Portfolio Error</div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-main overflow-y-auto animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Invisible probes for live price */}
      {positions.map(p => (
        <PositionLiveProbe key={p.symbol} position={p} onEnriched={handleEnriched} />
      ))}

      {/* ── Header KPIs ── */}
      <div
        className="px-6 pt-5 pb-4 border-b flex flex-wrap items-center gap-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Portfolio Value</div>
          <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {fmtCurrency(totalMarketValue)}
          </div>
        </div>
        <div className="w-px h-10" style={{ background: 'var(--color-border)' }} />
        <div>
          <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Unrealized P/L</div>
          <div
            className="font-mono text-xl font-bold"
            style={{ color: totalPnL >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}
          >
            {totalPnL >= 0 ? '+' : ''}{fmtCurrency(totalPnL)}
          </div>
        </div>
        <div className="w-px h-10" style={{ background: 'var(--color-border)' }} />
        <div>
          <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Total Return</div>
          <div
            className="font-mono text-xl font-bold"
            style={{ color: totalReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}
          >
            {fmtPct(totalReturn)}
          </div>
        </div>
        <div className="w-px h-10" style={{ background: 'var(--color-border)' }} />
        <div>
          <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Holdings</div>
          <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {positions.length}
          </div>
        </div>

        {/* Period Selector */}
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className="px-2.5 py-1 rounded text-xs font-semibold transition-all"
              style={{
                background: activePeriod === p ? 'var(--color-accent-dim)' : 'transparent',
                color: activePeriod === p ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                border: activePeriod === p ? '1px solid rgba(77,142,255,0.3)' : '1px solid transparent',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex h-full min-h-0">
        {/* Left: Holdings Table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Search */}
          <div className="px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-border)' }}>
            <div
              className="flex items-center gap-2 rounded-lg px-3 h-7 flex-1 max-w-xs"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
            >
              <svg width="12" height="12" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter holdings..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {sorted.length} position{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton h-11 rounded" />
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="p-12 text-center">
                <svg width="40" height="40" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.2" viewBox="0 0 24 24" className="mx-auto mb-3">
                  <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" />
                </svg>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>No Positions</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Add portfolio positions to track performance
                </div>
              </div>
            ) : (
              <table className="market-table">
                <thead>
                  <tr>
                    <SortTh label="Company" k="symbol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Shares" k="quantity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Avg Cost" k="avgCost" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Last Price" k="lastPrice" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Cost Basis" k="costBasis" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Mkt Value" k="marketValue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Daily Chg" k="changePct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Total Ret" k="totalReturn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Unr. P/L" k="unrealizedPnL" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => (
                    <PositionRow
                      key={row.position.id}
                      row={row}
                      index={idx}
                      selected={selectedSymbol === row.position.symbol}
                      onSelect={() => setSelectedSymbol(prev => prev === row.position.symbol ? null : row.position.symbol)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Allocation Panel */}
        <div
          className="w-72 shrink-0 border-l flex flex-col"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
              Allocation
            </div>
          </div>

          {allocationSlices.length > 0 ? (
            <div className="p-4 flex flex-col items-center gap-4">
              <div className="relative">
                <DonutChart slices={allocationSlices} size={156} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-xs font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {positions.length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>holdings</div>
                </div>
              </div>

              <div className="w-full space-y-1.5 overflow-y-auto max-h-[320px]">
                {allocationSlices.map((sl, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sl.color }} />
                    <div className="flex-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {sl.name}
                    </div>
                    <div className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {sl.value.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</span>
            </div>
          )}

          {/* Summary Stats */}
          {positions.length > 0 && (
            <div className="mt-auto border-t p-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Summary — {activePeriod}
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cost Basis</span>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(totalCostBasis)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Market Value</span>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(totalMarketValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Unrealized P/L</span>
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: totalPnL >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}
                >
                  {totalPnL >= 0 ? '+' : ''}{fmtCurrency(totalPnL)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Return</span>
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: totalReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}
                >
                  {fmtPct(totalReturn)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
