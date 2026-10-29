import { useMemo, useState } from 'react';
import { fetchWatchlistPerformance, type WatchlistPerformance } from '../../api/redesign';
import { usePanelQuery, type PanelQueryState } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';

type Item = WatchlistPerformance['items'][number];

const WINDOWS = ['1D', '1W', '1M', '3M', '6M', '1Y'] as const;
const WINDOW_LABELS: Record<(typeof WINDOWS)[number], string> = {
  '1D': '1G', '1W': '1H', '1M': '1A', '3M': '3A', '6M': '6A', '1Y': '1Y',
};

type SortKey = 'symbol' | (typeof WINDOWS)[number];

const fmtPct = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = value * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
};

const fmtPrice = (value: number | null | undefined): string => (
  value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
);

const tone = (value: number | null | undefined): string => {
  if (value == null || value === 0) return 'wl-flat';
  return value > 0 ? 'wl-pos' : 'wl-neg';
};

function Sparkline({ values, symbol }: { values: number[]; symbol: string }) {
  if (values.length < 2) return <span>—</span>;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 80},${22 - ((v - min) / span) * 20}`)
    .join(' ');
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" role="img" aria-label={`${symbol} 3 aylık fiyat eğilimi`}>
      <polyline points={points} fill="none" stroke="#60A5FA" strokeWidth="1.5" />
    </svg>
  );
}

const heatBackground = (value: number | null | undefined): string | undefined => {
  if (value == null || !Number.isFinite(value)) return undefined;
  const alpha = Math.min(0.75, 0.15 + Math.abs(value) * 4);
  return value >= 0 ? `rgba(52,211,153,${alpha.toFixed(2)})` : `rgba(248,113,113,${alpha.toFixed(2)})`;
};

interface Props {
  watchlistId: number | null;
  /** Upper-cased search text shared with the research table. */
  search: string;
  /** Changes whenever the symbol set changes so the panel reloads. */
  refreshKey: string;
}

export default function WatchlistPerformancePanel({ watchlistId, search, refreshKey }: Props) {
  const [view, setView] = useState<'table' | 'heatmap'>('table');
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [descending, setDescending] = useState(false);
  const [heatWindow, setHeatWindow] = useState<(typeof WINDOWS)[number]>('1M');

  const query = usePanelQuery(
    () => (watchlistId === null ? Promise.reject(new Error('no watchlist')) : fetchWatchlistPerformance(watchlistId, { limit: 50 })),
    [watchlistId, refreshKey],
  );

  const items = useMemo(() => {
    const source = (query.data?.items ?? []).filter((item) => (
      !search || item.symbol.includes(search) || (item.name ?? '').toUpperCase().includes(search)
    ));
    const valueOf = (item: Item): number | null => (
      sortKey === 'symbol' ? null : item.returns?.[sortKey] ?? null
    );
    return [...source].sort((x, y) => {
      if (sortKey === 'symbol') return descending ? y.symbol.localeCompare(x.symbol) : x.symbol.localeCompare(y.symbol);
      const vx = valueOf(x);
      const vy = valueOf(y);
      if (vx === null && vy === null) return 0;
      if (vx === null) return 1;
      if (vy === null) return -1;
      return descending ? vy - vx : vx - vy;
    });
  }, [query.data, search, sortKey, descending]);

  const state: PanelQueryState = query.state === 'ready' && (query.data?.items.length ?? 0) === 0 ? 'empty' : query.state;
  const data = query.data;

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDescending((current) => !current);
    else { setSortKey(key); setDescending(key !== 'symbol'); }
  };
  const ariaSort = (key: SortKey) => (sortKey === key ? (descending ? 'descending' : 'ascending') : 'none');

  return (
    <section className="rounded-lg border border-outline-variant bg-bg-card shadow-lg" aria-label="Liste performansı">
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-headline text-lg font-bold text-text-primary">Liste performansı</h3>
        <div className="flex gap-2" role="group" aria-label="Görünüm">
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className="wl-toggle">Tablo</button>
          <button type="button" aria-pressed={view === 'heatmap'} onClick={() => setView('heatmap')} className="wl-toggle">Isı haritası</button>
        </div>
      </div>
      <div className="p-4">
        <PanelState state={state} notes={data?.notes} onRetry={query.reload} label="Liste performansı" emptyMessage="Bu liste için performans verisi yok">
          {data ? (
            <>
              <dl className="wl-stats">
                {WINDOWS.map((w) => (
                  <div key={w} className="wl-stat">
                    <dt>{`Ort. ${WINDOW_LABELS[w]}`}</dt>
                    <dd className={tone(data.averages?.[w])}>{fmtPct(data.averages?.[w])}</dd>
                  </div>
                ))}
                <div className="wl-stat"><dt>Yükselen</dt><dd>{data.breadth?.up ?? '—'}</dd></div>
                <div className="wl-stat"><dt>Düşen</dt><dd>{data.breadth?.down ?? '—'}</dd></div>
                <div className="wl-stat"><dt>1A en iyi</dt><dd>{data.breadth?.bestSymbol1M ?? '—'}</dd></div>
                <div className="wl-stat"><dt>1A en zayıf</dt><dd>{data.breadth?.worstSymbol1M ?? '—'}</dd></div>
              </dl>
              {view === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="wl-table">
                    <caption className="wl-sr">Liste getiri tablosu</caption>
                    <thead>
                      <tr>
                        <th scope="col" aria-sort={ariaSort('symbol')}>
                          <button type="button" onClick={() => sortBy('symbol')}>Sembol</button>
                        </th>
                        <th scope="col">Fiyat</th>
                        {WINDOWS.map((w) => (
                          <th key={w} scope="col" aria-sort={ariaSort(w)}>
                            <button type="button" onClick={() => sortBy(w)}>{WINDOW_LABELS[w]}</button>
                          </th>
                        ))}
                        <th scope="col">3A eğilim</th>
                        <th scope="col">F/K</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.symbol}>
                          <th scope="row">{item.symbol}<small>{item.name ?? ''}</small></th>
                          <td>{fmtPrice(item.price)}</td>
                          {WINDOWS.map((w) => (
                            <td key={w} className={tone(item.returns?.[w])}>{fmtPct(item.returns?.[w])}</td>
                          ))}
                          <td><Sparkline values={item.sparkline3M ?? []} symbol={item.symbol} /></td>
                          <td>{item.peRatio == null ? '—' : item.peRatio.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Isı haritası dönemi">
                    {WINDOWS.map((w) => (
                      <button key={w} type="button" aria-pressed={heatWindow === w} onClick={() => setHeatWindow(w)} className="wl-toggle">
                        {WINDOW_LABELS[w]}
                      </button>
                    ))}
                  </div>
                  <ul className="wl-heat" aria-label={`Isı haritası, ${WINDOW_LABELS[heatWindow]} getiri`}>
                    {items.map((item) => (
                      <li key={item.symbol} style={{ background: heatBackground(item.returns?.[heatWindow]) }}>
                        <strong>{item.symbol}</strong>
                        <span>{fmtPct(item.returns?.[heatWindow])}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </PanelState>
      </div>
    </section>
  );
}
