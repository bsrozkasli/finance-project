import type {FinancialHistory, FinancialHistoryPoint} from '../../../api/client';

export type MetricKey = Exclude<keyof FinancialHistoryPoint, 'fiscalYear' | 'fiscalYearEnd' | 'notMeaningful'>;
export type CellState = 'value' | 'missing' | 'notMeaningful';
export type Unit = 'ratio' | 'percent' | 'money';
export type ViewState = 'loading' | 'unavailable' | 'empty' | 'ready';
export type ChartRow = {year: number; end: string} & Partial<Record<MetricKey, number | null>>;

const MISSING = '—';
const NOT_MEANINGFUL = 'anlamlı değil';

const ratioFormat = new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const percentFormat = new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});
const moneyFormat = new Intl.NumberFormat('tr-TR', {notation: 'compact', maximumFractionDigits: 1});

const numericValue = (point: FinancialHistoryPoint, key: MetricKey): number | null => {
    const value = point[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const cellState = (point: FinancialHistoryPoint, key: MetricKey): CellState => {
    if (point.notMeaningful.includes(key)) return 'notMeaningful';
    return numericValue(point, key) === null ? 'missing' : 'value';
};

export const formatCell = (
    point: FinancialHistoryPoint,
    key: MetricKey,
    unit: Unit,
    currency: string | null,
): string => {
    const state = cellState(point, key);
    if (state === 'notMeaningful') return NOT_MEANINGFUL;
    const value = numericValue(point, key);
    if (state === 'missing' || value === null) return MISSING;
    switch (unit) {
        case 'ratio':
            return `${ratioFormat.format(value)}x`;
        case 'percent':
            return percentFormat.format(value);
        case 'money': {
            const text = moneyFormat.format(value);
            return currency ? `${text} ${currency}` : text;
        }
    }
};

// Points are identified by fiscalYearEnd: two fiscal years can share a fiscalYear label.
export const sortedPoints = (history: FinancialHistory): FinancialHistoryPoint[] =>
    [...history.points].sort((a, b) => a.fiscalYearEnd.localeCompare(b.fiscalYearEnd));

export const chartRows = (history: FinancialHistory, keys: MetricKey[]): ChartRow[] =>
    sortedPoints(history).map((point) => {
        const row: ChartRow = {year: point.fiscalYear, end: point.fiscalYearEnd};
        for (const key of keys) {
            row[key] = cellState(point, key) === 'value' ? numericValue(point, key) : null;
        }
        return row;
    });

export const hasAnyValue = (history: FinancialHistory, key: MetricKey): boolean =>
    history.points.some((point) => cellState(point, key) === 'value');

export const viewState = (history: FinancialHistory | null, loading: boolean): ViewState => {
    if (loading) return 'loading';
    if (history === null || history.status === 'UNAVAILABLE') return 'unavailable';
    if (history.status === 'EMPTY' || history.points.length === 0) return 'empty';
    return 'ready';
};

const tickPercent = [0, 1].map((digits) => new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
}));
const tickRatio = [1, 2].map((digits) => new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
}));

/** Compact y-axis tick text; tooltips and tables keep full precision. `step` is the tick spacing. */
export const formatTick = (value: number, unit: Unit, step: number): string => {
    switch (unit) {
        case 'percent':
            return tickPercent[step * 100 >= 1 ? 0 : 1].format(value);
        case 'ratio':
            return `${tickRatio[step >= 0.1 ? 0 : 1].format(value)}x`;
        case 'money':
            return moneyFormat.format(value);
    }
};

// Estimated rendered width of one tick character at FONT units.
export const CHAR_WIDTH = 8.5;
export const MIN_LEFT = 44;
const TICK_GAP = 8;
export const M = {top: 12, right: 10, bottom: 30};

/** Left margin sized from the longest formatted tick so no tick (or its minus sign) is clipped. */
export const leftMargin = (tickTexts: string[]): number =>
    Math.max(MIN_LEFT, Math.ceil(Math.max(0, ...tickTexts.map((t) => t.length)) * CHAR_WIDTH + TICK_GAP));
