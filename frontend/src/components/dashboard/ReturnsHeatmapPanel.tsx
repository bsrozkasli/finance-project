import { benchmarkRef, fetchBenchmarks, fetchReturnsHeatmap, portfolioRef } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import DashCard from './DashCard';
import { WINDOW_LABELS, formatFraction, heatStyle } from './format';

/** Rows = portfolios and benchmarks, columns = return windows. The table is the accessible form of the heatmap. */
export default function ReturnsHeatmapPanel({ portfolioIds }: { portfolioIds: number[] }) {
  const idsKey = portfolioIds.join(',');
  const query = usePanelQuery(async () => {
    let benchmarkCodes: string[] = [];
    try {
      const benchmarks = await fetchBenchmarks();
      benchmarkCodes = benchmarks.items.slice(0, 4).map((item) => item.code);
    } catch {
      // Benchmarks are optional rows; portfolios still render without them.
    }
    return fetchReturnsHeatmap([...portfolioIds.map(portfolioRef), ...benchmarkCodes.map(benchmarkRef)]);
  }, [idsKey]);
  const data = query.data;

  return (
    <DashCard title="Getiri ısı haritası" subtitle="Portföyler ve endeksler için dönemsel getiri">
      <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Getiri ısı haritası" emptyMessage="Gösterilecek getiri verisi yok">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-separate border-spacing-1 text-xs">
            <caption className="sr-only">Portföy ve endeks getirileri, dönem bazında</caption>
            <thead>
              <tr>
                <th scope="col" className="px-2 py-2 text-left text-text-muted">Varlık</th>
                {data?.windows.map((window) => (
                  <th key={window} scope="col" className="px-2 py-2 text-right text-text-muted">{WINDOW_LABELS[window] ?? window}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row) => (
                <tr key={row.ref}>
                  <th scope="row" className="px-2 py-2 text-left font-bold text-text-primary">{row.label}</th>
                  {data.windows.map((window, index) => (
                    <td key={window} style={heatStyle(row.values[index])} className="rounded px-2 py-2 text-right font-data-mono font-bold text-text-primary">
                      {formatFraction(row.values[index])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelState>
    </DashCard>
  );
}
