import {describe, expect, it} from 'vitest';
import type {FinancialHistory, FinancialHistoryPoint} from '../../../api/client';
import {cellState, chartRows, formatCell, formatTick, hasAnyValue, leftMargin, sortedPoints, viewState, CHAR_WIDTH} from './trendModel';

const point = (overrides: Partial<FinancialHistoryPoint> = {}): FinancialHistoryPoint => ({
    fiscalYear: 2023,
    fiscalYearEnd: '2023-12-31',
    revenue: null,
    netIncome: null,
    operatingCashFlow: null,
    capitalExpenditure: null,
    freeCashFlow: null,
    totalAssets: null,
    totalLiabilities: null,
    totalEquity: null,
    totalDebt: null,
    cash: null,
    netDebt: null,
    debtToEquity: null,
    currentRatio: null,
    roe: null,
    roa: null,
    netMargin: null,
    fcfMargin: null,
    revenueGrowth: null,
    netIncomeGrowth: null,
    notMeaningful: [],
    ...overrides,
});

const history = (overrides: Partial<FinancialHistory> = {}): FinancialHistory => ({
    symbol: 'AAPL',
    status: 'AVAILABLE',
    currency: 'USD',
    periodType: 'annual',
    retrievedAt: null,
    points: [point()],
    ...overrides,
});

describe('cellState', () => {
    it('is notMeaningful only for keys listed in point.notMeaningful', () => {
        const p = point({roe: null, roa: null, notMeaningful: ['roe']});
        expect(cellState(p, 'roe')).toBe('notMeaningful');
        expect(cellState(p, 'roa')).toBe('missing');
    });
    it('is value for numbers including zero', () => {
        expect(cellState(point({netIncome: 0}), 'netIncome')).toBe('value');
        expect(cellState(point({netIncome: 5}), 'netIncome')).toBe('value');
    });
});

describe('formatCell', () => {
    it('formats ratios with x suffix', () => {
        expect(formatCell(point({currentRatio: 1.5}), 'currentRatio', 'ratio', 'USD')).toBe('1,50x');
    });
    it('formats percent with one decimal', () => {
        expect(formatCell(point({roe: 0.25}), 'roe', 'percent', null)).toBe('%25,0');
    });
    it('formats missing and not meaningful', () => {
        expect(formatCell(point(), 'roe', 'percent', null)).toBe('—');
        expect(formatCell(point({notMeaningful: ['roe']}), 'roe', 'percent', null)).toBe('anlamlı değil');
    });
    it('does not render zero for missing', () => {
        expect(formatCell(point({netIncome: 0}), 'netIncome', 'money', null)).toBe('0');
    });
    it('formats compact money with and without currency', () => {
        expect(formatCell(point({revenue: 391e9}), 'revenue', 'money', 'USD')).toBe('391 Mr USD');
        expect(formatCell(point({revenue: 391e9}), 'revenue', 'money', null)).toBe('391 Mr');
        expect(formatCell(point({netDebt: -391e9}), 'netDebt', 'money', 'USD')).toBe('-391 Mr USD');
    });
});

describe('chartRows', () => {
    it('keeps ascending order and maps both null states to null', () => {
        const h = history({
            points: [
                point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', roe: 0.1, roa: 0.05}),
                point({fiscalYear: 2023, fiscalYearEnd: '2023-12-31', roe: null, roa: null, notMeaningful: ['roe']}),
            ],
        });
        expect(chartRows(h, ['roe', 'roa'])).toEqual([
            {year: 2022, end: '2022-12-31', roe: 0.1, roa: 0.05},
            {year: 2023, end: '2023-12-31', roe: null, roa: null},
        ]);
    });
    it('sorts unordered input ascending', () => {
        const h = history({points: [point({fiscalYear: 2024, fiscalYearEnd: '2024-12-31'}), point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31'})]});
        expect(chartRows(h, ['roe']).map((r) => r.year)).toEqual([2022, 2024]);
    });
});

describe('hasAnyValue', () => {
    it('is false for an all-null key and true when one year has a value', () => {
        const h = history({points: [point({fiscalYear: 2022}), point({fiscalYear: 2023})]});
        expect(hasAnyValue(h, 'roe')).toBe(false);
        const h2 = history({points: [point({fiscalYear: 2022}), point({fiscalYear: 2023, roe: 0})]});
        expect(hasAnyValue(h2, 'roe')).toBe(true);
    });
});

describe('viewState', () => {
    it('loading wins', () => {
        expect(viewState(null, true)).toBe('loading');
        expect(viewState(history(), true)).toBe('loading');
    });
    it('null history after loading is unavailable', () => {
        expect(viewState(null, false)).toBe('unavailable');
    });
    it('maps statuses', () => {
        expect(viewState(history({status: 'UNAVAILABLE'}), false)).toBe('unavailable');
        expect(viewState(history({status: 'EMPTY'}), false)).toBe('empty');
        expect(viewState(history({status: 'AVAILABLE', points: []}), false)).toBe('empty');
        expect(viewState(history({status: 'AVAILABLE'}), false)).toBe('ready');
        expect(viewState(history({status: 'PARTIAL'}), false)).toBe('ready');
    });
});

describe('axis ticks and margin', () => {
    it('formats compact ticks by unit and step', () => {
        expect(formatTick(-5000, 'percent', 1000)).toBe('-%500.000');
        expect(formatTick(0.5, 'percent', 0.25)).toBe('%50');
        expect(formatTick(0.005, 'percent', 0.005)).toBe('%0,5');
        expect(formatTick(1000.5, 'ratio', 500)).toBe('1.000,5x');
        expect(formatTick(0.05, 'ratio', 0.05)).toBe('0,05x');
        expect(formatTick(-250000000, 'money', 1)).toMatch(/^-/);
    });

    it('sizes the margin to at least the longest tick estimate with a floor', () => {
        expect(leftMargin(['0'])).toBeGreaterThanOrEqual(44);
        const ticks = ['-%5.000', '%5.000'];
        expect(leftMargin(ticks)).toBeGreaterThanOrEqual(7 * CHAR_WIDTH);
    });

    it('orders points by period end and keeps same-fiscalYear points apart', () => {
        const h = {symbol: 'X', status: 'AVAILABLE', currency: null, periodType: 'annual', retrievedAt: null,
            points: [point({fiscalYear: 2023, fiscalYearEnd: '2023-12-31'}), point({fiscalYear: 2023, fiscalYearEnd: '2023-01-01'})]} as FinancialHistory;
        expect(sortedPoints(h).map((p) => p.fiscalYearEnd)).toEqual(['2023-01-01', '2023-12-31']);
        expect(chartRows(h, ['revenue']).map((r) => r.end)).toEqual(['2023-01-01', '2023-12-31']);
    });
});
