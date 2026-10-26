import type { ScoreBreakdown, SmartReportSectionStatus } from '../hooks/useSmartReport';
import StatusPill from './StatusPill';
import { isKnownStatus } from './sectionStatus';

const COMPONENT_LABELS: Record<string, string> = {
  fundamentalScore: 'Temel',
  valuationScore: 'Değerleme',
  qualityScore: 'Kalite',
  growthScore: 'Büyüme',
  momentumScore: 'Momentum',
  riskScore: 'Risk',
  earningsScore: 'Kazanç',
  sentimentScore: 'Duyarlılık',
};

const REASON_EXPLANATIONS: Record<string, string> = {
  fallback_source_used: 'Bileşik puan üretilemedi; daha ince kanıta dayanan yedek kaynak kullanıldı.',
  no_articles_in_lookback: 'İncelenen dönemde haber bulunamadı.',
};

const explainReason = (reason: string): string | undefined => {
  if (REASON_EXPLANATIONS[reason]) return REASON_EXPLANATIONS[reason];
  if (reason.endsWith('_component_unavailable')) return 'Bu bileşen veri kaynağı tarafından üretilemedi.';
  return undefined;
};

const toSnakeKey = (key: string) => key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

/**
 * Shows data availability next to each score component. The status is a data label:
 * it is never an investment signal and never part of the score.
 */
export default function SmartReportStatusPanel({
  breakdown,
  sectionStatus,
}: {
  breakdown: ScoreBreakdown | null;
  sectionStatus: SmartReportSectionStatus | null | undefined;
}) {
  const statusKnown = sectionStatus != null;
  const rows: Array<{ key: string; snake: string; label: string; value: number | null | undefined }> = breakdown
    ? Object.entries(breakdown).map(([key, value]) => ({ key, snake: toSnakeKey(key), label: COMPONENT_LABELS[key] ?? key, value }))
    : [];
  const shown = new Set(rows.map((r) => r.snake));
  // R-10.1: components reported only by sectionStatus are still listed; their score is not in the breakdown.
  for (const key of Object.keys(sectionStatus?.components ?? {})) {
    if (!shown.has(key)) rows.push({ key, snake: key, label: key.replace(/_score$/, '').replace(/_/g, ' '), value: undefined });
  }

  return (
    <section aria-label="Veri durumu" className="mt-4 pt-3 border-t border-outline-variant/20 space-y-2">
      <h3 className="font-headline text-sm font-bold text-text-primary tracking-tight">Veri durumu</h3>
      <ul className="space-y-1">
        {rows.map(({ key, snake, label, value }) => {
          const entry = sectionStatus?.components?.[snake];
          const status = entry?.status;
          return (
            <li key={key} data-component-row className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <span className="text-text-secondary w-24 shrink-0">{label}</span>
              {value === undefined ? (
                <span data-value aria-label="puan bu raporda yok" className="font-data-mono text-text-muted">—</span>
              ) : value === null ? (
                <span data-value aria-label="puan yok" className="font-data-mono text-text-muted">Veri yok</span>
              ) : (
                <span data-value className="font-data-mono text-text-primary">{value.toFixed(0)}</span>
              )}
              {statusKnown ? (
                isKnownStatus(status) ? (
                  <StatusPill status={status} compact />
                ) : (
                  <span className="text-[10px] text-text-muted">Durum bilinmiyor</span>
                )
              ) : null}
              {entry?.reason ? (
                <span className="text-[10px] text-text-muted" title={entry.reason}>
                  <span className="font-data-mono">{entry.reason}</span>
                  {explainReason(entry.reason) ? ` — ${explainReason(entry.reason)}` : ''}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
