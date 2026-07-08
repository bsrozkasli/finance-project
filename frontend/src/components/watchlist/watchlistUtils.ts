import type { FinancialRatios, FundamentalsData } from '../../api/client';
import type { PriceHistory } from '../../api/types';

export type WatchlistTab = 'overview' | 'technical' | 'analyst' | 'news' | 'ai';

export interface WatchlistAlert {
  id: string;
  symbol: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_ABOVE' | 'RSI_BELOW';
  threshold: number;
  createdAt: string;
}

export interface WatchlistSettings {
  colors: Record<number, string>;
  order: Record<number, string[]>;
  alerts: WatchlistAlert[];
}

export interface ResearchSnapshot {
  fundamentals: FundamentalsData | null;
  ratios: FinancialRatios | null;
  fiveDay: PriceHistory[];
  threeMonth: PriceHistory[];
  oneYear: PriceHistory[];
}

export const WATCHLIST_COLORS = ['#4d8eff', '#4edea3', '#f59e0b', '#a78bfa', '#fb923c', '#38bdf8', '#f472b6'];
export const watchlistSettingsKey = 'finance-project:watchlist-settings';

export const fmtCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtPct = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const fmtNum = (value: number | null | undefined, decimals = 2): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  return value.toFixed(decimals);
};

export const positiveColor = (value: number | null | undefined): string => (value ?? 0) >= 0 ? 'var(--color-bull)' : 'var(--color-bear)';

export const readWatchlistSettings = (): WatchlistSettings => {
  try {
    const raw = window.localStorage.getItem(watchlistSettingsKey);
    if (!raw) return { colors: {}, order: {}, alerts: [] };
    const parsed = JSON.parse(raw) as Partial<WatchlistSettings>;
    return { colors: parsed.colors ?? {}, order: parsed.order ?? {}, alerts: parsed.alerts ?? [] };
  } catch {
    return { colors: {}, order: {}, alerts: [] };
  }
};

export const writeWatchlistSettings = (settings: WatchlistSettings) => {
  window.localStorage.setItem(watchlistSettingsKey, JSON.stringify(settings));
};

export const sparklinePath = (values: number[], width = 120, height = 34): string => {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

export const yearRange = (bars: PriceHistory[]) => {
  if (bars.length === 0) return { high52w: null, low52w: null };
  return {
    high52w: Math.max(...bars.map(bar => bar.high)),
    low52w: Math.min(...bars.map(bar => bar.low)),
  };
};

export const revenueGrowth = (fundamentals: FundamentalsData | null): number | null => {
  const values = fundamentals?.revenue ?? [];
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a.year - b.year);
  const prev = sorted[sorted.length - 2]?.value;
  const last = sorted[sorted.length - 1]?.value;
  if (!prev) return null;
  return ((last - prev) / prev) * 100;
};

export const normalizePerformance = (bars: PriceHistory[]) => {
  if (bars.length === 0) return [];
  const first = bars[0].close;
  if (!first) return [];
  return bars.map(bar => ({ date: bar.timestamp.slice(0, 10), value: ((bar.close - first) / first) * 100 }));
};
