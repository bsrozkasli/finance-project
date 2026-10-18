import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, BarChart3, FileText } from 'lucide-react';
import type { Holding, Stock } from '../types';
import { useSmartReport } from '../hooks/useSmartReport';
import { useBacktest } from '../hooks/useBacktest';
import { valuePortfolio } from '../utils/portfolioValuation';

interface AiReportsViewProps {
  holdings: Holding[];
  stocks: Stock[];
}

const formatMetric = (value: number | null | undefined, suffix = '') =>
  value != null && Number.isFinite(value) ? `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}${suffix}` : 'Veri yok';

export default function AiReportsView({ holdings, stocks }: AiReportsViewProps) {
  const { symbol } = useParams();
  const availableSymbols = useMemo(() =>
    Array.from(new Set([...holdings.map((holding) => holding.symbol), ...stocks.map((stock) => stock.symbol)])),
  [holdings, stocks]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(symbol?.toUpperCase() ?? null);
  useEffect(() => {
    if (symbol) setSelectedSymbol(symbol.toUpperCase());
  }, [symbol]);
  const effectiveSymbol = selectedSymbol ?? availableSymbols[0] ?? null;
  const { report, loading: reportLoading, error: reportError } = useSmartReport(effectiveSymbol);
  const { data: backtest, loading: backtestLoading, error: backtestError } = useBacktest(effectiveSymbol);
  const valuation = useMemo(() => valuePortfolio(holdings, stocks), [holdings, stocks]);

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <p className="font-label-caps text-xs uppercase tracking-widest text-text-muted">Araştır / Raporlar</p>
          <h1 className="text-3xl font-headline font-bold tracking-tight mt-2">Kanıta dayalı analiz</h1>
          <p className="text-text-secondary mt-2">Mevcut sembol raporları ve geçmiş senaryolar. Sonuçlar yatırım kararı yerine geçmez.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <section className="rounded-md border border-outline-variant bg-bg-card p-5 md:p-7" aria-labelledby="smart-report-title">
            <div className="flex flex-wrap gap-4 items-start justify-between">
              <div><FileText className="w-6 h-6 text-primary mb-3" /><h2 id="smart-report-title" className="text-xl font-semibold">Sembol raporu</h2><p className="text-sm text-text-secondary mt-1">Spring API üzerinden mevcut akıllı rapor.</p></div>
              <label className="text-xs text-text-secondary">Varlık
                <select value={effectiveSymbol ?? ''} onChange={(event) => setSelectedSymbol(event.target.value || null)} className="block mt-1 min-h-11 min-w-32 rounded-lg border border-outline-variant bg-bg-base px-3 text-text-primary font-data-mono">
                  {!effectiveSymbol && <option value="">Sembol seçin</option>}
                  {effectiveSymbol && !availableSymbols.includes(effectiveSymbol) && <option value={effectiveSymbol}>{effectiveSymbol}</option>}
                  {availableSymbols.map((item) => <option value={item} key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            {!effectiveSymbol ? <p className="mt-8 rounded-lg border border-outline-variant bg-bg-base p-5 text-text-secondary">Analiz için önce bir varlık ekleyin veya izleme listenizden seçin.</p>
              : reportLoading ? <p role="status" className="mt-8 text-text-secondary">Rapor yükleniyor…</p>
                : reportError ? <p role="alert" className="mt-8 flex gap-2 rounded-lg border border-bear-red/40 bg-bear-red/10 p-4 text-bear-red"><AlertCircle className="w-5 h-5 shrink-0" />Rapor kullanılamıyor. Daha sonra yeniden deneyin.</p>
                  : report ? <div className="mt-7 space-y-5">
                    <div className="rounded-md border border-outline-variant bg-bg-base p-5">
                      <p className="text-xs uppercase tracking-wider text-text-muted">Backend rapor puanı</p>
                      <div className="font-data-mono text-3xl font-bold mt-2">{formatMetric(report.overallScore, ' / 100')}</div>
                      <p className="text-sm text-text-secondary mt-2">{report.grade} · {report.recommendation}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(report.breakdown ?? {}).map(([key, value]) => <div key={key} className="rounded-lg border border-outline-variant p-3"><div className="text-xs text-text-muted break-all">{key}</div><div className="font-data-mono text-lg mt-1">{formatMetric(value)}</div></div>)}
                    </div>
                  </div> : <p className="mt-8 text-text-muted">Rapor verisi bulunamadı.</p>}
          </section>

          <div className="space-y-5">
            <section className="rounded-md border border-outline-variant bg-bg-card p-5" aria-labelledby="coverage-title">
              <h2 id="coverage-title" className="text-lg font-semibold">Portföy veri kapsamı</h2>
              <p className="text-warning-amber text-sm mt-3">{valuation.pricedCount}/{valuation.holdingsCount} pozisyonun güncel fiyatı var</p>
              <p className="font-data-mono text-2xl mt-2">{valuation.totalValue == null ? '—' : `$${valuation.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
              <p className="text-xs text-text-muted mt-3">{valuation.totalValue == null ? 'Eksik fiyat nedeniyle toplam değer hesaplanamıyor.' : 'Son mevcut fiyat gözlemlerine göre hesaplandı.'}</p>
            </section>
            <section className="rounded-md border border-outline-variant bg-bg-card p-5" aria-labelledby="backtest-title">
              <BarChart3 className="w-5 h-5 text-primary mb-2" /><h2 id="backtest-title" className="text-lg font-semibold">Geçmiş senaryo</h2>
              {!effectiveSymbol ? <p className="text-sm text-text-muted mt-3">Sembol seçin.</p>
                : backtestLoading ? <p role="status" className="text-sm text-text-muted mt-3">Yükleniyor…</p>
                  : backtestError ? <p className="text-sm text-text-muted mt-3">Senaryo verisi kullanılamıyor.</p>
                    : backtest ? <div className="text-sm text-text-secondary mt-3 space-y-2"><p>{backtest.scenarioDescription}</p><p>Gözlem: <strong>{formatMetric(backtest.totalOccurrences)}</strong></p><p>Geçmiş kazanma oranı: <strong>{formatMetric(backtest.winRate, '%')}</strong></p>{!backtest.isMeaningful && <p className="text-warning-amber">Yeterli geçmiş kanıt yok.</p>}</div>
                      : <p className="text-sm text-text-muted mt-3">Senaryo verisi yok.</p>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
