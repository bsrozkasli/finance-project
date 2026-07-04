import { useLivePrice } from '../../hooks/useLivePrice';
import { useWatchlistResearch } from '../../hooks/useWatchlistResearch';
import { fmtCurrency, fmtNum, fmtPct, positiveColor, revenueGrowth, sparklinePath, yearRange } from './watchlistUtils';

interface AdvancedSymbolOverviewProps {
  symbol: string;
}

export const AdvancedSymbolOverview = ({ symbol }: AdvancedSymbolOverviewProps) => {
  const { data: live } = useLivePrice(symbol);
  const { data: research, loading } = useWatchlistResearch(symbol);
  const closes = research.fiveDay.map(bar => bar.close);
  const path = sparklinePath(closes);
  const range = yearRange(research.oneYear);
  const ratios = research.ratios;
  const growth = revenueGrowth(research.fundamentals);

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Live Price</div>
            <div className="mt-1 font-mono text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(live?.price)}</div>
            <div className="mt-1 font-mono text-sm font-semibold" style={{ color: positiveColor(live?.changePct) }}>{live?.change != null ? `${live.change >= 0 ? '+' : ''}${fmtCurrency(live.change)} ` : ''}{fmtPct(live?.changePct)}</div>
          </div>
          <div className="h-[42px] w-[130px]">
            <svg width="130" height="42" viewBox="0 0 120 34"><path d={path} fill="none" stroke={positiveColor((closes.at(-1) ?? 0) - (closes[0] ?? 0))} strokeWidth="1.8" /></svg>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Metric label="Open" value={fmtCurrency(live?.open)} />
        <Metric label="High" value={fmtCurrency(live?.high)} />
        <Metric label="Low" value={fmtCurrency(live?.low)} />
        <Metric label="Close" value={fmtCurrency(live?.price)} />
        <Metric label="Volume" value={live?.volume != null ? live.volume.toLocaleString() : '-'} />
        <Metric label="52W High" value={fmtCurrency(range.high52w)} />
        <Metric label="52W Low" value={fmtCurrency(range.low52w)} />
        <Metric label="Pre/After" value="N/A" muted />
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Metric label="Sector" value="N/A" muted />
        <Metric label="Market Cap" value="N/A" muted />
        <Metric label="P/E" value={fmtNum(ratios?.pe)} />
        <Metric label="P/B" value={fmtNum(ratios?.pb)} />
        <Metric label="Debt/Equity" value={fmtNum(ratios?.debtEquity)} />
        <Metric label="ROE" value={fmtPct(ratios?.roe)} />
        <Metric label="Revenue Growth" value={fmtPct(growth)} />
        <Metric label="Dividend Yield" value="N/A" muted />
      </div>

      {loading && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading extended research...</div>}
    </div>
  );
};

const Metric = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="rounded-xl border p-3" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
    <div className="mb-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="truncate font-mono text-sm font-bold" style={{ color: muted ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{value}</div>
  </div>
);