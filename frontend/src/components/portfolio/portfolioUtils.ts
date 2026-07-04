import type { EnrichedPosition, PortfolioHolding, PortfolioPerformanceResponse, PortfolioPosition } from '../../api/client';

export const CHART_COLORS = [
  '#4d8eff', '#4edea3', '#f59e0b', '#a78bfa', '#fb923c',
  '#34d399', '#60a5fa', '#f472b6', '#facc15', '#38bdf8',
];

export const THEME_OPTIONS = [
  'AI/ML',
  'Clean Energy',
  'Healthcare',
  'Defense',
  'Fintech',
  'E-commerce',
  'Semiconductor',
  'Gaming',
  'Space',
  'Real Estate',
];

export const PERFORMANCE_PERIODS = [
  { label: 'Haftalik', value: '5D' },
  { label: 'Aylik', value: '1M' },
  { label: '3 Aylik', value: '3M' },
  { label: '6 Aylik', value: '6M' },
  { label: 'YTD', value: 'YTD' },
  { label: '1 Yillik', value: '1Y' },
  { label: '3 Yillik', value: '3Y' },
  { label: 'MAX', value: 'MAX' },
];

export interface EnrichedRow {
  position: PortfolioPosition;
  holding?: PortfolioHolding;
  enriched?: EnrichedPosition;
  price: number | null;
  changePct: number | null;
  marketValue: number | null;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnL: number | null;
  totalReturn: number | null;
}

export interface PortfolioTotals {
  totalMarketValue: number;
  dailyPnL: number;
  totalPnL: number;
  totalCostBasis: number;
  totalReturn: number;
  assetCount: number;
}

export const fmt = (value: number | null | undefined, prefix = '', suffix = '', decimals = 2): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
};

export const fmtCurrency = (value: number | null | undefined, currency = '$'): string => fmt(value, currency, '', 2);

export const fmtPct = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const positiveColor = (value: number | null | undefined): string =>
  (value ?? 0) >= 0 ? 'var(--color-bull)' : 'var(--color-bear)';

export const calculateVolatility = (performance: PortfolioPerformanceResponse | null): number | null => {
  const series = performance?.series ?? [];
  if (series.length < 3) return performance?.metrics?.volatility ?? null;
  const returns: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    const previous = toNumber(series[index - 1].portfolioValue);
    const current = toNumber(series[index].portfolioValue);
    if (previous > 0 && current > 0) returns.push((current - previous) / previous);
  }
  if (returns.length < 2) return performance?.metrics?.volatility ?? null;
  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + ((value - average) ** 2), 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};

export const performanceReturn = (performance: PortfolioPerformanceResponse | null): { returnPct: number | null; pnl: number | null } => {
  const series = performance?.series ?? [];
  if (series.length < 2) return { returnPct: null, pnl: null };
  const first = toNumber(series[0].portfolioValue);
  const last = toNumber(series[series.length - 1].portfolioValue);
  if (first <= 0) return { returnPct: null, pnl: null };
  return { returnPct: ((last - first) / first) * 100, pnl: last - first };
};

export const sparkPath = (values: number[], width = 90, height = 28): string => {
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