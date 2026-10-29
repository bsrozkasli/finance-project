import type { ParsedRow, ParsedRowCode } from '../../api/redesign';
import { DASH, formatDate, formatMoney, formatQuantity, sideLabel } from './format';

/** The server is the authority on validation; the UI only maps its machine codes to Turkish text. */
const CODE_LABELS: Record<ParsedRowCode, string> = {
  SIDE_INVALID: 'Yön geçersiz (AL/SAT bekleniyor)',
  TICKER_NOT_FOUND: 'Sembol bulunamadı',
  QUANTITY_INVALID: 'Adet geçersiz',
  PRICE_INVALID: 'Fiyat geçersiz',
  PORTFOLIO_NOT_FOUND: 'Portföy bulunamadı',
  SELL_EXCEEDS_HOLDING: 'Satış eldeki miktarı aşıyor',
  DATE_INVALID: 'Tarih geçersiz',
};

const STATUS_LABELS: Record<ParsedRow['status'], string> = {
  VALID: 'Geçerli',
  DUPLICATE: 'Tekrar (atlanır)',
  INVALID: 'Geçersiz',
};

const STATUS_CLASS: Record<ParsedRow['status'], string> = {
  VALID: 'border-bull-green/35 bg-bull-green/10 text-bull-green',
  DUPLICATE: 'border-warning-amber/35 bg-warning-amber/10 text-warning-amber',
  INVALID: 'border-bear-red/35 bg-bear-red/10 text-bear-red',
};

const describeRowCode = (code: string | null | undefined): string => (
  code ? (CODE_LABELS[code as ParsedRowCode] ?? code) : ''
);

interface ParsedRowsTableProps {
  rows: ParsedRow[];
  currency?: string | null;
  portfolioNames: Record<string, string>;
  caption: string;
}

export default function ParsedRowsTable({ rows, currency, portfolioNames, caption }: ParsedRowsTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">Önizlenecek satır yok.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-text-muted">
          <tr>
            <th scope="col" className="px-2 py-2">Satır</th>
            <th scope="col" className="px-2 py-2">Durum</th>
            <th scope="col" className="px-2 py-2">Yön</th>
            <th scope="col" className="px-2 py-2">Sembol</th>
            <th scope="col" className="px-2 py-2">Adet</th>
            <th scope="col" className="px-2 py-2">Fiyat</th>
            <th scope="col" className="px-2 py-2">Tarih</th>
            <th scope="col" className="px-2 py-2">Portföy</th>
            <th scope="col" className="px-2 py-2">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line} className="border-t border-outline-variant/25 align-top">
              <td className="px-2 py-2 font-data-mono">{row.line}</td>
              <td className="px-2 py-2">
                <span className={`rounded border px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[row.status]}`}>{STATUS_LABELS[row.status]}</span>
                {row.code ? <div className="mt-1 text-text-muted" data-testid={`row-code-${row.line}`}>{describeRowCode(row.code)} <span className="font-data-mono">({row.code})</span></div> : null}
              </td>
              <td className="px-2 py-2">{row.draft ? sideLabel(row.draft.side) : DASH}</td>
              <td className="px-2 py-2 font-data-mono font-bold">{row.draft?.symbol ?? DASH}</td>
              <td className="px-2 py-2 font-data-mono">{formatQuantity(row.draft?.quantity)}</td>
              <td className="px-2 py-2 font-data-mono">{formatMoney(row.draft?.price, currency)}</td>
              <td className="px-2 py-2">{formatDate(row.draft?.date)}</td>
              <td className="px-2 py-2">{row.draft ? (portfolioNames[String(row.draft.portfolioId)] ?? `Portföy ${row.draft.portfolioId}`) : DASH}</td>
              <td className="px-2 py-2 font-data-mono">{formatMoney(row.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
