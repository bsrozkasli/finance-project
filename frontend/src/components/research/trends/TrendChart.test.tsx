import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {FinancialHistory, FinancialHistoryPoint} from '../../../api/client';
import {TrendChart} from './TrendChart';

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

const history = (points: FinancialHistoryPoint[]): FinancialHistory => ({
    symbol: 'AAPL',
    status: 'OK',
    currency: 'USD',
    periodType: 'annual',
    retrievedAt: null,
    points,
} as FinancialHistory);

const base = {title: 'Likidite', basis: 'Yıllık, raporlanan', unit: 'ratio' as const, kind: 'line' as const};

describe('TrendChart', () => {
    it('renders title, basis and a table with ratio values', () => {
        const h = history([
            point({fiscalYear: 2023, currentRatio: 1.5}),
            point({fiscalYear: 2024, fiscalYearEnd: '2024-12-31', currentRatio: 1.8}),
        ]);
        render(<TrendChart {...base} history={h} series={[{key: 'currentRatio', label: 'Cari oran'}]}/>);
        expect(screen.getByText('Likidite')).toBeInTheDocument();
        expect(screen.getByText('Yıllık, raporlanan')).toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(within(table).getByText('FY2023')).toBeInTheDocument();
        expect(within(table).getByText('FY2024')).toBeInTheDocument();
        expect(within(table).getByText('1,50x')).toBeInTheDocument();
        expect(screen.getByRole('figure').getAttribute('aria-label')).toContain('1,80x');
    });

    it('shows dash for missing and label for not-meaningful', () => {
        const h = history([
            point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', currentRatio: 1.2}),
            point({fiscalYear: 2023, currentRatio: null}),
            point({fiscalYear: 2024, fiscalYearEnd: '2024-12-31', notMeaningful: ['currentRatio']}),
        ]);
        render(<TrendChart {...base} history={h} series={[{key: 'currentRatio', label: 'Cari oran'}]}/>);
        const table = screen.getByRole('table');
        expect(within(table).getByText('—')).toBeInTheDocument();
        expect(within(table).getByText('anlamlı değil')).toBeInTheDocument();
    });

    it('renders empty message and no table when no values', () => {
        render(<TrendChart {...base} history={history([point()])} series={[{key: 'currentRatio', label: 'Cari oran'}]}/>);
        expect(screen.getByText('Bu gösterge için raporlanan veri yok')).toBeInTheDocument();
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('renders a single-year history', () => {
        render(<TrendChart {...base} kind="bar" history={history([point({currentRatio: 2})])}
                           series={[{key: 'currentRatio', label: 'Cari oran'}]}/>);
        expect(screen.getByText('FY2023')).toBeInTheDocument();
    });

    it('formats negative money with a minus sign', () => {
        const h = history([point({netIncome: -1500000})]);
        render(<TrendChart {...base} unit="money" kind="bar" history={h}
                           series={[{key: 'netIncome', label: 'Net kâr'}]}/>);
        const cell = within(screen.getByRole('table')).getAllByRole('cell')[0];
        expect(cell.textContent).toMatch(/^[-−]/);
        expect(screen.getByRole('figure').getAttribute('aria-label')).toMatch(/[-−]1,5/);
    });
});
