import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, fmtCurrency, fmtPct, THEME_OPTIONS } from './portfolioUtils';
import type { EnrichedRow } from './portfolioUtils';

export type ThemeAssignments = Record<string, string>;

interface AllocationPanelProps {
  rows: EnrichedRow[];
  assignments: ThemeAssignments;
  customThemes: string[];
  onSave: (assignments: ThemeAssignments, customThemes: string[]) => void;
}

interface ThemeSlice {
  name: string;
  value: number;
  amount: number;
  performance: number;
}

const allocationByTheme = (rows: EnrichedRow[], assignments: ThemeAssignments): ThemeSlice[] => {
  const total = rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0);
  const grouped = new Map<string, { amount: number; weightedReturn: number }>();
  rows.forEach(row => {
    const theme = assignments[row.position.symbol] || 'Unassigned';
    const amount = row.marketValue ?? 0;
    const current = grouped.get(theme) ?? { amount: 0, weightedReturn: 0 };
    current.amount += amount;
    current.weightedReturn += amount * (row.totalReturn ?? 0);
    grouped.set(theme, current);
  });
  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      value: total > 0 ? (data.amount / total) * 100 : 0,
      performance: data.amount > 0 ? data.weightedReturn / data.amount : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const AllocationPanel = ({ rows, assignments, customThemes, onSave }: AllocationPanelProps) => {
  const [editing, setEditing] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<ThemeAssignments>(assignments);
  const [draftThemes, setDraftThemes] = useState<string[]>(customThemes);
  const [newTheme, setNewTheme] = useState('');

  const slices = useMemo(() => allocationByTheme(rows, assignments), [assignments, rows]);
  const draftAllThemes = useMemo(() => [...THEME_OPTIONS, ...draftThemes.filter(theme => !THEME_OPTIONS.includes(theme))], [draftThemes]);

  const openEditor = () => {
    setDraftAssignments(assignments);
    setDraftThemes(customThemes);
    setEditing(true);
  };

  const addTheme = () => {
    const theme = newTheme.trim();
    if (!theme || draftAllThemes.includes(theme)) return;
    setDraftThemes(prev => [...prev, theme]);
    setNewTheme('');
  };

  const save = () => {
    onSave(draftAssignments, draftThemes);
    setEditing(false);
  };

  return (
    <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Tematik Dagilim</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Tema bazli allocation ve performans.</p>
        </div>
        <button type="button" onClick={openEditor} className="rounded px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>
          Tema Duzenle
        </button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="h-[260px]">
          {slices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                  {slices.map((slice, index) => <Cell key={slice.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }} formatter={(value) => typeof value === 'number' ? `${value.toFixed(2)}%` : String(value ?? '-')} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty label="Tema allocation verisi yok." />
          )}
        </div>
        <div className="h-[260px]">
          {slices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slices} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                <CartesianGrid stroke="rgba(140,144,159,0.16)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} width={86} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }} formatter={(value) => typeof value === 'number' ? fmtPct(value) : String(value ?? '-')} />
                <Bar dataKey="performance" name="Tema getirisi" radius={[0, 4, 4, 0]}>
                  {slices.map((slice, index) => <Cell key={slice.name} fill={slice.performance >= 0 ? CHART_COLORS[index % CHART_COLORS.length] : 'var(--color-bear)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty label="Tema performans verisi yok." />
          )}
        </div>
      </div>

      <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-4">
        {slices.map((slice, index) => (
          <div key={slice.name} className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
              <span className="truncate text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{slice.name}</span>
            </div>
            <div className="mt-2 flex justify-between text-[11px]"><span style={{ color: 'var(--color-text-muted)' }}>Allocation</span><span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{slice.value.toFixed(1)}%</span></div>
            <div className="mt-1 flex justify-between text-[11px]"><span style={{ color: 'var(--color-text-muted)' }}>Deger</span><span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{fmtCurrency(slice.amount)}</span></div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-lg border p-4" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Tema Duzenleme</h3>
              <button type="button" onClick={() => setEditing(false)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Kapat</button>
            </div>
            <div className="mt-4 flex gap-2">
              <input value={newTheme} onChange={event => setNewTheme(event.target.value)} placeholder="Yeni tema" className="flex-1 rounded border px-3 py-2 text-sm outline-none" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <button type="button" onClick={addTheme} className="rounded px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-bg-card)', color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>Ekle</button>
            </div>
            <div className="mt-4 space-y-2">
              {rows.map(row => (
                <div key={row.position.symbol} className="flex items-center gap-3 rounded border p-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
                  <div className="w-20 font-mono text-xs font-bold" style={{ color: 'var(--color-accent-light)' }}>{row.position.symbol}</div>
                  <select
                    value={draftAssignments[row.position.symbol] ?? ''}
                    onChange={event => setDraftAssignments(prev => ({ ...prev, [row.position.symbol]: event.target.value }))}
                    className="flex-1 rounded border px-2 py-1 text-xs outline-none"
                    style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">Unassigned</option>
                    {draftAllThemes.map(theme => <option key={theme} value={theme}>{theme}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button type="button" onClick={save} className="mt-4 w-full rounded px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-accent)', color: '#fff' }}>Kaydet</button>
          </div>
        </div>
      )}
    </section>
  );
};

const Empty = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center rounded border border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
    <span className="text-xs">{label}</span>
  </div>
);