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
  it('filters symbols, selects a search result, and clears the search box', async () => {
    const onSelectStock = vi.fn();

    render(
      <TopBar stocks={stocks} onSelectStock={onSelectStock} onOpenTradingJournal={vi.fn()} />,
    );

    const searchBox = screen.getByPlaceholderText(/search symbols/i);
    await user().type(searchBox, 'micro');

    expect(screen.getByText('Matching Instruments')).toBeInTheDocument();
    await user().click(screen.getByRole('button', { name: /MSFT.*Microsoft Corp/i }));

    expect(onSelectStock).toHaveBeenCalledWith(stocks[1]);
    expect(searchBox).toHaveValue('');
    expect(screen.queryByText('Matching Instruments')).not.toBeInTheDocument();
  });

  it('opens the trading journal from the header action', async () => {
    const onOpenTradingJournal = vi.fn();

    render(
      <TopBar stocks={stocks} onSelectStock={vi.fn()} onOpenTradingJournal={onOpenTradingJournal} />,
    );

    await user().click(screen.getByRole('button', { name: /trading journal/i }));

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

    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /portfolio management/i })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: /technical chart/i })).toHaveAttribute('href', '/workspace');
    expect(screen.getByRole('link', { name: /watchlists/i })).toHaveAttribute('href', '/watchlist');
    expect(screen.getByRole('link', { name: /news feed/i })).toHaveAttribute('href', '/news');
    expect(screen.getByRole('link', { name: /ai analysis/i })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: /trading journal/i })).toHaveAttribute('href', '/journal');

    await user().click(screen.getByRole('link', { name: /watchlists/i }));
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

    await user().click(screen.getByRole('button', { name: /manage assets/i }));
    await user().click(screen.getByRole('button', { name: /system settings/i }));

    expect(onOpenManageAssets).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /github source/i })).toHaveAttribute(
      'href',
      'https://github.com/bsrozkasli/finance-project',
    );
  });
});
