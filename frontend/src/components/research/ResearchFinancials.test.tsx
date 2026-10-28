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

    it('shows distinct values for two points that share a fiscalYear and states the reported currency', () => {
        const h = history({points: [
            point({fiscalYear: 2023, fiscalYearEnd: '2023-01-01', revenue: 1000}),
            point({fiscalYear: 2023, fiscalYearEnd: '2023-12-31', revenue: 2000}),
        ]});
        render(<ResearchFinancials data={fundamentals} history={h} loading={false} isFund={false}/>);
        const table = screen.getByRole('table', {name: 'Yıllık finansallar'});
        const row = within(table).getByRole('row', {name: /^Toplam gelir/});
        expect(within(row).getAllByRole('cell').map(c => c.textContent)).toEqual([
            formatCell(h.points[0], 'revenue', 'money', 'USD'), formatCell(h.points[1], 'revenue', 'money', 'USD')]);
        expect(within(row).getAllByRole('cell')[0]).not.toHaveTextContent(formatCell(h.points[1], 'revenue', 'money', 'USD'));
        expect(screen.getByText(/Para birimi: USD/)).toBeInTheDocument();
        expect(screen.queryByText(/Birim ve para birimi sağlayıcı yanıtında/)).not.toBeInTheDocument();
        expect(screen.queryByText(/dönem bitiş tarihi/)).not.toBeInTheDocument();
    });

    it('keeps the unreported unit and period-end copy in legacy mode', () => {
        render(<ResearchFinancials data={fundamentals} history={null} loading={false} isFund={false}/>);
        expect(screen.getByText(/Birim ve para birimi sağlayıcı yanıtında/)).toBeInTheDocument();
        expect(screen.getByText(/dönem bitiş tarihi/)).toBeInTheDocument();
    });

    it('says the currency was not reported when history has none', () => {
        render(<ResearchFinancials data={fundamentals} history={history({currency: null})} loading={false} isFund={false}/>);
        expect(screen.getByText(/Para birimi bildirilmedi\./)).toBeInTheDocument();
    });

    it('falls back when history is null', () => {
        render(<ResearchFinancials data={fundamentals} history={null} loading={false} isFund={false}/>);
        expect(rowNames()).not.toContain('Serbest nakit akışı');
    });
});
