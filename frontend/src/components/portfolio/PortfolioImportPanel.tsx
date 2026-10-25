import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { acceptPortfolioImport, getApiErrorMessage, uploadPortfolioImport } from '../../api/client';
import type { PortfolioImportBatch, PortfolioImportRowStatus } from '../../api/client';

interface PortfolioImportPanelProps {
  portfolioId: number;
  /** Called once the backend confirms the batch was accepted, so the screen can reload ledger data. */
  onAccepted?: () => void;
}

const ROW_STATUS_LABELS: Record<PortfolioImportRowStatus, string> = {
  VALID: 'Geçerli',
  INVALID: 'Geçersiz',
  DUPLICATE: 'Mükerrer',
  ACCEPTED: 'Kabul edildi',
  REJECTED: 'Reddedildi',
};

const BAD = 'border-bear-red/35 bg-bear-red/10 text-bear-red';
const ROW_STATUS_CLASSES: Record<PortfolioImportRowStatus, string> = {
  VALID: 'border-primary/35 bg-primary/10 text-primary',
  INVALID: BAD,
  DUPLICATE: 'border-warning-amber/35 bg-warning-amber/10 text-warning-amber',
  ACCEPTED: 'border-bull-green/35 bg-bull-green/10 text-bull-green',
  REJECTED: BAD,
};


export default function PortfolioImportPanel({ portfolioId, onAccepted }: PortfolioImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<PortfolioImportBatch | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setError('');
    try {
      setBatch(await uploadPortfolioImport(portfolioId, file));
    } catch (uploadError) {
      setBatch(null);
      setError(getApiErrorMessage(uploadError, 'CSV dosyası yüklenemedi.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAccept = async () => {
    if (!batch || isAccepting || batch.status === 'ACCEPTED') return;
    setIsAccepting(true);
    setError('');
    try {
      setBatch(await acceptPortfolioImport(portfolioId, batch.batchId));
      onAccepted?.();
    } catch (acceptError) {
      setError(getApiErrorMessage(acceptError, 'Toplu aktarım kabul edilemedi.'));
    } finally {
      setIsAccepting(false);
    }
  };

  const isAccepted = batch?.status === 'ACCEPTED';

  return (
    <section aria-labelledby="portfolio-import-title" className="rounded-md border border-outline-variant bg-bg-card p-5 md:p-6">
      <h2 id="portfolio-import-title" className="text-base font-bold text-text-primary">CSV ile işlem içe aktar</h2>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="portfolio-import-file" className="text-xs font-bold text-text-secondary">CSV dosyası</label>
          <input
            id="portfolio-import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="max-w-full rounded-md border border-outline-variant px-3 py-2 text-xs text-text-secondary"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!file || isUploading}
          className="rounded-md border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          {isUploading ? 'Yükleniyor…' : 'Yükle'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-bear-red/40 bg-bear-red/10 px-3 py-2 text-xs text-bear-red">
          {error}
        </p>
      )}

      {batch && (
        <div className="mt-5 space-y-4">
          <div role="group" aria-label="Satır sayıları" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(Object.keys(batch.counts) as Array<keyof PortfolioImportBatch['counts']>).map((key) => (
              <dl key={key} className="rounded-md border border-outline-variant/40 bg-bg-base/40 px-3 py-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{ROW_STATUS_LABELS[key.toUpperCase() as PortfolioImportRowStatus]}</dt>
                <dd className="font-data-mono text-lg font-black text-text-primary">{batch.counts[key]}</dd>
              </dl>
            ))}
          </div>

          <div className="max-h-96 overflow-auto rounded-md border border-outline-variant/40">
            <table aria-label="Aşamalı satırlar" className="w-full min-w-[640px] text-left text-xs">
              <thead className="sticky top-0 bg-bg-base text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">Satır</th>
                  <th scope="col" className="px-3 py-2">Durum</th>
                  <th scope="col" className="px-3 py-2">Mesaj</th>
                  <th scope="col" className="px-3 py-2">Kimlik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {batch.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 font-data-mono text-text-secondary">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 font-bold ${ROW_STATUS_CLASSES[row.status]}`}>
                        {ROW_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{row.message ?? '-'}</td>
                    <td className="px-3 py-2 font-data-mono text-text-muted">
                      {row.originLocator
                        ? <span title={row.originLocator} className="block max-w-40 truncate">{row.originLocator}</span>
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isAccepting || isAccepted}
              className="rounded-md bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container hover:opacity-95 disabled:opacity-50"
            >
              {isAccepting ? 'Kabul ediliyor…' : 'Kabul et'}
            </button>
            {isAccepted && (
              <span role="status" className="text-xs text-bull-green">Toplu aktarım kabul edildi.</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
