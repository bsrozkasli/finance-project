import { useState } from 'react';
import { createReportSchedule, deleteReportSchedule, listReportSchedules } from '../../api/redesign';
import type { ReportScheduleWrite } from '../../api/redesign';
import { getApiErrorMessage } from '../../api/errors';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';

const BTN = 'min-h-11 px-4 rounded-lg border border-outline-variant font-bold text-xs';
const FREQUENCY = { WEEKLY: 'Haftalık', MONTHLY: 'Aylık', QUARTERLY: 'Üç aylık' } as const;

/** Rendered only when `GET /report-templates` reports `delivery.email = true`. */
export default function ReportSchedules({ templateId, scope }: { templateId: string; scope: string }) {
  const schedules = usePanelQuery(() => listReportSchedules(), []);
  const [frequency, setFrequency] = useState<ReportScheduleWrite['frequency']>('MONTHLY');
  const [message, setMessage] = useState<string | null>(null);

  const guard = async (action: () => Promise<unknown>) => {
    setMessage(null);
    try {
      await action();
      schedules.reload();
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'Zamanlama kaydedilemedi.'));
    }
  };

  return (
    <div className="space-y-2 border-t border-outline-variant/30 pt-4">
      <h3 className="text-sm font-semibold">Zamanlanmış gönderim</h3>
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label>Sıklık
          <select value={frequency} onChange={(event) => setFrequency(event.target.value as ReportScheduleWrite['frequency'])} className="block mt-1 min-h-11 rounded-lg border border-outline-variant bg-bg-base px-3">
            {Object.entries(FREQUENCY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" className={BTN} onClick={() => void guard(() => createReportSchedule({ templateId, scope, frequency, format: 'pdf' }))}>Zamanla</button>
      </div>
      {message && <p role="alert" className="text-xs text-bear-red">{message}</p>}
      <PanelState state={schedules.state} onRetry={schedules.reload} label="Zamanlamalar" emptyMessage="Zamanlanmış gönderim yok">
        <ul className="space-y-1 text-xs">
          {(schedules.data?.items ?? []).map((item) => (
            <li key={item.scheduleId} className="flex flex-wrap items-center gap-2">
              <span>{item.templateId} · {FREQUENCY[item.frequency]} · {item.format.toUpperCase()}</span>
              <button type="button" className={BTN} onClick={() => void guard(() => deleteReportSchedule(item.scheduleId))}>Sil</button>
            </li>
          ))}
        </ul>
      </PanelState>
    </div>
  );
}
