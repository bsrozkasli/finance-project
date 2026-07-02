import { useMemo, useState } from 'react';
import type { Asset } from '../../api/types';
import { useDashboardLivePrices } from '../../hooks/useDashboardLivePrices';
import { useDashboardPortfolioData } from '../../hooks/useDashboardPortfolioData';
import { usePortfolioPerformanceSeries } from '../../hooks/usePortfolioPerformanceSeries';
import { AllocationExplorer } from './dashboard/AllocationExplorer';
import { CriticalDatesWidget } from './dashboard/CriticalDatesWidget';
import { CriticalNewsPanel } from './dashboard/CriticalNewsPanel';
import { LiveHoldingsTable } from './dashboard/LiveHoldingsTable';
import { MacroSnapshotPanel } from './dashboard/MacroSnapshotPanel';
import { PerformanceChart } from './dashboard/PerformanceChart';
import { PortfolioHealthScore } from './dashboard/PortfolioHealthScore';
import { PortfolioKpiStrip } from './dashboard/PortfolioKpiStrip';
import { PortfolioSelector } from './dashboard/PortfolioSelector';
import { buildDashboardPositions, buildHealth, buildSummary } from './dashboard/dashboardTransforms';

interface DashboardHomeProps {
  assets: Asset[];
  loading: boolean;
  selectedSymbol: string | null;
  onSelectAsset: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
  onManageAssets: () => void;
}

type Range = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGES: Range[] = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];

const pct = (value: number | null) => (value == null ? '-' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`);

export const DashboardHome = ({
  assets,
  loading: assetsLoading,
  selectedSymbol,
  onSelectAsset,
  onOpenChart,
  onManageAssets,
}: DashboardHomeProps) => {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [chartRange, setChartRange] = useState<Range>('1M');
  const {
    portfolios,
    selectedPortfolio,
    holdings,
    symbols,
    loading: portfolioLoading,
    error: portfolioError,
    reload,
  } = useDashboardPortfolioData(selectedPortfolioId);
  const { prices, loading: liveLoading } = useDashboardLivePrices(symbols);

  const positions = useMemo(
    () => buildDashboardPositions(holdings, prices, assets),
    [assets, holdings, prices]
  );
  const summary = useMemo(() => buildSummary(positions), [positions]);
  const health = useMemo(() => buildHealth(positions, summary), [positions, summary]);
  const portfolioSymbols = useMemo(() => positions.map((position) => position.symbol), [positions]);
  const { series: performanceSeries, loading: performanceLoading } = usePortfolioPerformanceSeries(positions, chartRange);

  const firstValue = performanceSeries[0]?.value ?? null;
  const lastValue = performanceSeries[performanceSeries.length - 1]?.value ?? null;
  const rangeReturn = firstValue && lastValue ? ((lastValue - firstValue) / firstValue) * 100 : null;
  const pageLoading = assetsLoading || portfolioLoading;

  return (
    <main className="terminal-main animate-fade-in" style={{ background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Portfolio Command Center
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedPortfolio ? `${selectedPortfolio.name} live status` : 'All portfolios live status'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 xl:items-end">
            <PortfolioSelector portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} loading={portfolioLoading} onSelect={setSelectedPortfolioId} />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void reload()} className="rounded px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }} disabled={pageLoading}>
                {pageLoading ? 'Loading' : 'Refresh'}
              </button>
              <button type="button" onClick={onManageAssets} className="rounded px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--color-accent)', color: '#001a42' }}>
                Manage Assets
              </button>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: liveLoading ? 'var(--color-warning)' : 'var(--color-bull)' }}>
                <span className="live-dot" />
                <span className="font-mono">{liveLoading ? 'Syncing prices' : 'Live feed active'}</span>
              </div>
            </div>
          </div>
        </div>

        {portfolioError && (
          <div className="mb-4 rounded-lg border p-4 text-sm" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: 'var(--color-warning)' }}>
            {portfolioError}
          </div>
        )}

        <div className="mb-4">
          <PortfolioKpiStrip summary={summary} loading={pageLoading} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="flex flex-col gap-4 xl:col-span-8">
            <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Performance</h2>
                  <p className="text-xs font-mono" style={{ color: rangeReturn == null ? 'var(--color-text-muted)' : rangeReturn >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                    {performanceLoading ? 'Loading history...' : `${pct(rangeReturn)} in ${chartRange}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {RANGES.map((range) => (
                    <button key={range} type="button" onClick={() => setChartRange(range)} className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: range === chartRange ? 'var(--color-bg-hover)' : 'transparent', color: range === chartRange ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[260px] overflow-hidden rounded-lg border" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
                {performanceLoading ? <div className="skeleton h-full w-full" /> : <PerformanceChart series={performanceSeries} />}
              </div>
            </section>

            <AllocationExplorer positions={positions} />
            <LiveHoldingsTable positions={positions} loading={pageLoading} selectedSymbol={selectedSymbol} onSelectAsset={onSelectAsset} onOpenChart={onOpenChart} />
          </section>

          <aside className="flex flex-col gap-4 xl:col-span-4">
            <PortfolioHealthScore health={health} summary={summary} />
            <CriticalDatesWidget symbols={portfolioSymbols} />
            <MacroSnapshotPanel />
            <CriticalNewsPanel symbols={portfolioSymbols} />
          </aside>
        </div>
      </div>
    </main>
  );
};
