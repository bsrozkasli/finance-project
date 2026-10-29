import { fetchPortfolioAllocation, fetchPortfolioMonthlyReturns, fetchPortfolioOverview } from '../../api/redesign';
import { useMarketScope } from '../../context/marketScope';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import DashCard from './DashCard';
import { CHART_COLORS, formatFraction, formatMoney, heatStyle } from './format';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Donut over the pinned portfolios; the legend list is the text equivalent. */
export function PortfolioAllocationPanel() {
  const { market } = useMarketScope();
  const marketParam = market === 'ALL' ? undefined : market;
  const query = usePanelQuery(() => fetchPortfolioOverview({ pinned: true, market: marketParam }), [marketParam]);
  const priced = (query.data?.items ?? []).filter((item): item is typeof item & { value: number } => typeof item.value === 'number' && item.value > 0);
  const total = priced.reduce((sum, item) => sum + item.value, 0);
  const skipped = (query.data?.items.length ?? 0) - priced.length;
  const arcs = priced.map((item, index) => {
    const length = (item.value / total) * CIRCUMFERENCE;
    const start = priced.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * CIRCUMFERENCE, 0);
    return { item, length, start };
  });

  return (
    <DashCard title="Portföylere göre dağılım" subtitle="Sabitlenen portföylerin değer payı">
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Portföy dağılımı" emptyMessage="Dağılım için değerlenmiş portföy yok">
        <div className="flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label="Portföylere göre dağılım halka grafiği">
            {arcs.map(({ item, length, start }, index) => (
              <circle
                key={item.portfolioId}
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
              />
            ))}
          </svg>
          <ul className="space-y-1 text-xs">
            {priced.map((item, index) => (
              <li key={item.portfolioId} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="text-text-primary">{item.name}</span>
                <span className="font-data-mono text-text-secondary">{formatFraction(item.value / total, false)} · {formatMoney(item.value, query.data?.currency)}</span>
              </li>
            ))}
            {skipped > 0 && <li className="text-text-muted">{skipped} portföy değerlenemediği için dışarıda bırakıldı.</li>}
          </ul>
        </div>
      </PanelState>
    </DashCard>
  );
}

/** Sector weights of the selected portfolio, cash included when the backend reports it. */
export function SectorAllocationPanel({ portfolioId }: { portfolioId: number | undefined }) {
  const query = usePanelQuery(
    () => (portfolioId === undefined ? Promise.resolve(null) : fetchPortfolioAllocation(portfolioId, 'SECTOR')),
    [portfolioId],
  );
  return (
    <DashCard title="Sektör dağılımı" subtitle="Nakit dahil">
      {portfolioId === undefined ? <PanelState state="empty" emptyMessage="Portföy seçin" /> : (
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Sektör dağılımı" emptyMessage="Sektör verisi yok">
          <ul className="space-y-2">
            {query.data?.slices.map((slice) => (
              <li key={slice.key} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-text-primary">{slice.label}</span>
                  <span className="font-data-mono text-text-secondary">{formatFraction(slice.weight, false)}</span>
                </div>
                <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded bg-surface-container-high">
                  <div className="h-full rounded bg-primary" style={{ width: `${Math.min(Math.max((slice.weight ?? 0) * 100, 0), 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </PanelState>
      )}
    </DashCard>
  );
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const monthLabel = (month: string): string => {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${month.slice(2, 4)}` : month;
};

/** Last 12 monthly returns as colour-coded tiles with the value in text. */
export function MonthlyReturnsPanel({ portfolioId }: { portfolioId: number | undefined }) {
  const query = usePanelQuery(
    () => (portfolioId === undefined ? Promise.resolve(null) : fetchPortfolioMonthlyReturns(portfolioId, 12)),
    [portfolioId],
  );
  const data = query.data;
  return (
    <DashCard title="Aylık getiriler" subtitle="Son 12 ay">
      {portfolioId === undefined ? <PanelState state="empty" emptyMessage="Portföy seçin" /> : (
        <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Aylık getiriler" emptyMessage="Aylık getiri verisi yok">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data?.items.map((item) => (
              <li key={item.month} style={heatStyle(item.returnPct)} className="rounded-md p-2 text-center">
                <span className="block text-xs text-text-secondary">{monthLabel(item.month)}</span>
                <span className="block font-data-mono text-xs font-bold text-text-primary">{formatFraction(item.returnPct)}</span>
              </li>
            ))}
          </ul>
          {data && (
            <p className="mt-3 text-xs text-text-muted">
              {data.positiveMonths !== undefined ? `Pozitif ay: ${data.positiveMonths}` : ''}
              {data.best ? ` · En iyi: ${monthLabel(data.best.month)} ${formatFraction(data.best.value)}` : ''}
              {data.worst ? ` · En kötü: ${monthLabel(data.worst.month)} ${formatFraction(data.worst.value)}` : ''}
            </p>
          )}
        </PanelState>
      )}
    </DashCard>
  );
}
