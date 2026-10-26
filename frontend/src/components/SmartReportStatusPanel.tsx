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
  const overallOk = statusKnown && sectionStatus.overall === 'OK';
  const rows = breakdown ? Object.entries(breakdown) : [];

  return (
    <section aria-label="Veri durumu" className="mt-4 pt-3 border-t border-outline-variant/20 space-y-2">
      <h3 className="font-headline text-sm font-bold text-text-primary tracking-tight">Veri durumu</h3>
      {!statusKnown ? (
        <p className="text-[11px] text-text-muted font-sans">
          Durum bilinmiyor: bu raporun bileşen durumu alınamadı, bu yüzden verinin eksiksiz olduğu varsayılmaz.
        </p>
      ) : null}
      {!overallOk ? (
        <p role="note" className="text-[11px] font-sans font-bold text-warning-amber border border-warning-amber/30 bg-warning-amber/10 rounded px-2 py-1.5">
          Bu puan eksik kanıta dayanıyor. Not ve öneri yalnızca eldeki veriyi yansıtır; durum bir yatırım sinyali değildir.
        </p>
      ) : null}
      <ul className="space-y-1">
        {rows.map(([key, value]) => {
          const entry = sectionStatus?.components?.[toSnakeKey(key)];
          const status = entry?.status;
          return (
            <li key={key} data-component-row className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <span className="text-text-secondary w-24 shrink-0">{COMPONENT_LABELS[key] ?? key}</span>
              {value == null ? (
                <span data-value className="font-data-mono text-text-muted">Veri yok</span>
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
                <span className="text-[10px] text-text-muted font-data-mono" title={explainReason(entry.reason) ?? entry.reason}>
                  {entry.reason}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
