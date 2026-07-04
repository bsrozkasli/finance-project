import type { CategorizedNewsItem, EconomicEvent } from '../../api/client';
import { getNewsTimestampMs } from './newsUtils';

interface MacroNewsBannerProps {
  news: CategorizedNewsItem[];
  events: EconomicEvent[];
}

const isMacroHeadline = (text: string) => {
  const lower = text.toLowerCase();
  return ['fomc', 'fed', 'cpi', 'inflation', 'jobs', 'payroll', 'employment', 'rate', 'central bank'].some(token => lower.includes(token));
};

export const MacroNewsBanner = ({ news, events }: MacroNewsBannerProps) => {
  const criticalNews = news
    .filter(item => item.priority === 'HIGH' || item.category === 'ECONOMY' || item.category === 'INFLATION' || item.category === 'INTEREST_RATES' || isMacroHeadline(item.headline))
    .sort((a, b) => getNewsTimestampMs(b) - getNewsTimestampMs(a))
    .slice(0, 4);
  const upcoming = events.slice(0, 4);
  const marquee = criticalNews.map(item => item.headline).join('   |   ');

  return (
    <section className="border-b px-5 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="mb-2 flex items-center gap-2"><span className="live-dot" /><span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Macro Intelligence</span></div>
          <div className="overflow-hidden whitespace-nowrap text-xs" style={{ color: 'var(--color-text-primary)' }}>
            <div style={{ display: 'inline-block', minWidth: '100%' }}>{marquee || 'No critical macro headlines in the current feed.'}</div>
          </div>
        </div>
        <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Upcoming Economic Events</div>
          <div className="space-y-1.5">
            {upcoming.length > 0 ? upcoming.map(event => <div key={`${event.date}-${event.event}`} className="flex justify-between gap-3 text-xs"><span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{event.event}</span><span className="font-mono" style={{ color: event.impact?.toLowerCase() === 'high' ? 'var(--color-bear)' : 'var(--color-text-muted)' }}>{event.date}</span></div>) : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Economic calendar unavailable or empty.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};