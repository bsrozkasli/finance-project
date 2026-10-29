import type { ComparableRef } from '../../api/redesign';

export const fmtFraction = (value: number | null | undefined, digits = 2): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = value * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(digits)}%`;
};

export const fmtPlainFraction = (value: number | null | undefined, digits = 1): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
};

export const fmtNumber = (value: number | null | undefined, digits = 2): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
};

/** Numeric portfolio id of a `PORTFOLIO:<id>` ref; null for ALL and benchmarks. */
export const portfolioIdOf = (ref: string): number | null => {
  const match = /^PORTFOLIO:(\d+)$/.exec(ref);
  return match ? Number(match[1]) : null;
};

export const benchmarkCodeOf = (ref: string): string | null => (
  ref.startsWith('BENCHMARK:') ? ref.slice('BENCHMARK:'.length) : null
);

export const isComparableRef = (value: string): value is ComparableRef => (
  value === 'ALL' || /^PORTFOLIO:\d+$/.test(value) || value.startsWith('BENCHMARK:')
);

/** Tone class for a signed fraction. */
export const toneOf = (value: number | null | undefined): 'pos' | 'neg' | 'flat' => {
  if (value == null || !Number.isFinite(value) || value === 0) return 'flat';
  return value > 0 ? 'pos' : 'neg';
};
