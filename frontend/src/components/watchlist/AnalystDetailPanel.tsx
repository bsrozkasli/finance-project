import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnalystRatings } from '../../hooks/useAnalystRatings';
import { useLivePrice } from '../../hooks/useLivePrice';
import { fmtCurrency } from './watchlistUtils';

interface AnalystDetailPanelProps {
  symbol: string;
}

export const AnalystDetailPanel = ({ symbol }: AnalystDetailPanelProps) => {
  const { data, loading } = useAnalystRatings(symbol);
  const { data: live } = useLivePrice(symbol);
  const recommendations = data?.recommendations ?? [];
  const latest = recommendations[0];
  const priceTarget = data?.priceTarget;
  const total = latest ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell || 1 : 1;
  const consensusScore = latest ? ((latest.strongBuy * 5 + latest.buy * 4 + latest.hold * 3 + latest.sell * 2 + latest.strongSell) / total) : null;
  const thisMonthUpdates = priceTarget?.lastUpdated && new Date(priceTarget.lastUpdated).getMonth() === new Date().getMonth() ? priceTarget.numberOfAnalysts ?? 0 : 0;
  const trend = recommendations.slice(0, 4).reverse().map(item => ({ period: item.period, buy: item.strongBuy + item.buy, hold: item.hold, sell: item.sell + item.strongSell }));

  if (loading) return <div className="space-y-3 p-4">{[0, 1, 2].map(item => <div key={item} className="skeleton h-16 rounded" />)}</div>;

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="mb-3 flex items-center justify-between gap-3"><div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Consensus</div><span className="rounded px-2 py-1 text-xs font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>{consensusScore == null ? 'N/A' : consensusScore >= 4 ? 'BUY' : consensusScore <= 2.4 ? 'SELL' : 'HOLD'}</span></div>
        {latest ? <>
          <div className="flex h-4 overflow-hidden rounded-full">
            <Segment value={latest.strongBuy} total={total} color="#22c55e" />
            <Segment value={latest.buy} total={total} color="#4edea3" />
            <Segment value={latest.hold} total={total} color="#f59e0b" />
            <Segment value={latest.sell} total={total} color="#f87171" />
            <Segment value={latest.strongSell} total={total} color="#ff5451" />
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px]" style={{ color: 'var(--color-text-muted)' }}><span>SB {latest.strongBuy}</span><span>B {latest.buy}</span><span>H {latest.hold}</span><span>S {latest.sell}</span><span>SS {latest.strongSell}</span></div>
        </> : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No recommendations.</div>}
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Recommendation Trend</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><XAxis dataKey="period" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} /><YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }} /><Line dataKey="buy" stroke="var(--color-bull)" /><Line dataKey="hold" stroke="var(--color-warning)" /><Line dataKey="sell" stroke="var(--color-bear)" /></LineChart></ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="mb-3 flex items-center justify-between"><div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Price Target</div><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{priceTarget?.numberOfAnalysts ?? 0} analysts</span></div>
        {priceTarget ? <Bullet low={priceTarget.targetLow} mean={priceTarget.targetMean} high={priceTarget.targetHigh} current={live?.price} /> : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No target data.</div>}
        <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>This month target updates: {thisMonthUpdates}</div>
      </section>
    </div>
  );
};

const Segment = ({ value, total, color }: { value: number; total: number; color: string }) => <div style={{ width: `${(value / total) * 100}%`, background: color }} />;

const Bullet = ({ low, mean, high, current }: { low?: number; mean?: number; high?: number; current?: number }) => {
  const min = low ?? 0;
  const max = high ?? min + 1;
  const pct = (value?: number) => Math.max(0, Math.min(100, (((value ?? min) - min) / (max - min || 1)) * 100));
  return <div><div className="relative h-3 rounded-full" style={{ background: 'var(--color-border-subtle)' }}><div className="absolute top-0 h-3 rounded-full" style={{ left: 0, width: `${pct(mean)}%`, background: 'var(--color-accent-dim)' }} /><div className="absolute -top-1 h-5 w-1 rounded" style={{ left: `${pct(current)}%`, background: 'var(--color-warning)' }} /><div className="absolute -top-1 h-5 w-1 rounded" style={{ left: `${pct(mean)}%`, background: 'var(--color-accent)' }} /></div><div className="mt-2 flex justify-between text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}><span>{fmtCurrency(low)}</span><span>{fmtCurrency(mean)}</span><span>{fmtCurrency(high)}</span></div></div>;
};