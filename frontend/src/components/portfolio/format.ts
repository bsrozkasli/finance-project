/** Formatting helpers for redesign portfolio panels. Null/undefined always render as an em dash, never 0. */
export const DASH = '—';

export const fmtPct = (fraction: number | null | undefined, digits = 1): string => (
  fraction == null ? DASH : `%${(fraction * 100).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
);

export const fmtSignedPct = (fraction: number | null | undefined, digits = 2): string => {
  if (fraction == null) return DASH;
  const text = (Math.abs(fraction) * 100).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${fraction > 0 ? '+' : fraction < 0 ? '−' : ''}%${text}`;
};

export const fmtMoney = (value: number | null | undefined, currency?: string | null): string => {
  if (value == null) return DASH;
  const options: Intl.NumberFormatOptions = currency && currency.length === 3
    ? { style: 'currency', currency, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 2 };
  return value.toLocaleString('tr-TR', options);
};

export const fmtSignedMoney = (value: number | null | undefined, currency?: string | null): string => {
  if (value == null) return DASH;
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmtMoney(Math.abs(value), currency)}`;
};

export const toneClass = (value: number | null | undefined): string => (
  value == null || value === 0 ? 'text-text-secondary' : value > 0 ? 'text-bull-green' : 'text-bear-red'
);
