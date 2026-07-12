import { useState, useMemo } from 'react';
import { Sparkles, ShieldAlert, TrendingUp, AlertTriangle, RefreshCw, Layers, CheckCircle, FileText } from 'lucide-react';
import type { Holding, Stock } from '../types';
import { useSmartReport } from '../hooks/useSmartReport';
import { useBacktest } from '../hooks/useBacktest';

function CustomMarkdownParser({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-3.5 text-xs text-text-secondary font-sans leading-relaxed">
      {lines.map((line, i) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        if (trimmed.startsWith('###')) {
          return (
            <h4 key={i} className="font-headline text-xs font-bold text-primary tracking-wide uppercase mt-5 mb-1.5 border-b border-outline-variant/30 pb-1">
              {trimmed.replace('###', '').trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={i} className="font-headline text-sm font-bold text-text-primary tracking-tight mt-6 mb-2">
              {trimmed.replace('##', '').trim()}
            </h3>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={i} className="font-headline text-base font-bold text-text-primary tracking-tight mt-6 mb-3">
              {trimmed.replace('#', '').trim()}
            </h2>
          );
        }

        const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*');
        if (isBullet) {
          trimmed = trimmed.substring(1).trim();
        }

        const parts = trimmed.split('**');
        const formattedLine = parts.map((part, index) => {
          if (index % 2 === 1) {
            return <strong key={index} className="text-text-primary font-bold">{part}</strong>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2.5 pl-2.5">
              <span className="text-primary mt-1.5 shrink-0 block w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{formattedLine}</span>
            </div>
          );
        }

        return <p key={i}>{formattedLine}</p>;
      })}
    </div>
  );
}

interface AiReportsViewProps {
  holdings: Holding[];
  stocks: Stock[];
}

const formatFiniteNumber = (value: unknown, digits: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : null;
};

export default function AiReportsView({ holdings, stocks }: AiReportsViewProps) {
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState<'macro' | 'risk' | 'recommendations'>('macro');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(holdings[0]?.symbol ?? stocks[0]?.symbol ?? null);

  const availableSymbols = useMemo(() => {
    const symbols = new Set<string>();
    holdings.forEach((holding) => symbols.add(holding.symbol));
    stocks.forEach((stock) => symbols.add(stock.symbol));
    return Array.from(symbols);
  }, [holdings, stocks]);

  const effectiveSymbol = selectedSymbol ?? availableSymbols[0] ?? null;
  const { report: smartReport, loading: smartReportLoading, error: smartReportError } = useSmartReport(effectiveSymbol);
  const { data: backtest, loading: backtestLoading, error: backtestError } = useBacktest(effectiveSymbol);

  const stockMap = useMemo(() => {
    const map: Record<string, Stock> = {};
    stocks.forEach((stock) => {
      map[stock.symbol] = stock;
    });
    return map;
  }, [stocks]);

  const portfolioSummary = useMemo(() => {
    const formattedHoldings = holdings.map((holding) => {
      const stock = stockMap[holding.symbol];
      const currentPrice = stock ? stock.price : holding.costPrice;
      const value = holding.quantity * currentPrice;
      const cost = holding.quantity * holding.costPrice;

      return {
        symbol: holding.symbol,
        quantity: holding.quantity,
        costPrice: holding.costPrice,
        currentPrice,
        value,
        cost,
      };
    });

    const totals = formattedHoldings.reduce(
      (acc, holding) => ({
        currentTotalValue: acc.currentTotalValue + holding.value,
        totalCostBasis: acc.totalCostBasis + holding.cost,
      }),
      { currentTotalValue: 0, totalCostBasis: 0 },
    );
    const totalProfitLoss = totals.currentTotalValue - totals.totalCostBasis;
    const totalReturnPercent = totals.totalCostBasis > 0 ? (totalProfitLoss / totals.totalCostBasis) * 100 : 0;

    return {
      totalValue: totals.currentTotalValue.toFixed(2),
      totalReturn: totalReturnPercent.toFixed(2),
      formattedHoldings: formattedHoldings.map(({ symbol, quantity, costPrice, currentPrice, value }) => ({ symbol, quantity, costPrice, currentPrice, value })),
    };
  }, [holdings, stockMap]);

  const buildSmartReportText = (type: 'macro' | 'risk' | 'recommendations') => {
    if (!effectiveSymbol) {
      return 'Select at least one symbol before requesting a backend smart report.';
    }
    if (!smartReport) {
      return smartReportError || 'Backend smart report data is not available for the selected symbol.';
    }

    const breakdown = smartReport.breakdown
      ? Object.entries(smartReport.breakdown)
          .map(([key, value]) => `- **${key.replace('Score', '')}:** ${value.toFixed(0)} / 100`)
          .join('\n')
      : '- Score breakdown is unavailable.';

    const backtestSection = backtest
      ? `- **Win rate:** ${backtest.winRate.toFixed(1)}%\n- **Average return:** ${backtest.averageReturnPct.toFixed(2)}%`
      : `- Backtest data is unavailable. ${backtestError ?? ''}`.trim();

    if (type === 'risk') {
      return `# Risk & Diversification Report\n\n## Selected Symbol\n${effectiveSymbol}\n\n## Smart Report\n- **Overall score:** ${smartReport.overallScore.toFixed(0)} / 100\n- **Grade:** ${smartReport.grade}\n- **Recommendation:** ${smartReport.recommendation}\n\n## Score Breakdown\n${breakdown}\n\n## Risk Readout\nUse the risk, momentum, quality, and valuation scores to review concentration before adding exposure. The backend report does not fabricate unavailable provider data.`;
    }

    if (type === 'recommendations') {
      return `# Strategic Optimization Plan\n\n## Selected Symbol\n${effectiveSymbol}\n\n## Backend Recommendation\n- **Recommendation:** ${smartReport.recommendation}\n- **Grade:** ${smartReport.grade}\n- **Overall score:** ${smartReport.overallScore.toFixed(0)} / 100\n\n## Backtest Context\n${backtestSection}\n\n## Action Framework\nReview position size, cost basis, and portfolio concentration before creating BUY or SELL transactions in the ledger.`;
    }

    return `# Macro Portfolio Analysis\n\n## Portfolio Snapshot\n- **Total value:** $${portfolioSummary.totalValue}\n- **Total return:** ${portfolioSummary.totalReturn}%\n- **Positions:** ${holdings.length}\n\n## Backend Smart Report: ${effectiveSymbol}\n- **Overall score:** ${smartReport.overallScore.toFixed(0)} / 100\n- **Grade:** ${smartReport.grade}\n- **Recommendation:** ${smartReport.recommendation}\n\n## Score Breakdown\n${breakdown}\n\n## Backtest Context\n${backtestSection}`;
  };

  const handleGenerateReport = (type: 'macro' | 'risk' | 'recommendations') => {
    setIsLoading(false);
    setReportType(type);
    setErrorMessage('');
    setReportText('');

    if (smartReportLoading || backtestLoading) {
      setErrorMessage('Backend analytics are still loading. Try again in a moment.');
      return;
    }

    const text = buildSmartReportText(type);
    if (!smartReport) {
      setErrorMessage(text);
      return;
    }
    setReportText(text);
  };

  const reportTitle = reportType === 'risk'
    ? 'Risk & Diversification Report'
    : reportType === 'recommendations'
      ? 'Strategic Optimization Plan'
      : 'Macro Portfolio Analysis';

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
          AI Portfolio Reports
        </h2>
        <p className="text-sm text-text-secondary">
          Analyze holdings, cost basis, allocation, and portfolio risk with institutional-grade AI reporting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Report Categories</span>
            </h3>

            <div className="space-y-3 font-sans text-xs">
              <button
                onClick={() => handleGenerateReport('macro')}
                disabled={isLoading}
                className="w-full text-left p-3.5 bg-bg-base/60 hover:bg-bg-base border border-outline-variant/35 rounded-xl transition-all hover:border-primary/50 group block"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary group-hover:animate-pulse" />
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Macro Overview
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  Evaluates the portfolio against global market conditions, rate expectations, and inflation trends.
                </p>
              </button>

              <button
                onClick={() => handleGenerateReport('risk')}
                disabled={isLoading}
                className="w-full text-left p-3.5 bg-bg-base/60 hover:bg-bg-base border border-outline-variant/35 rounded-xl transition-all hover:border-primary/50 group block"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-warning-amber group-hover:scale-105 transition-transform" />
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Risk & Sector Concentration
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  Reviews diversification, correlations, allocation balance, and volatility exposure.
                </p>
              </button>

              <button
                onClick={() => handleGenerateReport('recommendations')}
                disabled={isLoading}
                className="w-full text-left p-3.5 bg-bg-base/60 hover:bg-bg-base border border-outline-variant/35 rounded-xl transition-all hover:border-primary/50 group block"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-bull-green group-hover:rotate-6 transition-transform" />
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Portfolio Optimization Plan
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  Suggests cash levels, profit-taking areas, tax-aware actions, and rebalancing opportunities.
                </p>
              </button>
            </div>
          </div>

          <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-4 space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase">Backend Analytics</span>
              <select
                value={effectiveSymbol ?? ''}
                onChange={(event) => setSelectedSymbol(event.target.value || null)}
                className="bg-bg-base border border-outline-variant rounded px-2 py-1 text-[11px] text-text-primary font-data-mono focus:outline-none focus:border-primary"
              >
                {availableSymbols.length === 0 ? (
                  <option value="">No symbols</option>
                ) : (
                  availableSymbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-outline-variant/25 bg-bg-base/40 p-3">
                <div className="text-[9px] uppercase text-text-muted font-label-caps">Smart Score</div>
                <div className="mt-1 font-data-mono text-lg font-bold text-primary">
                  {smartReportLoading ? '...' : formatFiniteNumber(smartReport?.overallScore, 0) ? `${formatFiniteNumber(smartReport?.overallScore, 0)} / 100` : '-'}
                </div>
                <div className="mt-1 text-[10px] text-text-secondary">
                  {smartReport?.grade ?? smartReport?.recommendation ?? smartReportError ?? 'Provider data unavailable'}
                </div>
              </div>

              <div className="rounded-lg border border-outline-variant/25 bg-bg-base/40 p-3">
                <div className="text-[9px] uppercase text-text-muted font-label-caps">Backtest Win Rate</div>
                <div className="mt-1 font-data-mono text-lg font-bold text-bull-green">
                  {backtestLoading ? '...' : formatFiniteNumber(backtest?.winRate, 1) ? `${formatFiniteNumber(backtest?.winRate, 1)}%` : '-'}
                </div>
                <div className="mt-1 text-[10px] text-text-secondary">
                  {formatFiniteNumber(backtest?.averageReturnPct, 2) ? `Avg return ${formatFiniteNumber(backtest?.averageReturnPct, 2)}%` : backtestError ?? 'Provider data unavailable'}
                </div>
              </div>
            </div>

            {smartReport?.breakdown && (
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-text-secondary">
                {Object.entries(smartReport.breakdown).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-outline-variant/10 py-1">
                    <span>{key.replace('Score', '')}</span>
                    <span className="font-data-mono font-bold text-text-primary">{formatFiniteNumber(value, 0) ?? '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-4 space-y-2.5 font-sans text-xs">
            <span className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase">Portfolio Ratios for Analysis</span>
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-text-secondary">Total Asset Value:</span>
              <span className="font-data-mono font-bold text-text-primary">${portfolioSummary.totalValue}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-text-secondary">Total Return / P&L:</span>
              <span className={`font-data-mono font-bold ${parseFloat(portfolioSummary.totalReturn) >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                {portfolioSummary.totalReturn}%
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Total Positions:</span>
              <span className="font-data-mono font-bold text-text-primary">{holdings.length}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-6 shadow-lg space-y-4 min-h-[450px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg-card/75 z-20">
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <h4 className="font-headline text-sm font-bold text-text-primary animate-pulse">Generating Institutional Analysis Report</h4>
                <p className="text-xs text-text-muted mt-1 font-sans">
                  Backend analytics are preparing the smart report. Please wait...
                </p>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="p-4 bg-bear-red/10 border border-bear-red/25 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-bear-red shrink-0 mt-0.5" />
              <div className="text-xs text-bear-red font-sans">
                <strong>Report Error:</strong> {errorMessage}
                <button
                  onClick={() => handleGenerateReport(reportType)}
                  className="underline font-bold block mt-2 uppercase"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : reportText ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-bull-green" />
                  <div>
                    <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
                      {reportTitle}
                    </h3>
                    <span className="text-[9px] font-data-mono text-text-muted uppercase">Generated: Today - Source: Backend Smart Report</span>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateReport(reportType)}
                  className="text-xs font-bold text-primary hover:text-text-primary flex items-center gap-1.5 transition-all font-sans"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Again</span>
                </button>
              </div>

              <div className="p-1 max-h-[500px] overflow-y-auto">
                <CustomMarkdownParser text={reportText} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary-container/15 flex items-center justify-center border border-primary/20 text-primary">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h4 className="font-headline text-sm font-bold text-text-primary">Institutional AI Report Ready</h4>
                <p className="text-xs text-text-secondary mt-1.5 font-sans leading-relaxed">
                  Select a report category from the left panel to generate a <strong>Senior Chief Investment Officer (CIO)</strong> level view tailored to your active portfolio ratios.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
