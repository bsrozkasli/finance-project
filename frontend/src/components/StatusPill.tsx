import type { WatchlistResearchStatus } from '../api/watchlists';
import { statusClass, statusLabel } from './sectionStatus';

export default function StatusPill({ status, title, compact = false }: { status: WatchlistResearchStatus; title?: string; compact?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border font-data-mono font-bold ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} ${statusClass(status)}`}
      title={title}
    >
      {statusLabel(status)}
    </span>
  );
}
