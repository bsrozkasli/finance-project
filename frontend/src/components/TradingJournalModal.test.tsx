import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import type { Trade } from '../types';
import TradingJournalModal from './TradingJournalModal';

const trade = (overrides: Partial<Trade>): Trade => ({
  id: 't1',
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 2,
  price: 100,
  notes: 'Initial position',
  date: '2026-07-01T10:00:00Z',
  portfolioId: '1',
  ...overrides,
});

const renderJournal = (
  trades: Trade[],
  onClose = vi.fn(),
  onRemoveTrade: (id: string) => Promise<void> | void = vi.fn(),
) => {
  render(
    <TradingJournalModal
      isOpen
      onClose={onClose}
      trades={trades}
      stocks={[]}
      portfolios={[{ id: '1', name: 'ALFA', holdings: [] }]}
      onRemoveTrade={onRemoveTrade}
      onOpenTradeModal={vi.fn()}
    />,
  );
  return { onClose };
};

describe('TradingJournalModal', () => {
  it('is a named dialog with Turkish summary labels that closes with Escape', async () => {
    const { onClose } = renderJournal([trade({})]);

    expect(screen.getByRole('dialog', { name: 'İşlem günlüğü' })).toBeInTheDocument();
    expect(screen.getByText('İşlem sayısı')).toBeInTheDocument();
    expect(screen.getByText('Toplam alış değeri')).toBeInTheDocument();
    expect(screen.getByText('Toplam satış değeri')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Yatırım tezi / notlar' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not invent a portfolio name for a trade without a known portfolio', () => {
    renderJournal([trade({ portfolioId: '99' })]);

    expect(screen.queryByText('Technology Portfolio')).not.toBeInTheDocument();
    expect(screen.getByText('Portföy bilinmiyor')).toBeInTheDocument();
    expect(screen.getByText(/1 Tem/)).toBeInTheDocument();
  });

  it('explains when the filters match no records', async () => {
    renderJournal([trade({})]);

    await userEvent.type(screen.getByLabelText('Notlarda ara'), 'zzz');

    expect(screen.getByText('Veri yok: filtrelerle eşleşen işlem kaydı yok.')).toBeInTheDocument();
  });

  it('shows the backend 409 message when deleting a transaction is refused', async () => {
    const message = 'Cannot delete the AAPL buy: a later sell depends on it';
    const onRemoveTrade = vi.fn().mockRejectedValue(
      new ApiError(message, { status: 409, path: '/api/v1/portfolios/1/transactions/10', isNetworkError: false }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderJournal([trade({})], vi.fn(), onRemoveTrade);

    await userEvent.click(screen.getByRole('button', { name: 'İşlemi sil' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('keeps the generic message for other delete failures', async () => {
    const onRemoveTrade = vi.fn().mockRejectedValue(
      new ApiError('Sunucuya ulaşılamadı.', { status: null, path: null, isNetworkError: true }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderJournal([trade({})], vi.fn(), onRemoveTrade);

    await userEvent.click(screen.getByRole('button', { name: 'İşlemi sil' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('İşlem silinemedi. Daha sonra yeniden deneyin.');
  });
});
