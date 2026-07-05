import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AllocationSlice } from '../../../api/client';
import type { DashboardPosition } from './dashboardTransforms';
import { buildAssetAllocation, buildCountryAllocation, buildTypeAllocation } from './dashboardTransforms';
import { formatCurrency } from '../../../utils/formatters';

type AllocationTab = 'asset' | 'sector' | 'country' | 'theme';

const TABS: { id: AllocationTab; label: string }[] = [
  { id: 'asset', label: 'Asset' },
  { id: 'sector', label: 'Sector' },
  { id: 'country', label: 'Country' },
  { id: 'theme', label: 'Theme' },
];

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex h-56 items-center justify-center rounded border text-sm" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
    {label}
  </div>
);

const CountryCards = ({ rows }: { rows: AllocationSlice[] }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {rows.map((row) => (
      <div key={row.name} className="rounded border p-4" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
            {row.name === 'United States' ? 'US' : row.name === 'Turkey' ? 'TR' : 'OT'}
          </span>
          <span className="font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{row.value.toFixed(1)}%</span>
        </div>
        <div className="mt-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{row.name}</div>
        <div className="mt-1 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(row.amount)}</div>
      </div>
    ))}
  </div>
);

export const AllocationExplorer = ({ positions }: { positions: DashboardPosition[] }) => {
  const [tab, setTab] = useState<AllocationTab>('asset');
  const assetRows = useMemo(() => buildAssetAllocation(positions), [positions]);
  const sectorRows = useMemo(() => buildTypeAllocation(positions), [positions]);
  const countryRows = useMemo(() => buildCountryAllocation(positions), [positions]);
  const themeRows: AllocationSlice[] = [];
  const activeRows = tab === 'asset' ? assetRows : tab === 'sector' ? sectorRows : tab === 'country' ? countryRows : themeRows;

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Allocation</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Portfolio exposure by selected dimension</p>
        </div>
        <div className="flex rounded border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}>
          {TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className="rounded px-3 py-1.5 text-xs font-bold"
              style={{
                background: tab === item.id ? 'var(--color-bg-hover)' : 'transparent',
                color: tab === item.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'theme' ? (
        <EmptyState label="Theme tags are not available in the current portfolio API." />
      ) : activeRows.length === 0 ? (
        <EmptyState label="No allocation data for this selection." />
      ) : tab === 'country' ? (
        <CountryCards rows={countryRows} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="h-64 rounded border p-2" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={activeRows} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={92} stroke="none">
                  {activeRows.map((row) => <Cell key={row.name} fill={row.color ?? 'var(--color-accent)'} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 rounded border p-2" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeRows.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 32 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#c2c6d6', fontSize: 11 }} />
                <Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`} contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {activeRows.slice(0, 8).map((row) => <Cell key={row.name} fill={row.color ?? 'var(--color-accent)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
};
