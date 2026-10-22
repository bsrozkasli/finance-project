import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LeftNav from './LeftNav';
import TopBar from './TopBar';
import type { Stock } from '../types';

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

const stock = (symbol: string, name: string, sector: string, price: number): Stock => ({
  symbol,
  name,
  sector,
  industry: 'Software',
  price,
  change: 1,
  changePercent: 0.5,
  open: price - 1,
  high: price + 2,
  low: price - 2,
  close: price,
  volume: '1.2M',
  high52W: price + 20,
  low52W: price - 20,
  marketCap: '$1T',
  pe: 25,
  pb: 8,
  debtEquity: 1,
  roe: 30,
  revenueGrowth: 10,
  divYield: null,
  history: [],
  sparkline: [],
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
});

const stocks = [
  stock('AAPL', 'Apple Inc.', 'Consumer Technology', 150.25),
  stock('MSFT', 'Microsoft Corp.', 'Enterprise Software', 320.5),
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('TopBar', () => {
  it('focuses saved-asset search with Ctrl+K and opens its keyboard-selected result', async () => {
    const onSelectStock = vi.fn();
    render(<TopBar stocks={stocks} onSelectStock={onSelectStock} onOpenTradingJournal={vi.fn()} />);
    await user().keyboard('{Control>}k{/Control}');
    const input = screen.getByRole('combobox', { name: 'Kayıtlı varlıklarda ara' });
    expect(input).toHaveFocus();
    await user().type(input, 'micro');
    await user().keyboard('{ArrowDown}{Enter}');
    expect(onSelectStock).toHaveBeenCalledWith(stocks[1]);
    expect(input).toHaveValue('');
  });
  it('keeps a saved asset searchable when its price history is unavailable', async () => {
    const onSelectAsset = vi.fn();
    render(
      <TopBar
        stocks={[]}
        assets={[{ symbol: 'AAA', name: 'Alpha Inc.', type: 'STOCK' }]}
        onSelectStock={vi.fn()}
        onSelectAsset={onSelectAsset}
        onOpenTradingJournal={vi.fn()}
      />,
    );
    await user().type(screen.getByPlaceholderText('Kayıtlı varlıklarda ara'), 'AAA');
    expect(screen.getByText('Fiyat yok')).toBeInTheDocument();
    await user().click(screen.getByRole('option', { name: /AAA.*Alpha Inc./ }));
    expect(onSelectAsset).toHaveBeenCalledWith({ symbol: 'AAA', name: 'Alpha Inc.', type: 'STOCK' });
  });

  it('filters symbols, selects a search result, and clears the search box', async () => {
    const onSelectStock = vi.fn();

    render(
      <TopBar stocks={stocks} onSelectStock={onSelectStock} onOpenTradingJournal={vi.fn()} />,
    );

    const searchBox = screen.getByPlaceholderText(/kayıtlı varlıklarda ara/i);
    await user().type(searchBox, 'micro');

    expect(screen.getByText(/Eşleşen varlıklar/)).toBeInTheDocument();
    await user().click(screen.getByRole('option', { name: /MSFT.*Microsoft Corp/i }));

    expect(onSelectStock).toHaveBeenCalledWith(stocks[1]);
    expect(searchBox).toHaveValue('');
    expect(screen.queryByText(/Eşleşen varlıklar/)).not.toBeInTheDocument();
  });

  it('opens the trading journal from the header action', async () => {
    const onOpenTradingJournal = vi.fn();

    render(
      <TopBar stocks={stocks} onSelectStock={vi.fn()} onOpenTradingJournal={onOpenTradingJournal} />,
    );

    await user().click(screen.getByRole('button', { name: /günlük/i }));

    expect(onOpenTradingJournal).toHaveBeenCalledTimes(1);
  });
});

describe('LeftNav', () => {
  it('renders every primary route link and navigates when clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LeftNav onOpenSettings={vi.fn()} onOpenManageAssets={vi.fn()} />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Bugün' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Araştır' })).toHaveAttribute('href', '/workspace');
    expect(screen.getByRole('link', { name: 'İzleme Listem' })).toHaveAttribute('href', '/watchlist');
    expect(screen.getByRole('link', { name: 'Portföy' })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: 'Günlük' })).toHaveAttribute('href', '/journal');

    await user().click(screen.getByRole('link', { name: 'İzleme Listem' }));
    expect(screen.getByTestId('location-path')).toHaveTextContent('/watchlist');
  });

  it('opens drawer/settings actions and exposes the repository link', async () => {
    const onOpenSettings = vi.fn();
    const onOpenManageAssets = vi.fn();

    render(
      <MemoryRouter>
        <LeftNav onOpenSettings={onOpenSettings} onOpenManageAssets={onOpenManageAssets} />
      </MemoryRouter>,
    );

    await user().click(screen.getByRole('button', { name: /varlıkları yönet/i }));
    await user().click(screen.getByRole('button', { name: /ayarlar/i }));

    expect(onOpenManageAssets).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Kaynak kodu (GitHub)' })).toHaveAttribute(
      'href',
      'https://github.com/bsrozkasli/finance-project',
    );
  });
});
