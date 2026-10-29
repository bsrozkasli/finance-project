import { useState } from 'react';
import { bulkCreateTransactions, parseTransactions } from '../../api/redesign';
import type { ParsedTransactions } from '../../api/redesign';
import { getApiErrorMessage, getApiErrorStatus } from '../../api/errors';
import type { Portfolio } from '../../types';
import ParsedRowsTable from './ParsedRowsTable';
import { BUTTON_CLASS, INPUT_CLASS, LABEL_CLASS, PRIMARY_BUTTON_CLASS, formatMoney } from './format';

interface BulkTextPanelProps {
  portfolios: Portfolio[];
  portfolioNames: Record<string, string>;
  onSaved: () => void;
}

type Phase = 'idle' | 'parsing' | 'saving';

/** Pasted-text mode: the server parses the grammar (dry run); only valid rows are saved. */
export default function BulkTextPanel({ portfolios, portfolioNames, onSaved }: BulkTextPanelProps) {
  const [text, setText] = useState('');
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [preview, setPreview] = useState<ParsedTransactions | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const defaultPortfolio = Number(portfolioId);
  const canParse = text.trim().length > 0 && portfolioId !== '' && Number.isFinite(defaultPortfolio);
  const validDrafts = (preview?.rows ?? []).flatMap((row) => (row.status === 'VALID' && row.draft ? [row.draft] : []));

  const handlePreview = async () => {
    setPhase('parsing');
    setMessage(null);
    setUnavailable(null);
    try {
      const result = await parseTransactions(text, defaultPortfolio);
      setPreview(result);
      if (result.status === 'UNAVAILABLE') setUnavailable(result.notes?.join(' · ') || 'Metin çözümleme şu anda kullanılamıyor.');
    } catch (error) {
      setPreview(null);
      const status = getApiErrorStatus(error);
      if (status === 404 || status === 501) {
        setUnavailable('Toplu metin çözümleme henüz hazır değil. Hızlı formu kullanabilirsiniz.');
      } else {
        setUnavailable(getApiErrorMessage(error, 'Metin çözümlenemedi. Tekrar deneyin.'));
      }
    } finally {
      setPhase('idle');
    }
  };

  const handleSave = async () => {
    if (!preview || validDrafts.length === 0) return;
    setPhase('saving');
    setMessage(null);
    try {
      const result = await bulkCreateTransactions(validDrafts);
      const invalidLines = new Set(preview.rows.filter((row) => row.status === 'INVALID').map((row) => row.line));
      const remaining = text.split(/\r?\n/).filter((_, index) => invalidLines.has(index + 1)).join('\n');
      setText(remaining);
      setPreview(null);
      setMessage(`${result.created} işlem kaydedildi${result.skipped ? `, ${result.skipped} tekrar atlandı` : ''}.${remaining ? ' Geçersiz satırlar düzeltmeniz için metinde bırakıldı.' : ''}`);
      onSaved();
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'İşlemler kaydedilemedi. Tekrar deneyin.'));
    } finally {
      setPhase('idle');
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label htmlFor="bulk-text" className={LABEL_CLASS}>İşlemler (Excel’den ya da notlarından yapıştır)</label>
        <textarea
          id="bulk-text"
          rows={6}
          value={text}
          onChange={(event) => { setText(event.target.value); setPreview(null); }}
          placeholder="Her satır bir işlem: YÖN TICKER ADET FİYAT [TARİH] [PORTFÖY]"
          className="w-full rounded-md border border-outline-variant bg-bg-base p-3 font-data-mono text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="bulk-portfolio" className={LABEL_CLASS}>Portföy belirtilmeyen satırlar için</label>
          <select
            id="bulk-portfolio"
            value={portfolioId}
            onChange={(event) => { setPortfolioId(event.target.value); setPreview(null); }}
            className={INPUT_CLASS}
          >
            {portfolios.length === 0 ? <option value="">Portföy yok</option> : null}
            {portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
          </select>
        </div>
        <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={!canParse || phase !== 'idle'} onClick={() => void handlePreview()}>
          {phase === 'parsing' ? 'Çözümleniyor…' : 'Önizle'}
        </button>
      </div>

      {unavailable ? <p role="alert" className="rounded-md border border-warning-amber/40 bg-warning-amber/10 p-3 font-bold text-warning-amber">{unavailable}</p> : null}
      {message ? <p role="status" className="rounded-md border border-outline-variant bg-bg-base p-3 text-text-secondary">{message}</p> : null}

      {preview && !unavailable ? (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            {preview.validCount ?? 0} geçerli · {preview.duplicateCount ?? 0} tekrar · {preview.invalidCount ?? 0} geçersiz
            {preview.totalAmount != null ? ` · Toplam ${formatMoney(preview.totalAmount, preview.currency)}` : ''}
          </p>
          <ParsedRowsTable rows={preview.rows} currency={preview.currency} portfolioNames={portfolioNames} caption="Toplu metin önizlemesi" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={validDrafts.length === 0 || phase !== 'idle'} onClick={() => void handleSave()}>
              {phase === 'saving' ? 'Kaydediliyor…' : `${validDrafts.length} geçerli satırı kaydet`}
            </button>
            <button type="button" className={BUTTON_CLASS} onClick={() => setPreview(null)}>Önizlemeyi temizle</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
