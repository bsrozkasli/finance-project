// Formatting helpers for the dashboard panels. Missing values render as an em dash, never as 0.
export const DASH = '—';

const isNum = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

/** Ratio (0.25) -> "+25,00%". */
export const formatFraction = (value: number | null | undefined, signed = true): string => {
  if (!isNum(value)) return DASH;
  const pct = value * 100;
  return `${signed && pct > 0 ? '+' : ''}${pct.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

/** Percentage points (1.5) -> "+1,50 pp". */
export const formatPoints = (value: number | null | undefined): string => {
  if (!isNum(value)) return DASH;
  return `${value > 0 ? '+' : ''}${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pp`;
};

export const formatMoney = (value: number | null | undefined, currency?: string | null, signed = false): string => {
  if (!isNum(value)) return DASH;
  const body = Math.abs(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = value < 0 ? '-' : signed && value > 0 ? '+' : '';
  return `${sign}${body}${currency ? ` ${currency}` : ''}`;
};

export const toneClass = (value: number | null | undefined): string => {
  if (!isNum(value) || value === 0) return 'text-text-muted';
  return value > 0 ? 'text-bull-green' : 'text-bear-red';
};

/** Heat background for a return ratio; saturates at +-10 percent. */
export const heatStyle = (value: number | null | undefined): { backgroundColor: string } => {
  if (!isNum(value) || value === 0) return { backgroundColor: 'rgba(144,151,168,0.12)' };
  const alpha = (0.15 + Math.min(Math.abs(value) / 0.1, 1) * 0.55).toFixed(2);
  return { backgroundColor: value > 0 ? `rgba(74,222,128,${alpha})` : `rgba(248,113,113,${alpha})` };
};

export const CHART_COLORS = ['#60A5FA', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#2DD4BF', '#9097A8'];

export const WINDOW_LABELS: Record<string, string> = {
  '1D': '1G', '1W': '1H', '1M': '1A', '3M': '3A', '6M': '6A', '1Y': '1Y', YTD: 'YBB',
};

export const buttonClass = (active: boolean): string =>
  `min-h-11 min-w-11 rounded-md border px-3 text-xs font-bold transition-colors ${active
    ? 'border-primary/50 bg-primary/15 text-text-primary'
    : 'border-outline-variant/40 text-text-secondary hover:text-text-primary'}`;
