import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LeftNav from '../LeftNav';
import TopBar from '../TopBar';
import CompareView from '../CompareView';
import MarketScopeProvider from '../../context/MarketScopeProvider';
import { MARKET_SCOPE_STORAGE_KEY } from '../../context/marketScope';
import { API_BASE_URL } from '../../api/config';
import { server } from '../../test/server';
import { NAV_GROUPS, routeTitle } from './navigation';

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

const renderTopBar = () => render(
  <MemoryRouter>
    <MarketScopeProvider>
      <TopBar stocks={[]} onSelectStock={vi.fn()} onOpenTradingJournal={vi.fn()} />
    </MarketScopeProvider>
  </MemoryRouter>,
);

describe('navigation', () => {
  it('groups the nine screens as Genel / Piyasa / Hisseler / Portföy', () => {
    expect(NAV_GROUPS.map((group) => [group.label, group.items.map((item) => item.label)])).toEqual([
      ['Genel', ['Panel', 'Karşılaştırma']],
      ['Piyasa', ['Haberler', 'İzleme Listeleri']],
      ['Hisseler', ['Şirket Analizi', 'Raporlar']],
      ['Portföy', ['Portföylerim', 'İşlem Ekle', 'Kazanç Analizi']],
    ]);
  });

  it.each([
    ['/dashboard', 'Panel'],
    ['/compare', 'Karşılaştırma'],
    ['/news/AAPL', 'Haberler'],
    ['/watchlist', 'İzleme Listeleri'],
    ['/workspace/AAPL', 'Şirket Analizi'],
    ['/reports', 'Raporlar'],
    ['/portfolio/10', 'Portföylerim'],
    ['/journal', 'İşlem Ekle'],
    ['/transactions', 'Kazanç Analizi'],
    ['/unknown', 'Panel'],
  ])('titles %s as %s', (path, title) => {
    expect(routeTitle(path)).toBe(title);
  });

  it('renders labelled groups and marks the current page', () => {
    render(
      <MemoryRouter initialEntries={['/compare']}>
        <LeftNav onOpenSettings={vi.fn()} onOpenManageAssets={vi.fn()} />
      </MemoryRouter>,
    );
    for (const group of NAV_GROUPS) {
      expect(within(screen.getByRole('group', { name: group.label })).getAllByRole('link')).toHaveLength(group.items.length);
    }
    expect(screen.getByRole('link', { name: 'Karşılaştırma' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current');
  });
});

describe('market toggle', () => {
  it('starts on ALL with neither button pressed', () => {
    renderTopBar();
    expect(screen.getByRole('button', { name: 'BIST' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'ABD' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects a market, persists it and clears it when pressed again', async () => {
    renderTopBar();
    await user().click(screen.getByRole('button', { name: 'ABD' }));
    expect(screen.getByRole('button', { name: 'ABD' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(MARKET_SCOPE_STORAGE_KEY)).toBe('US');

    await user().click(screen.getByRole('button', { name: 'BIST' }));
    expect(screen.getByRole('button', { name: 'BIST' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ABD' })).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem(MARKET_SCOPE_STORAGE_KEY)).toBe('BIST');

    await user().click(screen.getByRole('button', { name: 'BIST' }));
    expect(screen.getByRole('button', { name: 'BIST' })).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem(MARKET_SCOPE_STORAGE_KEY)).toBe('ALL');
  });

  it('restores the stored market and ignores invalid stored values', () => {
    localStorage.setItem(MARKET_SCOPE_STORAGE_KEY, 'BIST');
    const first = renderTopBar();
    expect(screen.getByRole('button', { name: 'BIST' })).toHaveAttribute('aria-pressed', 'true');
    first.unmount();

    localStorage.setItem(MARKET_SCOPE_STORAGE_KEY, 'MARS');
    renderTopBar();
    expect(screen.getByRole('button', { name: 'BIST' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('still works when localStorage throws', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    renderTopBar();
    await user().click(screen.getByRole('button', { name: 'ABD' }));
    expect(screen.getByRole('button', { name: 'ABD' })).toHaveAttribute('aria-pressed', 'true');
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('notification bell and profile chip', () => {
  it('shows no badge without unread notifications', async () => {
    renderTopBar();
    expect(await screen.findByRole('button', { name: 'Bildirimler' })).toBeInTheDocument();
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('shows the unread count from the notifications endpoint and marks all read', async () => {
    let read = false;
    server.use(
      http.get(`${API_BASE_URL}/notifications`, () => HttpResponse.json([
        { id: 1, symbol: 'AAPL', score: 90, message: 'Sinyal', createdAt: '2026-07-09T09:00:00Z', read },
        { id: 2, symbol: 'MSFT', score: 80, message: 'Sinyal 2', createdAt: '2026-07-09T09:00:00Z', read },
      ])),
      http.post(`${API_BASE_URL}/notifications/read-all`, () => { read = true; return new HttpResponse(null, { status: 204 }); }),
    );
    renderTopBar();
    const bell = await screen.findByRole('button', { name: 'Bildirimler, 2 okunmamış' });
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');

    await user().click(bell);
    await user().click(screen.getByRole('button', { name: 'Tümünü okundu işaretle' }));
    await waitFor(() => expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument());
  });

  it('renders a static profile chip', () => {
    renderTopBar();
    expect(screen.getByRole('img', { name: 'Profil: yerel kullanıcı' })).toBeInTheDocument();
  });
});

describe('CompareView shell', () => {
  it('shows the title and the not-yet-available panel state for the default UNAVAILABLE stub', async () => {
    render(<MemoryRouter><CompareView /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Karşılaştırma' })).toBeInTheDocument();
    expect(await screen.findByText('Veri alınamadı')).toBeInTheDocument();
  });

  it('lists benchmarks when the endpoint answers', async () => {
    server.use(http.get(`${API_BASE_URL}/benchmarks`, () => HttpResponse.json({
      status: 'AVAILABLE',
      asOf: '2026-07-09T09:00:00Z',
      items: [{ code: 'BIST100', name: 'BIST 100', kind: 'INDEX' }],
    })));
    render(<MemoryRouter><CompareView /></MemoryRouter>);
    expect((await screen.findAllByText('BIST 100')).length).toBeGreaterThan(0);
  });
});
