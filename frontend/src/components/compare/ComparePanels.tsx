import { fetchPortfolioPerformanceComparison } from '../../api/portfolio';
import type { PortfolioComparisonSeries } from '../../api/portfolio';
import {
  fetchComparisonMetrics,
  fetchCorrelationMatrix,
  fetchPortfolioAllocation,
  fetchPortfolioMonthlyReturns,
  fetchRiskReturn,
  type ComparableRef,
  type ComparisonPeriod,
  type EntityMetrics,
} from '../../api/redesign';
import { usePanelQuery, type PanelQueryState } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import {
  benchmarkCodeOf,
  fmtFraction,
  fmtNumber,
  fmtPlainFraction,
  portfolioIdOf,
  toneOf,
} from './compareFormat';

const SERIES_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'];

interface PairProps {
  a: ComparableRef;
  b: ComparableRef;
  period: ComparisonPeriod;
}

function Panel({ title, help, wide, children }: { title: string; help?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`desk-panel${wide ? ' cmp-wide' : ''}`} aria-label={title}>
      <div className="desk-panel-head">
        <div>
          <h2>{title}</h2>
          {help ? <p className="desk-help">{help}</p> : null}
        </div>
      </div>
      <div className="cmp-body">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------ metrics + KPIs */

type MetricKey = Exclude<keyof EntityMetrics, 'ref' | 'label'>;

const METRIC_ROWS: { key: MetricKey; label: string; format: (v: number | null | undefined) => string }[] = [
  { key: 'periodReturn', label: 'Dönem getirisi', format: (v) => fmtFraction(v) },
  { key: 'volatility', label: 'Oynaklık', format: (v) => fmtPlainFraction(v, 2) },
  { key: 'sharpe', label: 'Sharpe oranı', format: (v) => fmtNumber(v, 2) },
  { key: 'maxDrawdown', label: 'Maks. düşüş', format: (v) => fmtFraction(v) },
  { key: 'beta', label: 'Beta', format: (v) => fmtNumber(v, 2) },
  { key: 'bestDay', label: 'En iyi gün', format: (v) => fmtFraction(v) },
  { key: 'worstDay', label: 'En kötü gün', format: (v) => fmtFraction(v) },
  { key: 'positiveDayRatio', label: 'Pozitif gün oranı', format: (v) => fmtPlainFraction(v, 1) },
];

export function MetricsSection({ a, b, period }: PairProps) {
  const query = usePanelQuery(() => fetchComparisonMetrics(a, b, period), [a, b, period]);
  const data = query.data;
  return (
    <>
      <Panel title="Özet göstergeler" wide>
        <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Özet göstergeler" skeletonRows={2}>
          {data ? (
            <div className="cmp-kpis">
              <div className="cmp-kpi">
                <span>{data.a.label} dönem getirisi</span>
                <strong className={`cmp-${toneOf(data.a.periodReturn)}`}>{fmtFraction(data.a.periodReturn)}</strong>
              </div>
              <div className="cmp-kpi">
                <span>{data.b.label} dönem getirisi</span>
                <strong className={`cmp-${toneOf(data.b.periodReturn)}`}>{fmtFraction(data.b.periodReturn)}</strong>
              </div>
              <div className="cmp-kpi">
                <span>Korelasyon</span>
                <strong>{fmtNumber(data.correlation, 2)}</strong>
              </div>
              <div className="cmp-kpi">
                <span>Risksiz oran{data.riskFreeSource ? ` (${data.riskFreeSource})` : ''}</span>
                <strong>{fmtPlainFraction(data.riskFreeRate, 2)}</strong>
              </div>
            </div>
          ) : null}
        </PanelState>
      </Panel>
      <Panel title="Metrik karşılaştırması" help="Daha iyi taraf servis tarafından belirlenir." wide>
        <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Metrik karşılaştırması">
          {data ? (
            <div className="desk-table-scroll">
              <table className="desk-data-table">
                <caption className="cmp-sr">Metrik karşılaştırma tablosu</caption>
                <thead>
                  <tr>
                    <th scope="col">Metrik</th>
                    <th scope="col">{data.a.label}</th>
                    <th scope="col">{data.b.label}</th>
                  </tr>
                </thead>
                <tbody>
                  {METRIC_ROWS.map((row) => {
                    const winner = data.better?.[row.key];
                    return (
                      <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        <td className={winner === 'A' ? 'cmp-better' : undefined}>
                          {row.format(data.a[row.key])}
                          {winner === 'A' ? <span className="cmp-sr"> (daha iyi)</span> : null}
                        </td>
                        <td className={winner === 'B' ? 'cmp-better' : undefined}>
                          {row.format(data.b[row.key])}
                          {winner === 'B' ? <span className="cmp-sr"> (daha iyi)</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </PanelState>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------ relative performance */

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { left: 48, right: 12, top: 12, bottom: 24 };

function LineChart({ series }: { series: PortfolioComparisonSeries[] }) {
  const all = series.flatMap((s) => s.points.map((p) => p.returnPct));
  const min = Math.min(0, ...all);
  const max = Math.max(0, ...all);
  const span = max - min || 1;
  const maxLen = Math.max(...series.map((s) => s.points.length));
  const x = (i: number) => PAD.left + (maxLen <= 1 ? 0 : (i / (maxLen - 1)) * (WIDTH - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + ((max - v) / span) * (HEIGHT - PAD.top - PAD.bottom);
  const summary = series
    .map((s) => `${s.label}: ${fmtNumber(s.points[s.points.length - 1]?.returnPct, 2)}%`)
    .join('; ');
  return (
    <svg className="cmp-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Göreli getiri grafiği. Dönem sonu: ${summary}`}>
      <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(0)} y2={y(0)} stroke="#2A2F3D" strokeDasharray="4 4" />
      <text x={PAD.left - 6} y={y(max) + 4} textAnchor="end">{`${max.toFixed(1)}%`}</text>
      <text x={PAD.left - 6} y={y(min)} textAnchor="end">{`${min.toFixed(1)}%`}</text>
      {series.map((s, index) => (
        <polyline
          key={s.id}
          fill="none"
          stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
          strokeWidth={2}
          points={s.points.map((p, i) => `${x(i)},${y(p.returnPct)}`).join(' ')}
        />
      ))}
    </svg>
  );
}

export function PerformancePanel({ a, b, period }: PairProps) {
  const query = usePanelQuery(() => {
    const portfolioIds = [a, b].map(portfolioIdOf).filter((id): id is number => id !== null);
    const benchmarks = [a, b].map(benchmarkCodeOf).filter((code): code is string => code !== null);
    return fetchPortfolioPerformanceComparison(period, portfolioIds, benchmarks);
  }, [a, b, period]);
  const series = (query.data?.series ?? []).filter((s) => s.points.length > 0);
  const state: PanelQueryState = query.state === 'ready' && series.length === 0 ? 'empty' : query.state;
  return (
    <Panel title="Göreli performans" help="Seçilen dönemde kümülatif getiri (%)." wide>
      <PanelState state={state} onRetry={query.reload} label="Göreli performans" emptyMessage="Bu dönem için performans verisi yok">
        <div className="cmp-legend">
          {series.map((s, index) => (
            <span key={s.id}><i style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} />{s.label}</span>
          ))}
        </div>
        {series.length > 0 ? <LineChart series={series} /> : null}
      </PanelState>
    </Panel>
  );
}

/* ----------------------------------------------------------- sector weights */

function SectorSide({ refValue, title }: { refValue: ComparableRef; title: string }) {
  const id = portfolioIdOf(refValue);
  const query = usePanelQuery(
    () => (id === null ? Promise.reject(new Error('not a portfolio')) : fetchPortfolioAllocation(id, 'SECTOR')),
    [id],
  );
  if (id === null) {
    return <p className="cmp-note"><strong>{title}</strong>: sektör dağılımı yalnızca portföyler için gösterilir.</p>;
  }
  const slices = (query.data?.slices ?? []).filter((s) => s.weight != null);
  return (
    <div>
      <div className="cmp-side-title">{title}</div>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label={`${title} sektör ağırlıkları`} emptyMessage="Sektör ağırlığı yok">
        <ul className="cmp-bars">
          {slices.map((s) => (
            <li key={s.key} className="cmp-bar">
              <span>{s.label}</span>
              <span className="cmp-bar-track" aria-hidden="true">
                <span className="cmp-bar-fill" style={{ display: 'block', width: `${Math.min(100, Math.max(0, (s.weight ?? 0) * 100))}%` }} />
              </span>
              <span>{fmtPlainFraction(s.weight, 1)}</span>
            </li>
          ))}
        </ul>
      </PanelState>
    </div>
  );
}

export function SectorPanel({ a, b, labelA, labelB }: { a: ComparableRef; b: ComparableRef; labelA: string; labelB: string }) {
  return (
    <Panel title="Sektör ağırlıkları" wide>
      <div className="cmp-grid" style={{ marginTop: 0 }}>
        <SectorSide refValue={a} title={labelA} />
        <SectorSide refValue={b} title={labelB} />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ monthly returns */

function MonthlySide({ refValue, title }: { refValue: ComparableRef; title: string }) {
  const id = portfolioIdOf(refValue);
  const query = usePanelQuery(
    () => (id === null ? Promise.reject(new Error('not a portfolio')) : fetchPortfolioMonthlyReturns(id, 12)),
    [id],
  );
  if (id === null) {
    return <p className="cmp-note"><strong>{title}</strong>: aylık getiri yalnızca portföyler için gösterilir.</p>;
  }
  return (
    <div>
      <div className="cmp-side-title">{title}</div>
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label={`${title} aylık getiriler`} emptyMessage="Aylık getiri yok">
        <ul className="cmp-months">
          {(query.data?.items ?? []).map((item) => (
            <li key={item.month} className="cmp-month">
              <span>{item.month}</span>
              <strong className={`cmp-${toneOf(item.returnPct)}`}>{fmtFraction(item.returnPct, 1)}</strong>
            </li>
          ))}
        </ul>
      </PanelState>
    </div>
  );
}

export function MonthlyPanel({ a, b, labelA, labelB }: { a: ComparableRef; b: ComparableRef; labelA: string; labelB: string }) {
  return (
    <Panel title="Aylık getiriler" wide>
      <div className="cmp-grid" style={{ marginTop: 0 }}>
        <MonthlySide refValue={a} title={labelA} />
        <MonthlySide refValue={b} title={labelB} />
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------- risk / return scatter */

export function RiskReturnPanel({ a, b, period }: PairProps) {
  const query = usePanelQuery(() => fetchRiskReturn([a, b], period), [a, b, period]);
  const points = (query.data?.points ?? []).filter((p) => p.volatility != null && p.periodReturn != null);
  const state: PanelQueryState = query.state === 'ready' && points.length === 0 ? 'empty' : query.state;
  const maxVol = Math.max(0.01, ...points.map((p) => p.volatility ?? 0));
  const rets = points.map((p) => p.periodReturn ?? 0);
  const minRet = Math.min(0, ...rets);
  const maxRet = Math.max(0.01, ...rets);
  const sx = (v: number) => PAD.left + (v / maxVol) * (WIDTH - PAD.left - PAD.right - 120);
  const sy = (v: number) => PAD.top + ((maxRet - v) / (maxRet - minRet || 1)) * (HEIGHT - PAD.top - PAD.bottom);
  const summary = points.map((p) => `${p.label}: oynaklık ${fmtPlainFraction(p.volatility, 1)}, getiri ${fmtFraction(p.periodReturn, 1)}`).join('; ');
  return (
    <Panel title="Risk / getiri">
      <PanelState state={state} notes={query.data?.notes} onRetry={query.reload} label="Risk getiri" emptyMessage="Risk / getiri verisi yok">
        <svg className="cmp-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Risk getiri dağılımı. ${summary}`}>
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#2A2F3D" />
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} stroke="#2A2F3D" />
          <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end">Oynaklık</text>
          <text x={PAD.left + 4} y={PAD.top + 8}>Getiri</text>
          {points.map((p, index) => (
            <g key={p.ref}>
              <circle cx={sx(p.volatility ?? 0)} cy={sy(p.periodReturn ?? 0)} r={7} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
              <text x={sx(p.volatility ?? 0) + 11} y={sy(p.periodReturn ?? 0) + 4}>{p.label}</text>
            </g>
          ))}
        </svg>
      </PanelState>
    </Panel>
  );
}

/* ------------------------------------------------------------ correlation matrix */

export function CorrelationPanel({ a, b }: { a: ComparableRef; b: ComparableRef }) {
  const query = usePanelQuery(() => fetchCorrelationMatrix([a, b]), [a, b]);
  const labels = query.data?.labels ?? [];
  const state: PanelQueryState = query.state === 'ready' && labels.length === 0 ? 'empty' : query.state;
  return (
    <Panel title="Korelasyon matrisi">
      <PanelState state={state} notes={query.data?.notes} onRetry={query.reload} label="Korelasyon matrisi" emptyMessage="Korelasyon verisi yok">
        <div className="desk-table-scroll">
          <table className="desk-data-table">
            <caption className="cmp-sr">Korelasyon matrisi</caption>
            <thead>
              <tr>
                <th scope="col"><span className="cmp-sr">Varlık</span></th>
                {labels.map((label) => <th key={label} scope="col">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {(query.data?.matrix ?? []).map((row, i) => (
                <tr key={labels[i] ?? i}>
                  <th scope="row">{labels[i]}</th>
                  {row.map((value, j) => (
                    <td
                      key={labels[j] ?? j}
                      style={value == null ? undefined : { background: `rgba(96,165,250,${(Math.abs(value) * 0.45).toFixed(2)})` }}
                    >
                      {fmtNumber(value, 2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelState>
    </Panel>
  );
}
