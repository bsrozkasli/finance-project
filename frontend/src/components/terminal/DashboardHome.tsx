import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Asset } from '../../api/types';
import type { NewsItem, PortfolioPosition } from '../../api/client';
import { fetchNews } from '../../api/client';
import { useLivePrice } from '../../hooks/useLivePrice';
import { usePortfolioPositions } from '../../hooks/usePortfolioPositions';
import { useSparkline } from '../../hooks/useSparkline';
import { formatCurrency } from '../../utils/formatters';

type HoldingSnapshot = {
  symbol: string;
  quantity: number;
  avgCostPrice: number;
  price: number | null;
  change: number | null;
  changePct: number | null;
};

type SortKey = 'symbol' | 'quantity' | 'avgCostPrice' | 'marketValue' | 'dailyChange' | 'totalReturn';

type DashboardHomeProps = {
  assets: Asset[];
  loading: boolean;
  selectedSymbol: string | null;
  onSelectAsset: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
  onManageAssets: () => void;
};

const currency = (value: number | null | undefined) => (value == null ? '-' : formatCurrency(value));
const pct = (value: number | null | undefined) => (value == null ? '-' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`);
const signedCurrency = (value: number | null | undefined) => (value == null ? '-' : `${value >= 0 ? '+' : ''}${formatCurrency(value)}`);

const uniqueSymbols = (positions: PortfolioPosition[], assets: Asset[]) => {
  const symbols = new Set<string>();
  positions.forEach((position) => symbols.add(position.symbol));
  assets.slice(0, 6).forEach((asset) => symbols.add(asset.symbol));
  return Array.from(symbols);
};

const MiniTrend = ({ symbol, positive }: { symbol: string; positive: boolean }) => {
  const { points } = useSparkline(symbol);

  if (points.length < 2) {
    return <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>;
  }

  const width = 112;
  const height = 34;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const color = positive ? 'var(--color-bull)' : 'var(--color-bear)';

  return (
    <svg aria-hidden="true" className="w-28 h-9" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
};

const PositionProbe = ({ position, onSnapshot }: { position: PortfolioPosition; onSnapshot: (snapshot: HoldingSnapshot) => void }) => {
  const { data } = useLivePrice(position.symbol);

  useEffect(() => {
    onSnapshot({
      symbol: position.symbol,
      quantity: position.quantity,
      avgCostPrice: position.avgCostPrice,
      price: data?.price ?? null,
      change: data?.change ?? null,
      changePct: data?.changePct ?? null,
    });
  }, [data, onSnapshot, position.avgCostPrice, position.quantity, position.symbol]);

  return null;
};

const WatchAssetRow = ({
  asset,
  selected,
  onSelect,
  onOpenChart,
}: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onOpenChart: () => void;
}) => {
  const { data, loading } = useLivePrice(asset.symbol);
  const positive = (data?.changePct ?? 0) >= 0;

  return (
    <tr
      className={`market-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpenChart}
      title="Double click to open chart"
    >
      <td>
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold"
            style={{ background: selected ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: selected ? '#001a42' : 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {asset.symbol.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{asset.symbol}</div>
            <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)', maxWidth: 170 }}>{asset.name}</div>
          </div>
        </div>
      </td>
      <td className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {loading ? <span className="skeleton inline-block h-3 w-16" /> : currency(data?.price)}
      </td>
      <td className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>-</td>
      <td className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>-</td>
      <td className="font-mono text-xs font-semibold text-right" style={{ color: positive ? 'var(--color-bull)' : 'var(--color-bear)' }}>
        {pct(data?.changePct)}
      </td>
      <td className="text-right"><MiniTrend symbol={asset.symbol} positive={positive} /></td>
    </tr>
  );
};

const HoldingRow = ({
  position,
  asset,
  selected,
  onSelect,
  onOpenChart,
}: {
  position: PortfolioPosition;
  asset?: Asset;
  selected: boolean;
  onSelect: () => void;
  onOpenChart: () => void;
}) => {
  const { data, loading } = useLivePrice(position.symbol);
  const currentPrice = data?.price ?? null;
  const marketValue = currentPrice == null ? null : currentPrice * position.quantity;
  const costBasis = position.avgCostPrice * position.quantity;
  const dailyChange = data?.change == null ? null : data.change * position.quantity;
  const totalReturn = marketValue == null ? null : marketValue - costBasis;
  const totalReturnPct = marketValue == null || costBasis === 0 ? null : (totalReturn! / costBasis) * 100;
  const positive = (data?.changePct ?? totalReturnPct ?? 0) >= 0;

  return (
    <tr
      className={`market-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpenChart}
      title="Double click to open chart"
    >
      <td>
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold"
            style={{ background: selected ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: selected ? '#001a42' : 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {position.symbol.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{position.symbol}</div>
            <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)', maxWidth: 170 }}>{asset?.name ?? 'Portfolio holding'}</div>
          </div>
        </div>
      </td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{position.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-secondary)' }}>{currency(position.avgCostPrice)}</td>
      <td className="font-mono text-xs text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {loading ? <span className="skeleton inline-block h-3 w-16" /> : currency(currentPrice)}
      </td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{currency(marketValue)}</td>
      <td className="font-mono text-xs text-right" style={{ color: data?.changePct == null ? 'var(--color-text-muted)' : positive ? 'var(--color-bull)' : 'var(--color-bear)' }}>
        {signedCurrency(dailyChange)} / {pct(data?.changePct)}
      </td>
      <td className="font-mono text-xs text-right font-semibold" style={{ color: totalReturn == null ? 'var(--color-text-muted)' : totalReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
        {signedCurrency(totalReturn)} / {pct(totalReturnPct)}
      </td>
      <td className="text-right"><MiniTrend symbol={position.symbol} positive={positive} /></td>
    </tr>
  );
};

const MetricCard = ({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail?: string; tone?: 'neutral' | 'positive' | 'negative' }) => {
  const color = tone === 'positive' ? 'var(--color-bull)' : tone === 'negative' ? 'var(--color-bear)' : 'var(--color-text-primary)';

  return (
    <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-2 font-mono text-xl font-bold" style={{ color }}>{value}</div>
      {detail && <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{detail}</div>}
    </div>
  );
};

const AllocationBar = ({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-bg-base)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, percent))}%`, background: color }} />
    </div>
  </div>
);

export const DashboardHome = ({
  assets,
  loading,
  selectedSymbol,
  onSelectAsset,
  onOpenChart,
  onManageAssets,
}: DashboardHomeProps) => {
  const { positions, loading: positionsLoading } = usePortfolioPositions();
  const [snapshots, setSnapshots] = useState<Record<string, HoldingSnapshot>>({});
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [newsCollapsed, setNewsCollapsed] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const assetBySymbol = useMemo(() => new Map(assets.map((asset) => [asset.symbol, asset])), [assets]);

  const reportSnapshot = useCallback((snapshot: HoldingSnapshot) => {
    setSnapshots((current) => ({ ...current, [snapshot.symbol]: snapshot }));
  }, []);

  const portfolio = useMemo(() => {
    const rows = positions.map((position) => {
      const snap = snapshots[position.symbol];
      const costBasis = position.quantity * position.avgCostPrice;
      const marketValue = snap?.price == null ? costBasis : snap.price * position.quantity;
      const dailyPnl = snap?.change == null ? null : snap.change * position.quantity;
      return { costBasis, marketValue, dailyPnl };
    });

    const value = rows.reduce((sum, row) => sum + row.marketValue, 0);
    const cost = rows.reduce((sum, row) => sum + row.costBasis, 0);
    const daily = rows.reduce((sum, row) => sum + (row.dailyPnl ?? 0), 0);
    const total = value - cost;
    const totalReturnPct = cost > 0 ? (total / cost) * 100 : null;

    return { value, cost, daily, total, totalReturnPct };
  }, [positions, snapshots]);

  const filteredPositions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const scored = positions.filter((position) => {
      const asset = assetBySymbol.get(position.symbol);
      return !normalized || position.symbol.toLowerCase().includes(normalized) || asset?.name.toLowerCase().includes(normalized);
    });

    const getValue = (position: PortfolioPosition) => {
      const snap = snapshots[position.symbol];
      const marketValue = (snap?.price ?? position.avgCostPrice) * position.quantity;
      const totalReturn = marketValue - position.avgCostPrice * position.quantity;
      const values: Record<SortKey, number | string> = {
        symbol: position.symbol,
        quantity: position.quantity,
        avgCostPrice: position.avgCostPrice,
        marketValue,
        dailyChange: (snap?.change ?? 0) * position.quantity,
        totalReturn,
      };
      return values[sortKey];
    };

    return [...scored].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const result = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sortDir === 'asc' ? result : -result;
    });
  }, [assetBySymbol, positions, query, snapshots, sortDir, sortKey]);

  const watchOnlyAssets = useMemo(
    () => assets.filter((asset) => !positions.some((position) => position.symbol === asset.symbol)),
    [assets, positions]
  );

  const allocation = useMemo(() => {
    const total = portfolio.value || 1;
    return positions
      .map((position) => {
        const snap = snapshots[position.symbol];
        const value = (snap?.price ?? position.avgCostPrice) * position.quantity;
        return { symbol: position.symbol, value, percent: (value / total) * 100 };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [portfolio.value, positions, snapshots]);

  const loadNews = useCallback(async () => {
    const symbols = uniqueSymbols(positions, assets).slice(0, 8);
    if (symbols.length === 0) {
      setNews([]);
      return;
    }

    setNewsLoading(true);
    try {
      const settled = await Promise.allSettled(symbols.map((symbol) => fetchNews(symbol)));
      const seen = new Set<string>();
      const merged = settled
        .flatMap((item) => item.status === 'fulfilled' ? item.value : [])
        .filter((item) => {
          const key = `${item.headline}-${item.source}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 12);
      setNews(merged);
    } finally {
      setNewsLoading(false);
    }
  }, [assets, positions]);

  useEffect(() => { void loadNews(); }, [loadNews]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDir(key === 'symbol' ? 'asc' : 'desc');
  };

  const totalTone = portfolio.total >= 0 ? 'positive' : 'negative';
  const dailyTone = portfolio.daily >= 0 ? 'positive' : 'negative';

  return (
    <main className="terminal-main animate-fade-in" style={{ background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
      {positions.map((position) => <PositionProbe key={position.id} position={position} onSnapshot={reportSnapshot} />)}

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Overview</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Real-time portfolio metrics and market conditions.</p>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest" style={{ color: 'var(--color-bull)' }}>
            <span className="live-dot" />
            <span className="font-mono">Market feed active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className={`${newsCollapsed ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col gap-4`}>
            <div className="rounded-lg border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Portfolio Value</div>
                  <div className="mt-2 font-mono text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {positionsLoading ? <span className="skeleton inline-block h-10 w-64" /> : currency(portfolio.value)}
                  </div>
                  <div className="mt-2 font-mono text-sm" style={{ color: portfolio.daily >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                    {signedCurrency(portfolio.daily)} today
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                  <MetricCard label="Cash" value="-" detail="Cash endpoint not connected" />
                  <MetricCard label="Total P/L" value={signedCurrency(portfolio.total)} detail={pct(portfolio.totalReturnPct)} tone={totalTone} />
                  <MetricCard label="Cost Basis" value={currency(portfolio.cost)} detail={`${positions.length} holdings`} tone="neutral" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <MetricCard label="Daily Profit/Loss" value={signedCurrency(portfolio.daily)} detail="From live price deltas" tone={dailyTone} />
                <MetricCard label="Portfolio Return" value={pct(portfolio.totalReturnPct)} detail="Unrealized return" tone={totalTone} />
                <MetricCard label="Tracked Assets" value={String(assets.length)} detail="Watchlist universe" />
              </div>
            </div>

            <div className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Holdings</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Professional table with search, filtering, sorting, and chart drill-down.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="sr-only" htmlFor="dashboard-holdings-search">Search holdings</label>
                  <input
                    id="dashboard-holdings-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search holdings..."
                    className="h-9 rounded px-3 text-sm outline-none"
                    style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <button
                    onClick={onManageAssets}
                    className="h-9 rounded px-3 text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'var(--color-accent)', color: '#001a42' }}
                  >
                    Manage Assets
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="market-table min-w-[980px]">
                  <thead>
                    <tr>
                      <th onClick={() => setSort('symbol')}>Company</th>
                      <th onClick={() => setSort('quantity')}>Shares</th>
                      <th onClick={() => setSort('avgCostPrice')}>Average Cost</th>
                      <th>Current Price</th>
                      <th onClick={() => setSort('marketValue')}>Market Value</th>
                      <th onClick={() => setSort('dailyChange')}>Daily Change</th>
                      <th onClick={() => setSort('totalReturn')}>Total Return</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionsLoading || loading ? (
                      Array.from({ length: 5 }, (_, index) => (
                        <tr key={index}><td colSpan={8}><span className="skeleton inline-block h-5 w-full" /></td></tr>
                      ))
                    ) : filteredPositions.length > 0 ? (
                      filteredPositions.map((position) => (
                        <HoldingRow
                          key={position.id}
                          position={position}
                          asset={assetBySymbol.get(position.symbol)}
                          selected={selectedSymbol === position.symbol}
                          onSelect={() => onSelectAsset(position.symbol)}
                          onOpenChart={() => onOpenChart(position.symbol)}
                        />
                      ))
                    ) : watchOnlyAssets.length > 0 ? (
                      watchOnlyAssets.map((asset) => (
                        <WatchAssetRow
                          key={asset.symbol}
                          asset={asset}
                          selected={selectedSymbol === asset.symbol}
                          onSelect={() => onSelectAsset(asset.symbol)}
                          onOpenChart={() => onOpenChart(asset.symbol)}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                          No holdings yet. Add assets to start building the dashboard.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Asset Allocation</h2>
                <div className="mt-4 space-y-4">
                  {allocation.length > 0 ? allocation.map((item, index) => (
                    <AllocationBar
                      key={item.symbol}
                      label={item.symbol}
                      value={currency(item.value)}
                      percent={item.percent}
                      color={index === 0 ? 'var(--color-accent)' : index === 1 ? 'var(--color-bull)' : index === 2 ? 'var(--color-warning)' : 'var(--color-text-muted)'}
                    />
                  )) : <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Allocation appears after positions are added.</p>}
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Exposure Coverage</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricCard label="Sector" value="Pending" detail="Requires metadata feed" />
                  <MetricCard label="Industry" value="Pending" detail="Requires metadata feed" />
                  <MetricCard label="Country" value="Pending" detail="Requires metadata feed" />
                  <MetricCard label="Theme" value="Pending" detail="Requires tagging model" />
                </div>
              </div>
            </div>
          </section>

          <aside className={`${newsCollapsed ? 'xl:col-span-12' : 'xl:col-span-4'} rounded-lg border ${newsCollapsed ? '' : 'xl:sticky xl:top-0 xl:self-start'}`} style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Market News</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Portfolio, watchlist, and macro feed</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadNews} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>Refresh</button>
                <button onClick={() => setNewsCollapsed((current) => !current)} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                  {newsCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>
            </div>
            {!newsCollapsed && (
              <div className="max-h-[760px] overflow-y-auto p-4">
                {newsLoading && Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton mb-3 h-24 rounded" />)}
                {!newsLoading && news.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No recent news found for the current portfolio.</p>}
                <div className="space-y-5">
                  {news.map((item) => (
                    <a key={`${item.source}-${item.datetime}-${item.headline}`} href={item.url} target="_blank" rel="noopener noreferrer" className="block border-b pb-5 last:border-b-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {item.related && <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>{item.related}</span>}
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{new Date(item.datetime * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</h3>
                      {item.summary && <p className="mt-2 line-clamp-2 text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>{item.summary}</p>}
                      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{item.source}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};