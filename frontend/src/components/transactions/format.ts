/** Formatting helpers for the transaction and earnings screens. Missing values render as an em dash, never 0. */
export const DASH = '—';

export const formatMoney = (value: number | null | undefined, currency?: string | null): string => {
  if (value == null || !Number.isFinite(value)) return DASH;
  const code = currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
  if (!code) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value);
};

export const formatQuantity = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return DASH;
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 }).format(value);
};

/** `fraction` is a ratio: 0.25 = 25 percent. */
export const formatPercent = (fraction: number | null | undefined, signed = true): string => {
  if (fraction == null || !Number.isFinite(fraction)) return DASH;
  const text = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(fraction * 100);
  return `${signed && fraction > 0 ? '+' : ''}%${text}`;
};

export const formatPoints = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return DASH;
  const text = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
  return `${value > 0 ? '+' : ''}${text} puan`;
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const toneClass = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value) || value === 0) return 'text-text-primary';
  return value > 0 ? 'text-bull-green' : 'text-bear-red';
};

export const sideLabel = (side: string): string => {
  switch (side) {
    case 'BUY': return 'AL';
    case 'SELL': return 'SAT';
    case 'DIVIDEND': return 'Temettü';
    case 'FEE': return 'Masraf';
    default: return side;
  }
};

export const INPUT_CLASS = 'min-h-11 w-full rounded-md border border-outline-variant bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none';
export const BUTTON_CLASS = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant bg-bg-card px-4 py-2 text-sm font-bold text-text-secondary hover:text-text-primary disabled:opacity-60';
export const PRIMARY_BUTTON_CLASS = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-60';
export const CARD_CLASS = 'min-w-0 rounded-md border border-outline-variant bg-bg-card p-4';
export const LABEL_CLASS = 'mb-1 block text-xs font-label-caps uppercase tracking-wide text-text-muted';
