import type { WatchlistResearchStatus } from '../api/watchlists';

/**
 * Shared seven-value research status vocabulary (domain enum WatchlistResearchStatus).
 * Used by the watchlist screen and the smart-report section status. The status is a
 * data-availability label, never an investment signal.
 */
export const statusStyles: Record<WatchlistResearchStatus, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'border-bull-green/30 bg-bull-green/10 text-bull-green' },
  STALE: { label: 'Eski veri', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  EMPTY: { label: 'Veri yok', className: 'border-outline-variant bg-bg-base text-text-muted' },
  FAILED: { label: 'Yüklenemedi', className: 'border-bear-red/30 bg-bear-red/10 text-bear-red' },
  RATE_LIMITED: { label: 'İstek sınırı', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  INSUFFICIENT_DATA: { label: 'Yetersiz geçmiş', className: 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' },
  PENDING_REFRESH: { label: 'Yenileniyor', className: 'border-primary/30 bg-primary/10 text-primary' },
};

export const statusClass = (status: WatchlistResearchStatus) => statusStyles[status]?.className ?? statusStyles.FAILED.className;
export const statusLabel = (status: WatchlistResearchStatus) => statusStyles[status]?.label ?? status;

/** True only for the seven known statuses; anything else is treated as unknown by callers. */
export const isKnownStatus = (status: unknown): status is WatchlistResearchStatus =>
  typeof status === 'string' && Object.prototype.hasOwnProperty.call(statusStyles, status);
