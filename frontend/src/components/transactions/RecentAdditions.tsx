import { useState } from 'react';
import { deletePortfolioTransaction } from '../../api/portfolio';
import { fetchRecentTransactions } from '../../api/redesign';
import { getApiErrorMessage } from '../../api/errors';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import { BUTTON_CLASS, CARD_CLASS, DASH, formatDate, formatMoney, formatQuantity, sideLabel, toneClass } from './format';

/** "Son eklenenler": latest ledger rows with undo through the existing DELETE endpoint. */
export default function RecentAdditions({ refreshKey, onUndone }: { refreshKey: number; onUndone: () => void }) {
  const query = usePanelQuery(() => fetchRecentTransactions({ limit: 10 }), [refreshKey]);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const undo = async (portfolioId: number, transactionId: number) => {
    setPendingId(transactionId);
    setError(null);
    try {
      await deletePortfolioTransaction(portfolioId, transactionId);
      query.reload();
      onUndone();
    } catch (err) {
      setError(getApiErrorMessage(err, 'İşlem geri alınamadı. Tekrar deneyin.'));
    } finally {
      setPendingId(null);
    }
  };

  const items = query.data?.items ?? [];

  return (
    <section className={CARD_CLASS} aria-labelledby="recent-additions-title">
      <h3 id="recent-additions-title" className="mb-3 font-headline text-sm font-bold uppercase tracking-wide text-text-primary">Son eklenenler</h3>
      {error ? <p role="alert" className="mb-3 text-sm font-bold text-bear-red">{error}</p> : null}
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} emptyMessage="Henüz işlem eklenmedi." label="Son eklenenler">
        <ul className="divide-y divide-outline-variant/25">
          {items.map((item) => (
            <li key={item.transactionId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <span className="mr-2 text-xs font-bold text-text-muted">{sideLabel(item.side)}</span>
                <span className="font-data-mono font-bold text-text-primary">{item.symbol ?? DASH}</span>
                <span className="ml-2 text-xs text-text-muted">
                  {formatQuantity(item.quantity)} × {formatMoney(item.price, query.data?.currency)} · {formatDate(item.date)}
                  {item.portfolioName ? ` · ${item.portfolioName}` : ''}
                </span>
                {item.realizedPnl != null ? (
                  <span className={`ml-2 text-xs font-bold ${toneClass(item.realizedPnl)}`}>K/Z {formatMoney(item.realizedPnl, query.data?.currency)}</span>
                ) : null}
              </div>
              <button
                type="button"
                className={BUTTON_CLASS}
                disabled={pendingId === item.transactionId}
                aria-label={`${item.symbol ?? 'İşlem'} işlemini geri al`}
                onClick={() => void undo(item.portfolioId, item.transactionId)}
              >
                {pendingId === item.transactionId ? 'Geri alınıyor…' : 'Geri al'}
              </button>
            </li>
          ))}
        </ul>
      </PanelState>
    </section>
  );
}
