import { fetchNewsPortfolioImpact, fetchNewsSectorImpact, fetchNewsTopics } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';

const PANEL = 'bg-bg-card border border-outline-variant rounded-md p-5 space-y-3';
const HEADING = 'font-headline text-xs font-bold text-text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-2';

/** Net effect score in [-1, 1]; shown signed, never as a percentage and never when absent. */
const formatNet = (net: number | null | undefined): string => (
  net == null ? 'Veri yok' : `${net > 0 ? '+' : ''}${net.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
);

function NetBar({ net }: { net: number | null | undefined }) {
  if (net == null) return <span className="h-2 flex-1" aria-hidden="true" />;
  const width = `${Math.min(Math.abs(net), 1) * 50}%`;
  return (
    <span className="relative h-2 flex-1 rounded bg-bg-base" aria-hidden="true">
      <span className="absolute inset-y-0 left-1/2 w-px bg-outline-variant" />
      <span
        className={`absolute inset-y-0 rounded ${net >= 0 ? 'left-1/2 bg-bull-green' : 'right-1/2 bg-bear-red'}`}
        style={{ width }}
      />
    </span>
  );
}

export function PortfolioImpactPanel() {
  const query = usePanelQuery(() => fetchNewsPortfolioImpact(), []);
  return (
    <section aria-labelledby="news-portfolio-impact" className={PANEL}>
      <h3 id="news-portfolio-impact" className={HEADING}>Portföy etkisi (24 saat)</h3>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Portföy etkisi" emptyMessage="Portföyünüzü etkileyen haber yok">
        {query.data && (
          <>
            <p className="text-xs text-text-secondary">
              {query.data.newsCount ?? 0} haber · {query.data.affectedHoldings ?? 0} etkilenen pozisyon
            </p>
            <ul className="space-y-2 text-xs">
              {query.data.items.map((item) => (
                <li key={item.symbol} className="flex items-center gap-2">
                  <span className="w-16 font-data-mono font-bold text-text-primary">{item.symbol}</span>
                  <NetBar net={item.net} />
                  <span className="w-24 text-right font-data-mono text-text-secondary">
                    {item.newsCount} haber · {formatNet(item.net)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanelState>
    </section>
  );
}

export function SectorImpactPanel() {
  const query = usePanelQuery(() => fetchNewsSectorImpact(), []);
  return (
    <section aria-labelledby="news-sector-impact" className={PANEL}>
      <h3 id="news-sector-impact" className={HEADING}>Sektör etki haritası</h3>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Sektör etkisi" emptyMessage="Sektör etkisi hesaplanmadı">
        {query.data && (
          <ul className="space-y-2 text-xs" aria-label="Sektörlere göre net haber etkisi (negatif ile pozitif arası)">
            {query.data.items.map((item) => (
              <li key={item.sector} className="flex items-center gap-2">
                <span className="w-28 truncate text-text-primary">{item.sector}</span>
                <NetBar net={item.net} />
                <span className="w-14 text-right font-data-mono text-text-secondary">{formatNet(item.net)}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelState>
    </section>
  );
}

export function TrendingTopicsPanel() {
  const query = usePanelQuery(() => fetchNewsTopics(8), []);
  return (
    <section aria-labelledby="news-topics" className={PANEL}>
      <h3 id="news-topics" className={HEADING}>Gündemdeki konular</h3>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Konular" emptyMessage="Öne çıkan konu yok">
        {query.data && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {query.data.items.map((topic) => (
              <li key={topic.label} className="rounded-full border border-outline-variant bg-bg-base px-3 py-1 text-text-secondary">
                {topic.label} <span className="font-data-mono text-text-muted">{topic.count}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelState>
    </section>
  );
}
