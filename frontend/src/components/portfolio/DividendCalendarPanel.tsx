import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FundamentalsData, PortfolioTransaction } from '../../api/client';
import { fetchFundamentals } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { fmtPct } from './portfolioUtils';
import type { EnrichedRow } from './portfolioUtils';

interface DividendCalendarPanelProps {
  rows: EnrichedRow[];
  transactions: PortfolioTransaction[];
  baseCurrency: string;
}

interface DividendRow {
  symbol: string;
  marketValue: number;
  yieldPct: number | null;
  annualIncome: number | null;
  monthlyIncome: number | null;
}

const safeCurrency = (value: number, currency: string) => {
  try {
    return formatCurrency(value, currency);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const normalizeYield = (value: number | undefined): number | null => {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value <= 1 ? value * 100 : value;
};

const monthLabels = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const DividendCalendarPanel = ({ rows, transactions, baseCurrency }: DividendCalendarPanelProps) => {
  const [fundamentalsBySymbol, setFundamentalsBySymbol] = useState<Record<string, FundamentalsData | null>>({});
  const symbols = useMemo(() => rows.map(row => row.position.symbol).sort(), [rows]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results = await Promise.allSettled(symbols.map(symbol => fetchFundamentals(symbol)));
      if (cancelled) return;
      const next: Record<string, FundamentalsData | null> = {};
      symbols.forEach((symbol, index) => {
        const result = results[index];
        next[symbol] = result.status === 'fulfilled' ? result.value : null;
      });
      setFundamentalsBySymbol(next);
    };
    if (symbols.length > 0) {
      void load();
    } else {
      setFundamentalsBySymbol({});
    }
    return () => { cancelled = true; };
  }, [symbols]);

  const dividendRows: DividendRow[] = rows.map(row => {
    const fundamentals = fundamentalsBySymbol[row.position.symbol];
    const yieldPct = normalizeYield(fundamentals?.dividendYield);
    const marketValue = row.marketValue ?? 0;
    const annualIncome = yieldPct == null ? null : marketValue * (yieldPct / 100);
    return {
      symbol: row.position.symbol,
      marketValue,
      yieldPct,
      annualIncome,
      monthlyIncome: annualIncome == null ? null : annualIncome / 12,
    };
  }).sort((a, b) => (b.annualIncome ?? 0) - (a.annualIncome ?? 0));

  const annualProjection = dividendRows.reduce((sum, row) => sum + (row.annualIncome ?? 0), 0);
  const recordedDividends = transactions
    .filter(transaction => transaction.action === 'DIVIDEND')
    .reduce((sum, transaction) => sum + ((transaction.quantity ?? 0) * (transaction.price ?? 0) * (transaction.fxRateToBase ?? 1)), 0);
  const monthlyData = monthLabels.map(month => ({ month, expected: annualProjection / 12 }));
  const hasYieldData = dividendRows.some(row => row.yieldPct != null);

  return (
    <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Temettu Takvimi</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Fundamentals dividendYield alanindan gelir projeksiyonu; tarih verisi yoksa tarih uydurulmaz.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Yillik Projeksiyon</div>
          <div className="font-mono text-sm font-bold" style={{ color: 'var(--color-bull)' }}>{safeCurrency(annualProjection, baseCurrency)}</div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[240px]">
          {hasYieldData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="rgba(140,144,159,0.18)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={54} />
                <Tooltip formatter={(value) => safeCurrency(Number(value ?? 0), baseCurrency)} contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Bar dataKey="expected" name="Beklenen temettu" fill="var(--color-bull)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="text-xs">Temettu yield verisi henuz yok.</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Aylik Ortalama" value={safeCurrency(annualProjection / 12, baseCurrency)} />
            <Metric label="Kayitli Temettu" value={safeCurrency(recordedDividends, baseCurrency)} />
          </div>
          <div className="max-h-[190px] overflow-y-auto rounded border" style={{ borderColor: 'var(--color-border)' }}>
            {dividendRows.length === 0 ? (
              <div className="p-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>Portfoy pozisyonu yok.</div>
            ) : dividendRows.map(row => (
              <div key={row.symbol} className="grid grid-cols-[70px_1fr_auto] gap-2 border-b p-3 text-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <span className="font-mono font-bold" style={{ color: 'var(--color-accent-light)' }}>{row.symbol}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Tarih yok</span>
                <span className="font-mono" style={{ color: row.yieldPct == null ? 'var(--color-text-muted)' : 'var(--color-bull)' }}>{row.yieldPct == null ? '-' : fmtPct(row.yieldPct)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border p-2" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="mt-1 font-mono text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
  </div>
);
