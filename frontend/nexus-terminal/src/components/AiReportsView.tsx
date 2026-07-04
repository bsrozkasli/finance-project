import React, { useState } from 'react';
import { Sparkles, ShieldAlert, TrendingUp, AlertTriangle, RefreshCw, Layers, CheckCircle, HelpCircle, FileText } from 'lucide-react';
import { Holding, Stock } from '../types';

interface AiReportsViewProps {
  holdings: Holding[];
  stocks: Stock[];
}

export default function AiReportsView({ holdings, stocks }: AiReportsViewProps) {
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState<'macro' | 'risk' | 'recommendations'>('macro');
  const [errorMessage, setErrorMessage] = useState('');

  // Map stocks by symbol for valuation
  const stockMap = React.useMemo(() => {
    const map: Record<string, Stock> = {};
    stocks.forEach((s) => {
      map[s.symbol] = s;
    });
    return map;
  }, [stocks]);

  // Total Portfolio Metrics payload
  const portfolioSummary = React.useMemo(() => {
    let currentTotalValue = 0;
    let totalCostBasis = 0;

    const formattedHoldings = holdings.map((h) => {
      const stock = stockMap[h.symbol];
      const currentPrice = stock ? stock.price : h.costPrice;
      const value = h.quantity * currentPrice;
      const cost = h.quantity * h.costPrice;
      
      currentTotalValue += value;
      totalCostBasis += cost;

      return {
        symbol: h.symbol,
        quantity: h.quantity,
        costPrice: h.costPrice,
        currentPrice,
        value,
      };
    });

    const totalProfitLoss = currentTotalValue - totalCostBasis;
    const totalReturnPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

    return {
      totalValue: currentTotalValue.toFixed(2),
      totalReturn: totalReturnPercent.toFixed(2),
      formattedHoldings,
    };
  }, [holdings, stockMap]);

  const handleGenerateReport = async (type: 'macro' | 'risk' | 'recommendations') => {
    setReportType(type);
    setIsLoading(true);
    setErrorMessage('');
    setReportText('');

    try {
      const response = await fetch('/api/gemini/portfolio-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: portfolioSummary.formattedHoldings,
          totalValue: portfolioSummary.totalValue,
          totalReturn: portfolioSummary.totalReturn,
          reportType: type,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generative report failed.');
      }
      setReportText(data.text);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'AI Raporu oluşturulamadı. Lütfen API anahtarınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Lightweight custom markdown parser to guarantee compiler consistency
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

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      {/* View Header */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
          AI Analiz Raporları (AI Portfolio Reports)
        </h2>
        <p className="text-sm text-text-secondary">
          Portföy bileşenlerinizi, maliyet oranlarınızı ve genel risk dağılımınızı kurumsal düzeyde yapay zeka ile analiz edin.
        </p>
      </div>

      {/* Grid: Actions Left, Report Display Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left pane: Action Takers */}
        <div className="space-y-4">
          <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Rapor Kategorileri</span>
            </h3>

            <div className="space-y-3 font-sans text-xs">
              {/* Category 1 */}
              <button
                onClick={() => handleGenerateReport('macro')}
                disabled={isLoading}
                className="w-full text-left p-3.5 bg-bg-base/60 hover:bg-bg-base border border-outline-variant/35 rounded-xl transition-all hover:border-primary/50 group block"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary group-hover:animate-pulse" />
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Genel Makro Değerlendirme
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  Küresel borsa koşulları, faiz beklentileri ve enflasyon verilerine göre portföyün büyüme seyrini analiz eder.
                </p>
              </button>

              {/* Category 2 */}
              <button
                onClick={() => handleGenerateReport('risk')}
                disabled={isLoading}
                className="w-full text-left p-3.5 bg-bg-base/60 hover:bg-bg-base border border-outline-variant/35 rounded-xl transition-all hover:border-primary/50 group block"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-warning-amber group-hover:scale-105 transition-transform" />
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Risk & Sektör Konsantrasyonu
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  Hisse senedi çeşitlilik korelasyonunu, ağırlık dengelerini ve oynaklık katsayılarını hesaplar.
                </p>
              </button>

              {/* Category 3 */}
              <button
                onClick={() => handleGenerateReport('recommendations')}
                disabled={isLoading}
                className="w-full text-left p-3.5 bg-bg-base/60 hover:bg-bg-base border border-outline-variant/35 rounded-xl transition-all hover:border-primary/50 group block"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-bull-green group-hover:rotate-6 transition-transform" />
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    Portföy Optimizasyon Reçetesi
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  Nakit seviyeleri, kâr realizasyon noktaları, vergi hasatı ve stratejik rebalans önerileri sunar.
                </p>
              </button>
            </div>
          </div>

          {/* Quick Stats sidebar summary */}
          <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-4 space-y-2.5 font-sans text-xs">
            <span className="text-[10px] font-label-caps text-text-muted tracking-wider uppercase">Analiz Edilecek Portföy Rasyoları</span>
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-text-secondary">Toplam Varlık Değeri:</span>
              <span className="font-data-mono font-bold text-text-primary">${portfolioSummary.totalValue}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-text-secondary">Toplam Getiri / P&L:</span>
              <span className={`font-data-mono font-bold ${parseFloat(portfolioSummary.totalReturn) >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                %{portfolioSummary.totalReturn}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Toplam Hisse Adedi:</span>
              <span className="font-data-mono font-bold text-text-primary">{holdings.length}</span>
            </div>
          </div>
        </div>

        {/* Right pane: Report Screen */}
        <div className="lg:col-span-2 bg-bg-card border border-outline-variant rounded-xl p-6 shadow-lg space-y-4 min-h-[450px] relative">
          
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg-card/75 z-20">
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <h4 className="font-headline text-sm font-bold text-text-primary animate-pulse">Kurumsal Analiz Raporu Formüle Ediliyor</h4>
                <p className="text-xs text-text-muted mt-1 font-sans">
                  Gemini 3.5 Flash portföy korelasyonlarını hesaplıyor. Lütfen bekleyin...
                </p>
              </div>
            </div>
          ) : null}

          {/* Report contents */}
          {errorMessage ? (
            <div className="p-4 bg-bear-red/10 border border-bear-red/25 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-bear-red shrink-0 mt-0.5" />
              <div className="text-xs text-bear-red font-sans">
                <strong>Rapor Hatası:</strong> {errorMessage}
                <button
                  onClick={() => handleGenerateReport(reportType)}
                  className="underline font-bold block mt-2 uppercase"
                >
                  Tekrar Dene
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
                      {reportType === 'risk' ? 'Risk & Çeşitlendirme Raporu' : reportType === 'recommendations' ? 'Stratejik Optimizasyon Reçetesi' : 'Genel Makro Portföy Analizi'}
                    </h3>
                    <span className="text-[9px] font-data-mono text-text-muted uppercase">Üretildi: BUGÜN • MODEL: GEMINI-3.5-FLASH</span>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateReport(reportType)}
                  className="text-xs font-bold text-primary hover:text-text-primary flex items-center gap-1.5 transition-all font-sans"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yeniden Analiz Et</span>
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
                <h4 className="font-headline text-sm font-bold text-text-primary">Kurumsal AI Raporu Hazır</h4>
                <p className="text-xs text-text-secondary mt-1.5 font-sans leading-relaxed">
                  Sol taraftaki panelden bir analiz kategorisi seçerek, aktif portföy rasyolarınıza özel <strong>Senior Chief Investment Officer (CIO)</strong> düzeyinde raporu anında borsa terminalinizde görüntüleyin.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
