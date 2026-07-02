import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardPosition } from './dashboardTransforms';
import { formatCurrency } from '../../../utils/formatters';

type SortKey = 'symbol' | 'quantity' | 'avgCost' | 'currentPrice' | 'marketValue' | 'dailyReturn' | 'totalReturn' | 'unrealizedPnL';

const signedPct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const signedCurrency = (value: number) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;

const Sparkline = ({ values }: { values: number[] }) => {
  if (values.length < 2) return <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>-</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 84;
    const y = 28 - ((value - min) / span) * 24;
    return `${x},${y}`;
  }).join(' ');
  const positive = values[values.length - 1] >= values[0];
  return (
    <svg width="86" height="30" viewBox="0 0 86 30" aria-hidden="true">
      <polyline fill="none" stroke={positive ? 'var(--color-bull)' : 'var(--color-bear)'} strokeWidth="1.5" points={points} />
    </svg>
  );
};

const HoldingRow = ({
  position,
  selected,
  onSelect,
  onOpenChart,
}: {
  position: DashboardPosition;
  selected: boolean;
  onSelect: () => void;
  onOpenChart: () => void;
}) => {
  const previousPrice = useRef(position.currentPrice);
  const [flash, setFlash] = useState<'flash-bull' | 'flash-bear' | ''>('');

  useEffect(() => {
    if (position.currentPrice === previousPrice.current) return;
    setFlash(position.currentPrice > previousPrice.current ? 'flash-bull' : 'flash-bear');
    previousPrice.current = position.currentPrice;
    const timeout = window.setTimeout(() => setFlash(''), 850);
    return () => window.clearTimeout(timeout);
  }, [position.currentPrice]);

  const pnlPositive = position.unrealizedPnL >= 0;
  const dailyPositive = position.dailyReturn >= 0;

  return (
    <tr className={`market-row ${selected ? 'selected' : ''} ${flash}`} onClick={onSelect} onDoubleClick={onOpenChart} title="Double click to open chart">
      <td>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold" style={{ background: selected ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: selected ? '#001a42' : 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
            {position.symbol.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{position.symbol}</div>
            <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)', maxWidth: 150 }}>{position.company}</div>
          </div>
        </div>
      </td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{position.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(position.avgCost)}</td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(position.currentPrice)}</td>
      <td className="font-mono text-xs text-right" style={{ color: dailyPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}>{signedPct(position.dailyReturn)}</td>
      <td className="text-right"><Sparkline values={position.sparkline} /></td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(position.marketValue)}</td>
      <td className="font-mono text-xs text-right font-semibold" style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}>{signedPct(position.totalReturn)}</td>
      <td className="font-mono text-xs text-right font-semibold" style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}>{signedCurrency(position.unrealizedPnL)}</td>
    </tr>
  );
};

export const LiveHoldingsTable = ({
  positions,
  loading,
  selectedSymbol,
  onSelectAsset,
  onOpenChart,
}: {
  positions: DashboardPosition[];
  loading: boolean;
  selectedSymbol: string | null;
  onSelectAsset: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
}) => {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = positions.filter((position) => !normalized
      || position.symbol.toLowerCase().includes(normalized)
      || position.company.toLowerCase().includes(normalized)
      || position.portfolioName.toLowerCase().includes(normalized));

    return [...rows].sort((a, b) => {
      const av = sortKey === 'symbol' ? a.symbol : a[sortKey];
      const bv = sortKey === 'symbol' ? b.symbol : b[sortKey];
      const result = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sortDir === 'asc' ? result : -result;
    });
  }, [positions, query, sortDir, sortKey]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDir(key === 'symbol' ? 'asc' : 'desc');
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Live Holdings</h2>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} positions, 30s polling while market is open</div>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search holdings..." className="h-8 w-44 rounded px-2 text-xs outline-none" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
      </div>
      <div className="overflow-x-auto">
        <table className="market-table min-w-full">
          <thead>
            <tr>
              <th onClick={() => setSort('symbol')}>Symbol</th>
              <th className="text-right" onClick={() => setSort('quantity')}>Qty</th>
              <th className="text-right" onClick={() => setSort('avgCost')}>Cost</th>
              <th className="text-right" onClick={() => setSort('currentPrice')}>Last</th>
              <th className="text-right" onClick={() => setSort('dailyReturn')}>Day</th>
              <th className="text-right">5D</th>
              <th className="text-right" onClick={() => setSort('marketValue')}>Value</th>
              <th className="text-right" onClick={() => setSort('totalReturn')}>Return</th>
              <th className="text-right" onClick={() => setSort('unrealizedPnL')}>P/L</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={9}><span className="skeleton inline-block h-5 w-full" /></td></tr>)
            ) : filtered.length > 0 ? (
              filtered.map((position) => (
                <HoldingRow
                  key={position.symbol}
                  position={position}
                  selected={selectedSymbol === position.symbol}
                  onSelect={() => onSelectAsset(position.symbol)}
                  onOpenChart={() => onOpenChart(position.symbol)}
                />
              ))
            ) : (
              <tr><td colSpan={9} className="py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No holdings for this portfolio selection.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
