import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {FinancialHistory, FinancialHistoryPoint} from '../../../api/client';
import {FONT, TrendChart, VIEWBOX_WIDTH} from './TrendChart';
import {CHAR_WIDTH, formatCell, M} from './trendModel';

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

    it('shows a fully not-meaningful series with its table instead of the no-data card', () => {
        const h = history([
            point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', notMeaningful: ['currentRatio']}),
            point({fiscalYear: 2023, notMeaningful: ['currentRatio']}),
        ]);
        render(<TrendChart {...base} history={h} series={[{key: 'currentRatio', label: 'Cari oran'}]}/>);
        expect(screen.queryByText('Bu gösterge için raporlanan veri yok')).toBeNull();
        expect(within(screen.getByRole('table')).getAllByText('anlamlı değil')).toHaveLength(2);
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

    describe('svg drawing', () => {
        it('keeps rendered text at least 12px at the narrowest realistic plot width', () => {
            // Worst case: a 360px viewport leaves roughly 300px of plot width inside the padded, bordered figure.
            const WORST_CASE_PLOT_WIDTH = 300;
            expect(FONT * WORST_CASE_PLOT_WIDTH / VIEWBOX_WIDTH).toBeGreaterThanOrEqual(12);
            const {container} = render(<TrendChart {...base} history={history([point({currentRatio: 2})])}
                                                   series={[{key: 'currentRatio', label: 'Cari oran'}]}/>);
            const svg = container.querySelector('svg') as SVGElement;
            expect(svg.getAttribute('viewBox')).toBe(`0 0 ${VIEWBOX_WIDTH} 240`);
            expect(svg.getAttribute('font-size')).toBe(String(FONT));
        });

        const cr = [{key: 'currentRatio' as const, label: 'Cari oran'}];
        const three = (mid: number | null) => history([
            point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', currentRatio: 1.2}),
            point({fiscalYear: 2023, currentRatio: mid}),
            point({fiscalYear: 2024, fiscalYearEnd: '2024-12-31', currentRatio: 1.8}),
        ]);

        it('breaks a line at a missing cell instead of drawing through it', () => {
            const {container} = render(<TrendChart {...base} history={three(null)} series={cr}/>);
            expect(container.querySelectorAll('svg path')).toHaveLength(2);
            expect(container.querySelectorAll('svg circle')).toHaveLength(2);
        });

        it('draws one connected path when no cell is missing', () => {
            const {container} = render(<TrendChart {...base} history={three(1.5)} series={cr}/>);
            expect(container.querySelectorAll('svg path')).toHaveLength(1);
        });

        it('shows a dot for a single-year line series', () => {
            const {container} = render(<TrendChart {...base} history={history([point({currentRatio: 2})])} series={cr}/>);
            expect(container.querySelectorAll('svg circle')).toHaveLength(1);
        });

        it('fits five year labels within their bands', () => {
            const five = history([2020, 2021, 2022, 2023, 2024].map((year) =>
                point({fiscalYear: year, fiscalYearEnd: `${year}-12-31`, currentRatio: 1 + (year - 2020) / 10})));
            const {container} = render(<TrendChart {...base} history={five} series={cr}/>);
            const labels = Array.from(container.querySelectorAll('svg text')).map((t) => t.textContent ?? '').filter((t) => /^\d{4}$/.test(t));
            expect(labels).toEqual(['2020', '2021', '2022', '2023', '2024']);
            const band = (VIEWBOX_WIDTH - M.left - M.right) / labels.length;
            expect(labels[0].length * CHAR_WIDTH).toBeLessThanOrEqual(band);
        });

        it('omits the currency code from money ticks but keeps it in the hover title and table', () => {
            const h = history([point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', netIncome: 500000000}), point({netIncome: -250000000})]);
            const {container} = render(<TrendChart {...base} unit="money" kind="bar" history={h} series={[{key: 'netIncome', label: 'Net kâr'}]}/>);
            const texts = Array.from(container.querySelectorAll('svg text')).map((t) => t.textContent ?? '');
            expect(texts.some((t) => t.includes('USD'))).toBe(false);
            expect(texts.some((t) => t.includes('Mn'))).toBe(true);
            expect(Array.from(container.querySelectorAll('svg title')).every((t) => (t.textContent ?? '').includes('USD'))).toBe(true);
            expect(within(screen.getByRole('table')).getAllByRole('cell').every((c) => (c.textContent ?? '').includes('USD'))).toBe(true);
        });

        it('states the currency once for money charts only', () => {
            const money = {...base, unit: 'money' as const, kind: 'bar' as const, series: [{key: 'netIncome' as const, label: 'Net kâr'}]};
            const {rerender} = render(<TrendChart {...money} history={history([point({netIncome: 5})])}/>);
            expect(screen.getByText('Para birimi: USD')).toBeInTheDocument();
            rerender(<TrendChart {...money} history={{...history([point({netIncome: 5})]), currency: null}}/>);
            expect(screen.getByText('Para birimi bildirilmedi.')).toBeInTheDocument();
            rerender(<TrendChart {...base} history={history([point({currentRatio: 5})])} series={cr}/>);
            expect(screen.queryByText(/Para birimi/)).toBeNull();
            rerender(<TrendChart {...base} unit="percent" history={history([point({roe: 0.1})])} series={[{key: 'roe', label: 'ROE'}]}/>);
            expect(screen.queryByText(/Para birimi/)).toBeNull();
        });

        it('sizes the left margin for the longest tick of each unit', () => {
            const probe = point();
            const samples = [
                formatCell({...probe, netIncome: -250000000, notMeaningful: []}, 'netIncome', 'money', null),
                formatCell({...probe, netIncome: -1200000000000, notMeaningful: []}, 'netIncome', 'money', null),
                formatCell({...probe, currentRatio: -12.5, notMeaningful: []}, 'currentRatio', 'ratio', null),
                formatCell({...probe, roe: -1, notMeaningful: []}, 'roe', 'percent', null),
            ];
            for (const text of samples) expect(M.left).toBeGreaterThanOrEqual(text.length * CHAR_WIDTH + 6);
        });

        it('draws negative bars below the zero line and hides the svg from assistive tech', () => {
            const h = history([
                point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', netIncome: 500000}),
                point({fiscalYear: 2023, netIncome: -400000}),
            ]);
            const {container} = render(<TrendChart {...base} unit="money" kind="bar" history={h} series={[{key: 'netIncome', label: 'Net kâr'}]}/>);
            const zero = Number(container.querySelector('.desk-trend-zero')?.getAttribute('y1'));
            const [positive, negative] = Array.from(container.querySelectorAll('svg rect'));
            expect(Number(positive.getAttribute('y')) + Number(positive.getAttribute('height'))).toBeCloseTo(zero, 1);
            expect(Number(negative.getAttribute('y'))).toBeCloseTo(zero, 1);
            expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        });

        it('puts the formatted value in the native hover title', () => {
            const {container} = render(<TrendChart {...base} history={three(1.5)} series={cr}/>);
            const titles = Array.from(container.querySelectorAll('svg title')).map(t => t.textContent);
            expect(titles).toContain('FY2023 (2023-12-31) Cari oran: 1,50x');
        });
    });
});
