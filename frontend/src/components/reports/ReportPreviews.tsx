import { fetchDividendReport, fetchPerformanceReport, fetchRealizedPnlReport } from '../../api/redesign';
import type { ReportScope } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';

interface PreviewProps {
  scope: ReportScope;
  period: string;
  year: number;
}

const num = (value: number | null | undefined, digits = 2) => (
  value == null || !Number.isFinite(value) ? 'Veri yok' : value.toLocaleString('tr-TR', { maximumFractionDigits: digits })
);
const pct = (value: number | null | undefined) => (value == null ? 'Veri yok' : `%${num(value * 100)}`);
const TH = 'text-left font-bold text-text-muted py-1 pr-3';
const TD = 'py-1 pr-3 font-data-mono';

const Disclaimer = ({ text }: { text: string }) => (
  <p className="rounded-lg border border-warning-amber/40 bg-warning-amber/10 p-3 text-xs text-text-secondary">{text}</p>
);

export function PerformancePreview({ scope, period }: PreviewProps) {
  const query = usePanelQuery(() => fetchPerformanceReport(period, scope), [scope, period]);
  const data = query.data;
  return (
    <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Performans raporu">
      {data && (
        <div className="space-y-4 text-xs">
          {data.valueBridge && (
            <table className="w-full">
              <caption className="sr-only">Değer köprüsü</caption>
              <thead><tr><th className={TH}>Kalem</th><th className={TH}>Tutar</th></tr></thead>
              <tbody>
                <tr><td className={TD}>Başlangıç</td><td className={TD}>{num(data.valueBridge.start)}</td></tr>
                {(data.valueBridge.steps ?? []).map((step) => (
                  <tr key={step.symbol}><td className={TD}>{step.symbol}</td><td className={TD}>{num(step.contribution)}</td></tr>
                ))}
                <tr><td className={TD}>Net akış</td><td className={TD}>{num(data.valueBridge.netFlow)}</td></tr>
                <tr><td className={TD}>Yuvarlama</td><td className={TD}>{num(data.valueBridge.rounding)}</td></tr>
                <tr><td className={`${TD} font-bold`}>Bitiş</td><td className={`${TD} font-bold`}>{num(data.valueBridge.end)}</td></tr>
              </tbody>
            </table>
          )}
          {(data.sectorContribution ?? []).length > 0 && (
            <table className="w-full">
              <caption className="sr-only">Sektör katkısı</caption>
              <thead><tr><th className={TH}>Sektör</th><th className={TH}>Ort. ağırlık</th><th className={TH}>Getiri</th><th className={TH}>Katkı</th></tr></thead>
              <tbody>
                {(data.sectorContribution ?? []).map((row) => (
                  <tr key={row.sector}><td className={TD}>{row.sector}</td><td className={TD}>{pct(row.averageWeight)}</td><td className={TD}>{pct(row.sectorReturn)}</td><td className={TD}>{num(row.contribution)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {data.riskSummary && (
            <dl className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {[
                ['Oynaklık', pct(data.riskSummary.volatility)],
                ['Maks. düşüş', pct(data.riskSummary.maxDrawdown)],
                ['Beta', num(data.riskSummary.beta)],
                ['İşlem sayısı', num(data.riskSummary.tradeCount, 0)],
                ['Devir', pct(data.riskSummary.turnover)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-outline-variant p-2"><dt className="text-text-muted">{label}</dt><dd className="font-data-mono">{value}</dd></div>
              ))}
            </dl>
          )}
        </div>
      )}
    </PanelState>
  );
}

export function RealizedPnlPreview({ scope, year }: PreviewProps) {
  const query = usePanelQuery(() => fetchRealizedPnlReport(year, scope), [scope, year]);
  const data = query.data;
  return (
    <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Gerçekleşen K/Z" emptyMessage="Bu yıl için gerçekleşen işlem yok">
      {data && (
        <div className="space-y-3 text-xs">
          <p className="text-text-secondary">Maliyet yöntemi: ortalama maliyet</p>
          {data.totals && <p className="font-data-mono">Toplam gerçekleşen K/Z: {num(data.totals.realizedPnl)} · Hasılat: {num(data.totals.proceeds)} · Maliyet: {num(data.totals.cost)} · Masraf: {num(data.totals.fees)}</p>}
          <table className="w-full">
            <caption className="sr-only">Gerçekleşen kâr/zarar dökümü</caption>
            <thead><tr><th className={TH}>Tarih</th><th className={TH}>Sembol</th><th className={TH}>Maliyet</th><th className={TH}>Hasılat</th><th className={TH}>K/Z</th><th className={TH}>Elde tutma (gün)</th></tr></thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.saleDate}-${row.symbol}`}><td className={TD}>{row.saleDate}</td><td className={TD}>{row.symbol}</td><td className={TD}>{num(row.cost)}</td><td className={TD}>{num(row.proceeds)}</td><td className={TD}>{num(row.realizedPnl)}</td><td className={TD}>{num(row.holdingDays, 0)}</td></tr>
              ))}
            </tbody>
          </table>
          <Disclaimer text={data.disclaimer} />
        </div>
      )}
    </PanelState>
  );
}

export function DividendPreview({ scope, year }: PreviewProps) {
  const query = usePanelQuery(() => fetchDividendReport(year, scope), [scope, year]);
  const data = query.data;
  return (
    <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Temettü raporu" emptyMessage="Bu yıl için temettü kaydı yok">
      {data && (
        <div className="space-y-3 text-xs">
          {data.totals && <p className="font-data-mono">Brüt: {num(data.totals.gross)} · Stopaj: {num(data.totals.withholding)} · Net: {num(data.totals.net)}</p>}
          <table className="w-full">
            <caption className="sr-only">Temettü geliri dökümü</caption>
            <thead><tr><th className={TH}>Tarih</th><th className={TH}>Sembol</th><th className={TH}>Brüt</th><th className={TH}>Stopaj</th><th className={TH}>Net</th></tr></thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.paymentDate}-${row.symbol}`}><td className={TD}>{row.paymentDate}</td><td className={TD}>{row.symbol}</td><td className={TD}>{num(row.gross)}</td><td className={TD}>{row.withholding == null ? 'Kayıtlı değil' : num(row.withholding)}</td><td className={TD}>{num(row.net)}</td></tr>
              ))}
            </tbody>
          </table>
          {(data.byYear ?? []).length > 0 && (
            <ul aria-label="Yıllara göre net temettü" className="flex flex-wrap gap-3 font-data-mono">
              {(data.byYear ?? []).map((entry, index) => <li key={entry.year ?? index}>{entry.year ?? '—'}: {num(entry.net)}</li>)}
            </ul>
          )}
          <Disclaimer text={data.disclaimer} />
        </div>
      )}
    </PanelState>
  );
}
