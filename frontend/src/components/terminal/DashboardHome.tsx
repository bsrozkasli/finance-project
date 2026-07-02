import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Asset } from '../../api/types';
import type {
  AllNewsResponse,
  EnrichedPosition,
  NewsItem,
  PortfolioAllocation,
  PortfolioPerformanceResponse,
  PortfolioSummary,
} from '../../api/client';
import {
  fetchAllNews,
  fetchEnrichedPositions,
  fetchNews,
  fetchPortfolioAllocation,
  fetchPortfolioPerformance,
  fetchPortfolioSummary,
} from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { isMarketOpen } from '../../utils/market';
import { MacroCalendarWidget } from './MacroCalendarWidget';

type DashboardHomeProps = {
  assets: Asset[];
  loading: boolean;
  selectedSymbol: string | null;
  onSelectAsset: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
  onManageAssets: () => void;
};

type Range = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
type SortKey = 'symbol' | 'shares' | 'avgCost' | 'currentPrice' | 'marketValue' | 'totalReturn' | 'unrealizedPnL';

const RANGES: Range[] = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];
const COLORS = ['#00e5ff', '#ffb74d', '#4edea3', '#a78bfa', '#fb7185', '#60a5fa'];

const currency = (value: number | null | undefined) => (value == null ? '-' : formatCurrency(value));
const pct = (value: number | null | undefined) => (value == null ? '-' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`);
const signedCurrency = (value: number | null | undefined) => (value == null ? '-' : `${value >= 0 ? '+' : ''}${formatCurrency(value)}`);

const uniqueSymbols = (positions: EnrichedPosition[], assets: Asset[]) => {
  const symbols = new Set<string>();
  positions.forEach((position) => symbols.add(position.symbol));
  assets.slice(0, 8).forEach((asset) => symbols.add(asset.symbol));
  return Array.from(symbols);
};

const PerformanceChart = ({ performance }: { performance: PortfolioPerformanceResponse | null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const series = useMemo(() => performance?.series ?? [], [performance]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8c909f',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;
    seriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: '#00e5ff',
      topColor: 'rgba(0,229,255,0.28)',
      bottomColor: 'rgba(0,229,255,0.0)',
      lineWidth: 2,
    });

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(
      series.map((point) => ({ time: point.date as Time, value: point.portfolioValue }))
    );
    chartRef.current.timeScale().fitContent();
  }, [series]);

  return <div ref={containerRef} className="h-full w-full" />;
};

const HoldingRow = ({
  position,
  selected,
  onSelect,
  onOpenChart,
}: {
  position: EnrichedPosition;
  selected: boolean;
  onSelect: () => void;
  onOpenChart: () => void;
}) => {
  const pnlPositive = position.unrealizedPnL >= 0;

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
            <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)', maxWidth: 140 }}>{position.company || 'Portfolio holding'}</div>
          </div>
        </div>
      </td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{position.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-secondary)' }}>{currency(position.avgCost)}</td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{currency(position.currentPrice)}</td>
      <td className="font-mono text-xs text-right" style={{ color: 'var(--color-text-primary)' }}>{currency(position.marketValue)}</td>
      <td className="font-mono text-xs text-right font-semibold" style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}>{pct(position.totalReturn)}</td>
      <td className="font-mono text-xs text-right font-semibold" style={{ color: pnlPositive ? 'var(--color-bull)' : 'var(--color-bear)' }}>{signedCurrency(position.unrealizedPnL)}</td>
    </tr>
  );
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
}) => (
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
          <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)', maxWidth: 140 }}>{asset.name}</div>
        </div>
      </div>
    </td>
    <td colSpan={6} className="text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>Watchlist only</td>
  </tr>
);

export const DashboardHome = ({
  assets,
  loading,
  selectedSymbol,
  onSelectAsset,
  onOpenChart,
  onManageAssets,
}: DashboardHomeProps) => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformanceResponse | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null);
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [newsCollapsed, setNewsCollapsed] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [chartRange, setChartRange] = useState<Range>('1M');

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [summaryData, performanceData, allocationData, positionData] = await Promise.all([
        fetchPortfolioSummary(),
        fetchPortfolioPerformance(chartRange),
        fetchPortfolioAllocation(),
        fetchEnrichedPositions(),
      ]);
      setSummary(summaryData);
      setPerformance(performanceData);
      setAllocation(allocationData);
      setPositions(positionData);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setDashboardLoading(false);
    }
  }, [chartRange]);

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(
      () => void loadDashboard(),
      isMarketOpen() ? 60 * 1000 : 15 * 60 * 1000
    );
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const filteredPositions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = positions.filter((position) => {
      return !normalized
        || position.symbol.toLowerCase().includes(normalized)
        || position.company.toLowerCase().includes(normalized);
    });

    const valueFor = (position: EnrichedPosition): number | string => position[sortKey];
    return [...rows].sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      const result = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sortDir === 'asc' ? result : -result;
    });
  }, [positions, query, sortDir, sortKey]);

  const positionSymbols = useMemo(() => new Set(positions.map((position) => position.symbol)), [positions]);
  const watchOnlyAssets = useMemo(() => assets.filter((asset) => !positionSymbols.has(asset.symbol)), [assets, positionSymbols]);
  const allocationRows = useMemo(() => (allocation?.byAsset ?? []).filter((item) => item.amount > 0).slice(0, 6), [allocation]);

  const loadNews = useCallback(async () => {
    const symbols = uniqueSymbols(positions, assets).slice(0, 8);
    if (symbols.length === 0) {
      setNews([]);
      return;
    }

    setNewsLoading(true);
    try {
      let merged: NewsItem[] = [];
      try {
        const categorized: AllNewsResponse = await fetchAllNews(undefined, 0, 20, symbols);
        merged = categorized.content ?? [];
      } catch {
        const settled = await Promise.allSettled(symbols.map((symbol) => fetchNews(symbol)));
        merged = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
      }
      const seen = new Set<string>();
      setNews(
        merged
          .filter((item) => {
            const key = `${item.headline}-${item.source}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 12)
      );
    } finally {
      setNewsLoading(false);
    }
  }, [assets, positions]);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDir(key === 'symbol' ? 'asc' : 'desc');
  };

  const totalValue = summary?.totalValue ?? 0;
  const totalPnl = summary?.totalPnL ?? 0;
  const totalReturn = summary?.totalReturn ?? 0;
  const chartSeries = performance?.series ?? [];
  const firstValue = chartSeries[0]?.portfolioValue ?? null;
  const lastValue = chartSeries[chartSeries.length - 1]?.portfolioValue ?? null;
  const rangeReturn = firstValue && lastValue ? ((lastValue - firstValue) / firstValue) * 100 : null;

  return (
    <main className="terminal-main animate-fade-in" style={{ background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Portfolio Overview
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Backend-driven portfolio metrics and market conditions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDashboard} className="rounded px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }} disabled={dashboardLoading}>
              {dashboardLoading ? 'Loading' : 'Refresh'}
            </button>
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest" style={{ color: 'var(--color-bull)' }}>
              <span className="live-dot" />
              <span className="font-mono">Backend feed active</span>
            </div>
          </div>
        </div>

        {dashboardError && (
          <div className="mb-4 rounded-lg border p-4 text-sm" style={{ background: 'rgba(255,77,109,0.08)', borderColor: 'rgba(255,77,109,0.25)', color: 'var(--color-bear)' }}>
            {dashboardError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className={`${newsCollapsed ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col gap-4`}>
            <div className="rounded-lg border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Portfolio Value</div>
                  <div className="mt-1 font-mono text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{dashboardLoading ? <span className="skeleton inline-block h-7 w-36" /> : currency(totalValue)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Total P/L</div>
                  <div className="mt-1 font-mono text-xl font-bold" style={{ color: totalPnl >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>{signedCurrency(totalPnl)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Total Return</div>
                  <div className="mt-1 font-mono text-xl font-bold" style={{ color: totalReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>{pct(totalReturn)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Holdings</div>
                  <div className="mt-1 font-mono text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{positions.length}</div>
                </div>
              </div>

              <div className={`grid grid-cols-1 gap-5 ${allocationRows.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_240px]' : ''}`}>
                <div className="flex min-w-0 flex-col">
                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Portfolio Performance</div>
                      <div className="mt-1 text-xs font-mono" style={{ color: rangeReturn == null ? 'var(--color-text-muted)' : rangeReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>{rangeReturn == null ? 'Not enough price history for this range' : `${pct(rangeReturn)} in ${chartRange}`}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {RANGES.map((range) => (
                        <button key={range} onClick={() => setChartRange(range)} className="rounded px-2 py-1 text-[10px] font-bold transition-colors" style={{ background: range === chartRange ? 'var(--color-bg-hover)' : 'transparent', color: range === chartRange ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative min-h-[220px] overflow-hidden rounded-lg border" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
                    {chartSeries.length >= 2 ? (
                      <PerformanceChart performance={performance} />
                    ) : (
                      <div className="flex h-[220px] items-center justify-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No portfolio price history yet. Trigger price history loads for holdings to build this chart.
                      </div>
                    )}
                  </div>
                </div>

                {allocationRows.length > 0 && (
                  <div className="flex min-w-0 flex-col">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Allocation</div>
                    <div className="flex flex-1 flex-col justify-center rounded-lg border p-3" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
                      <div className="relative h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={allocationRows} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={62} stroke="none">
                              {allocationRows.map((item, index) => <Cell key={item.name} fill={item.color ?? COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => currency(Number(value ?? 0))} contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{allocationRows.length} ASSETS</span>
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        {allocationRows.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color ?? COLORS[index % COLORS.length] }} />
                              <span className="truncate font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                            </div>
                            <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{item.value.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
              <MacroCalendarWidget />

              <div className="flex flex-col overflow-hidden rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Holdings</h2>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{filteredPositions.length} backend-enriched positions</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." className="h-8 w-28 rounded px-2 text-xs outline-none" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                    <button onClick={onManageAssets} className="h-8 rounded px-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-accent)', color: '#001a42' }}>Manage</button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="market-table min-w-full">
                    <thead>
                      <tr>
                        <th onClick={() => setSort('symbol')}>Symbol</th>
                        <th className="text-right" onClick={() => setSort('shares')}>Qty</th>
                        <th className="text-right" onClick={() => setSort('avgCost')}>Cost</th>
                        <th className="text-right" onClick={() => setSort('currentPrice')}>Last</th>
                        <th className="text-right" onClick={() => setSort('marketValue')}>Value</th>
                        <th className="text-right" onClick={() => setSort('totalReturn')}>Return</th>
                        <th className="text-right" onClick={() => setSort('unrealizedPnL')}>P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardLoading || loading ? (
                        Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={7}><span className="skeleton inline-block h-5 w-full" /></td></tr>)
                      ) : filteredPositions.length > 0 ? (
                        filteredPositions.map((position) => <HoldingRow key={position.symbol} position={position} selected={selectedSymbol === position.symbol} onSelect={() => onSelectAsset(position.symbol)} onOpenChart={() => onOpenChart(position.symbol)} />)
                      ) : watchOnlyAssets.length > 0 ? (
                        watchOnlyAssets.map((asset) => <WatchAssetRow key={asset.symbol} asset={asset} selected={selectedSymbol === asset.symbol} onSelect={() => onSelectAsset(asset.symbol)} onOpenChart={() => onOpenChart(asset.symbol)} />)
                      ) : (
                        <tr><td colSpan={7} className="py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No holdings yet. Add assets or portfolio positions.</td></tr>
                      )}
                    </tbody>
                  </table>
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
                <button onClick={loadNews} disabled={newsLoading} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>{newsLoading ? 'Loading' : 'Refresh'}</button>
                <button onClick={() => setNewsCollapsed((current) => !current)} className="rounded px-2 py-1 text-xs" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>{newsCollapsed ? 'Expand' : 'Collapse'}</button>
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

