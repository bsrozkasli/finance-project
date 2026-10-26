import type { SmartReportSectionStatus } from '../hooks/useSmartReport';

/**
 * Shown above the report body (R-9) so the warning precedes grade and recommendation.
 * The status is a data label, never an investment signal.
 */
export default function SmartReportEvidenceNote({ sectionStatus }: { sectionStatus: SmartReportSectionStatus | null | undefined }) {
  const statusKnown = sectionStatus != null;
  if (statusKnown && sectionStatus.overall === 'OK') return null;
  return (
    <div className="mb-3 space-y-2">
      {!statusKnown ? (
        <p className="text-[11px] text-text-muted font-sans">
          Durum bilinmiyor: bu raporun bileşen durumu alınamadı, bu yüzden verinin eksiksiz olduğu varsayılmaz.
        </p>
      ) : null}
      <p role="note" className="text-[11px] font-sans font-bold text-warning-amber border border-warning-amber/30 bg-warning-amber/10 rounded px-2 py-1.5">
        Bu puan eksik kanıta dayanıyor. Not ve öneri yalnızca eldeki veriyi yansıtır; durum bir yatırım sinyali değildir.
      </p>
    </div>
  );
}
