import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {http, HttpResponse, delay} from 'msw';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {server} from '../../test/server';
import ResearchWorkspace from './ResearchWorkspace';

// HTTP boundary stubs isolate providers; component and selection logic run unchanged.
const base = 'http://localhost:8080/api/v1';
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
    http.get(`${base}/news/:symbol`, () => HttpResponse.json([])),
));
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
