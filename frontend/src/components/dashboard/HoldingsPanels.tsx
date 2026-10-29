import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchHoldingsAnalysis } from '../../api/redesign';
import type { HoldingRow } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import DashCard from './DashCard';
import { DASH, formatFraction, formatMoney, formatPoints, heatStyle, toneClass } from './format';

type SortKey = 'symbol' | 'value' | 'weight' | 'return1D' | 'pnlPct';

const compare = (a: HoldingRow, b: HoldingRow, key: SortKey): number => {
  if (key === 'symbol') return a.symbol.localeCompare(b.symbol, 'tr');
  const left = a[key];
  const right = b[key];
  // Missing values sort last regardless of direction handling by the caller.
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
};

interface HoldingsPanelsProps {
  portfolioId: number | undefined;
  onSelectSymbol: (symbol: string) => void;
}

/** Holdings treemap (cash excluded) and sortable positions table sharing one holdings-analysis request. */
export default function HoldingsPanels({ portfolioId, onSelectSymbol }: HoldingsPanelsProps) {
  const query = usePanelQuery(
    () => (portfolioId === undefined ? Promise.resolve(null) : fetchHoldingsAnalysis(portfolioId)),
    [portfolioId],
  );
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'weight', dir: 'desc' });
  const data = query.data;
  const currency = data?.currency ?? null;

  const rows = useMemo(() => {
    const items = [...(data?.items ?? [])];
    return items.sort((a, b) => {
      const result = compare(a, b, sort.key);
      const missing = sort.key !== 'symbol' && (a[sort.key] == null || b[sort.key] == null);
      return sort.dir === 'asc' || missing ? result : -result;
    });
  }, [data, sort]);

  const tiles = rows.filter((row) => typeof row.weight === 'number' && row.weight > 0);
  const toggleSort = (key: SortKey) => setSort((current) => (
    current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'symbol' ? 'asc' : 'desc' }
  ));

  const header = (key: SortKey, label: string, right = true) => (
    <th
      key={key}
      scope="col"
      aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-1 ${right ? 'text-right' : 'text-left'}`}
    >
      <button type="button" onClick={() => toggleSort(key)} className="min-h-11 min-w-11 font-bold">{label}</button>
    </th>
  );

  const body = (render: () => ReactNode) => (portfolioId === undefined
    ? <PanelState state="empty" emptyMessage="Portföy seçin" />
    : (
      <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Pozisyon analizi" emptyMessage="Pozisyon verisi yok">
        {render()}
      </PanelState>
    ));

  return (
    <>
      <DashCard title="Portföy haritası" subtitle="Boyut = pozisyon değeri, renk = günlük değişim; nakit hariç">
        {body(() => (
          <ul className="flex flex-wrap gap-1.5">
            {tiles.map((row) => (
              <li key={row.symbol} className="min-w-28" style={{ flexGrow: Math.max(row.weight ?? 0, 0.02) * 100, flexBasis: `${Math.max((row.weight ?? 0) * 100, 12)}%` }}>
                <button
                  type="button"
                  onClick={() => onSelectSymbol(row.symbol)}
                  style={heatStyle(row.return1D)}
                  className="min-h-16 w-full rounded-md border border-outline-variant/40 p-3 text-left"
                >
                  <span className="block font-data-mono text-sm font-extrabold text-text-primary">{row.symbol}</span>
                  <span className="block font-data-mono text-xs text-text-primary">{formatFraction(row.return1D)}</span>
                  <span className="block text-xs text-text-secondary">Ağırlık {formatFraction(row.weight, false)}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
      </DashCard>

      <DashCard title="Pozisyonlar ve ağırlıklar" subtitle="Başlığa dokunarak sıralayın">
        {body(() => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <caption className="sr-only">Pozisyonlar, ağırlıklar ve getiriler</caption>
              <thead>
                <tr className="border-b border-outline-variant/35 text-text-muted">
                  {header('symbol', 'Varlık', false)}
                  <th scope="col" className="px-3 py-1">Sektör</th>
                  <th scope="col" className="px-3 py-1 text-right">Adet</th>
                  <th scope="col" className="px-3 py-1 text-right">Fiyat</th>
                  {header('value', 'Değer')}
                  {header('weight', 'Ağırlık')}
                  <th scope="col" className="px-3 py-1 text-right">Ağırlık Δ 1A</th>
                  {header('return1D', '1G')}
                  <th scope="col" className="px-3 py-1 text-right">1H</th>
                  <th scope="col" className="px-3 py-1 text-right">1A</th>
                  {header('pnlPct', 'K/Z')}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.symbol} className="border-b border-outline-variant/15">
                    <th scope="row" className="px-3 py-2 text-left">
                      <button type="button" onClick={() => onSelectSymbol(row.symbol)} className="min-h-11 min-w-11 text-left font-data-mono font-bold text-text-primary hover:text-primary">
                        {row.symbol}
                      </button>
                      {row.name && <span className="block max-w-[160px] truncate text-text-muted">{row.name}</span>}
                    </th>
                    <td className="px-3 py-2 text-text-secondary">{row.sector ?? DASH}</td>
                    <td className="px-3 py-2 text-right font-data-mono">{row.quantity ?? DASH}</td>
                    <td className="px-3 py-2 text-right font-data-mono">{formatMoney(row.price, currency)}</td>
                    <td className="px-3 py-2 text-right font-data-mono font-bold text-text-primary">{formatMoney(row.value, currency)}</td>
                    <td className="px-3 py-2 text-right font-data-mono">{formatFraction(row.weight, false)}</td>
                    <td className={`px-3 py-2 text-right font-data-mono ${toneClass(row.weightDelta1M)}`}>{formatPoints(row.weightDelta1M)}</td>
                    <td className={`px-3 py-2 text-right font-data-mono ${toneClass(row.return1D)}`}>{formatFraction(row.return1D)}</td>
                    <td className={`px-3 py-2 text-right font-data-mono ${toneClass(row.return1W)}`}>{formatFraction(row.return1W)}</td>
                    <td className={`px-3 py-2 text-right font-data-mono ${toneClass(row.return1M)}`}>{formatFraction(row.return1M)}</td>
                    <td className={`px-3 py-2 text-right font-data-mono font-bold ${toneClass(row.pnlPct)}`}>
                      {formatFraction(row.pnlPct)}
                      <span className="block font-normal text-text-muted">{formatMoney(row.pnl, currency, true)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </DashCard>
    </>
  );
}
