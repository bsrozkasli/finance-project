import { useMemo, useState } from 'react';
import { AlertCircle, BarChart3, FileText, Sparkles } from 'lucide-react';
import type { Holding, Stock } from '../types';
import { useSmartReport } from '../hooks/useSmartReport';
import { useBacktest } from '../hooks/useBacktest';

interface AiReportsViewProps {
  holdings: Holding[];
  stocks: Stock[];
}

const formatMetric = (value: number | null | undefined, digits = 0): string =>
  value != null && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
    : 'Unavailable';

export default function AiReportsView({ holdings, stocks }: AiReportsViewProps) {
  const symbols = useMemo(() => Array.from(new Set([
    ...holdings.map((holding) => holding.symbol),
    ...stocks.map((stock) => stock.symbol),
  ])), [holdings, stocks]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const symbol = selectedSymbol && symbols.includes(selectedSymbol) ? selectedSymbol : symbols[0] ?? null;
  const { report, loading: reportLoading, error: reportError } = useSmartReport(symbol);
  const { data: backtest, loading: backtestLoading, error: backtestError } = useBacktest(symbol);

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl font-bold text-text-primary">Security Research</h2>
          <p className="mt-1 text-sm text-text-secondary">Backend research and historical backtest evidence for a selected symbol.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Symbol
          <select
            value={symbol ?? ''}
            onChange={(event) => setSelectedSymbol(event.target.value || null)}
            disabled={symbols.length === 0}
            className="min-w-40 rounded-lg border border-outline bg-bg-base px-3 py-2 font-data-mono text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            {symbols.length === 0 ? <option value="">No symbols available</option> : symbols.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </header>

      <section aria-label="Portfolio report availability" className="flex gap-3 rounded-xl border border-warning-amber/60 bg-warning-amber/10 p-4 text-sm text-text-secondary">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning-amber" aria-hidden="true" />
        <div>
          <h3 className="font-semibold text-text-primary">Portfolio report is not available</h3>
          <p className="mt-1">The current API provides symbol research. Portfolio-wide AI analysis has no supported endpoint yet.</p>
        </div>
      </section>

      {symbol == null ? (
        <section className="rounded-xl border border-outline-variant bg-bg-card p-8 text-center text-sm text-text-secondary">
          Add a tracked asset or portfolio holding to view research.
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-outline-variant bg-bg-card p-5" aria-labelledby="smart-report-heading">
            <h3 id="smart-report-heading" className="flex items-center gap-2 font-headline text-base font-semibold text-text-primary">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" /> Smart Research · {symbol}
            </h3>
            {reportLoading ? <p role="status" className="mt-4 text-sm text-text-secondary">Loading research…</p>
              : reportError || !report ? <p role="status" className="mt-4 text-sm text-warning-amber">Research unavailable. {reportError}</p>
                : <>
                  <div className="mt-5 flex flex-wrap items-baseline gap-3">
                    <span className="font-data-mono text-3xl font-bold text-primary">{report.overallScore == null ? 'Unavailable' : `${formatMetric(report.overallScore)} / 100`}</span>
                    {report.grade && <span className="rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">Grade {report.grade}</span>}
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">Provider-backed research score. Missing metrics remain unavailable.</p>
                  {report.breakdown && <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(report.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3 rounded-lg bg-bg-base px-3 py-2 text-sm">
                        <dt className="text-text-secondary">{key.replace(/Score$/, '')}</dt>
                        <dd className="font-data-mono text-text-primary">{formatMetric(value)}</dd>
                      </div>
                    ))}
                  </dl>}
                  {report.peers.length > 0 && <p className="mt-5 flex items-center gap-2 text-sm text-text-secondary"><FileText className="h-4 w-4" aria-hidden="true" /> {report.peers.length} peer records available in the backend report.</p>}
                </>}
          </section>

          <section className="rounded-xl border border-outline-variant bg-bg-card p-5" aria-labelledby="backtest-heading">
            <h3 id="backtest-heading" className="flex items-center gap-2 font-headline text-base font-semibold text-text-primary">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" /> Historical Backtest · {symbol}
            </h3>
            {backtestLoading ? <p role="status" className="mt-4 text-sm text-text-secondary">Loading backtest…</p>
              : backtestError || !backtest ? <p role="status" className="mt-4 text-sm text-warning-amber">Backtest unavailable. {backtestError}</p>
                : !backtest.isMeaningful ? <p className="mt-4 text-sm text-text-secondary">Insufficient history for a meaningful backtest result.</p>
                  : <>
                    <div className="mt-5 font-data-mono text-3xl font-bold text-text-primary">{formatMetric(backtest.winRate, 1)}%</div>
                    <p className="mt-1 text-sm text-text-secondary">Historical win rate across {formatMetric(backtest.totalOccurrences)} occurrences</p>
                    <p className="mt-4 text-sm text-text-secondary">Average return: <span className="font-data-mono text-text-primary">{formatMetric(backtest.averageReturnPct, 2)}%</span></p>
                    {backtest.scenarioDescription && <p className="mt-3 text-sm text-text-secondary">{backtest.scenarioDescription}</p>}
                  </>}
          </section>
        </div>
      )}
    </div>
  );
}
