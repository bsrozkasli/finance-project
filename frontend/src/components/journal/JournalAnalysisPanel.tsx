import type { JournalStats } from '../../api/client';
import { fmtPct, positiveColor, THEMES, toNumber } from './journalUtils';
import type { JournalRecord } from './journalModels';
import type { TradeEvaluation } from './journalUtils';

interface JournalAnalysisPanelProps {
  stats: JournalStats | null;
  records: JournalRecord[];
  evaluations: Record<number, TradeEvaluation>;
}

interface PerformanceRow {
  key: string;
  count: number;
  wins: number;
  avgReturn: number;
}

const closedJournalRecords = (records: JournalRecord[]) => records.filter(record => record.source === 'journal' && record.status === 'CLOSED');

const performanceBy = (records: JournalRecord[], keyOf: (record: JournalRecord) => string | null): PerformanceRow[] => {
  const groups = new Map<string, JournalRecord[]>();
  records.forEach(record => {
    const key = keyOf(record);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });
  return Array.from(groups.entries()).map(([key, items]) => {
    const returns = items.map(item => toNumber(item.returnPct)).filter(Number.isFinite);
    return {
      key,
      count: items.length,
      wins: items.filter(item => toNumber(item.pnl) > 0).length,
      avgReturn: returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0,
    };
  }).sort((a, b) => b.avgReturn - a.avgReturn);
};

const monthlyPnL = (records: JournalRecord[]) => {
  const map = new Map<string, number>();
  records.forEach(record => {
    if (record.pnl == null) return;
    const month = record.date.slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + record.pnl);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
};

export const JournalAnalysisPanel = ({ stats, records, evaluations }: JournalAnalysisPanelProps) => {
  const closed = closedJournalRecords(records);
  const strategyRows = performanceBy(closed, record => record.strategy ?? 'No Strategy');
  const themeRows = performanceBy(closed, record => record.tags.find(tag => THEMES.includes(tag)) ?? null);
  const worst = [...closed].sort((a, b) => toNumber(a.pnl) - toNumber(b.pnl)).slice(0, 5);
  const best = [...closed].sort((a, b) => toNumber(b.pnl) - toNumber(a.pnl)).slice(0, 5);
  const months = monthlyPnL(closed);
  const evaluated = Object.keys(evaluations).length;

  return (
    <section className="border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Toplam Islem" value={String(stats?.totalTrades ?? records.filter(record => record.source === 'journal').length)} />
        <Stat label="Acik" value={String(stats?.openTrades ?? records.filter(record => record.status === 'OPEN').length)} color="var(--color-accent-light)" />
        <Stat label="Kapali" value={String(stats?.closedTrades ?? closed.length)} />
        <Gauge label="Win Rate" value={toNumber(stats?.winRate)} />
        <Stat label="Ort. Getiri" value={fmtPct(toNumber(stats?.avgReturn))} color={positiveColor(toNumber(stats?.avgReturn))} />
        <Stat label="Degerlendirme" value={String(evaluated)} color="var(--color-warning)" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <PerformanceTable title="Strateji Performansi" rows={strategyRows} />
        <PerformanceTable title="Tema Performansi" rows={themeRows} />
        <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Aylik P/L Heatmap</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {months.length > 0 ? months.map(([month, pnl]) => (
              <div key={month} className="rounded p-2 text-center" style={{ background: pnl >= 0 ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)', color: pnl >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                <div className="text-[10px] font-bold">{month}</div>
                <div className="font-mono text-xs">{pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}</div>
              </div>
            )) : <div className="col-span-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>Kapali islem verisi yok.</div>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <DecisionList title="En Buyuk Hatalar" records={worst} />
        <DecisionList title="En Iyi Kararlar" records={best} />
      </div>
    </section>
  );
};

const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="mt-1 font-mono text-base font-bold" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
  </div>
);

const Gauge = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</span><span className="font-mono text-xs" style={{ color: 'var(--color-bull)' }}>{value.toFixed(1)}%</span></div>
    <div className="mt-2 h-2 rounded-full" style={{ background: 'var(--color-border-subtle)' }}><div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: 'var(--color-bull)' }} /></div>
  </div>
);

const PerformanceTable = ({ title, rows }: { title: string; rows: PerformanceRow[] }) => (
  <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>
    <div className="mt-3 space-y-2">
      {rows.length > 0 ? rows.slice(0, 6).map(row => (
        <div key={row.key} className="grid grid-cols-[1fr_60px_70px] gap-2 text-xs">
          <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{row.key}</span>
          <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{row.count}x</span>
          <span className="font-mono text-right" style={{ color: positiveColor(row.avgReturn) }}>{fmtPct(row.avgReturn)}</span>
        </div>
      )) : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Veri yok.</div>}
    </div>
  </div>
);

const DecisionList = ({ title, records }: { title: string; records: JournalRecord[] }) => (
  <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>
    <div className="mt-3 space-y-2">
      {records.length > 0 ? records.map(record => (
        <div key={record.id} className="rounded border p-2" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-primary)' }}>
          <div className="flex justify-between gap-3 text-xs"><span className="font-mono font-bold" style={{ color: 'var(--color-accent-light)' }}>{record.symbol}</span><span className="font-mono" style={{ color: positiveColor(record.pnl) }}>{record.pnl != null ? `${record.pnl >= 0 ? '+' : '-'}$${Math.abs(record.pnl).toFixed(2)}` : '-'}</span></div>
          <div className="mt-1 line-clamp-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{record.notes || 'Neden notu yok.'}</div>
        </div>
      )) : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Veri yok.</div>}
    </div>
  </div>
);