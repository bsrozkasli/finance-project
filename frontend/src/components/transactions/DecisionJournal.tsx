import { fetchJournalDecisions } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import { CARD_CLASS, formatDate, formatPercent, sideLabel, toneClass } from './format';

const RESULT_LABELS = { GAIN: 'Kâr', LOSS: 'Zarar', OPEN: 'Açık' } as const;

/** "Karar günlüğü": notes attached to transactions with their outcome, from GET /journal/decisions. */
export default function DecisionJournal({ refreshKey }: { refreshKey: number }) {
  const query = usePanelQuery(() => fetchJournalDecisions({ limit: 20 }), [refreshKey]);
  const items = query.data?.items ?? [];

  return (
    <section className={CARD_CLASS} aria-labelledby="decision-journal-title">
      <h3 id="decision-journal-title" className="font-headline text-sm font-bold uppercase tracking-wide text-text-primary">Karar günlüğü</h3>
      <p className="mb-3 mt-1 text-xs text-text-muted">Notlu işlemler; geriye dönüp kararlarını değerlendir</p>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} emptyMessage="Notlu işlem yok." label="Karar günlüğü">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.transactionId} className="rounded-md border border-outline-variant/40 bg-bg-base/45 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="mr-2 text-xs font-bold text-text-muted">{sideLabel(item.side)}</span>
                  <span className="font-data-mono font-bold">{item.symbol}</span>
                  <span className="ml-2 text-xs text-text-muted">{formatDate(item.date)}</span>
                </span>
                <span className={`text-xs font-bold ${toneClass(item.resultPct)}`}>
                  {item.result ? RESULT_LABELS[item.result] : 'Sonuç yok'} {formatPercent(item.resultPct)}
                </span>
              </div>
              <p className="mt-2 text-text-secondary">{item.note}</p>
            </li>
          ))}
        </ul>
      </PanelState>
    </section>
  );
}
