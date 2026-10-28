import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {FinancialHistory, FinancialHistoryPoint, FundamentalsData} from '../../api/client';
import ResearchFinancials from './ResearchFinancials';
import {formatCell} from './trends/trendModel';

const point = (overrides: Partial<FinancialHistoryPoint> = {}): FinancialHistoryPoint => ({
    fiscalYear: 2023,
    fiscalYearEnd: '2023-12-31',
    revenue: 1000,
    netIncome: 100,
    operatingCashFlow: 150,
    capitalExpenditure: 50,
    freeCashFlow: 100,
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
    points: [point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', netIncome: null}), point(), point({fiscalYear: 2024, fiscalYearEnd: '2024-12-31'})],
    ...overrides,
});
const fundamentals: FundamentalsData = {
    symbol: 'AAPL',
    revenue: [{year: 2021, value: 5}],
    netIncome: [],
    eps: [{year: 2023, value: 1.5}],
    freeCashFlow: [{year: 2021, value: 7}],
};
const rowNames = () => screen.getAllByRole('rowheader').map(header => header.textContent);

describe('ResearchFinancials', () => {
    it('uses history years and the computed free cash flow when history is usable', () => {
        const h = history();
        render(<ResearchFinancials data={fundamentals} history={h} loading={false} isFund={false}/>);
        const table = screen.getByRole('table', {name: 'Yıllık finansallar'});
        expect(within(table).getAllByRole('columnheader').map(c => c.textContent)).toEqual(['Gösterge', 'FY2022', 'FY2023', 'FY2024']);
        expect(rowNames()).toEqual(['Toplam gelir', 'Net kâr', 'Faaliyet nakit akışı', 'Serbest nakit akışı', 'Hisse başına kazanç (EPS)']);
        const p = h.points[1];
        expect((p.operatingCashFlow as number) - (p.capitalExpenditure as number)).toBe(p.freeCashFlow);
        const fcfRow = within(table).getByRole('row', {name: /^Serbest nakit akışı/});
        expect(within(fcfRow).getAllByRole('cell')[1]).toHaveTextContent(formatCell(p, 'freeCashFlow', 'money', 'USD'));
        const incomeRow = within(table).getByRole('row', {name: /^Net kâr/});
        expect(within(incomeRow).getAllByRole('cell')[0]).toHaveTextContent('—');
        const epsRow = within(table).getByRole('row', {name: /^Hisse başına/});
        expect(within(epsRow).getAllByRole('cell')[1]).toHaveTextContent('1,5');
    });

    it('falls back to the legacy series and labels the cash flow row as operating cash flow', () => {
        render(<ResearchFinancials data={fundamentals} history={history({status: 'UNAVAILABLE', points: []})} loading={false} isFund={false}/>);
        expect(rowNames()).toContain('Faaliyet nakit akışı');
        expect(rowNames()).not.toContain('Serbest nakit akışı');
        expect(screen.getByRole('columnheader', {name: 'FY2021'})).toBeInTheDocument();
    });

    it('falls back when history is null', () => {
        render(<ResearchFinancials data={fundamentals} history={null} loading={false} isFund={false}/>);
        expect(rowNames()).not.toContain('Serbest nakit akışı');
    });
});
