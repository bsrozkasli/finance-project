import type { CategorizedNewsItem, NewsCategory, NewsPriority } from '../../api/client';

export type SentimentFilter = 'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type PriorityFilter = 'ALL' | 'HIGH';
export type TimeFilter = 'ALL' | '1H' | 'TODAY' | 'WEEK' | 'MONTH';

export interface NewsFilters {
  category: NewsCategory | 'ALL';
  sentiment: SentimentFilter;
  priority: PriorityFilter;
  time: TimeFilter;
  portfolioId: string;
  watchlistId: string;
  symbol: string;
  page: number;
}

export const CATEGORIES: { id: NewsCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All News' },
  { id: 'BREAKING', label: 'Breaking' },
  { id: 'PORTFOLIO', label: 'Portfolio' },
  { id: 'WATCHLIST', label: 'Watchlist' },
  { id: 'ECONOMY', label: 'Economy' },
  { id: 'INFLATION', label: 'Inflation' },
  { id: 'INTEREST_RATES', label: 'Rates' },
  { id: 'CENTRAL_BANKS', label: 'Central Banks' },
  { id: 'AI', label: 'AI' },
  { id: 'TECHNOLOGY', label: 'Tech' },
  { id: 'DEFENSE', label: 'Defense' },
  { id: 'ENERGY', label: 'Energy' },
  { id: 'HEALTHCARE', label: 'Healthcare' },
];

export const PRIORITY_COLORS: Record<NewsPriority, string> = {
  HIGH: 'var(--color-bear)',
  MEDIUM: 'var(--color-warning)',
  LOW: 'var(--color-text-muted)',
};

export const SENTIMENT_COLORS = {
  BULLISH: 'var(--color-bull)',
  BEARISH: 'var(--color-bear)',
  NEUTRAL: 'var(--color-text-muted)',
};

export const getNewsTimestampMs = (item: CategorizedNewsItem) => {
  const raw = item.datetime;
  return raw > 10_000_000_000 ? raw : raw * 1000;
};

export const relatedSymbolsOf = (item: CategorizedNewsItem): string[] => {
  const explicit = item.relatedSymbols ?? [];
  const related = item.related ? item.related.split(',').map(symbol => symbol.trim().toUpperCase()).filter(Boolean) : [];
  return Array.from(new Set([...explicit.map(symbol => symbol.toUpperCase()), ...related]));
};

export const sentimentIcon = (sentiment?: string) => {
  if (sentiment === 'BULLISH') return '+';
  if (sentiment === 'BEARISH') return '-';
  return '->';
};

export const timeThreshold = (filter: TimeFilter): number | null => {
  const now = Date.now();
  if (filter === '1H') return now - 60 * 60 * 1000;
  if (filter === 'TODAY') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (filter === 'WEEK') return now - 7 * 24 * 60 * 60 * 1000;
  if (filter === 'MONTH') return now - 30 * 24 * 60 * 60 * 1000;
  return null;
};