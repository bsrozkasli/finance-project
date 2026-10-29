import { useMemo, useState } from 'react';
import { fetchCompositionHistory } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import DashCard from './DashCard';
import { CHART_COLORS, DASH, buttonClass, formatMoney } from './format';

const WIDTH = 600;
const HEIGHT = 220;
const OTHERS_LABEL = 'Diğerleri';

/** Stacked area of the top positions over the last 6 months; the details table is the text equivalent. */
export default function CompositionPanel({ portfolioId }: { portfolioId: number | undefined }) {
  const [mode, setMode] = useState<'value' | 'weight'>('value');
  const query = usePanelQuery(
    () => (portfolioId === undefined ? Promise.resolve(null) : fetchCompositionHistory(portfolioId, { months: 6, top: 5 })),
    [portfolioId],
  );
  const data = query.data;

  const stacked = useMemo(() => {
    if (!data || data.dates.length === 0) return null;
    const totals = data.dates.map((_, index) => data.series.reduce((sum, series) => sum + (series.values[index] ?? 0), 0));
    const scaleMax = mode === 'weight' ? 1 : Math.max(...totals, 0);
    if (scaleMax <= 0) return null;
    const x = (index: number) => (data.dates.length === 1 ? WIDTH / 2 : (index / (data.dates.length - 1)) * WIDTH);
    const cumulative = data.dates.map(() => 0);
    const layers = data.series.map((series, seriesIndex) => {
      const lower = [...cumulative];
      series.values.forEach((value, index) => {
        const share = value ?? 0;
        cumulative[index] += mode === 'weight' ? (totals[index] > 0 ? share / totals[index] : 0) : share;
      });
      const y = (value: number) => HEIGHT - (value / scaleMax) * HEIGHT;
      const top = cumulative.map((value, index) => `${x(index)},${y(value)}`);
      const bottom = lower.map((value, index) => `${x(index)},${y(value)}`).reverse();
      return { key: series.key, color: CHART_COLORS[seriesIndex % CHART_COLORS.length], points: [...top, ...bottom].join(' ') };
    });
    return { layers, totals };
  }, [data, mode]);

  const labelFor = (key: string) => (key === 'OTHERS' ? OTHERS_LABEL : key);

  return (
    <DashCard
      title="Pozisyon dağılımının zaman içindeki değişimi"
      subtitle="Son 6 ay, en büyük 5 pozisyon ve diğerleri"
      actions={(
        <div role="group" aria-label="Gösterim türü" className="flex gap-2">
          <button type="button" aria-pressed={mode === 'value'} onClick={() => setMode('value')} className={buttonClass(mode === 'value')}>Değer</button>
          <button type="button" aria-pressed={mode === 'weight'} onClick={() => setMode('weight')} className={buttonClass(mode === 'weight')}>Ağırlık %</button>
        </div>
      )}
    >
      {portfolioId === undefined ? <PanelState state="empty" emptyMessage="Portföy seçin" /> : (
        <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Pozisyon dağılımı geçmişi" emptyMessage="Geçmiş dağılım verisi yok">
          {stacked && data && (
            <>
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-56 w-full" role="img" aria-label="Pozisyon dağılımının son 6 aydaki değişimi, yığılmış alan grafiği">
                {stacked.layers.map((layer) => (
                  <polygon key={layer.key} points={layer.points} fill={layer.color} fillOpacity="0.75" />
                ))}
              </svg>
              <ul className="mt-3 flex flex-wrap gap-3 text-xs">
                {stacked.layers.map((layer) => (
                  <li key={layer.key} className="flex items-center gap-1.5 text-text-primary">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                    {labelFor(layer.key)}
                  </li>
                ))}
              </ul>
              <details className="mt-3 text-xs">
                <summary className="min-h-11 cursor-pointer py-3 font-bold text-primary">Veri tablosunu göster</summary>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left">
                    <caption className="sr-only">Pozisyon değerleri, tarihe göre</caption>
                    <thead>
                      <tr className="text-text-muted">
                        <th scope="col" className="px-2 py-1">Tarih</th>
                        {data.series.map((series) => <th key={series.key} scope="col" className="px-2 py-1 text-right">{labelFor(series.key)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.dates.map((date, index) => (
                        <tr key={date} className="border-t border-outline-variant/15">
                          <th scope="row" className="px-2 py-1 font-data-mono">{date}</th>
                          {data.series.map((series) => (
                            <td key={series.key} className="px-2 py-1 text-right font-data-mono">
                              {series.values[index] == null ? DASH : formatMoney(series.values[index], data.currency)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </PanelState>
      )}
    </DashCard>
  );
}
