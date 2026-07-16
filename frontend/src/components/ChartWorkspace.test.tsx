import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stock } from '../types';

const setData = vi.fn();
const remove = vi.fn();
const subscribeCrosshairMove = vi.fn();
const fitContent = vi.fn();
const applyOptions = vi.fn();

vi.mock('lightweight-charts', () => ({
  AreaSeries: 'AreaSeries',
  CandlestickSeries: 'CandlestickSeries',
  HistogramSeries: 'HistogramSeries',
  LineSeries: 'LineSeries',
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({
      setData,
      priceScale: () => ({ applyOptions }),
    })),
    subscribeCrosshairMove,
    timeScale: () => ({ fitContent }),
    remove,
  })),
}));

import ChartWorkspace from './ChartWorkspace';

const history = Array.from({ length: 60 }, (_, index) => {
  const price = 100 + index;
  return {
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    price,
    open: price - 1,
    high: price + 2,
    low: price - 2,
    close: price,
    volume: 1_000_000 + index,
  };
});

const stock: Stock = {
  symbol: 'DRAM',
  name: 'Roundhill Memory ETF',
  sector: 'Technology',
  industry: 'ETF',
  price: 159,
  change: 2,
  changePercent: 1.25,
  open: 158,
  high: 162,
  low: 157,
  close: 159,
  volume: '1.2M',
  high52W: 180,
  low52W: 90,
  marketCap: null,
  pe: null,
  pb: null,
  debtEquity: null,
  roe: null,
  revenueGrowth: null,
  divYield: null,
  history,
  sparkline: history.map((point) => point.price),
  news: [],
  technicals: null,
  analystRating: null,
  alerts: [],
};

describe('ChartWorkspace', () => {
  beforeEach(() => {
    setData.mockClear();
    remove.mockClear();
    subscribeCrosshairMove.mockClear();
    fitContent.mockClear();
    applyOptions.mockClear();
  });

  it('renders real OHLCV summary and creates chart series from history', () => {
    render(<ChartWorkspace stocks={[stock]} onSelectStock={vi.fn()} />);

    expect(screen.getAllByText('DRAM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Roundhill Memory ETF').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/O: 158.00/i)).toBeInTheDocument();
    expect(screen.getByText(/H: 161.00/i)).toBeInTheDocument();
    expect(setData).toHaveBeenCalled();
    expect(fitContent).toHaveBeenCalled();
  });

  it('switches to Heikin Ashi mode without requiring mock candle data', async () => {
    render(<ChartWorkspace stocks={[stock]} onSelectStock={vi.fn()} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Heikin Ashi'));

    expect(setData).toHaveBeenCalled();
    expect(screen.getByTitle('Heikin Ashi')).toBeEnabled();
  });

  it('shows provider unavailable state instead of fake candles', async () => {
    render(<ChartWorkspace stocks={[stock]} onSelectStock={vi.fn()} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Simulate connection error'));

    expect(screen.getByText('Market data provider unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No fallback or mock candles/i)).toBeInTheDocument();
  });
});



