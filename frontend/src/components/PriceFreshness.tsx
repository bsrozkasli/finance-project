import type { PriceStatus } from '../api/types';
import { formatDateTime } from '../utils/formatters';
import StatusPill from './StatusPill';

/** Data-availability label for the price behind a row; not an investment signal. Unknown (null/absent) and OK show nothing. */
export default function PriceFreshness({ status, asOf }: { status: PriceStatus | null | undefined; asOf: string | null | undefined }) {
  if (status === 'STALE') {
    return (
      <div className="mt-1 flex flex-col items-start gap-0.5 font-sans">
        <StatusPill status="STALE" label="Eski fiyat" compact />
        <span className="text-[10px] text-text-muted">{formatDateTime(asOf)}</span>
      </div>
    );
  }
  if (status === 'FAILED' || status === 'EMPTY') {
    return (
      <div className="mt-1">
        <StatusPill status="EMPTY" label="Fiyat yok" compact />
      </div>
    );
  }
  return null;
}

/** One note next to a portfolio total when some prices are stale or missing; numbers are never changed. */
export function PricingStatusNote({ status }: { status: PriceStatus | null | undefined }) {
  if (status !== 'STALE' && status !== 'FAILED') return null;
  return (
    <p role="note" className="mt-2 text-xs text-warning-amber">
      Bazı fiyatlar doğrulanamadı; toplam eski fiyatlar içerebilir.
    </p>
  );
}
