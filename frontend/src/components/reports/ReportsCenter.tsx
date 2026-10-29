import { useState } from 'react';
import {
  createReportRun, downloadReportRun, emailReportRun, fetchReportTemplates, listReportRuns,
} from '../../api/redesign';
import type { ReportFormat, ReportScope, ReportTemplateId } from '../../api/redesign';
import { getApiErrorMessage } from '../../api/errors';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import { DividendPreview, PerformancePreview, RealizedPnlPreview } from './ReportPreviews';
import ReportSchedules from './ReportSchedules';

const BTN = 'min-h-11 px-4 rounded-lg border border-outline-variant font-bold text-xs transition-all disabled:opacity-50';
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const SCOPE: ReportScope = 'ALL';

/** Period options derive from the calendar only; no data is implied. */
const periodOptions = (now: Date) => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return [
    { value: `${year}-${String(month + 1).padStart(2, '0')}`, label: `${MONTHS[month]} ${year}` },
    { value: `${year}-Q${quarter}`, label: `${quarter}. çeyrek ${year}` },
    { value: String(year), label: `${year} yılbaşından bugüne` },
  ];
};

export default function ReportsCenter() {
  const templates = usePanelQuery(() => fetchReportTemplates(), []);
  const history = usePanelQuery(() => listReportRuns({ limit: 10 }), []);
  const options = periodOptions(new Date());
  const [templateId, setTemplateId] = useState<ReportTemplateId>('PERFORMANCE');
  const [period, setPeriod] = useState(options[0].value);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const year = Number(period.slice(0, 4));
  const delivery = templates.data?.delivery;
  const items = templates.data?.items ?? [];
  const selected = items.find((item) => item.id === templateId) ?? items[0];
  const effectiveId = selected?.id ?? templateId;
  const previewable = effectiveId !== 'STOCK_ANALYSIS';

  const run = async (action: (runId: string) => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      const created = await createReportRun({
        templateId: effectiveId, scope: SCOPE, period, year,
      });
      setLastRunId(created.runId);
      await action(created.runId);
      history.reload();
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'İşlem tamamlanamadı. Daha sonra yeniden deneyin.'));
    } finally {
      setBusy(false);
    }
  };

  const download = (format: ReportFormat) => run(async (runId) => {
    const blob = await downloadReportRun(runId, format);
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `rapor-${effectiveId.toLowerCase()}.${format}`;
    link.click();
    URL.revokeObjectURL(href);
  });

  return (
    <section aria-labelledby="report-center-title" className="rounded-md border border-outline-variant bg-bg-card p-5 md:p-7 space-y-5">
      <h2 id="report-center-title" className="text-xl font-semibold">Raporlar</h2>
      <PanelState state={templates.state === 'ready' && items.length === 0 ? 'empty' : templates.state} onRetry={templates.reload} label="Rapor şablonları" emptyMessage="Rapor şablonu yok">
        <div role="group" aria-label="Rapor şablonu" className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === effectiveId}
              title={item.description}
              onClick={() => setTemplateId(item.id)}
              className={`${BTN} ${item.id === effectiveId ? 'bg-primary text-bg-base' : 'bg-bg-base text-text-secondary'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
        {selected?.externalUseGate && (
          <p className="text-xs text-warning-amber">Dış kullanım kısıtı: {selected.externalUseGate}</p>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
          <label>Kapsam
            <select className="block mt-1 min-h-11 rounded-lg border border-outline-variant bg-bg-base px-3 text-text-primary" defaultValue={SCOPE} disabled>
              <option value="ALL">Tüm portföyler</option>
            </select>
          </label>
          <label>Dönem
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="block mt-1 min-h-11 rounded-lg border border-outline-variant bg-bg-base px-3 text-text-primary">
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-md border border-outline-variant bg-bg-base p-4" aria-label="Rapor önizlemesi" role="region">
          {effectiveId === 'PERFORMANCE' && <PerformancePreview scope={SCOPE} period={period} year={year} />}
          {effectiveId === 'REALIZED_PNL' && <RealizedPnlPreview scope={SCOPE} period={period} year={year} />}
          {effectiveId === 'DIVIDENDS' && <DividendPreview scope={SCOPE} period={period} year={year} />}
          {!previewable && <p className="text-xs text-text-secondary">Hisse analiz raporu aşağıdaki sembol raporundan açılır.</p>}
        </div>

        {previewable && (
          <div className="flex flex-wrap gap-2">
            {delivery?.pdf && <button type="button" className={BTN} disabled={busy} onClick={() => void download('pdf')}>PDF indir</button>}
            {delivery?.xlsx && <button type="button" className={BTN} disabled={busy} onClick={() => void download('xlsx')}>Excel indir</button>}
            {delivery?.email && (
              <button type="button" className={BTN} disabled={busy} onClick={() => void run((runId) => emailReportRun(runId, 'pdf'))}>E-posta ile gönder</button>
            )}
          </div>
        )}
        {message && <p role="alert" className="text-xs text-bear-red">{message}</p>}
        {delivery?.email && <ReportSchedules templateId={effectiveId} scope={SCOPE} />}
      </PanelState>

      <div>
        <h3 className="text-sm font-semibold mb-2">Geçmiş raporlar</h3>
        <PanelState state={history.state === 'ready' && history.data?.items.length === 0 ? 'empty' : history.state} onRetry={history.reload} label="Rapor geçmişi" emptyMessage="Henüz oluşturulmuş rapor yok">
          <ul className="space-y-1 text-xs">
            {(history.data?.items ?? []).map((item) => (
              <li key={item.runId} className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{item.title ?? item.templateId}</span>
                <span className="text-text-muted font-data-mono">{item.period ?? ''} · {item.createdAt}</span>
                {delivery?.pdf && (
                  <button type="button" className={BTN} disabled={busy} onClick={() => void (async () => {
                    try {
                      const blob = await downloadReportRun(item.runId, 'pdf');
                      const href = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = href;
                      link.download = `rapor-${item.runId}.pdf`;
                      link.click();
                      URL.revokeObjectURL(href);
                    } catch (error) {
                      setMessage(getApiErrorMessage(error, 'İndirme başarısız.'));
                    }
                  })()}>PDF indir</button>
                )}
              </li>
            ))}
          </ul>
        </PanelState>
        {lastRunId && <p className="sr-only" role="status">Rapor oluşturuldu</p>}
      </div>
    </section>
  );
}
