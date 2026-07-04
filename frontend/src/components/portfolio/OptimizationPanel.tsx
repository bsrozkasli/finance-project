import { useMemo, useState } from 'react';
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ResponsiveContainer, ZAxis } from 'recharts';
import type { PortfolioOptimizationMetrics, PortfolioOptimizationResponse, RebalanceAction } from '../../api/client';
import { checkPortfolioRebalance, optimizePortfolio } from '../../api/client';
import { fmtCurrency, fmtPct, positiveColor, toNumber } from './portfolioUtils';
import type { EnrichedRow, PortfolioTotals } from './portfolioUtils';

interface OptimizationPanelProps {
  rows: EnrichedRow[];
  totals: PortfolioTotals;
  currentReturn: number | null;
  currentRisk: number | null;
}

interface ScatterPoint {
  name: string;
  risk: number;
  returnValue: number;
  sharpe?: number;
}

const metricsOf = (result: PortfolioOptimizationResponse | null): PortfolioOptimizationMetrics | null =>
  result?.portfolioMetrics ?? result?.portfolio_metrics ?? null;

const frontierOf = (result: PortfolioOptimizationResponse | null): ScatterPoint[] => {
  const points = result?.efficientFrontier ?? result?.efficient_frontier ?? [];
  return points.map((point, index) => ({
    name: `Frontier ${index + 1}`,
    risk: toNumber(point.volatility) * 100,
    returnValue: toNumber(point.expectedReturn ?? point.expected_return ?? point.targetReturn ?? point.target_return) * 100,
    sharpe: point.sharpe ?? point.sharpeRatio ?? point.sharpe_ratio,
  }));
};

const normalizedWeight = (value: number | undefined): number => {
  if (value == null) return 0;
  return value <= 1 ? value : value / 100;
};

const actionTarget = (action: RebalanceAction): number => normalizedWeight(action.targetWeight ?? action.target_weight);
const actionCurrent = (action: RebalanceAction): number => normalizedWeight(action.currentWeight ?? action.current_weight);
const actionRequired = (action: RebalanceAction): boolean => action.requiresRebalance ?? action.requires_rebalance ?? false;

export const OptimizationPanel = ({ rows, totals, currentReturn, currentRisk }: OptimizationPanelProps) => {
  const [result, setResult] = useState<PortfolioOptimizationResponse | null>(null);
  const [actions, setActions] = useState<RebalanceAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    rows.forEach(row => {
      if (totals.totalMarketValue > 0 && row.marketValue != null) {
        weights[row.position.symbol] = row.marketValue / totals.totalMarketValue;
      }
    });
    return weights;
  }, [rows, totals.totalMarketValue]);

  const metrics = metricsOf(result);
  const targetWeights = result?.weights ?? metrics?.weights ?? {};
  const optimalPoint = metrics?.volatility != null || metrics?.returns != null
    ? [{ name: 'Optimal', risk: toNumber(metrics.volatility) * 100, returnValue: toNumber(metrics.returns) * 100, sharpe: metrics.sharpe }]
    : [];
  const currentPoint = currentRisk != null || currentReturn != null
    ? [{ name: 'Mevcut', risk: currentRisk ?? 0, returnValue: currentReturn ?? 0 }]
    : [];
  const frontier = frontierOf(result);
  const riskLabel = (metrics?.volatility ?? 0) < 0.15 ? 'Conservative' : (metrics?.volatility ?? 0) < 0.3 ? 'Moderate' : 'Aggressive';
  const riskPercent = Math.min(100, Math.max(4, (metrics?.volatility ?? 0) * 220));

  const runOptimization = async () => {
    const symbols = rows.map(row => row.position.symbol).filter((symbol, index, arr) => arr.indexOf(symbol) === index);
    if (symbols.length < 2) {
      setError('Optimizasyon icin en az iki holding gerekli.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const optimized = await optimizePortfolio({
        symbols,
        objective: 'MAX_SHARPE',
        risk_free_rate: 0.02,
        lookback_period: 365,
        max_weight: 0.4,
        min_weight: 0,
      });
      setResult(optimized);
      const optimizedWeights = optimized.weights ?? optimized.portfolioMetrics?.weights ?? optimized.portfolio_metrics?.weights ?? {};
      const rebalance = await checkPortfolioRebalance({
        target_weights: optimizedWeights,
        current_weights: currentWeights,
        threshold: 0.03,
      });
      setActions(rebalance.actions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Portfoy optimizasyonu kullanilamiyor.');
      setResult(null);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Portfoy Optimizasyonu</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Efficient frontier, optimal agirliklar ve rebalance aksiyonlari.</p>
        </div>
        <button type="button" disabled={loading} onClick={runOptimization} className="rounded px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: 'var(--color-accent)', color: '#fff' }}>
          {loading ? 'Calisiyor...' : 'Optimizasyonu Calistir'}
        </button>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[300px] min-w-0">
          {(frontier.length > 0 || currentPoint.length > 0 || optimalPoint.length > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="rgba(140,144,159,0.18)" />
                <XAxis type="number" dataKey="risk" name="Risk" unit="%" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="number" dataKey="returnValue" name="Return" unit="%" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <ZAxis range={[60, 140]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }} />
                <Scatter name="Efficient frontier" data={frontier} fill="var(--color-accent-light)" />
                <Scatter name="Mevcut portfoy" data={currentPoint} fill="var(--color-warning)" />
                <Scatter name="Optimal" data={optimalPoint} fill="var(--color-bull)" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="text-xs">Optimizasyon calistirildiginda grafik dolacak.</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Risk Skoru</span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-accent-light)' }}>{result ? riskLabel : '-'}</span>
            </div>
            <div className="mt-3 h-2 rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-2 rounded-full" style={{ width: `${result ? riskPercent : 0}%`, background: riskLabel === 'Aggressive' ? 'var(--color-bear)' : riskLabel === 'Moderate' ? 'var(--color-warning)' : 'var(--color-bull)' }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <span style={{ color: 'var(--color-text-muted)' }}>Conservative</span>
              <span className="text-center" style={{ color: 'var(--color-text-muted)' }}>Moderate</span>
              <span className="text-right" style={{ color: 'var(--color-text-muted)' }}>Aggressive</span>
            </div>
          </div>

          <div className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <div className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Optimal Dagilim</div>
            <div className="mt-3 max-h-48 overflow-y-auto">
              {Object.keys(targetWeights).length > 0 ? Object.entries(targetWeights).sort((a, b) => b[1] - a[1]).map(([symbol, weight]) => (
                <div key={symbol} className="flex items-center justify-between border-b py-1.5 text-xs last:border-b-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <span className="font-mono" style={{ color: 'var(--color-accent-light)' }}>{symbol}</span>
                  <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{fmtPct(normalizedWeight(weight) * 100)}</span>
                </div>
              )) : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Henuz sonuc yok.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Rebalance Onerileri</h3>
          {result && frontier.length === 0 && <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Backend yaniti frontier noktasi icermiyorsa yalniz mevcut/optimal noktalar gosterilir.</span>}
        </div>
        {error && <div className="mb-3 rounded border p-2 text-xs" style={{ color: 'var(--color-bear)', borderColor: 'var(--color-bear)', background: 'var(--color-bear-dim)' }}>{error}</div>}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {actions.filter(actionRequired).length > 0 ? actions.filter(actionRequired).map(action => {
            const target = actionTarget(action);
            const current = actionCurrent(action);
            const amount = Math.abs(target - current) * totals.totalMarketValue;
            return (
              <div key={action.symbol} className="rounded border p-3 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
                <div className="font-mono font-bold" style={{ color: 'var(--color-accent-light)' }}>{action.symbol}</div>
                <div className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {fmtPct(current * 100)} -&gt; {fmtPct(target * 100)} ({action.action.toLowerCase()} {fmtCurrency(amount)})
                </div>
                <div className="mt-1 font-mono" style={{ color: positiveColor(target - current) }}>{fmtPct((target - current) * 100)} sapma</div>
              </div>
            );
          }) : <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Calistirilmis rebalance onerisi yok veya esik asilmadi.</div>}
        </div>
      </div>
    </section>
  );
};