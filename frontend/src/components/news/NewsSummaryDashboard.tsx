import type { CategorizedNewsItem } from '../../api/client';
import { relatedSymbolsOf } from './newsUtils';

interface NewsSummaryDashboardProps {
  news: CategorizedNewsItem[];
}

export const NewsSummaryDashboard = ({ news }: NewsSummaryDashboardProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = news.filter(item => (item.datetime > 10_000_000_000 ? item.datetime : item.datetime * 1000) >= today.getTime()).length;
  const bullish = news.filter(item => item.sentiment === 'BULLISH').length;
  const bearish = news.filter(item => item.sentiment === 'BEARISH').length;
  const symbolCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  news.forEach(item => {
    relatedSymbolsOf(item).forEach(symbol => symbolCounts.set(symbol, (symbolCounts.get(symbol) ?? 0) + 1));
    if (item.category) topicCounts.set(item.category, (topicCounts.get(item.category) ?? 0) + 1);
  });
  const topSymbols = Array.from(symbolCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTopics = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <section className="grid gap-3 border-b px-5 py-3 md:grid-cols-4" style={{ borderColor: 'var(--color-border)' }}>
      <Metric label="Today" value={String(todayCount)} />
      <Metric label="Bullish / Bearish" value={`${bullish} / ${bearish}`} color={bullish >= bearish ? 'var(--color-bull)' : 'var(--color-bear)'} />
      <Metric label="Trending Topics" value={topTopics.map(([topic]) => topic).join(', ') || '-'} />
      <Metric label="Most Covered" value={topSymbols.map(([symbol, count]) => `${symbol}(${count})`).join(', ') || '-'} />
    </section>
  );
};

const Metric = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="rounded-lg border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="mt-1 truncate text-sm font-bold" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
  </div>
);