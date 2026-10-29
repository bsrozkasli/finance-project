import { useState } from 'react';
import { fetchPortfolioOverview, fetchPortfolioSummaryV2, pinPortfolio } from '../../api/redesign';
import { useMarketScope } from '../../context/marketScope';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import DashCard from './DashCard';
import { formatFraction, formatMoney, toneClass } from './format';

interface DashboardTopProps {
  portfolioId: number | undefined;
  onSelectPortfolioId: (id: string) => void;
}

/** Pinned portfolios (with value) and the KPI row of the selected portfolio. */
export default function DashboardTop({ portfolioId, onSelectPortfolioId }: DashboardTopProps) {
  const { market } = useMarketScope();
  const marketParam = market === 'ALL' ? undefined : market;
  const overview = usePanelQuery(() => fetchPortfolioOverview({ pinned: true, market: marketParam }), [marketParam]);
  const summary = usePanelQuery(
    () => (portfolioId === undefined ? Promise.resolve(null) : fetchPortfolioSummaryV2(portfolioId)),
    [portfolioId],
  );
  const [pinError, setPinError] = useState(false);

  const isPinned = overview.data?.items.some((item) => item.portfolioId === portfolioId) ?? false;
  const togglePin = async () => {
    if (portfolioId === undefined) return;
    try {
      await pinPortfolio(portfolioId, !isPinned);
      setPinError(false);
      overview.reload();
    } catch {
      setPinError(true);
    }
  };

  const data = summary.data;
  const currency = data?.currency ?? null;
  const kpis = data ? [
    { label: 'Portföy değeri', value: formatMoney(data.value, currency), sub: data.pricingComplete === false ? 'Kısmi veri: bazı pozisyonların fiyatı yok' : 'Güncel piyasa değeri', tone: null },
    { label: 'Günlük değişim', value: formatMoney(data.dayChange, currency, true), sub: formatFraction(data.dayChangePct), tone: data.dayChange },
    { label: 'Gerçekleşmemiş K/Z', value: formatMoney(data.unrealizedPnl, currency, true), sub: formatFraction(data.unrealizedPnlPct), tone: data.unrealizedPnl },
    { label: 'Gerçekleşen K/Z (YBB)', value: formatMoney(data.realizedPnlYtd, currency, true), sub: 'Yıl başından bugüne', tone: data.realizedPnlYtd },
    { label: 'Nakit', value: formatMoney(data.cash, currency), sub: 'Portföydeki nakit bakiye', tone: null },
  ] : [];

  return (
    <div className="space-y-6">
      <DashCard
        title="Sabitlenen portföyler"
        subtitle="Portföy kartına dokunarak o portföyü seçin"
        actions={portfolioId !== undefined && (
          <button
            type="button"
            aria-pressed={isPinned}
            onClick={() => void togglePin()}
            className="min-h-11 min-w-11 rounded-md border border-outline-variant/40 px-3 text-xs font-bold text-text-secondary hover:text-text-primary"
          >
            {isPinned ? 'Sabitlemeyi kaldır' : 'Portföyü sabitle'}
          </button>
        )}
      >
        {pinError && <p role="alert" className="mb-2 text-xs text-bear-red">Sabitleme kaydedilemedi.</p>}
        <PanelState state={overview.state} notes={overview.data?.notes} onRetry={overview.reload} emptyMessage="Sabitlenmiş portföy yok" label="Sabitlenen portföyler">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overview.data?.items.map((item) => (
              <li key={item.portfolioId}>
                <button
                  type="button"
                  aria-label={`${item.name} portföyünü seç`}
                  aria-pressed={item.portfolioId === portfolioId}
                  onClick={() => onSelectPortfolioId(String(item.portfolioId))}
                  className={`min-h-11 w-full rounded-md border p-3 text-left ${item.portfolioId === portfolioId ? 'border-primary/50 bg-primary/10' : 'border-outline-variant/40'}`}
                >
                  <span className="block text-xs font-bold text-text-primary">{item.name}</span>
                  <span className="mt-1 block font-data-mono text-lg font-bold text-text-primary">{formatMoney(item.value, overview.data?.currency)}</span>
                  <span className={`block font-data-mono text-xs font-semibold ${toneClass(item.dayChangePct)}`}>{formatFraction(item.dayChangePct)} bugün</span>
                </button>
              </li>
            ))}
          </ul>
        </PanelState>
      </DashCard>

      <DashCard title="Portföy göstergeleri" subtitle="Seçili portföy için değer, günlük değişim ve kâr/zarar">
        {portfolioId === undefined ? (
          <PanelState state="empty" emptyMessage="Portföy seçin" />
        ) : (
          <PanelState state={summary.state} notes={data?.notes} onRetry={summary.reload} skeletonRows={2} label="Portföy göstergeleri">
            <div role="group" aria-label="Portföy göstergeleri" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-md border border-outline-variant/40 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</span>
                  <span className={`mt-2 block font-data-mono text-xl font-bold ${kpi.tone === null ? 'text-text-primary' : toneClass(kpi.tone)}`}>{kpi.value}</span>
                  <span className="mt-1 block text-xs text-text-muted">{kpi.sub}</span>
                </div>
              ))}
            </div>
          </PanelState>
        )}
      </DashCard>
    </div>
  );
}
