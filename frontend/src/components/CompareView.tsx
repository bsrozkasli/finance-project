import { useMemo, useState } from 'react';
import {
  fetchBenchmarks,
  fetchPortfolioOverview,
  type ComparableRef,
  type ComparisonPeriod,
} from '../api/redesign';
import { usePanelQuery } from '../hooks/usePanelQuery';
import PanelState from './ui/PanelState';
import {
  CorrelationPanel,
  MetricsSection,
  MonthlyPanel,
  PerformancePanel,
  RiskReturnPanel,
  SectorPanel,
} from './compare/ComparePanels';
import { isComparableRef } from './compare/compareFormat';
import './compare/compare.css';

const PERIODS: ComparisonPeriod[] = ['1M', '3M', '6M', '1Y'];

interface Option {
  value: ComparableRef;
  label: string;
}

export default function CompareView() {
  const portfolios = usePanelQuery(() => fetchPortfolioOverview());
  const benchmarks = usePanelQuery(fetchBenchmarks);
  const [period, setPeriod] = useState<ComparisonPeriod>('6M');
  const [pickedA, setPickedA] = useState<ComparableRef | null>(null);
  const [pickedB, setPickedB] = useState<ComparableRef | null>(null);

  const options = useMemo<Option[]>(() => {
    const list: Option[] = [{ value: 'ALL', label: 'Toplam' }];
    (portfolios.data?.items ?? []).forEach((p) => list.push({ value: `PORTFOLIO:${p.portfolioId}`, label: p.name }));
    (benchmarks.data?.items ?? []).forEach((b) => list.push({ value: `BENCHMARK:${b.code}`, label: b.name }));
    return list;
  }, [portfolios.data, benchmarks.data]);

  // Defaults: first portfolio (or Toplam) against the first benchmark, else the next option.
  const defaultA = (options.find((o) => o.value.startsWith('PORTFOLIO:')) ?? options[0]).value;
  const defaultB = (options.find((o) => o.value.startsWith('BENCHMARK:') && o.value !== defaultA)
    ?? options.find((o) => o.value !== defaultA)
    ?? options[0]).value;
  const a = pickedA ?? defaultA;
  const b = pickedB ?? defaultB;
  const labelOf = (ref: ComparableRef) => options.find((o) => o.value === ref)?.label ?? ref;

  const catalogueState = portfolios.state === 'loading' || benchmarks.state === 'loading'
    ? 'loading'
    : options.length < 2 && portfolios.state !== 'ready' && benchmarks.state !== 'ready' ? 'unavailable' : 'ready';
  const canCompare = options.length > 1 && a !== b;

  const onPick = (setter: (ref: ComparableRef) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isComparableRef(event.target.value)) setter(event.target.value);
  };

  return (
    <div className="desk-page">
      <h1>Karşılaştırma</h1>
      <p className="desk-help">İki portföyü veya bir portföy ile bir kıyas endeksini aynı dönemde karşılaştırın.</p>

      <PanelState
        state={catalogueState}
        onRetry={() => { portfolios.reload(); benchmarks.reload(); }}
        label="Karşılaştırma seçenekleri"
        skeletonRows={1}
      >
        <div className="cmp-controls">
          <label className="cmp-field">
            Karşılaştırılan A
            <select value={a} onChange={onPick(setPickedA)}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="cmp-btn"
            aria-label="A ve B seçimlerini yer değiştir"
            onClick={() => { setPickedA(b); setPickedB(a); }}
          >
            ⇄ Yer değiştir
          </button>
          <label className="cmp-field">
            Karşılaştırılan B
            <select value={b} onChange={onPick(setPickedB)}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <div className="cmp-periods" role="group" aria-label="Dönem">
            {PERIODS.map((p) => (
              <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>

        {canCompare ? (
          <div className="cmp-grid">
            <MetricsSection a={a} b={b} period={period} />
            <PerformancePanel a={a} b={b} period={period} />
            <SectorPanel a={a} b={b} labelA={labelOf(a)} labelB={labelOf(b)} />
            <RiskReturnPanel a={a} b={b} period={period} />
            <CorrelationPanel a={a} b={b} />
            <MonthlyPanel a={a} b={b} labelA={labelOf(a)} labelB={labelOf(b)} />
          </div>
        ) : (
          <p className="cmp-note">Karşılaştırmak için iki farklı seçim yapın.</p>
        )}
      </PanelState>
    </div>
  );
}
