import type { CSSProperties } from 'react';

export const STRATEGIES = [
  'Growth',
  'Value',
  'Momentum',
  'Swing Trade',
  'Scalp',
  'Hedge',
  'Dividend',
  'Income',
  'Mean Reversion',
  'Breakout',
  'Pairs Trade',
  'Speculative',
  'Other',
];

export const THEMES = ['AI', 'Enerji', 'Savunma', 'Saglik', 'Fintech', 'E-commerce', 'Semiconductor', 'Gaming', 'Space', 'Real Estate'];

export type JournalViewMode = 'table' | 'grouped' | 'timeline';
export type JournalActionKind = 'BUY' | 'SELL' | 'ADD' | 'REDUCE' | 'DIVIDEND';

export interface TradeEvaluation {
  decisionScore: number;
  repeat: boolean;
  lesson: string;
}

export interface JournalFilters {
  portfolioId: string;
  symbol: string;
  action: string;
  strategy: string;
  theme: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const INPUT_STYLE: CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: '7px 10px',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  outline: 'none',
};

export const fmtCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';
  return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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

export const positiveColor = (value: number | null | undefined) => (value ?? 0) >= 0 ? 'var(--color-bull)' : 'var(--color-bear)';

export const actionIcon = (action: string) => {
  if (action === 'BUY' || action === 'ADD') return { icon: 'UP', color: 'var(--color-bull)', label: action === 'ADD' ? 'Pozisyon Arttirma' : 'BUY' };
  if (action === 'SELL' || action === 'REDUCE') return { icon: 'DN', color: 'var(--color-bear)', label: action === 'REDUCE' ? 'Pozisyon Azaltma' : 'SELL' };
  if (action === 'DIVIDEND') return { icon: '$', color: 'var(--color-warning)', label: 'Temettu' };
  return { icon: '-', color: 'var(--color-text-muted)', label: action };
};

export const themesFromTags = (tags?: string[]) => (tags ?? []).filter(tag => THEMES.includes(tag));
export const nonThemeTags = (tags?: string[]) => (tags ?? []).filter(tag => !THEMES.includes(tag) && !tag.startsWith('eval:'));

export const evaluationKey = 'finance-project:journal-evaluations';

export const readEvaluations = (): Record<number, TradeEvaluation> => {
  try {
    const raw = window.localStorage.getItem(evaluationKey);
    return raw ? JSON.parse(raw) as Record<number, TradeEvaluation> : {};
  } catch {
    return {};
  }
};

export const writeEvaluations = (evaluations: Record<number, TradeEvaluation>) => {
  window.localStorage.setItem(evaluationKey, JSON.stringify(evaluations));
};