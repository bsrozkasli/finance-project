import { useState } from 'react';
import { fetchCalendarEvents, fetchUpcomingStopLevels } from '../../api/redesign';
import type { CalendarCategory } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import DashCard from './DashCard';
import { buttonClass, formatFraction, formatMoney } from './format';

const FILTERS: { id: CalendarCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Tümü' },
  { id: 'CENTRAL_BANK', label: 'Merkez bankası' },
  { id: 'EARNINGS', label: 'Bilanço' },
  { id: 'MACRO', label: 'Makro' },
];
const CATEGORY_LABEL: Record<string, string> = { CENTRAL_BANK: 'Merkez bankası', EARNINGS: 'Bilanço', MACRO: 'Makro' };
const IMPORTANCE_LABEL: Record<string, string> = { HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük' };
const STATUS_LABEL: Record<string, string> = { BREACHED: 'Aşıldı', AT_RISK: 'Risk altında', NEAR: 'Yakın', SAFE: 'Güvenli', NA: 'Uygulanamaz' };

const daysLabel = (days: number | undefined): string => {
  if (days === undefined) return '';
  if (days <= 0) return 'Bugün';
  return `${days} gün kaldı`;
};

/** Calendar with category filters (central bank, earnings, macro). */
export function CalendarPanel({ portfolioId }: { portfolioId: number | undefined }) {
  const [category, setCategory] = useState<CalendarCategory | 'ALL'>('ALL');
  const query = usePanelQuery(
    () => fetchCalendarEvents({ category: category === 'ALL' ? undefined : category, portfolioId }),
    [category, portfolioId],
  );

  return (
    <DashCard title="Yaklaşan olaylar" subtitle="Merkez bankası, bilanço ve makro takvimi">
      <div role="group" aria-label="Takvim filtresi" className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button key={filter.id} type="button" aria-pressed={category === filter.id} onClick={() => setCategory(filter.id)} className={buttonClass(category === filter.id)}>
            {filter.label}
          </button>
        ))}
      </div>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Takvim" emptyMessage="Bu filtre için yaklaşan olay yok">
        <ul className="space-y-2">
          {query.data?.items.map((event, index) => (
            <li key={`${event.date}-${event.title}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-outline-variant/30 p-3">
              <div>
                <div className="font-data-mono text-xs text-text-muted">{event.date}{event.time ? `, ${event.time}` : ''}</div>
                <div className="text-xs font-bold text-text-primary">{event.title}</div>
                <div className="text-xs text-text-muted">
                  {CATEGORY_LABEL[event.category] ?? event.category}{event.symbol ? ` · ${event.symbol}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs">
                {event.importance && <div className="font-bold text-warning-amber">Önem: {IMPORTANCE_LABEL[event.importance]}</div>}
                <div className="text-text-secondary">{daysLabel(event.daysUntil)}</div>
              </div>
            </li>
          ))}
        </ul>
      </PanelState>
    </DashCard>
  );
}

/** Nearest stop-loss / take-profit levels across pinned portfolios with a distance bar. */
export function UpcomingStopsPanel() {
  const query = usePanelQuery(() => fetchUpcomingStopLevels({ pinned: true, limit: 6 }), []);
  const nearLimit = query.data?.thresholds?.near ?? 0.1;
  const scale = Math.max(nearLimit * 2, 0.1);

  return (
    <DashCard title="Yaklaşan stop seviyeleri" subtitle="Sabitlenen portföylerdeki en yakın stop-loss ve hedef fiyatlar">
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Stop seviyeleri" emptyMessage="Tanımlı stop seviyesi yok">
        <ul className="space-y-3">
          {query.data?.items.map((item) => {
            const distance = item.distance;
            const width = distance == null ? 0 : Math.min(Math.max(distance / scale, 0), 1) * 100;
            return (
              <li key={`${item.portfolioId}-${item.symbol}-${item.type}`} className="rounded-md border border-outline-variant/30 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-text-primary">{item.symbol}{item.portfolioName ? ` · ${item.portfolioName}` : ''}</span>
                  <span className="text-text-secondary">
                    {item.type === 'TAKE_PROFIT' ? 'Hedef fiyat' : 'Stop-loss'}
                    {item.status ? ` · ${STATUS_LABEL[item.status] ?? item.status}` : ''}
                  </span>
                </div>
                <div className="mt-1 font-data-mono text-text-secondary">
                  Seviye {formatMoney(item.level)} · Fiyat {formatMoney(item.price)} · Mesafe {formatFraction(distance, false)}
                </div>
                <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded bg-surface-container-high">
                  <div className="h-full rounded bg-primary" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </PanelState>
    </DashCard>
  );
}
