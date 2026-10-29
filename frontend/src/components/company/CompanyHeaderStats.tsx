import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAssetResearchDetail } from '../../hooks/useAssetResearchDetail';
import './company.css';
import { compactNum, isNum, num } from './companyFormat';

/** Header facts from the existing /assets/{symbol}/detail; absent fields stay "—". */
export default function CompanyHeaderStats({ symbol }: { symbol: string }) {
  const { data, loading } = useAssetResearchDetail(symbol);
  const quote = data?.market.data ?? null;
  const profile = data?.profile.data ?? null;
  const change = quote?.regularChange;
  const changePct = quote?.regularChangePercent;
  const up = isNum(change) && change > 0;
  const tone = isNum(change) ? (up ? 'company-up' : change < 0 ? 'company-down' : '') : '';
  return (
    <div className="company-header-stats" aria-label="Şirket özeti">
      <dl>
        <div><dt>Günlük değişim</dt><dd className={tone}>{loading ? '…' : isNum(change) ? `${up ? '+' : ''}${num(change)}${isNum(changePct) ? ` (%${num(changePct)})` : ''}` : '—'}</dd></div>
        <div><dt>Piyasa değeri</dt><dd>{loading ? '…' : compactNum(profile?.marketCap)}{isNum(profile?.marketCap) && profile?.currency ? ` ${profile.currency}` : ''}</dd></div>
        <div><dt>52 hafta aralığı</dt><dd>—<small> Veri kaynağı hazır değil</small></dd></div>
      </dl>
      <Link className="desk-button company-report-link" to={`/reports/${encodeURIComponent(symbol)}`}><FileText size={16} aria-hidden="true" />Rapor oluştur</Link>
    </div>
  );
}
