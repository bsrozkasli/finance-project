import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { commitImport, fetchImportTemplate, stageImport, undoImport } from '../../api/redesign';
import type { ImportMappingField, ImportPreview } from '../../api/redesign';
import { getApiErrorMessage, getApiErrorResponse, getApiErrorStatus } from '../../api/errors';
import type { Portfolio } from '../../types';
import ParsedRowsTable from './ParsedRowsTable';
import { BUTTON_CLASS, INPUT_CLASS, LABEL_CLASS, PRIMARY_BUTTON_CLASS, formatMoney } from './format';

interface ImportPanelProps {
  portfolios: Portfolio[];
  portfolioNames: Record<string, string>;
  onChanged: () => void;
}

type Phase = 'idle' | 'staging' | 'committing' | 'undoing';

const FIELD_OPTIONS: { value: ImportMappingField; label: string }[] = [
  { value: 'DATE', label: 'Tarih' },
  { value: 'SIDE', label: 'Yön' },
  { value: 'SYMBOL', label: 'Ticker' },
  { value: 'QUANTITY', label: 'Adet' },
  { value: 'PRICE', label: 'Fiyat' },
  { value: 'FEE', label: 'Komisyon' },
  { value: 'NOTE', label: 'Not' },
  { value: 'IGNORED', label: 'Yok say' },
];

const notReady = (error: unknown) => {
  const status = getApiErrorStatus(error);
  return status === 404 || status === 501;
};

/** CSV/XLSX mode: staged preview, editable column mapping, atomic commit and undo. All rules come from the API. */
export default function ImportPanel({ portfolios, portfolioNames, onChanged }: ImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [committedId, setCommittedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const targetPortfolio = Number(portfolioId);

  const stage = async (override?: Record<string, string>) => {
    if (!file || portfolioId === '') return;
    setPhase('staging');
    setProblem(null);
    setMessage(null);
    setCommittedId(null);
    try {
      const result = await stageImport({ file, portfolioId: targetPortfolio, mapping: override });
      setPreview(result);
      setMapping(Object.fromEntries(result.detectedMapping.map((entry) => [entry.column, entry.field ?? ''])));
      if (result.status === 'UNAVAILABLE') setProblem(result.notes?.join(' · ') || 'İçe aktarma önizlemesi kullanılamıyor.');
    } catch (error) {
      setPreview(null);
      setProblem(notReady(error)
        ? 'CSV / ekstre içe aktarma henüz hazır değil. Hızlı formu kullanabilirsiniz.'
        : getApiErrorMessage(error, 'Dosya önizlenemedi. Biçimi ve satır sayısını (en fazla 5.000) kontrol edin.'));
    } finally {
      setPhase('idle');
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setCommittedId(null);
    setProblem(null);
    setMessage(null);
  };

  const applyMapping = () => {
    void stage(Object.fromEntries(Object.entries(mapping).filter(([, field]) => field !== '')));
  };

  const commit = async () => {
    if (!preview) return;
    setPhase('committing');
    setProblem(null);
    try {
      const result = await commitImport(preview.importId);
      setCommittedId(preview.importId);
      setMessage(`${result.created} işlem içe aktarıldı${result.skipped ? `, ${result.skipped} satır atlandı` : ''}.`);
      onChanged();
    } catch (error) {
      setProblem(getApiErrorMessage(error, 'İçe aktarma tamamlanamadı. Hiçbir işlem eklenmedi.'));
    } finally {
      setPhase('idle');
    }
  };

  const undo = async () => {
    if (!committedId) return;
    setPhase('undoing');
    setProblem(null);
    try {
      const result = await undoImport(committedId);
      setMessage(`${result.removed} işlem geri alındı.`);
      setCommittedId(null);
      setPreview(null);
      onChanged();
    } catch (error) {
      const response = getApiErrorResponse(error) as { code?: string } | null;
      setProblem(getApiErrorStatus(error) === 409 || response?.code === 'IMPORT_NOT_UNDOABLE'
        ? 'Bu içe aktarma geri alınamaz: sonradan yapılan işlemler ona bağlı.'
        : getApiErrorMessage(error, 'Geri alınamadı. Tekrar deneyin.'));
    } finally {
      setPhase('idle');
    }
  };

  const downloadTemplate = async () => {
    setProblem(null);
    try {
      const csv = await fetchImportTemplate();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'islem-sablonu.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setProblem(notReady(error) ? 'Şablon henüz hazır değil.' : getApiErrorMessage(error, 'Şablon indirilemedi.'));
    }
  };

  const busy = phase !== 'idle';

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="import-portfolio" className={LABEL_CLASS}>Hedef portföy</label>
          <select id="import-portfolio" value={portfolioId} onChange={(event) => { setPortfolioId(event.target.value); setPreview(null); }} className={INPUT_CLASS}>
            {portfolios.length === 0 ? <option value="">Portföy yok</option> : null}
            {portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="import-file" className={LABEL_CLASS}>CSV veya aracı kurum ekstresi</label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.xlsx"
            onChange={onFileChange}
            className="block min-h-11 w-full rounded-md border border-outline-variant bg-bg-base p-2 text-xs text-text-secondary"
          />
          <p className="mt-1 text-xs text-text-muted">Desteklenen: .csv, .xlsx · en fazla 5.000 satır</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={!file || portfolioId === '' || busy} onClick={() => void stage()}>
          {phase === 'staging' ? 'Önizleniyor…' : 'Önizleme oluştur'}
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={() => void downloadTemplate()}>Şablonu indir (.csv)</button>
      </div>

      {problem ? <p role="alert" className="rounded-md border border-warning-amber/40 bg-warning-amber/10 p-3 font-bold text-warning-amber">{problem}</p> : null}
      {message ? <p role="status" className="rounded-md border border-outline-variant bg-bg-base p-3 text-text-secondary">{message}</p> : null}

      {preview && preview.status !== 'UNAVAILABLE' ? (
        <div className="space-y-4">
          <fieldset className="rounded-md border border-outline-variant/40 p-3">
            <legend className="px-1 text-xs font-bold text-text-muted">Sütun eşlemesi</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {preview.detectedMapping.map((entry) => (
                <div key={entry.column}>
                  <label htmlFor={`map-${entry.column}`} className={LABEL_CLASS}>{entry.column}</label>
                  <select
                    id={`map-${entry.column}`}
                    value={mapping[entry.column] ?? ''}
                    onChange={(event) => setMapping((current) => ({ ...current, [entry.column]: event.target.value }))}
                    className={INPUT_CLASS}
                    disabled={committedId !== null}
                  >
                    <option value="">Eşlenmedi</option>
                    {FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button type="button" className={`${BUTTON_CLASS} mt-3`} disabled={busy || committedId !== null} onClick={applyMapping}>Eşlemeyi uygula</button>
          </fieldset>

          <p className="text-xs text-text-muted">
            {preview.fileName ? `${preview.fileName} · ` : ''}{preview.validCount ?? 0} geçerli · {preview.duplicateCount ?? 0} tekrar · {preview.invalidCount ?? 0} geçersiz
            {preview.totalAmount != null ? ` · Toplam ${formatMoney(preview.totalAmount, preview.currency)}` : ''}
          </p>
          <ParsedRowsTable rows={preview.rows} currency={preview.currency} portfolioNames={portfolioNames} caption="CSV içe aktarma önizlemesi" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={busy || committedId !== null || (preview.validCount ?? 0) === 0} onClick={() => void commit()}>
              {phase === 'committing' ? 'İçe aktarılıyor…' : 'İçe aktar'}
            </button>
            {committedId ? (
              <button type="button" className={BUTTON_CLASS} disabled={busy} onClick={() => void undo()}>
                {phase === 'undoing' ? 'Geri alınıyor…' : 'Geri al'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
