import {useState} from 'react';
import type {AnnualMetric, FinancialHistory, FundamentalsData} from '../../api/client';
import {metric} from './formatResearchMetric';
import {formatCell, type MetricKey} from './trends/trendModel';

type LegacyKey = keyof Pick<FundamentalsData, 'revenue' | 'netIncome' | 'eps' | 'freeCashFlow'>;
// The legacy freeCashFlow field carries operating cash flow, so it is labelled as such.
const legacySeries: [LegacyKey, string][] = [['revenue', 'Toplam gelir'], ['netIncome', 'Net kâr'], ['eps', 'Hisse başına kazanç (EPS)'], ['freeCashFlow', 'Faaliyet nakit akışı']];
const historyRows: [MetricKey | 'eps', string][] = [['revenue', 'Toplam gelir'], ['netIncome', 'Net kâr'], ['operatingCashFlow', 'Faaliyet nakit akışı'], ['freeCashFlow', 'Serbest nakit akışı'], ['eps', 'Hisse başına kazanç (EPS)']];

export default function ResearchFinancials({data, history, loading, isFund}: {
    data: FundamentalsData | null;
    history: FinancialHistory | null;
    loading: boolean;
    isFund: boolean
}) {
    const [compact, setCompact] = useState(false);
    const useHistory = history !== null && (history.status === 'AVAILABLE' || history.status === 'PARTIAL') && history.points.length > 0;
    const points = useHistory ? [...history.points].sort((a, b) => a.fiscalYear - b.fiscalYear) : [];
    const years = useHistory ? points.map(point => point.fiscalYear) : [...new Set(legacySeries.flatMap(([key]) => (data?.[key] ?? []).map(point => point.year)))].sort((a, b) => a - b);
    const legacyCell = (key: LegacyKey, year: number) => metric((data?.[key] as AnnualMetric[] | undefined)?.find(point => point.year === year)?.value, key === 'eps' ? 2 : 0);
    const historyCell = (key: MetricKey | 'eps', year: number) => {
        if (key === 'eps') return legacyCell('eps', year);
        const point = points.find(item => item.fiscalYear === year);
        return point ? formatCell(point, key, 'money', history?.currency ?? null) : '—';
    };
    return <section className="desk-panel">
        <div className="desk-panel-head">
            <div><h2>Gelir ve nakit akışı</h2><p className="desk-help">Raporlanan yıllık değerler · ölçek
                değiştirilmedi</p></div>
            <span className="desk-badge">Yıllık</span></div>
        <div className="desk-table-controls"><p className="desk-help">Birim ve para birimi sağlayıcı yanıtında
            bildirilmedi. EPS hisse başına değerdir.</p>
            <div className="desk-segment" aria-label="Tablo yoğunluğu">
                <button type="button" aria-pressed={!compact} onClick={() => setCompact(false)}>Rahat</button>
                <button type="button" aria-pressed={compact} onClick={() => setCompact(true)}>Kompakt</button>
            </div>
        </div>
        {loading ? <p role="status" className="desk-empty">Finansallar yükleniyor…</p> : years.length === 0 ?
            <p className="desk-empty">{isFund ? 'Fonlar için şirket gelir tablosu uygulanmaz.' : 'Finansal tablo kullanılamıyor. Raporlanan dönem verisi bulunamadı.'}</p> :
            <div className="desk-table-scroll" role="region" aria-label="Yıllık finansallar, yatay kaydırılabilir"
                 tabIndex={0}>
                <table className={`desk-data-table ${compact ? 'is-compact' : ''}`} aria-label="Yıllık finansallar">
                    <caption>Sağlayıcının bildirdiği mali yıllar · {years[0]}–{years.at(-1)}</caption>
                    <thead>
                    <tr>
                        <th scope="col">Gösterge</th>
                        {years.map(year => <th key={year} scope="col">FY{year}</th>)}</tr>
                    </thead>
                    <tbody>{useHistory ? historyRows.map(([key, label]) => <tr key={key}>
                        <th scope="row">{label}</th>
                        {years.map(year => <td key={year}>{historyCell(key, year)}</td>)}
                    </tr>) : legacySeries.map(([key, label]) => <tr key={key}>
                        <th scope="row">{label}</th>
                        {years.map(year => <td key={year}>{legacyCell(key, year)}</td>)}
                    </tr>)}</tbody>
                </table>
            </div>}
        <p className="desk-footnote">Kaynak: kayıtlı finansal veri yanıtı. Sağlayıcı, rapor URL'si ve dönem bitiş tarihi
            bu yanıtta bildirilmedi. Eksik alanlar sıfır değildir.</p>
    </section>;
}
