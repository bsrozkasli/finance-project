import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, RefreshCw, BarChart2, Briefcase } from 'lucide-react';
import type { Stock } from '../types';
import { useAnalystRatings } from '../hooks/useAnalystRatings';
import { useSmartReport } from '../hooks/useSmartReport';
import { useTechnicalAnalysis } from '../hooks/useTechnicalAnalysis';
import { useTechnicalWorkspace } from '../hooks/useTechnicalWorkspace';
import { fetchTechnicalCopilot, type TechnicalCopilotResponse } from '../api/client';
import { useWatchlistResearch } from '../hooks/useWatchlistResearch';
import { useAssetResearchDetail } from '../hooks/useAssetResearchDetail';
import AssetDetailChart from './AssetDetailChart';
import CompanyLogo from './CompanyLogo';
import SmartReportStatusPanel from './SmartReportStatusPanel';
import SmartReportEvidenceNote from './SmartReportEvidenceNote';

interface StockDetailModalProps {
  stock: Stock | null;
  symbol?: string | null;
  name?: string | null;
  onClose: () => void;
  onOpenTradeModal: (symbol: string) => void;
  position?: { quantity: number; costPrice: number } | null;
}

// Lightweight Markdown to HTML component to guarantee seamless compile without external packages

type AnalystRatingSummary = NonNullable<Stock['analystRating']>;

const SCORE_LABELS: Record<string, string> = {
  fundamental: 'Temel',
  valuation: 'Değerleme',
  quality: 'Kalite',
  growth: 'Büyüme',
  momentum: 'Momentum',
  risk: 'Risk',
  earnings: 'Kazanç',
  sentiment: 'Duyarlılık',
};

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
    targetPrice,
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

export default function StockDetailModal({ stock, symbol, name, onClose, onOpenTradeModal, position = null }: StockDetailModalProps) {
  const [aiReport, setAiReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'analyst' | 'ai'>('overview');
  const [copilotPrompt, setCopilotPrompt] = useState('Mevcut trendi ve en güçlü destek/direnç seviyelerini açıkla.');
  const [copilotResponse, setCopilotResponse] = useState<TechnicalCopilotResponse | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const effectiveSymbol = stock?.symbol ?? symbol ?? null;
  const { data: analystData, loading: analystLoading, error: analystError, refetch: refetchAnalystData } = useAnalystRatings(effectiveSymbol);
  const { report: smartReport, loading: smartReportLoading, error: smartReportError } = useSmartReport(effectiveSymbol);
  const { data: technicalData, loading: technicalLoading, error: technicalError } = useTechnicalAnalysis(effectiveSymbol, '1d', '6mo');
  const { data: technicalWorkspace, loading: workspaceLoading, error: workspaceError } = useTechnicalWorkspace(effectiveSymbol, '1d', '1y');
  const { data: researchData } = useWatchlistResearch(effectiveSymbol);
  const { data: assetDetail, loading: assetDetailLoading, error: assetDetailError } = useAssetResearchDetail(effectiveSymbol);

  const analystTargetPrice = priceTargetValue(analystData?.priceTarget);
  const analystRating = useMemo(
    () => buildAnalystRating(analystData?.recommendations ?? [], analystTargetPrice) ?? stock?.analystRating ?? null,
    [analystData?.recommendations, analystTargetPrice, stock?.analystRating]
  );
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!effectiveSymbol) return null;

  const formatNullable = (value: number | null | undefined, digits = 2) => value == null ? '—' : value.toFixed(digits);
  const formatMoney = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : `$${value.toFixed(2)}`;
  const formatQuoteTimestamp = (value: string | null | undefined) => {
    if (!value) return 'Zaman bilgisi yok';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Zaman bilgisi yok' : date.toLocaleString('tr-TR');
  };
  const historyFromResearch = researchData.oneYear.map((point) => ({
    date: point.timestamp.slice(0, 10),
    price: point.close,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
  }));
  const displayHistory = stock?.history?.length ? stock.history : historyFromResearch;
  const latestHistoryPoint = displayHistory.at(-1);
  const profile = assetDetail?.profile.data;
  const quote = assetDetail?.market.data;
  const currentPrice = stock?.price ?? quote?.regularPrice ?? latestHistoryPoint?.price ?? null;
  // A missing provider price target stays null; a zero target is never real.
  const ratingTargetPrice = analystRating?.targetPrice != null && analystRating.targetPrice > 0 ? analystRating.targetPrice : null;
  const targetPriceForUpside = analystTargetPrice ?? ratingTargetPrice;
  const analystUpside = targetPriceForUpside == null || currentPrice == null || currentPrice === 0 ? null : (((targetPriceForUpside - currentPrice) / currentPrice) * 100).toFixed(1);
  const analystUpsideText = analystUpside == null ? '—' : `${analystUpside}%`;
  const displayName = profile?.name ?? stock?.name ?? name ?? effectiveSymbol;
  const displaySector = profile?.sector ?? stock?.sector ?? 'Tür bilinmiyor';
  const displayIndustry = (profile?.industry ?? stock?.industry) || 'Endüstri bilgisi yok';
  const marketChangePercent = stock?.changePercent ?? (quote?.regularChangePercent == null ? null : quote.regularChangePercent * 100);
  const ratios = researchData.ratios;
  const fundamentals = researchData.fundamentals;
  const peRatio = ratios?.pe ?? stock?.pe ?? null;
  const pbRatio = ratios?.pb ?? stock?.pb ?? null;
  const debtEquity = ratios?.debtEquity ?? stock?.debtEquity ?? null;
  const roe = ratios?.roe ?? fundamentals?.roe ?? stock?.roe ?? null;
  const revenueGrowth = stock?.revenueGrowth ?? null;
  const dividendYield = fundamentals?.dividendYield ?? stock?.divYield ?? null;
  const rsiDisplay = technicalData?.rsi != null
    ? technicalData.rsi.toFixed(1)
    : stock?.technicals ? `${stock.technicals.rsi} - ${stock.technicals.rsiStatus}` : 'Veri yok';
  const macdDisplay = technicalData?.macd != null
    ? `${technicalData.macd.toFixed(2)}${technicalData.macdSignal != null ? ` / ${technicalData.macdSignal.toFixed(2)}` : ''}`
    : stock?.technicals ? `${stock.technicals.macd} - ${stock.technicals.macdStatus}` : 'Veri yok';
  const sma50Value = technicalData?.sma50 ?? stock?.technicals?.sma50 ?? null;

  const buildSmartReportText = () => {
    if (!smartReport) {
      return smartReportError || 'Veri yok: bu sembol için akıllı rapor bulunamadı.';
    }

    const breakdown = smartReport.breakdown
      ? Object.entries(smartReport.breakdown)
          .map(([key, value]) => {
            const name = key.replace('Score', '');
            return `- **${SCORE_LABELS[name] ?? name}:** ${value == null ? 'Veri yok' : `${value.toFixed(0)} / 100`}`;
          })
          .join('\n')
      : '- Veri yok: puan dağılımı bulunamadı.';
    const targetPriceText = targetPriceForUpside == null ? 'Veri yok' : '$' + targetPriceForUpside.toFixed(2);

    const overallScore = smartReport.overallScore == null ? 'Veri yok' : `${smartReport.overallScore.toFixed(0)} / 100`;
    return `# Akıllı yatırım raporu: ${smartReport.symbol}\n\n## Özet\n- **Genel puan:** ${overallScore}\n- **Not:** ${smartReport.grade ?? 'Veri yok'}\n- **Öneri:** ${smartReport.recommendation ?? 'Veri yok'}\n\n## Puan dağılımı\n${breakdown}\n\n## Analist bağlamı\n- **Konsensüs:** ${analystRating?.consensus ?? 'Veri yok'}\n- **Hedef fiyat:** ${targetPriceText}\n- **Potansiyel:** ${analystUpsideText}\n\nBu rapor backend sağlayıcı verilerinden üretilir. Eksik sağlayıcı alanları uydurulmaz; "Veri yok" olarak kalır.`;
  };

  const handleTechnicalCopilot = async () => {
    setCopilotLoading(true);
    try { setCopilotResponse(await fetchTechnicalCopilot(effectiveSymbol, copilotPrompt, '1d', '1y')); }
    catch (reason) { setCopilotResponse({ symbol: effectiveSymbol, answer: reason instanceof Error ? reason.message : 'Teknik asistan yüklenemedi', overlays: [], caveats: ['Yapay zekâ sağlayıcısı kullanılamıyor.'], generatedAt: new Date().toISOString() }); }
    finally { setCopilotLoading(false); }
  };
  const handleGenerateReport = () => {
    setIsLoading(false);
    setErrorMessage('');

    if (smartReportLoading) {
      setErrorMessage('Akıllı rapor hâlâ yükleniyor. Birazdan yeniden deneyin.');
      return;
    }

    const text = buildSmartReportText();
    if (!smartReport) {
      setErrorMessage(text);
      return;
    }
    setAiReport(text);
  };

  // Calculate 52W Position Slider percentage  // Calculate 52W Position Slider percentage
  const rangeMax = stock?.high52W ?? (displayHistory.length ? Math.max(...displayHistory.map((point) => point.high ?? point.price)) : null);
  const rangeMin = stock?.low52W ?? (displayHistory.length ? Math.min(...displayHistory.map((point) => point.low ?? point.price)) : null);
  const rangePercent = currentPrice == null || rangeMin == null || rangeMax == null || rangeMax === rangeMin
    ? null
    : Math.min(100, Math.max(0, ((currentPrice - rangeMin) / (rangeMax - rangeMin)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName} (${effectiveSymbol})`}
        className="bg-bg-primary border border-outline-variant rounded-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col shadow-2xl"
      >

        {/* Header section */}
        <div className="p-5 border-b border-outline-variant flex items-center justify-between shrink-0 bg-bg-card/40">
          <div className="flex items-center gap-3">
            <CompanyLogo symbol={effectiveSymbol} logoUrl={profile?.logoUrl ?? stock?.logoUrl} className="h-10 w-10" />            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="font-headline text-lg font-bold text-text-primary">{displayName}</h3>
                <span className="font-data-mono text-xs text-text-muted">({effectiveSymbol})</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {displaySector} - {displayIndustry}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
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
            Genel bakış
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1.5 font-sans font-bold text-xs rounded-lg transition-all ${
              activeTab === 'technical'
                ? 'bg-primary text-bg-base shadow-sm'
                : 'bg-bg-card/50 text-text-secondary border border-outline-variant/30 hover:text-text-primary'
            }`}
          >
            Teknik
          </button>
          <button
            onClick={() => setActiveTab('analyst')}
            className={`px-3 py-1.5 font-sans font-bold text-xs rounded-lg transition-all ${
              activeTab === 'analyst'
                ? 'bg-primary text-bg-base shadow-sm'
                : 'bg-bg-card/50 text-text-secondary border border-outline-variant/30 hover:text-text-primary'
            }`}
          >
            Analist görüşü
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
            Akıllı rapor
          </button>
        </div>

        {/* Modal body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="border border-outline-variant/30 bg-bg-card p-3 rounded-lg">
                  <div className="text-[9px] font-label-caps uppercase text-text-muted">Piyasa oturumu</div>
                  <div className="mt-1 font-data-mono text-sm font-bold text-text-primary">{quote?.marketState ?? 'Bilinmiyor'}</div>
                  <div className="mt-1 text-[10px] text-text-muted">{quote?.delayed ? 'Sağlayıcı fiyatı gecikmeli' : quote ? formatQuoteTimestamp(quote.regularTimestamp) : assetDetailLoading ? 'Fiyat yükleniyor' : assetDetailError ?? assetDetail?.market.message ?? 'Veri yok: fiyat bulunamadı'}</div>
                </div>
                <div className="border border-outline-variant/30 bg-bg-card p-3 rounded-lg">
                  <div className="text-[9px] font-label-caps uppercase text-text-muted">Piyasa öncesi</div>
                  <div className="mt-1 font-data-mono text-sm font-bold text-text-primary">{formatMoney(quote?.preMarketPrice)}</div>
                  <div className="mt-1 text-[10px] text-text-muted">{quote?.preMarketChangePercent == null ? '—' : `${(quote.preMarketChangePercent * 100).toFixed(2)}%`}</div>
                </div>
                <div className="border border-outline-variant/30 bg-bg-card p-3 rounded-lg">
                  <div className="text-[9px] font-label-caps uppercase text-text-muted">Piyasa sonrası</div>
                  <div className="mt-1 font-data-mono text-sm font-bold text-text-primary">{formatMoney(quote?.postMarketPrice)}</div>
                  <div className="mt-1 text-[10px] text-text-muted">{quote?.postMarketChangePercent == null ? '—' : `${(quote.postMarketChangePercent * 100).toFixed(2)}%`}</div>
                </div>
              </div>

              {profile?.description ? <p className="text-sm leading-relaxed text-text-secondary">{profile.description}</p> : null}
              {profile?.website ? <a className="text-xs text-primary hover:underline" href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a> : null}
              <div className="border border-outline-variant/30 bg-bg-card p-3 rounded-lg text-xs text-text-secondary">
                <span className="font-label-caps uppercase text-[9px] text-text-muted">Portföy pozisyonu</span>
                <span className="ml-2 font-data-mono font-bold text-text-primary">{position ? `${position.quantity} adet, maliyet ${formatMoney(position.costPrice)}` : 'Aktif portföyde yok'}</span>
              </div>
              {/* Main Price Widget with 52W range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-bg-card/25 border border-outline-variant/40 p-4 rounded-xl">
                {/* Price tag */}
                <div>
                  <span className="text-[10px] font-label-caps text-text-muted block uppercase">Güncel değer</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-data-mono text-3xl font-bold text-text-primary">
                      {formatMoney(currentPrice)}
                    </span>
                    <span className={`font-data-mono text-sm font-bold ${marketChangePercent == null ? 'text-text-muted' : marketChangePercent >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                      {marketChangePercent != null ? `${marketChangePercent >= 0 ? '+' : ''}${marketChangePercent.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* 52-Week Range Slider Widget */}
                <div className="md:col-span-2">
                  <div className="flex justify-between text-[10px] font-label-caps text-text-secondary mb-1">
                    <span>52 hafta en düşük: {formatMoney(rangeMin)}</span>
                    <span className="text-primary font-bold">52 haftalık aralık</span>
                    <span>52 hafta en yüksek: {formatMoney(rangeMax)}</span>
                  </div>
                  <div className="w-full h-2 bg-bg-base border border-outline-variant rounded-full relative">
                    {/* Pointer marker */}
                    {rangePercent != null ? (
                      <div
                        className="absolute w-3 h-3 bg-primary rounded-full -top-0.5 border border-bg-primary shadow-lg"
                        style={{ left: `${rangePercent}%`, transform: 'translateX(-50%)' }}
                      />
                    ) : null}
                  </div>
                  <div className="text-right text-[9px] text-text-muted font-data-mono mt-1">
                    Yıllık aralıktaki konum: {rangePercent == null ? '—' : `${rangePercent.toFixed(0)}%`}</div>
                </div>
              </div>

              <AssetDetailChart bars={researchData.oneYear} symbol={effectiveSymbol} />
              {/* Ratios Metrics Grid */}
              <div>
                <h4 className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase border-b border-outline-variant/30 pb-1.5 mb-3">
                  Finansal oranlar
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">F/K</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{formatNullable(peRatio)}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">PD/DD</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{formatNullable(pbRatio)}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">BORÇ / ÖZSERMAYE</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{formatNullable(debtEquity)}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">ÖZSERMAYE KÂRLILIĞI</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{roe == null ? '—' : `${roe.toFixed(1)}%`}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">GELİR BÜYÜMESİ (YILLIK)</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{revenueGrowth == null ? '—' : `${revenueGrowth.toFixed(1)}%`}</span>
                  </div>
                  <div className="bg-bg-card border border-outline-variant/35 p-3 rounded-lg text-center">
                    <span className="text-[9px] font-label-caps text-text-muted block">TEMETTÜ VERİMİ</span>
                    <span className="font-data-mono text-sm font-bold text-text-primary mt-1 block">{dividendYield == null ? '—' : `${dividendYield.toFixed(2)}%`}</span>
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
                  <span>Teknik göstergeler</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Gauge indicator */}
                  <div className="bg-bg-base/40 border border-outline-variant/20 rounded-lg p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-label-caps text-text-muted mb-2">GENEL SİNYAL</span>
                    <span className="px-3 py-1 bg-bull-green/10 text-bull-green font-bold text-sm rounded-full tracking-wide">
                      {technicalLoading ? 'Yükleniyor…' : technicalData?.signalAction ?? 'Veri yok'}
                    </span>
                    <p className="text-[11px] text-text-secondary mt-3 leading-relaxed">
                      {technicalData?.signalConfidence == null ? 'Teknik sinyal sağlayıcısında veri yoksa yön tahmini gösterilmez.' : `Sinyal güveni: ${(technicalData.signalConfidence * 100).toFixed(0)}%.`}
                    </p>
                  </div>

                  {/* Indicators Details */}
                  <div className="md:col-span-2 space-y-3 font-sans text-xs">
                    <div className="flex justify-between py-2 border-b border-outline-variant/20 items-center">
                      <span className="text-text-secondary font-medium">RSI (14 gün):</span>
                      <span className="font-data-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                        {technicalLoading ? 'Yükleniyor…' : technicalError ? 'Yüklenemedi' : rsiDisplay}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-outline-variant/20 items-center">
                      <span className="text-text-secondary font-medium">MACD sinyali (12, 26, 9):</span>
                      <span className="font-data-mono font-bold text-bull-green bg-bull-green/5 px-2 py-0.5 rounded">
                        {technicalLoading ? 'Yükleniyor…' : technicalError ? 'Yüklenemedi' : macdDisplay}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 items-center">
                      <span className="text-text-secondary font-medium">SMA (50 gün):</span>
                      <span className="font-data-mono font-bold text-text-primary">
                        {technicalLoading ? 'Yükleniyor…' : sma50Value == null ? 'Veri yok' : formatMoney(sma50Value)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-base/40 border border-outline-variant/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-label-caps text-text-muted uppercase">Hesaplanan destek / direnç</span>
                    <span className="text-[10px] text-text-muted">{workspaceLoading ? 'Yükleniyor' : workspaceError ? 'Yüklenemedi' : `${technicalWorkspace ? technicalWorkspace.candles.length : '—'} mum`}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(technicalWorkspace?.levels ?? []).map((level) => (
                      <div key={`${level.kind}-${level.price}`} className="flex items-center justify-between border border-outline-variant/20 px-3 py-2 rounded">
                        <span className={`text-[10px] font-bold ${level.kind === 'SUPPORT' ? 'text-bull-green' : 'text-bear-red'}`}>{level.kind === 'SUPPORT' ? 'Destek' : 'Direnç'}</span>
                        <span className="font-data-mono text-xs text-text-primary">{formatMoney(level.price)}</span>
                        <span className="text-[9px] text-text-muted">{level.touches} temas</span>
                      </div>
                    ))}
                  </div>
                  {!workspaceLoading && !workspaceError && (technicalWorkspace?.levels.length ?? 0) === 0 ? <p className="text-[10px] text-text-muted">Veri yok: bu aralık için seviye hesaplanmadı.</p> : null}
                </div>
                <div className="bg-bg-card border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary"><Sparkles className="w-4 h-4" /> Teknik asistan</div>
                  <textarea aria-label="Teknik asistana soru" value={copilotPrompt} onChange={(event) => setCopilotPrompt(event.target.value)} className="w-full min-h-20 bg-bg-base border border-outline-variant/40 rounded p-2 text-xs text-text-primary" />
                  <button type="button" onClick={() => void handleTechnicalCopilot()} disabled={copilotLoading || !copilotPrompt.trim()} className="px-3 py-2 bg-primary text-bg-base rounded text-xs font-bold disabled:opacity-50">{copilotLoading ? 'Analiz ediliyor…' : 'Grafiği analiz et'}</button>
                  {copilotResponse ? <div className="space-y-2 text-xs text-text-secondary"><p>{copilotResponse.answer}</p>{copilotResponse.overlays.length ? <div className="flex flex-wrap gap-2">{copilotResponse.overlays.map((overlay) => <span key={`${overlay.kind}-${overlay.price}`} className="border border-primary/30 px-2 py-1 rounded font-data-mono">{overlay.label}{overlay.price == null ? '' : ` ${formatMoney(overlay.price)}`}</span>)}</div> : null}{copilotResponse.caveats.map((caveat) => <p key={caveat} className="text-[10px] text-warning-amber">{caveat}</p>)}</div> : null}
                </div>
                {/* Educational Box */}
                <div className="p-4 bg-primary-container/5 border border-primary/10 rounded-lg text-xs text-text-secondary leading-relaxed">
                  <strong>Teknik analiz notu:</strong> RSI 30’un altında genellikle aşırı satım, 70’in üstünde aşırı alım olarak yorumlanır. MACD, trend yönünü doğrulamak için kullanılan gecikmeli bir göstergedir.
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
                  <span>Analist konsensüsü</span>
                </h4>

                                {analystLoading && (
                  <div className="rounded-lg border border-outline-variant/30 bg-bg-base/40 p-3 text-xs text-text-secondary">
                    Analist verisi yükleniyor…
                  </div>
                )}

                {analystError && (
                  <div className="rounded-lg border border-bear-red/30 bg-bear-red/10 p-3 text-xs text-bear-red flex items-center justify-between gap-3">
                    <span>Analist verisi yüklenemedi. Sağlayıcı yanıtı boş ya da geçici olarak kullanılamıyor.</span>
                    <button type="button" onClick={() => void refetchAnalystData()} className="font-bold underline">
                      Yeniden dene
                    </button>
                  </div>
                )}

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-text-secondary">12 aylık konsensüs hedef fiyat:</span>
                      <span className="font-data-mono text-2xl font-bold text-primary">{targetPriceForUpside == null ? '—' : `$${targetPriceForUpside.toFixed(2)}`}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Sağlayıcı hedef fiyatı, güncel fiyata göre <strong>{analystUpsideText}</strong> potansiyel gösteriyor. Analist verisi yoksa bu bölüm boş kalır.
                    </p>
                  </div>

                  {/* Sentiment Bar */}
                  <div className="space-y-3 bg-bg-base/40 p-4 rounded-xl border border-outline-variant/20">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-bull-green font-bold">AL / AĞIRLIK ARTIR:</span>
                      <span className="font-data-mono text-bull-green font-bold">{analystRating ? `${analystRating.buyPercent}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-warning-amber font-bold">TUT:</span>
                      <span className="font-data-mono text-warning-amber font-bold">{analystRating ? `${analystRating.holdPercent}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-sans">
                      <span className="text-bear-red font-bold">SAT:</span>
                      <span className="font-data-mono text-bear-red font-bold">{analystRating ? `${analystRating.sellPercent}%` : '—'}</span>
                    </div>

                    {analystRating ? (
                    <div className="w-full h-2.5 bg-bg-base rounded-full overflow-hidden flex mt-2">
                      <div className="bg-bull-green h-full" style={{ width: `${analystRating.buyPercent}%` }} />
                      <div className="bg-warning-amber h-full" style={{ width: `${analystRating.holdPercent}%` }} />
                      <div className="bg-bear-red h-full" style={{ width: `${analystRating.sellPercent}%` }} />
                    </div>
                    ) : null}
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
                      Akıllı yatırım raporu</h4>
                  </div>

                  {!aiReport && !isLoading && (
                    <button
                      onClick={handleGenerateReport}
                      className="bg-primary hover:bg-primary-container text-bg-base font-sans font-bold text-[10px] px-3 py-1.5 rounded border border-primary/20 shadow-md transition-all uppercase"
                    >
                      Analizi oluştur</button>
                  )}
                </div>

                {/* Analysis report placeholder, loading, error, or content */}
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <p className="font-sans text-xs text-text-secondary animate-pulse">
                      Akıllı rapor güncel sağlayıcı verisiyle yükleniyor. Lütfen bekleyin…
                    </p>
                  </div>
                ) : errorMessage ? (
                  <div className="p-3 bg-bear-red/10 border border-bear-red/25 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-bear-red shrink-0 mt-0.5" />
                    <div className="text-xs text-bear-red font-sans">
                      <strong>Rapor oluşturulamadı:</strong> {errorMessage}
                      <button
                        onClick={handleGenerateReport}
                        className="underline block mt-1 font-bold text-[10px] uppercase"
                      >
                        Yeniden dene
                      </button>
                    </div>
                  </div>
                ) : aiReport ? (
                  <div className="bg-bg-base/40 border border-outline-variant/20 p-4 rounded-xl prose max-w-none">
                    {smartReport ? <SmartReportEvidenceNote sectionStatus={smartReport.sectionStatus} /> : null}
                    <CustomMarkdownParser text={aiReport} />
                    {smartReport ? <SmartReportStatusPanel breakdown={smartReport.breakdown} sectionStatus={smartReport.sectionStatus} /> : null}

                    <div className="mt-4 pt-3 border-t border-outline-variant/20 flex justify-between items-center text-[9px] text-text-muted font-data-mono">
                      <span>KAYNAK: BACKEND AKILLI RAPOR</span>
                      <button
                        onClick={handleGenerateReport}
                        className="text-primary hover:underline flex items-center gap-1 font-bold"
                      >
                        <RefreshCw className="w-3 h-3" /> YENİDEN OLUŞTUR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-text-secondary font-sans leading-relaxed">
                    Puanları, analist bağlamını ve eksik alanları gösteren rapor için “Analizi oluştur” düğmesine basın.
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
            Pencereyi kapat
          </button>
          <button
            onClick={() => {
              onOpenTradeModal(effectiveSymbol);
              onClose();
            }}
            className="px-5 py-2 bg-primary hover:bg-primary-container text-bg-base font-sans font-bold text-xs rounded-lg shadow-md shadow-primary/10 transition-all flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" />
            <span>İşlem kaydı ekle</span>
          </button>
        </div>

      </div>
    </div>
  );
}
