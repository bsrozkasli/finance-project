import { useState } from 'react';
import {
  fetchCompanyPeers,
  fetchCompanyStatements,
  fetchQuarterlyTrend,
  fetchRatioHistory,
} from '../../api/redesign';
import type { CompanyAnalysis, RatioMetric, StatementType } from '../../api/redesign';
import { usePanelQuery, type PanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import { MiniBarChart, MiniLineChart } from './MiniCharts';
import { isNum, num, pct, periodLabel, VERDICT_LABEL } from './companyFormat';

type AnalysisQuery = PanelQuery<CompanyAnalysis>;

const RATIO_ROWS: { key: string; label: string; percent?: boolean }[] = [
  { key: 'pe', label: 'F/K' },
  { key: 'pb', label: 'PD/DD' },
  { key: 'evEbitda', label: 'FD/FAVÖK' },
  { key: 'roe', label: 'Özkaynak kârlılığı (ROE)', percent: true },
  { key: 'netMargin', label: 'Net marj', percent: true },
  { key: 'debtToEquity', label: 'Borç / özkaynak' },
];

export function ValuationPanel({ query }: { query: AnalysisQuery }) {
  const ttm = query.data?.ttm ?? {};
  const rows = RATIO_ROWS.filter((row) => ttm[row.key]);
  return (
    <section className="desk-panel company-panel" aria-labelledby="company-valuation-h">
      <div className="desk-panel-head"><div><h2 id="company-valuation-h">Değerleme ve kârlılık</h2><p className="desk-help">Şirket değeri ve sektör ortalaması</p></div></div>
      <div className="company-panel-body">
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Değerleme" emptyMessage="Değerleme verisi yok">
          {rows.length === 0 ? <p className="desk-empty">Değerleme verisi yok.</p> : (
            <div className="desk-table-scroll" role="region" aria-label="Değerleme ve kârlılık, yatay kaydırılabilir" tabIndex={0}>
              <table className="desk-data-table" aria-label="Değerleme ve kârlılık">
                <thead><tr><th scope="col">Gösterge</th><th scope="col">Şirket</th><th scope="col">Sektör ort.</th><th scope="col">Sonuç</th></tr></thead>
                <tbody>
                  {rows.map((row) => {
                    const item = ttm[row.key];
                    const fmt = row.percent ? pct : num;
                    return (
                      <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        <td>{fmt(item.value)}</td>
                        <td>{fmt(item.sectorAverage)}</td>
                        <td>{item.verdict ? <span className={`company-verdict company-verdict-${item.verdict.toLowerCase()}`}>{VERDICT_LABEL[item.verdict]}</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelState>
      </div>
    </section>
  );
}

const COMPONENT_LABEL: Record<string, string> = {
  PROFITABILITY: 'Kârlılık', GROWTH: 'Büyüme', LEVERAGE: 'Kaldıraç', VALUATION: 'Değerleme', DIVIDEND: 'Temettü',
};

export function HealthScorePanel({ query }: { query: AnalysisQuery }) {
  const data = query.data;
  // A score is only meaningful together with the policy version that defines it.
  const scored = isNum(data?.healthScore) && Boolean(data?.policyVersion);
  const components = (data?.healthComponents ?? []).filter((c) => isNum(c.score));
  return (
    <section className="desk-panel company-panel" aria-labelledby="company-health-h">
      <div className="desk-panel-head"><div><h2 id="company-health-h">Finansal sağlık skoru</h2><p className="desk-help">0–100 arası, sürümlü politika ile hesaplanır</p></div></div>
      <div className="company-panel-body">
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Sağlık skoru">
          {scored ? (
            <>
              <p className="company-score"><strong>{num(data!.healthScore, 0)}</strong><span> / 100</span></p>
              <p className="desk-help">Politika sürümü: {data!.policyVersion}</p>
              {components.length > 0 && (
                <ul className="company-bars" aria-label="Skor bileşenleri">
                  {components.map((c) => (
                    <li key={c.name}>
                      <span>{COMPONENT_LABEL[c.name] ?? c.name}</span>
                      <span className="company-bar" role="img" aria-label={`${COMPONENT_LABEL[c.name] ?? c.name} ${num(c.score, 0)} / 100`}><i style={{ width: `${c.score}%` }} /></span>
                      <span>{num(c.score, 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="panel-state panel-state-unavailable" role="status">
              <p className="panel-state-title">Veri alınamadı</p>
              <p className="panel-state-note">Sağlık skoru, onaylı bir politika sürümü olmadan gösterilmez.</p>
            </div>
          )}
        </PanelState>
      </div>
    </section>
  );
}

const METRICS: [RatioMetric, string][] = [['PE', 'F/K'], ['PB', 'PD/DD'], ['EV_EBITDA', 'FD/FAVÖK'], ['ROE', 'ROE'], ['NET_MARGIN', 'Net marj']];

export function RatioHistoryPanel({ symbol }: { symbol: string }) {
  const [metric, setMetric] = useState<RatioMetric>('PE');
  const query = usePanelQuery(() => fetchRatioHistory(symbol, metric, 9), [symbol, metric]);
  const points = (query.data?.points ?? []).slice(-9);
  const labels = points.map((p) => periodLabel(p.periodEnd));
  const hasSector = points.some((p) => isNum(p.sectorValue));
  const metricLabel = METRICS.find(([key]) => key === metric)![1];
  return (
    <section className="desk-panel company-panel" aria-labelledby="company-ratio-h">
      <div className="desk-panel-head"><div><h2 id="company-ratio-h">Oran geçmişi</h2><p className="desk-help">Son 9 çeyrek</p></div></div>
      <div className="company-panel-body">
        <div className="desk-segment" role="group" aria-label="Oran seçimi">
          {METRICS.map(([key, label]) => <button key={key} type="button" aria-pressed={key === metric} onClick={() => setMetric(key)}>{label}</button>)}
        </div>
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Oran geçmişi" emptyMessage="Oran geçmişi yok">
          {points.length === 0 ? <p className="desk-empty">Oran geçmişi yok.</p> : (
            <>
              <MiniLineChart
                labels={labels}
                label={`${metricLabel} geçmişi, ${points.length} çeyrek`}
                series={[
                  { name: 'Şirket', values: points.map((p) => p.value), className: 'company-line-main' },
                  ...(hasSector ? [{ name: 'Sektör', values: points.map((p) => p.sectorValue), dashed: true, className: 'company-line-sector' }] : []),
                ]}
              />
              <p className="desk-help">Güncel {num(query.data?.current)} · ortalama {num(query.data?.mean)}{isNum(query.data?.sectorAverage) ? ` · sektör ${num(query.data?.sectorAverage)}` : ''}</p>
              <details className="company-details">
                <summary>Tablo olarak göster</summary>
                <table className="desk-data-table" aria-label="Oran geçmişi tablosu">
                  <thead><tr><th scope="col">Dönem</th><th scope="col">Şirket</th><th scope="col">Sektör</th></tr></thead>
                  <tbody>{points.map((p) => <tr key={p.periodEnd}><th scope="row">{periodLabel(p.periodEnd)}</th><td>{num(p.value)}</td><td>{num(p.sectorValue)}</td></tr>)}</tbody>
                </table>
              </details>
            </>
          )}
        </PanelState>
      </div>
    </section>
  );
}

export function QuarterlyTrendPanel({ symbol }: { symbol: string }) {
  const query = usePanelQuery(() => fetchQuarterlyTrend(symbol, 12), [symbol]);
  const points = (query.data?.points ?? []).slice(-12);
  const labels = points.map((p) => periodLabel(p.periodEnd));
  return (
    <section className="desk-panel company-panel" aria-labelledby="company-quarterly-h">
      <div className="desk-panel-head"><div><h2 id="company-quarterly-h">Çeyreklik gelir ve net kâr</h2><p className="desk-help">Son 12 çeyrek · net marj</p></div></div>
      <div className="company-panel-body">
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Çeyreklik trend" emptyMessage="Çeyreklik veri yok">
          {points.length === 0 ? <p className="desk-empty">Çeyreklik veri yok.</p> : (
            <>
              <MiniBarChart
                labels={labels}
                label={`Çeyreklik gelir ve net kâr, ${points.length} çeyrek`}
                series={[
                  { name: 'Gelir', values: points.map((p) => p.revenue), className: 'company-bar-revenue' },
                  { name: 'Net kâr', values: points.map((p) => p.netIncome), className: 'company-bar-income' },
                ]}
              />
              <div className="desk-table-scroll" role="region" aria-label="Çeyreklik tablo, yatay kaydırılabilir" tabIndex={0}>
                <table className="desk-data-table" aria-label="Çeyreklik gelir, net kâr ve net marj">
                  <thead><tr><th scope="col">Dönem</th><th scope="col">Gelir</th><th scope="col">Net kâr</th><th scope="col">Net marj</th></tr></thead>
                  <tbody>{points.map((p) => <tr key={p.periodEnd}><th scope="row">{periodLabel(p.periodEnd)}</th><td>{num(p.revenue, 0)}</td><td>{num(p.netIncome, 0)}</td><td>{pct(p.netMargin)}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </PanelState>
      </div>
    </section>
  );
}

const STATEMENTS: [StatementType, string][] = [['INCOME', 'Gelir tablosu'], ['BALANCE', 'Bilanço'], ['CASH_FLOW', 'Nakit akışı']];

export function StatementsPanel({ symbol }: { symbol: string }) {
  const [type, setType] = useState<StatementType>('INCOME');
  const query = usePanelQuery(() => fetchCompanyStatements(symbol, type, 5), [symbol, type]);
  const periods = query.data?.periods ?? [];
  const lines = query.data?.lines ?? [];
  return (
    <section className="desk-panel company-panel" aria-labelledby="company-statements-h">
      <div className="desk-panel-head"><div><h2 id="company-statements-h">Finansal tablolar</h2><p className="desk-help">Son 5 çeyrek · yıllık değişim</p></div></div>
      <div className="company-panel-body">
        <div className="desk-segment" role="group" aria-label="Tablo türü">
          {STATEMENTS.map(([key, label]) => <button key={key} type="button" aria-pressed={key === type} onClick={() => setType(key)}>{label}</button>)}
        </div>
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Finansal tablolar" emptyMessage="Tablo verisi yok">
          {lines.length === 0 ? <p className="desk-empty">Tablo verisi yok.</p> : (
            <div className="desk-table-scroll" role="region" aria-label="Finansal tablo, yatay kaydırılabilir" tabIndex={0}>
              <table className="desk-data-table" aria-label={STATEMENTS.find(([key]) => key === type)![1]}>
                <thead><tr><th scope="col">Kalem</th>{periods.map((p) => <th key={p} scope="col">{periodLabel(p)}</th>)}<th scope="col">YoY</th></tr></thead>
                <tbody>{lines.map((l) => <tr key={l.key}><th scope="row">{l.label ?? l.key}</th>{periods.map((p, i) => <td key={p}>{num(l.values[i], 0)}</td>)}<td>{pct(l.yoyChange)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </PanelState>
      </div>
    </section>
  );
}

export function PeersPanel({ symbol }: { symbol: string }) {
  const query = usePanelQuery(() => fetchCompanyPeers(symbol), [symbol]);
  const items = query.data?.items ?? [];
  return (
    <section className="desk-panel company-panel" aria-labelledby="company-peers-h">
      <div className="desk-panel-head"><div><h2 id="company-peers-h">Benzer şirketler</h2><p className="desk-help">Sektör akranlarıyla karşılaştırma</p></div></div>
      <div className="company-panel-body">
        <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Benzer şirketler" emptyMessage="Akran şirket verisi yok">
          {items.length === 0 ? <p className="desk-empty">Akran şirket verisi yok.</p> : (
            <div className="desk-table-scroll" role="region" aria-label="Benzer şirketler, yatay kaydırılabilir" tabIndex={0}>
              <table className="desk-data-table" aria-label="Benzer şirketler">
                <thead><tr><th scope="col">Şirket</th><th scope="col">F/K</th><th scope="col">PD/DD</th><th scope="col">FD/FAVÖK</th><th scope="col">ROE</th><th scope="col">Net marj</th><th scope="col">1Y getiri</th></tr></thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.symbol} aria-current={p.isSelected ? 'true' : undefined}>
                      <th scope="row">{p.symbol}{p.name ? ` · ${p.name}` : ''}{p.isSelected ? ' (seçili)' : ''}</th>
                      <td>{num(p.pe)}</td><td>{num(p.pb)}</td><td>{num(p.evEbitda)}</td><td>{pct(p.roe)}</td><td>{pct(p.netMargin)}</td><td>{pct(p.return1Y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelState>
      </div>
    </section>
  );
}
