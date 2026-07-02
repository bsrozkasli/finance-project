import { useEffect, useMemo, useState } from 'react';
import type { EarningsEvent, EconomicEvent, MarketCalendar } from '../../../api/client';
import { fetchCalendar } from '../../../api/client';

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  meta: string;
  kind: 'Earnings' | 'Macro';
  urgency: 'critical' | 'warning' | 'ok';
};

const dayMs = 24 * 60 * 60 * 1000;

const urgencyFor = (dateText: string): TimelineItem['urgency'] => {
  const eventDate = new Date(dateText);
  if (Number.isNaN(eventDate.getTime())) return 'ok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const days = Math.round((eventDate.getTime() - today.getTime()) / dayMs);
  if (days <= 1) return 'critical';
  if (days <= 7) return 'warning';
  return 'ok';
};

const colorFor = (urgency: TimelineItem['urgency']) => {
  if (urgency === 'critical') return 'var(--color-bear)';
  if (urgency === 'warning') return 'var(--color-warning)';
  return 'var(--color-bull)';
};

const formatDate = (dateText: string) => {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const toItems = (calendar: MarketCalendar | null): TimelineItem[] => {
  if (!calendar) return [];
  const earnings = calendar.earnings.map((event: EarningsEvent): TimelineItem => ({
    id: `earnings-${event.symbol}-${event.date}`,
    date: event.date,
    title: `${event.symbol} earnings`,
    meta: `EPS est. ${event.epsEstimate ?? '-'}${event.time ? ` / ${event.time}` : ''}`,
    kind: 'Earnings',
    urgency: urgencyFor(event.date),
  }));
  const economic = calendar.economicEvents.map((event: EconomicEvent): TimelineItem => ({
    id: `macro-${event.event}-${event.date}`,
    date: event.date,
    title: event.event,
    meta: `${event.country ?? 'Global'}${event.impact ? ` / ${event.impact}` : ''}`,
    kind: 'Macro',
    urgency: urgencyFor(event.date),
  }));

  return [...earnings, ...economic]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);
};

export const CriticalDatesWidget = ({ symbols }: { symbols: string[] }) => {
  const [calendar, setCalendar] = useState<MarketCalendar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbolKey = useMemo(() => symbols.slice().sort().join(','), [symbols]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCalendar(symbols);
        if (!cancelled) setCalendar(data);
      } catch (e) {
        if (!cancelled) {
          setCalendar(null);
          setError(e instanceof Error ? e.message : 'Calendar unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [symbolKey, symbols]);

  const items = useMemo(() => toItems(calendar), [calendar]);

  return (
    <section className="rounded-lg border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Critical Dates</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Earnings and macro events for selected holdings</p>
        </div>
        {loading && <span className="skeleton h-6 w-16" />}
      </div>

      {error && <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No upcoming critical dates for this selection.</div>
      )}
      <div className="space-y-3">
        {items.map((item) => {
          const color = colorFor(item.urgency);
          return (
            <div key={item.id} className="flex gap-3 rounded border p-3" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{formatDate(item.date)}</span>
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color, border: `1px solid ${color}` }}>{item.kind}</span>
                </div>
                <div className="mt-1 truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.title}</div>
                <div className="mt-1 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.meta}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
