import type { SectorComparable } from '../../api/redesign';

const nf = (digits: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits });

export const isNum = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Plain number, em dash when absent (never 0). */
export const num = (value: number | null | undefined, digits = 2): string => (isNum(value) ? nf(digits).format(value) : '—');

/** Fraction (0.25) to percent text, em dash when absent. */
export const pct = (value: number | null | undefined, digits = 1): string =>
  isNum(value) ? `%${nf(digits).format(value * 100)}` : '—';

export const compactNum = (value: number | null | undefined): string =>
  isNum(value) ? new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : '—';

export const periodLabel = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `Ç${Math.ceil(Number(match[2]) / 3)} ${match[1].slice(2)}`;
};

export const VERDICT_LABEL: Record<NonNullable<SectorComparable['verdict']>, string> = {
  CHEAPER: 'Sektörden ucuz',
  SIMILAR: 'Sektöre yakın',
  MORE_EXPENSIVE: 'Sektörden pahalı',
  STRONGER: 'Sektörden güçlü',
  WEAKER: 'Sektörden zayıf',
};
