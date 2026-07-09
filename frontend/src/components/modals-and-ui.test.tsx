import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ManageAssetsDrawer from './ManageAssetsDrawer';
import SettingsModal from './SettingsModal';
import TradeActionModal from './TradeActionModal';
import ErrorBoundary from './ui/ErrorBoundary';
import { ToastProvider } from './ui/ToastProvider';
import { useToast } from './ui/toast';
import type { Holding, Stock } from '../types';

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

const stock = (symbol: string, name: string, price: number): Stock => ({
  symbol,
  name,
  sector: 'Technology',
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
  stock('AAPL', 'Apple Inc.', 150.25),
  stock('MSFT', 'Microsoft Corp.', 320.5),
];

const holdings: Holding[] = [
  { symbol: 'AAPL', quantity: 2, costPrice: 100 },
  { symbol: 'MSFT', quantity: 1, costPrice: 300 },
];

describe('SettingsModal', () => {
  it('updates volatility, closes from save, and hides when closed', async () => {
    const onClose = vi.fn();
    const onUpdateVolatility = vi.fn();

    const { rerender } = render(
      <SettingsModal
        isOpen
        onClose={onClose}
        volatility="normal"
        onUpdateVolatility={onUpdateVolatility}
        onResetDatabase={vi.fn()}
      />,
    );

    await user().click(screen.getByRole('button', { name: 'high' }));
    expect(onUpdateVolatility).toHaveBeenCalledWith('high');

    await user().click(screen.getByRole('button', { name: /save changes/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <SettingsModal
        isOpen={false}
        onClose={onClose}
        volatility="normal"
        onUpdateVolatility={onUpdateVolatility}
        onResetDatabase={vi.fn()}
      />,
    );
    expect(screen.queryByText('Nexus Terminal System Settings')).not.toBeInTheDocument();
  });

  it('requires confirmation before resetting local UI preferences', async () => {
    const onClose = vi.fn();
    const onResetDatabase = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        volatility="normal"
        onUpdateVolatility={vi.fn()}
        onResetDatabase={onResetDatabase}
      />,
    );

    await user().click(screen.getByRole('button', { name: /reset local preferences/i }));
    expect(onResetDatabase).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await user().click(screen.getByRole('button', { name: /reset local preferences/i }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Reset local UI preferences'));
    expect(onResetDatabase).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TradeActionModal', () => {
  it('blocks invalid orders without executing a trade', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const onExecuteTrade = vi.fn();

    render(
      <TradeActionModal
        isOpen
        onClose={vi.fn()}
        symbol="AAPL"
        stocks={stocks}
        holdings={holdings}
        onExecuteTrade={onExecuteTrade}
      />,
    );

    const [quantity] = screen.getAllByRole('spinbutton');
    await user().clear(quantity);
    await user().type(quantity, '0');
    await user().click(screen.getByRole('button', { name: /send order/i }));

    expect(alertSpy).toHaveBeenCalledWith('Invalid quantity or unit price.');
    expect(onExecuteTrade).not.toHaveBeenCalled();
  });

  it('blocks sell orders that exceed current holdings', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const onExecuteTrade = vi.fn();

    render(
      <TradeActionModal
        isOpen
        onClose={vi.fn()}
        symbol="AAPL"
        stocks={stocks}
        holdings={holdings}
        onExecuteTrade={onExecuteTrade}
      />,
    );

    await user().click(screen.getByRole('button', { name: 'Sell' }));
    const [quantity] = screen.getAllByRole('spinbutton');
    await user().clear(quantity);
    await user().type(quantity, '3');
    await user().click(screen.getByRole('button', { name: /send order/i }));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Insufficient quantity'));
    expect(onExecuteTrade).not.toHaveBeenCalled();
  });

  it('submits a valid buy order with trimmed notes and closes the modal', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const onClose = vi.fn();
    const onExecuteTrade = vi.fn();

    render(
      <TradeActionModal
        isOpen
        onClose={onClose}
        symbol="AAPL"
        stocks={stocks}
        holdings={holdings}
        onExecuteTrade={onExecuteTrade}
      />,
    );

    await user().type(screen.getByRole('textbox'), '  add on breakout  ');
    await user().click(screen.getByRole('button', { name: /send order/i }));

    expect(onExecuteTrade).toHaveBeenCalledWith({
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 1,
      price: 150.25,
      notes: 'add on breakout',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ManageAssetsDrawer', () => {
  it('validates position input before sending a portfolio trade', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const onExecuteTrade = vi.fn();

    render(
      <ManageAssetsDrawer
        isOpen
        onClose={vi.fn()}
        stocks={stocks}
        holdings={holdings}
        portfolioId="10"
        onExecuteTrade={onExecuteTrade}
      />,
    );

    const [quantity] = screen.getAllByRole('spinbutton');
    await user().clear(quantity);
    await user().type(quantity, '0');
    await user().click(screen.getByRole('button', { name: /save to portfolio/i }));

    expect(alertSpy).toHaveBeenCalledWith('Enter a valid quantity and cost basis.');
    expect(onExecuteTrade).not.toHaveBeenCalled();
  });

  it('records an added position as a backend portfolio buy trade', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const onExecuteTrade = vi.fn();

    render(
      <ManageAssetsDrawer
        isOpen
        onClose={vi.fn()}
        stocks={stocks}
        holdings={holdings}
        portfolioId="10"
        onExecuteTrade={onExecuteTrade}
      />,
    );

    const [quantity, averageCost] = screen.getAllByRole('spinbutton');
    await user().clear(quantity);
    await user().type(quantity, '3');
    await user().clear(averageCost);
    await user().type(averageCost, '120');
    await user().click(screen.getByRole('button', { name: /save to portfolio/i }));

    expect(onExecuteTrade).toHaveBeenCalledWith({
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 3,
      price: 120,
      notes: 'AAPL position added from portfolio drawer.',
      portfolioId: '10',
    });
  });

  it('records a closing sell trade only after user confirmation', async () => {
    const onExecuteTrade = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    render(
      <ManageAssetsDrawer
        isOpen
        onClose={vi.fn()}
        stocks={stocks}
        holdings={holdings}
        portfolioId="10"
        onExecuteTrade={onExecuteTrade}
      />,
    );

    const closeButtons = screen.getAllByTitle('Close Position');
    await user().click(closeButtons[0]);
    expect(onExecuteTrade).not.toHaveBeenCalled();

    await user().click(closeButtons[0]);
    expect(onExecuteTrade).toHaveBeenCalledWith({
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 2,
      price: 150.25,
      notes: 'AAPL position closed from portfolio drawer.',
      portfolioId: '10',
    });
  });
});
describe('ToastProvider', () => {
  function ToastHarness() {
    const { showToast } = useToast();
    return (
      <button
        type="button"
        onClick={() => showToast({ title: 'Order saved', description: 'AAPL was added.', tone: 'success' })}
      >
        Show toast
      </button>
    );
  }

  it('shows, dismisses, and auto-expires toast notifications', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    await user().click(screen.getByRole('button', { name: /show toast/i }));
    expect(screen.getByText('Order saved')).toBeInTheDocument();
    expect(screen.getByText('AAPL was added.')).toBeInTheDocument();

    await user().click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(screen.queryByText('Order saved')).not.toBeInTheDocument();

    await user().click(screen.getByRole('button', { name: /show toast/i }));
    expect(screen.getByText('Order saved')).toBeInTheDocument();
    vi.advanceTimersByTime(5000);
    await waitFor(() => expect(screen.queryByText('Order saved')).not.toBeInTheDocument());
  });
});

describe('ErrorBoundary', () => {
  function BrokenChild() {
    throw new Error('render failure');
  }

  it('renders a recoverable fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText('render failure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
