import type { InvestmentPortfolio, PortfolioTransaction } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { fmtPct } from './portfolioUtils';
import type { EnrichedRow } from './portfolioUtils';

interface CurrencyImpactPanelProps {
  portfolio: InvestmentPortfolio | null;
  rows: EnrichedRow[];
  transactions: PortfolioTransaction[];
}

interface CurrencySlice {
  currency: string;
  nativeValue: number;
  baseValue: number | null;
  rate: number | null;
}

const safeCurrency = (value: number, currency: string) => {
  try {
    return formatCurrency(value, currency);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const latestRate = (transactions: PortfolioTransaction[], currency: string, baseCurrency: string): number | null => {
  if (currency === baseCurrency) return 1;
  const matches = transactions
    .filter(transaction => transaction.currency === currency && transaction.fxRateToBase > 0)
    .sort((a, b) => (b.tradeDate ?? '').localeCompare(a.tradeDate ?? ''));
  return matches[0]?.fxRateToBase ?? null;
};

const averageRate = (transactions: PortfolioTransaction[], currency: string, baseCurrency: string): number | null => {
  if (currency === baseCurrency) return 1;
  let weight = 0;
  let weightedRate = 0;
  transactions
    .filter(transaction => transaction.currency === currency && transaction.fxRateToBase > 0)
    .forEach(transaction => {
      const notional = Math.abs((transaction.quantity ?? 0) * (transaction.price ?? 0));
      const effectiveWeight = notional > 0 ? notional : 1;
      weight += effectiveWeight;
      weightedRate += effectiveWeight * transaction.fxRateToBase;
    });
  return weight > 0 ? weightedRate / weight : null;
};

const buildSlices = (rows: EnrichedRow[], transactions: PortfolioTransaction[], baseCurrency: string): CurrencySlice[] => {
  const grouped = new Map<string, number>();
  rows.forEach(row => {
    const currency = (row.holding?.currency ?? baseCurrency).toUpperCase();
    grouped.set(currency, (grouped.get(currency) ?? 0) + (row.marketValue ?? 0));
  });
  return Array.from(grouped.entries()).map(([currency, nativeValue]) => {
    const rate = latestRate(transactions, currency, baseCurrency);
    return {
      currency,
      nativeValue,
      rate,
      baseValue: rate == null ? null : nativeValue * rate,
    };
  }).sort((a, b) => (b.baseValue ?? b.nativeValue) - (a.baseValue ?? a.nativeValue));
};

export const CurrencyImpactPanel = ({ portfolio, rows, transactions }: CurrencyImpactPanelProps) => {
  const baseCurrency = (portfolio?.baseCurrency ?? 'USD').toUpperCase();
  const slices = buildSlices(rows, transactions, baseCurrency);
  const convertedTotal = slices.reduce((sum, slice) => sum + (slice.baseValue ?? 0), 0);
  const missingRates = slices.filter(slice => slice.baseValue == null && slice.currency !== baseCurrency).map(slice => slice.currency);
  const fxImpacts = slices
    .filter(slice => slice.currency !== baseCurrency && slice.rate != null)
    .map(slice => {
      const avg = averageRate(transactions, slice.currency, baseCurrency);
      if (avg == null || avg <= 0 || slice.rate == null || slice.baseValue == null) return null;
      const impactAmount = slice.nativeValue * (slice.rate - avg);
      return {
        currency: slice.currency,
        pair: `${slice.currency}/${baseCurrency}`,
        rateChangePct: ((slice.rate - avg) / avg) * 100,
        impactPct: slice.baseValue > 0 ? (impactAmount / convertedTotal) * 100 : 0,
      };
    })
    .filter((impact): impact is { currency: string; pair: string; rateChangePct: number; impactPct: number } => impact != null);
  const primaryImpact = fxImpacts.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct))[0] ?? null;

  return (
    <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Para Birimi Etkisi</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Base currency: {baseCurrency}. Donusum icin portfoy islemindeki fxRateToBase kullanilir.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Aile Portfoyu</div>
          <div className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{safeCurrency(convertedTotal, baseCurrency)}</div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="flex h-3 overflow-hidden rounded-full" style={{ background: 'var(--color-bg-primary)' }}>
            {slices.map((slice, index) => {
              const value = slice.baseValue ?? 0;
              const width = convertedTotal > 0 ? (value / convertedTotal) * 100 : 0;
              return <span key={slice.currency} title={slice.currency} style={{ width: `${width}%`, background: index % 2 === 0 ? 'var(--color-accent)' : 'var(--color-warning)' }} />;
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {slices.map(slice => (
              <div key={slice.currency} className="rounded border p-3" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{slice.currency}</span>
                  <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{slice.rate == null ? 'FX yok' : slice.rate.toFixed(4)}</span>
                </div>
                <div className="mt-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{safeCurrency(slice.nativeValue, slice.currency)}</div>
                <div className="mt-1 font-mono text-xs font-bold" style={{ color: 'var(--color-accent-light)' }}>{slice.baseValue == null ? '-' : safeCurrency(slice.baseValue, baseCurrency)}</div>
              </div>
            ))}
          </div>
          {missingRates.length > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--color-warning)' }}>Eksik kur: {missingRates.join(', ')}. Bu varliklar toplam base deger hesabina dahil edilmedi.</p>
          )}
        </div>

        <div className="rounded border p-3" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Kur Etkisi</div>
          {primaryImpact ? (
            <>
              <div className="mt-2 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{primaryImpact.pair}</div>
              <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {primaryImpact.pair} {fmtPct(primaryImpact.rateChangePct)} degisti, portfoy etkisi: {fmtPct(primaryImpact.impactPct)}.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Kur etkisi icin yabanci para pozisyonu ve fxRateToBase gecmisi gerekli.</p>
          )}
        </div>
      </div>
    </section>
  );
};
