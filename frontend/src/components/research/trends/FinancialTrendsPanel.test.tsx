import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {FinancialHistory, FinancialHistoryPoint} from '../../../api/client';
import type {FinancialRatios, FundamentalsData} from '../../../api/research';
import FinancialTrendsPanel from './FinancialTrendsPanel';

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
    totalEquity: -10,
    totalDebt: 300,
    cash: 40,
    netDebt: null,
    debtToEquity: null,
    currentRatio: 1.2,
    roe: 0.1,
    roa: 0.05,
    netMargin: 0.1,
    fcfMargin: null,
    revenueGrowth: 0.05,
    netIncomeGrowth: 0.02,
    notMeaningful: ['debtToEquity'],
    ...overrides,
});

const history = (overrides: Partial<FinancialHistory> = {}): FinancialHistory => ({
    symbol: 'AAPL',
    status: 'PARTIAL',
    currency: 'USD',
    periodType: 'annual',
    retrievedAt: null,
    points: [point()],
    ...overrides,
} as FinancialHistory);

const props = {history: history(), ratios: null, fundamentals: null, loading: false, isFund: false};

describe('FinancialTrendsPanel', () => {
    it('shows only the fund message for funds', () => {
        render(<FinancialTrendsPanel {...props} isFund/>);
        expect(screen.getByText('Fonlar için şirket gelir tablosu uygulanmaz.')).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Kârlılık'})).not.toBeInTheDocument();
    });

    it('shows a loading status', () => {
        render(<FinancialTrendsPanel {...props} loading/>);
        expect(screen.getByRole('status')).toHaveTextContent('Finansal geçmiş yükleniyor…');
    });

    it('shows retry copy when unavailable or null', () => {
        const {rerender} = render(<FinancialTrendsPanel {...props} history={history({status: 'UNAVAILABLE', points: []})}/>);
        expect(screen.getByText(/Finansal geçmiş şu an alınamıyor/)).toBeInTheDocument();
        rerender(<FinancialTrendsPanel {...props} history={null}/>);
        expect(screen.getByText(/Finansal geçmiş şu an alınamıyor/)).toBeInTheDocument();
    });

    it('shows empty copy', () => {
        render(<FinancialTrendsPanel {...props} history={history({status: 'EMPTY', points: []})}/>);
        expect(screen.getByText('Raporlanan dönem verisi bulunamadı')).toBeInTheDocument();
    });

    it('renders all seven charts and marks negative-equity D/E as not meaningful', () => {
        const two = history({points: [
            point({fiscalYear: 2022, fiscalYearEnd: '2022-12-31', totalEquity: 50, debtToEquity: 2, notMeaningful: []}),
            point(),
        ]});
        render(<FinancialTrendsPanel {...props} history={two}/>);
        for (const name of [
            'Gelir ve net kâr', 'Büyüme, yıllık', 'Kârlılık', 'Borç / özsermaye', 'Borç ve nakit', 'Cari oran',
            'Faaliyet nakit akışı, yatırım harcaması ve serbest nakit akışı',
        ]) {
            expect(screen.getByRole('heading', {name})).toBeInTheDocument();
        }
        expect(screen.getAllByText('anlamlı değil').length).toBeGreaterThan(0);
    });

    it('shows not-meaningful D/E cells in the table when every year is not meaningful', () => {
        render(<FinancialTrendsPanel {...props}/>);
        const figure = screen.getByRole('heading', {name: 'Borç / özsermaye'}).closest('figure') as HTMLElement;
        const cells = within(within(figure).getByRole('table')).getAllByRole('cell');
        expect(cells.map((c) => c.textContent)).toContain('anlamlı değil');
        expect(within(figure).queryByText('Bu gösterge için raporlanan veri yok')).toBeNull();
    });

    it('shows the reported currency or the missing-currency note', () => {
        const {rerender} = render(<FinancialTrendsPanel {...props}/>);
        expect(screen.getAllByText('Para birimi: USD').length).toBeGreaterThan(0);
        rerender(<FinancialTrendsPanel {...props} history={history({currency: null})}/>);
        expect(screen.getByText('Para birimi bildirilmedi. Değerler dönüştürülmedi.')).toBeInTheDocument();
    });

    it('shows valuation tiles with dashes for absent ratios and the no-series note', () => {
        const ratios: FinancialRatios = {pe: 20.5};
        const fundamentals = {dividendYield: 1.234} as FundamentalsData;
        render(<FinancialTrendsPanel {...props} ratios={ratios} fundamentals={fundamentals}/>);
        const pe = screen.getByText('Fiyat / kazanç (F/K)').closest('div') as HTMLElement;
        expect(within(pe).getByText('20.50')).toBeInTheDocument();
        const pb = screen.getByText('PD/DD').closest('div') as HTMLElement;
        expect(within(pb).getByText('—')).toBeInTheDocument();
        expect(screen.getByText('1.23%')).toBeInTheDocument();
        expect(screen.getAllByText('Güncel değer · geçmiş seri yok')).toHaveLength(5);
    });

    it('does not imply healthy or unhealthy', () => {
        render(<FinancialTrendsPanel {...props}/>);
        expect(screen.queryByText(/sağlıklı|riskli|iyi|kötü|eşik|healthy/i)).not.toBeInTheDocument();
    });
});
