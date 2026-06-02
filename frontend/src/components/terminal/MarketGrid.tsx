import { useState, useEffect, useRef, useCallback } from 'react';
import type { Asset } from '../../api/types';
import { useLivePrice } from '../../hooks/useLivePrice';
import { useSparkline } from '../../hooks/useSparkline';

/* ── Formatters ─────────────────────────────────────────────────── */
function fmt(n: number | undefined | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVol(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

/* ── Inline SVG Sparkline ───────────────────────────────────────── */
const Sparkline = ({ points, positive }: { points: number[]; positive: boolean }) => {
  if (points.length < 2) return <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>–</span>;

  const W = 72;
  const H = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p - min) / range) * H);

  const d =
    xs
      .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(' ');

  const color = positive ? 'var(--color-bull)' : 'var(--color-bear)';

  // Filled area
  const fillD = `${d} L${W},${H} L0,${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${positive ? 'b' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#sg-${positive ? 'b' : 'r'})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── Single Row ─────────────────────────────────────────────────── */
interface RowProps {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

const AssetRow = ({ asset, selected, onSelect, onDoubleClick }: RowProps) => {
  const { data, loading } = useLivePrice(asset.symbol);
  const { points } = useSparkline(asset.symbol);

  const prevPriceRef = useRef<number | null>(null);
  const [flashClass, setFlashClass] = useState('');
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data) return;
    const prev = prevPriceRef.current;
    if (prev !== null && prev !== data.price) {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlashClass(data.price > prev ? 'flash-bull' : 'flash-bear');
      flashTimer.current = setTimeout(() => setFlashClass(''), 900);
    }
    prevPriceRef.current = data.price;
  }, [data]);

  const positive = data ? data.changePct >= 0 : true;
  const changeColor = positive ? 'var(--color-bull)' : 'var(--color-bear)';

  return (
    <tr
      className={`market-row ${selected ? 'selected' : ''} ${flashClass}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      title="Çift tıklayarak grafiği aç"
    >
      {/* Asset */}
      <td style={{ minWidth: 160, paddingLeft: selected ? 10 : 12 }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded font-bold shrink-0"
            style={{
              width: 28, height: 28, fontSize: 10,
              background: 'var(--color-accent-dim)',
              color: 'var(--color-accent-light)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {asset.symbol.slice(0, 2)}
          </div>
          <div>
            <div
              className="font-bold text-xs"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', letterSpacing: '0.03em' }}
            >
              {asset.symbol}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)', maxWidth: 110, fontSize: 10 }}>
              {asset.name}
            </div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td>
        {loading ? <RowSkeleton /> : (
          <span
            className="font-mono font-semibold text-xs"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {data ? `$${fmt(data.price)}` : '—'}
          </span>
        )}
      </td>

      {/* Change % */}
      <td>
        {loading ? <RowSkeleton /> : (
          <span
            className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: changeColor,
              background: positive ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {data ? (positive ? '▲' : '▼') : ''}
            {data ? `${Math.abs(data.changePct).toFixed(2)}%` : '—'}
          </span>
        )}
      </td>

      {/* Change abs */}
      <td>
        {loading ? <RowSkeleton /> : (
          <span className="font-mono text-xs" style={{ color: data ? changeColor : 'var(--color-text-secondary)' }}>
            {data ? `${data.change >= 0 ? '+' : ''}${fmt(data.change)}` : '—'}
          </span>
        )}
      </td>

      {/* Sparkline */}
      <td style={{ paddingRight: 16 }}>
        <div className="flex justify-end">
          <Sparkline points={points} positive={positive} />
        </div>
      </td>

      {/* Volume */}
      <td>
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {loading ? <RowSkeleton /> : (data ? fmtVol(data.volume) : '—')}
        </span>
      </td>

      {/* Type badge */}
      <td>
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', fontSize: 10 }}
        >
          {asset.type || 'STOCK'}
        </span>
      </td>
    </tr>
  );
};

/* ── Shared sub-components (declared outside render) ───────────── */
const RowSkeleton = () => (
  <span className="skeleton inline-block rounded" style={{ width: 60, height: 12 }} />
);

interface SortIconProps { field: string; activeField: string; dir: 'asc' | 'desc'; }
const SortIcon = ({ field, activeField, dir }: SortIconProps) =>
  activeField === field ? (
    <span style={{ marginLeft: 3, fontSize: 9 }}>{dir === 'asc' ? '▲' : '▼'}</span>
  ) : (
    <span style={{ marginLeft: 3, fontSize: 9, opacity: 0.3 }}>↕</span>
  );

/* ── Market Grid ────────────────────────────────────────────────── */
interface MarketGridProps {
  assets: Asset[];
  loading: boolean;
  selectedSymbol: string | null;
  onSelectAsset: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
}

export const MarketGrid = ({
  assets,
  loading,
  selectedSymbol,
  onSelectAsset,
  onOpenChart,
}: MarketGridProps) => {
  const [sortField, setSortField] = useState<string>('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const si = (field: string) => <SortIcon field={field} activeField={sortField} dir={sortDir} />;

  const filtered = assets.filter(
    (a) =>
      filter === '' ||
      a.symbol.toLowerCase().includes(filter.toLowerCase()) ||
      a.name.toLowerCase().includes(filter.toLowerCase())
  );

  const COL_W = { symbol: '22%', price: '12%', changePct: '11%', changeAbs: '10%', spark: '14%', vol: '13%', type: '10%' };

  return (
    <div className="terminal-main animate-fade-in" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-primary)' }}
      >
        <div>
          <h1 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Küresel Piyasa İstihbarat Panosu
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {assets.length} varlık izleniyor · Çift tıkla → Grafik
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-bull)' }}>
            <span className="live-dot" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>CANLI</span>
          </div>
          {/* Quick filter */}
          <div
            className="flex items-center gap-1.5 px-2.5 h-7 rounded"
            style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
          >
            <svg width="11" height="11" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrele..."
              className="bg-transparent text-xs outline-none w-24"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Table area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading && assets.length === 0 ? (
          /* Loading skeletons */
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton rounded-lg" style={{ height: 44 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" strokeLinecap="round" />
            </svg>
            <p className="text-sm">Varlık bulunamadı. "Varlık Yönet" ile yeni sembol ekle.</p>
          </div>
        ) : (
          <table className="market-table">
            <colgroup>
              <col style={{ width: COL_W.symbol }} />
              <col style={{ width: COL_W.price }} />
              <col style={{ width: COL_W.changePct }} />
              <col style={{ width: COL_W.changeAbs }} />
              <col style={{ width: COL_W.spark }} />
              <col style={{ width: COL_W.vol }} />
              <col style={{ width: COL_W.type }} />
            </colgroup>
            <thead>
              <tr>
                <th onClick={() => handleSort('symbol')} style={{ textAlign: 'left' }}>
                  Varlık {si('symbol')}
                </th>
                <th onClick={() => handleSort('price')}>
                  Son Fiyat {si('price')}
                </th>
                <th onClick={() => handleSort('changePct')}>
                  Değişim % {si('changePct')}
                </th>
                <th>Değer Δ</th>
                <th>14G Grafik</th>
                <th onClick={() => handleSort('volume')}>
                  Hacim {si('volume')}
                </th>
                <th>Tür</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <AssetRow
                  key={asset.symbol}
                  asset={asset}
                  selected={selectedSymbol === asset.symbol}
                  onSelect={() => onSelectAsset(asset.symbol)}
                  onDoubleClick={() => onOpenChart(asset.symbol)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom status bar */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 26,
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-primary)',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          APEX FINANS TERMİNALİ · v2.0
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          {filtered.length} / {assets.length} varlık
        </span>
      </div>
    </div>
  );
};
