import type { ReactNode } from 'react';
import type { PanelQueryState } from '../../hooks/usePanelQuery';

interface PanelStateProps {
  state: PanelQueryState;
  /** Rendered for `ready` and `partial`. */
  children?: ReactNode;
  /** Degradation reasons from the response `notes`; shown for `partial` and `unavailable`. */
  notes?: readonly string[] | null;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Skeleton line count while loading. */
  skeletonRows?: number;
  /** Accessible panel name, used in the loading announcement. */
  label?: string;
}

/**
 * Uniform loading / empty / partial / unavailable rendering for redesign panels (spec X-3).
 * Missing evidence is never replaced with placeholder numbers.
 */
export default function PanelState({
  state,
  children,
  notes,
  onRetry,
  emptyMessage = 'Henüz veri yok',
  skeletonRows = 3,
  label,
}: PanelStateProps) {
  const noteText = notes?.filter(Boolean).join(' · ') ?? '';

  if (state === 'loading') {
    return (
      <div className="panel-state panel-state-loading" role="status" aria-busy="true">
        <span className="panel-state-sr">{label ? `${label} yükleniyor…` : 'Yükleniyor…'}</span>
        {Array.from({ length: skeletonRows }, (_, index) => (
          <span key={index} className="panel-state-skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (state === 'unavailable' || state === 'notImplemented') {
    return (
      <div className="panel-state panel-state-unavailable" role="status" data-state={state}>
        <p className="panel-state-title">Veri alınamadı</p>
        {state === 'notImplemented' && <p className="panel-state-note">Bu veri kaynağı henüz hazır değil.</p>}
        {noteText && <p className="panel-state-note">{noteText}</p>}
        {onRetry && (
          <button type="button" className="panel-state-retry" onClick={onRetry}>Yeniden dene</button>
        )}
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="panel-state panel-state-empty" role="status" data-state="empty">
        <p className="panel-state-title">{emptyMessage}</p>
        {noteText && <p className="panel-state-note">{noteText}</p>}
      </div>
    );
  }

  if (state === 'partial') {
    return (
      <>
        <p className="panel-state-banner" role="status" data-state="partial">
          Kısmi veri{noteText ? `: ${noteText}` : ': bazı kaynaklar alınamadı.'}
          {onRetry && (
            <button type="button" className="panel-state-retry" onClick={onRetry}>Yeniden dene</button>
          )}
        </p>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
