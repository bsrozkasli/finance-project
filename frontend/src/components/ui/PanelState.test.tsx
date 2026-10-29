import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PanelState from './PanelState';

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

describe('PanelState', () => {
  it('announces loading with a skeleton and hides children', () => {
    render(<PanelState state="loading" label="Getiri"><p>içerik</p></PanelState>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Getiri yükleniyor…')).toBeInTheDocument();
    expect(screen.queryByText('içerik')).not.toBeInTheDocument();
  });

  it('renders children when ready', () => {
    render(<PanelState state="ready"><p>içerik</p></PanelState>);
    expect(screen.getByText('içerik')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the empty message', () => {
    render(<PanelState state="empty"><p>içerik</p></PanelState>);
    expect(screen.getByText('Henüz veri yok')).toBeInTheDocument();
    expect(screen.queryByText('içerik')).not.toBeInTheDocument();
  });

  it('shows a partial banner with notes above the children', () => {
    render(<PanelState state="partial" notes={['HS2 fiyatı yok']}><p>içerik</p></PanelState>);
    expect(screen.getByText(/Kısmi veri: HS2 fiyatı yok/)).toBeInTheDocument();
    expect(screen.getByText('içerik')).toBeInTheDocument();
  });

  it('shows "Veri alınamadı" with a working retry button when unavailable', async () => {
    const onRetry = vi.fn();
    render(<PanelState state="unavailable" onRetry={onRetry}><p>içerik</p></PanelState>);
    expect(screen.getByText('Veri alınamadı')).toBeInTheDocument();
    expect(screen.queryByText('içerik')).not.toBeInTheDocument();
    await user().click(screen.getByRole('button', { name: 'Yeniden dene' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('explains a not implemented endpoint with the same message', () => {
    render(<PanelState state="notImplemented" />);
    expect(screen.getByText('Veri alınamadı')).toBeInTheDocument();
    expect(screen.getByText('Bu veri kaynağı henüz hazır değil.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
