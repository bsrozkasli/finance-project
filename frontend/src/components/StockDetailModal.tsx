import { useMemo, useState } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, RefreshCw, BarChart2, Briefcase } from 'lucide-react';
import type { Stock } from '../types';
import { useAnalystRatings } from '../hooks/useAnalystRatings';

interface StockDetailModalProps {
  stock: Stock | null;
  onClose: () => void;
  onOpenTradeModal: (symbol: string) => void;
}

// Lightweight Markdown to HTML component to guarantee seamless compile without external packages

type AnalystRatingSummary = NonNullable<Stock['analystRating']>;

const priceTargetValue = (priceTarget: { targetMean?: number; targetMedian?: number; targetHigh?: number; targetLow?: number } | null | undefined): number | null => {
  return priceTarget?.targetMean ?? priceTarget?.targetMedian ?? priceTarget?.targetHigh ?? priceTarget?.targetLow ?? null;
};

const buildAnalystRating = (
  recommendations: Array<{ strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }>,
  targetPrice: number | null
): AnalystRatingSummary | null => {
  const latest = recommendations[0];
  if (!latest) return null;

  const buyCount = latest.strongBuy + latest.buy;
  const holdCount = latest.hold;
  const sellCount = latest.sell + latest.strongSell;
  const total = buyCount + holdCount + sellCount;
  if (total <= 0) return null;

  const buyPercent = Math.round((buyCount / total) * 100);
  const holdPercent = Math.round((holdCount / total) * 100);
  const sellPercent = Math.max(0, 100 - buyPercent - holdPercent);
  const consensus: AnalystRatingSummary['consensus'] =
    buyPercent >= 60 ? 'STRONG BUY' :
    buyPercent >= holdPercent && buyPercent >= sellPercent ? 'BUY' :
    sellPercent > buyPercent && sellPercent > holdPercent ? 'SELL' :
    'HOLD';

  return {
    consensus,
    targetPrice: targetPrice ?? 0,
    buyPercent,
    holdPercent,
    sellPercent,
  };
};
function CustomMarkdownParser({ text }: { text: string }) {
  if (!text) return null;

  // Split lines and parse basic tags
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-xs text-text-secondary font-sans leading-relaxed">
      {lines.map((line, i) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Check for Headers
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={i} className="font-headline text-xs font-bold text-primary tracking-wide uppercase mt-4 mb-1 border-b border-outline-variant/20 pb-1">
              {trimmed.replace('###', '').trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={i} className="font-headline text-sm font-bold text-text-primary tracking-tight mt-4 mb-1">
              {trimmed.replace('##', '').trim()}
            </h3>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={i} className="font-headline text-base font-bold text-text-primary tracking-tight mt-4 mb-2">
              {trimmed.replace('#', '').trim()}
            </h2>
          );
        }

        // Check for bullets
        const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*');
        if (isBullet) {
          trimmed = trimmed.substring(1).trim();
        }

        // Format Bold tags (**bold**)
        const parts = trimmed.split('**');
        const formattedLine = parts.map((part, index) => {
          if (index % 2 === 1) {
            return <strong key={index} className="text-text-primary font-bold">{part}</strong>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
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

export default function StockDetailModal({ stock, onClose, onOpenTradeModal }: StockDetailModalProps) {
  const [aiReport, setAiReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'analyst' | 'ai'>('overview');
  const { data: analystData, loading: analystLoading, error: analystError, refetch: refetchAnalystData } = useAnalystRatings(stock?.symbol ?? null);

  const analystTargetPrice = priceTargetValue(analystData?.priceTarget);
  const analystRating = useMemo(
    () => buildAnalystRating(analystData?.recommendations ?? [], analystTargetPrice) ?? stock?.analystRating ?? null,
    [analystData?.recommendations, analystTargetPrice, stock?.analystRating]
  );

  if (!stock) return null;

  const formatNullable = (value: number | null | undefined, digits = 2) => value == null ? '-' : value.toFixed(digits);
  const targetPriceForUpside = analystTargetPrice ?? analystRating?.targetPrice ?? null;
  const analystUpside = targetPriceForUpside == null ? '-' : (((targetPriceForUpside - stock.price) / stock.price) * 100).toFixed(1);

  // Trigger Gemini AI report generation
  const handleGenerateReport = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          stats: {
            pe: stock.pe,
            pb: stock.pb,
            roe: stock.roe,
            revenueGrowth: stock.revenueGrowth,
            divYield: stock.divYield
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generative report generation failed.');
      }
      setAiReport(data.text);
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'AI report could not be generated. Check your API key and provider configuration.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate 52W Position Slider percentage
  const rangeMax = stock.high52W;
  const rangeMin = stock.low52W;
  const rangePercent = Math.min(
    100,
    Math.max(0, ((stock.price - rangeMin) / (rangeMax - rangeMin)) * 100)
  );

  // Generate SVG path for last 60 days of history
  const miniHistory = stock.history.slice(-60);
  const minPrice = Math.min(...miniHistory.map(h => h.price));
  const maxPrice = Math.max(...miniHistory.map(h => h.price));
  const priceDiff = maxPrice - minPrice || 1;

  const chartWidth = 500;
  const chartHeight = 100;

  const points = miniHistory.map((h, i) => {
    const x = (i / (miniHistory.length - 1)) * chartWidth;
    const y = chartHeight - ((h.price - minPrice) / priceDiff) * (chartHeight - 10) - 5;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-bg-primary border border-outline-variant rounded-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header section */}
        <div className="p-5 border-b border-outline-variant flex items-center justify-between shrink-0 bg-bg-card/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center font-bold text-bg-base text-sm">
              {stock.symbol}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="font-headline text-lg font-bold text-text-primary">{stock.name}</h3>
                <span className="font-data-mono text-xs text-text-muted">({stock.symbol})</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {stock.sector} - {stock.industry}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="px-6 py-3 border-b border-outline-variant bg-bg-base flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 font-sans font-bold text-xs rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-bg-base shadow-sm'
                : 'bg-bg-card/50 text-text-secondary border border-outline-variant/30 hover:text-text-primary'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1.5 font-sans font-bold text-xs rounded-lg transition-all ${
              activeTab === 'technical'
                ? 'bg-primary text-bg-base shadow-sm'
                : 'bg-bg-card/50 text-text-secondary border border-outline-variant/30 hover:text-text-primary'
            }`}
          >
            Technical
          </button>
          <button
            onClick={() => setActiveTab('analyst')}
            className={`px-3 py-1.5 font-sans font-bold text-xs rounded-lg transition-all ${
              activeTab === 'analyst'
                ? 'bg-primary text-bg-base shadow-sm'
                : 'bg-bg-card/50 text-text-secondary border border-outline-variant/30 hover:text-text-primary'
            }`}
          >
            Analyst Consensus
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 font-sans font-bold text-xs rounded-lg transition-all ${
              activeTab === 'ai'
                ? 'bg-primary text-bg-base shadow-sm font-semibold flex items-center gap-1'
                : 'bg-bg-card/50 text-text-secondary border border-outline-variant/30 hover:text-text-primary flex items-center gap-1'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gemini AI Analysis
          </button>
        </div>

        {/* Modal body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Main Price Widget with 52W range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-bg-card/25 border border-outline-variant/40 p-4 rounded-xl">
                {/* Price tag */}
                <div>
                  <span className="text-[10px] font-label-caps text-text-muted block uppercase">Current Instrument Value</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-data-mono text-3xl font-bold text-text-primary">
                      ${stock.price.toFixed(2)}
                    </span>
                    <span className={`font-data-mono text-sm font-bold ${stock.change >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                      {stock.change >= 0 ? '+' : ''}
                      {stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* 52-Week Range Slider Widget */}
                <div className="md:col-span-2">
                  <div className="flex justify-between text-[10px] font-label-caps text-text-secondary mb-1">
                    <span>52W LOW: ${stock.low52W.toFixed(2)}</span>
                    <span className="text-primary font-bold">52W SPREAD</span>
                    <span>52W HIGH: ${stock.high52W.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-bg-base border border-outline-variant rounded-full relative">
                    {/* Pointer marker */}
                    <div
                      className="absolute w-3 h-3 bg-primary rounded-full -top-0.5 border border-bg-primary shadow-lg"
                      style={{ left: `${rangePercent}%`, transform: 'translateX(-50%)' }}
                    />
                  </div>
                  <div className="text-right text-[9px] text-text-muted font-data-mono mt-1">
                    Current level: {rangePercent.toFixed(0)}% of yearly range</div>
                </div>
              </div>

              {/* Price Trend Custom Area Chart (60 days) */}
              <div className="bg-bg-card border border-outline-variant/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <span className="text-[10px] font-label-caps text-text-muted uppercase">60-Day Price Trend</span>
                  <span className="text-[10px] font-data-mono text-text-muted">
                    Min: ${minPrice.toFixed(2)} - Max: ${maxPrice.toFixed(2)}
                  </span>
                </div>
                <div className="h-28 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="modalChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary, #00ffff)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--color-primary, #00ffff)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path d={areaPath} fill="url(#modalChartGrad)" />
                    {/* Trend Line */}
                    <path d={linePath} fill="none" stroke="var(--color-primary, #00ffff)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Ratios Metrics Grid */}
              <div>
                <h4 className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-1.5 mb-3">
                  Financial Ratios
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">P/E RATIO</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{formatNullable(stock.pe)}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">P/B RATIO</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{formatNullable(stock.pb)}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">DEBT / EQUITY</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{formatNullable(stock.debtEquity)}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">ROE EFFICIENCY</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{stock.roe == null ? '-' : `%${stock.roe.toFixed(1)}`}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">GROWTH % (YOY)</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{stock.revenueGrowth == null ? '-' : `%${stock.revenueGrowth.toFixed(1)}`}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">DIVIDEND YIELD</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{stock.divYield == null ? '-' : `%${stock.divYield.toFixed(2)}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TECHNICAL ANALYSIS */}
          {activeTab === 'technical' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-bg-card border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <h4 className="text-[11px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Technical Analysis Indicators</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Gauge indicator */}
                  <div className="bg-bg-base/40 border border-outline-variant/20 rounded-lg p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-label-caps text-text-muted mb-2">OVERALL SIGNAL</span>
                    <span className="px-3 py-1 bg-bull-green/10 text-bull-green font-bold text-sm rounded-full tracking-wide">
                      No data
                    </span>
                    <p className="text-[11px] text-text-secondary mt-3 leading-relaxed">
                      No directional forecast is shown when the technical signal provider has no data.
                    </p>
                  </div>

                  {/* Indicators Details */}
                  <div className="md:col-span-2 space-y-3 font-sans text-xs">
                    <div className="flex justify-between py-2 border-b border-outline-variant/20 items-center">
                      <span className="text-text-secondary font-medium">RSI Indicator (14-day):</span>
                      <span className="font-data-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                        {stock.technicals ? `${stock.technicals.rsi} - ${stock.technicals.rsiStatus}` : 'No data'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-outline-variant/20 items-center">
                      <span className="text-text-secondary font-medium">MACD Sinyali (12, 26, 9):</span>
                      <span className="font-data-mono font-bold text-bull-green bg-bull-green/5 px-2 py-0.5 rounded">
                        {stock.technicals ? `${stock.technicals.macd} - ${stock.technicals.macdStatus}` : 'No data'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 items-center">
                      <span className="text-text-secondary font-medium">SMA 50-Day Support Level:</span>
                      <span className="font-data-mono font-bold text-text-primary">
                        {stock.technicals ? `$${stock.technicals.sma50.toFixed(2)} (${stock.technicals.sma50Status})` : 'No data'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Educational Box */}
                <div className="p-4 bg-primary-container/5 border border-primary/10 rounded-lg text-xs text-text-secondary leading-relaxed">
                  <strong>Technical Analysis Note:</strong> RSI below 30 is commonly interpreted as oversold, while RSI above 70 is commonly interpreted as overbought. MACD is a lagging indicator used to confirm trend direction.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANALYST RATINGS */}
          {activeTab === 'analyst' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-bg-card border border-outline-variant/30 rounded-xl p-6 space-y-5">
                <h4 className="text-[11px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span>Consensus Analyst Recommendation</span>
                </h4>

                                {analystLoading && (
                  <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3 text-xs text-text-secondary">
                    Loading analyst data...
                  </div>
                )}

                {analystError && (
                  <div className="rounded-lg border border-bear-red/30 bg-bear-red/10 p-3 text-xs text-bear-red flex items-center justify-between gap-3">
                    <span>Analyst data could not be loaded. The provider response is empty or temporarily unavailable.</span>
                    <button type="button" onClick={() => void refetchAnalystData()} className="font-bold underline">
                      Try again
                    </button>
                  </div>
                )}

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-text-secondary">Consensus 12-Month Target Price:</span>
                      <span className="font-data-mono text-2xl font-bold text-primary">{targetPriceForUpside == null ? '-' : `$${targetPriceForUpside.toFixed(2)}`}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      The provider target price shows <strong>%{analystUpside}</strong> upside/downside versus the current price. This section stays empty when analyst data is unavailable.
                    </p>
                  </div>

                  {/* Sentiment Bar */}
                  <div className="space-y-3 bg-bg-base/40 p-4 rounded-xl border border-outline-variant/20">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-bull-green font-bold">BUY / OVERWEIGHT:</span>
                      <span className="font-data-mono text-bull-green font-bold">{analystRating?.buyPercent ?? '-'}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-warning-amber font-bold">HOLD:</span>
                      <span className="font-data-mono text-warning-amber font-bold">{analystRating?.holdPercent ?? '-'}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-bear-red font-bold">SELL:</span>
                      <span className="font-data-mono text-bear-red font-bold">{analystRating?.sellPercent ?? '-'}%</span>
                    </div>

                    <div className="w-full h-2.5 bg-bg-base rounded-full overflow-hidden flex mt-2">
                      <div className="bg-bull-green h-full" style={{ width: `${analystRating?.buyPercent ?? '-'}%` }} />
                      <div className="bg-warning-amber h-full" style={{ width: `${analystRating?.holdPercent ?? '-'}%` }} />
                      <div className="bg-bear-red h-full" style={{ width: `${analystRating?.sellPercent ?? '-'}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI REPORTS */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-bg-card border border-primary/25 rounded-xl p-5 space-y-4 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 bg-radial-gradient from-primary to-transparent pointer-events-none" />

                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2 z-10 relative">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <h4 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
                      Gemini AI Professional Investment Report</h4>
                  </div>

                  {!aiReport && !isLoading && (
                    <button
                      onClick={handleGenerateReport}
                      className="bg-primary hover:bg-primary-container text-bg-base font-sans font-bold text-[10px] px-3 py-1.5 rounded border border-primary/20 shadow-md transition-all uppercase"
                    >
                      Generate Analysis</button>
                  )}
                </div>

                {/* Analysis report placeholder, loading, error, or content */}
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <p className="font-sans text-xs text-text-secondary animate-pulse">
                      Gemini 3.5 Flash is analyzing current financial data. Please wait.....
                    </p>
                  </div>
                ) : errorMessage ? (
                  <div className="p-3 bg-bear-red/10 border border-bear-red/25 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-bear-red shrink-0 mt-0.5" />
                    <div className="text-xs text-bear-red font-sans">
                      <strong>Connection Error:</strong> {errorMessage}
                      <button
                        onClick={handleGenerateReport}
                        className="underline block mt-1 font-bold text-[10px] uppercase"
                      >
                        Yeniden Dene
                      </button>
                    </div>
                  </div>
                ) : aiReport ? (
                  <div className="bg-bg-base/40 border border-outline-variant/20 p-4 rounded-xl prose max-w-none">
                    <CustomMarkdownParser text={aiReport} />

                    <div className="mt-4 pt-3 border-t border-outline-variant/20 flex justify-between items-center text-[9px] text-text-muted font-data-mono">
                      <span>MODEL: GEMINI-3.5-FLASH</span>
                      <button
                        onClick={handleGenerateReport}
                        className="text-primary hover:underline flex items-center gap-1 font-bold"
                      >
                        <RefreshCw className="w-3 h-3" /> REGENERATE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-text-secondary font-sans leading-relaxed">
                    The provider target price shows <strong>%{analystUpside}</strong> upside/downside versus the current price. This section stays empty when analyst data is unavailable.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal CTA footer actions */}
        <div className="p-5 border-t border-outline-variant bg-bg-card/40 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant hover:border-text-secondary rounded-lg font-sans text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
          >
            Close Window
          </button>
          <button
            onClick={() => {
              onOpenTradeModal(stock.symbol);
              onClose();
            }}
            className="px-5 py-2 bg-primary hover:bg-primary-container text-bg-base font-sans font-bold text-xs rounded-lg shadow-md shadow-primary/10 transition-all flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" />
            <span>Open Trade Ticket</span>
          </button>
        </div>

      </div>
    </div>
  );
}
