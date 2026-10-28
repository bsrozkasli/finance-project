import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {http, HttpResponse, delay} from 'msw';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {API_BASE_URL as base} from '../../api/config';
import {server} from '../../test/server';
import ResearchWorkspace from './ResearchWorkspace';

// HTTP boundary stubs isolate providers; component and selection logic run unchanged.
const user = () => userEvent.setup({advanceTimers: vi.advanceTimersByTime});
const props = {
    stocks: [],
    assets: [{symbol: 'AAA', name: 'Alpha', type: 'STOCK'}, {symbol: 'BBB', name: 'Beta', type: 'STOCK'}],
    onSelectStock: vi.fn()
};
beforeEach(() => server.use(
    http.get(`${base}/fundamentals/:symbol`, ({params}) => HttpResponse.json({
        symbol: params.symbol,
        revenue: [{year: 2025, value: 1200}],
        netIncome: [{year: 2025, value: 0}],
        eps: [],
        freeCashFlow: []
    })),
    http.get(`${base}/fundamentals/:symbol/ratios`, () => HttpResponse.json({pe: null})),
    http.get(`${base}/fundamentals/:symbol/history`, ({params}) => HttpResponse.json({symbol: params.symbol, status: 'EMPTY', currency: null, periodType: 'annual', retrievedAt: null, points: []})),
    http.get(`${base}/news/:symbol`, () => HttpResponse.json([])),
));
const availableHistory = (symbol: string) => ({
    symbol, status: 'AVAILABLE', currency: 'USD', periodType: 'annual', retrievedAt: null,
    points: [2023, 2024].map(year => ({
        fiscalYear: year, fiscalYearEnd: `${year}-12-31`, revenue: 1000 * (year - 2022), netIncome: 100, operatingCashFlow: 150,
        capitalExpenditure: 50, freeCashFlow: 100, totalAssets: null, totalLiabilities: null, totalEquity: 10, totalDebt: 30, cash: 4,
        netDebt: null, debtToEquity: 3, currentRatio: 1.2, roe: 0.1, roa: 0.05, netMargin: 0.1, fcfMargin: null,
        revenueGrowth: 0.05, netIncomeGrowth: 0.02, notMeaningful: []
    }))
});
const desk = (symbol = 'AAA') => <MemoryRouter><ResearchWorkspace {...props} symbol={symbol}/></MemoryRouter>;

describe('ResearchWorkspace', () => {
    it('opens Overview with six sections and keeps an unpriced saved symbol researchable', async () => {
        render(desk());
        expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Genel bakış', 'Grafik', 'Finansallar', 'Risk', 'Haberler', 'AI raporu']);
        expect(screen.getByRole('tab', {name: 'Genel bakış'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', {name: 'Alpha'})).toBeInTheDocument();
        await screen.findByText('1.200');
        expect(screen.getByText('Fiyat verisi yok')).toBeInTheDocument();
    });
    it('labels an unresolved instrument type as unknown instead of showing the raw value', async () => {
        render(<MemoryRouter><ResearchWorkspace {...props} assets={[{symbol: 'ZZZ', name: 'Zeta', type: 'UNRESOLVED'}]} symbol="ZZZ"/></MemoryRouter>);
        expect(screen.getByText('Tür bilinmiyor')).toBeInTheDocument();
        expect(screen.queryByText('UNRESOLVED')).not.toBeInTheDocument();
    });
    it('shows reported zero, missing period cells and unknown units truthfully in the annual table', async () => {
        render(desk());
        await user().click(screen.getByRole('tab', {name: 'Finansallar'}));
        const table = await screen.findByRole('table', {name: 'Yıllık finansallar'});
        await waitFor(() => expect(within(table).getByText('1.200')).toBeInTheDocument());
        expect(within(table).getByText('0')).toBeInTheDocument();
        expect(within(table).getAllByText('—').length).toBeGreaterThan(0);
        expect(screen.getByText(/Birim.*bildirilmedi/)).toBeInTheDocument();
        await user().click(screen.getByRole('button', {name: 'Kompakt'}));
        expect(table).toHaveClass('is-compact');
    });
    it('shows the trends panel headings on the Finansallar tab after the lazy chunk resolves', async () => {
        server.use(http.get(`${base}/fundamentals/:symbol/history`, ({params}) => HttpResponse.json(availableHistory(String(params.symbol)))));
        render(desk());
        await user().click(screen.getByRole('tab', {name: 'Finansallar'}));
        expect(await screen.findByRole('heading', {name: 'Büyüme ve kârlılık'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Nakit akışı'})).toBeInTheDocument();
        expect(screen.getByRole('table', {name: 'Yıllık finansallar'})).toBeInTheDocument();
    });
    it('does not request financial history for a fund', async () => {
        const requested = vi.fn();
        server.use(http.get(`${base}/fundamentals/:symbol/history`, () => {
            requested();
            return HttpResponse.json(availableHistory('SPY'));
        }));
        render(<MemoryRouter><ResearchWorkspace {...props} assets={[{symbol: 'SPY', name: 'Spdr', type: 'ETF'}]} symbol="SPY"/></MemoryRouter>);
        await user().click(screen.getByRole('tab', {name: 'Finansallar'}));
        expect(await screen.findAllByText('Fonlar için şirket gelir tablosu uygulanmaz.')).not.toHaveLength(0);
        expect(requested).not.toHaveBeenCalled();
    });
    it('shows the revenue and net income trend chart on the overview', async () => {
        server.use(http.get(`${base}/fundamentals/:symbol/history`, ({params}) => HttpResponse.json(availableHistory(String(params.symbol)))));
        render(desk());
        expect(await screen.findByRole('heading', {name: 'Gelir ve net kâr'})).toBeInTheDocument();
    });
    it('shows the empty chart copy on the overview when history is unusable', async () => {
        render(desk());
        expect(await screen.findByText('Grafik için raporlanan finansal dönem bulunamadı.')).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Gelir ve net kâr'})).not.toBeInTheDocument();
    });
    it('retains successful financial evidence when a separate provider section fails', async () => {
        server.use(http.get(`${base}/fundamentals/:symbol/ratios`, () => new HttpResponse(null, {status: 503})));
        render(desk());
        await screen.findByText('1.200');
        expect(screen.getByText(/Oranlar kullanılamıyor/)).toBeInTheDocument();
        await user().click(screen.getByRole('tab', {name: 'Risk'}));
        expect(screen.getByText(/Risk metrikleri kullanılamıyor/)).toBeInTheDocument();
    });
    it('does not show late evidence from a previously selected symbol', async () => {
        server.use(http.get(`${base}/fundamentals/AAA`, async () => {
            await delay(120);
            return HttpResponse.json({
                symbol: 'AAA',
                revenue: [{year: 2025, value: 999}],
                netIncome: [],
                eps: [],
                freeCashFlow: []
            });
        }));
        const {rerender} = render(desk());
        rerender(desk('BBB'));
        await screen.findByText('1.200');
        await new Promise(resolve => setTimeout(resolve, 180));
        expect(screen.queryByText('999')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Beta'})).toBeInTheDocument();
    });
    it('sends watchlist additions through the persistent callback', async () => {
        const add = vi.fn().mockResolvedValue(undefined);
        render(<MemoryRouter><ResearchWorkspace {...props} symbol="AAA"
                                                watchlists={[{id: '1', name: 'Takip', symbols: []}]}
                                                onAddToWatchlist={add}/></MemoryRouter>);
        await user().click(screen.getByRole('button', {name: 'İzleme listesine ekle'}));
        await waitFor(() => expect(add).toHaveBeenCalledWith('AAA', '1'));
    });
});
