import {useState} from 'react';
import type {AnnualMetric, FundamentalsData} from '../../api/client';
import {metric} from './formatResearchMetric';

const series: [keyof Pick<FundamentalsData, 'revenue' | 'netIncome' | 'eps' | 'freeCashFlow'>, string][] = [['revenue', 'Toplam gelir'], ['netIncome', 'Net kâr'], ['eps', 'Hisse başına kazanç (EPS)'], ['freeCashFlow', 'Serbest nakit akışı']];

export default function ResearchFinancials({data, loading, isFund}: {
    data: FundamentalsData | null;
    loading: boolean;
    isFund: boolean
}) {
    const [compact, setCompact] = useState(false);
    const years = [...new Set(series.flatMap(([key]) => (data?.[key] ?? []).map(point => point.year)))].sort((a, b) => a - b);
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
                    <tbody>{series.map(([key, label]) => <tr key={key}>
                        <th scope="row">{label}</th>
                        {years.map(year => <td
                            key={year}>{metric((data?.[key] as AnnualMetric[] | undefined)?.find(point => point.year === year)?.value, key === 'eps' ? 2 : 0)}</td>)}
                    </tr>)}</tbody>
                </table>
            </div>}
        <p className="desk-footnote">Kaynak: kayıtlı finansal veri yanıtı. Sağlayıcı, rapor URL'si ve dönem bitiş tarihi
            bu yanıtta bildirilmedi. Eksik alanlar sıfır değildir.</p>
    </section>;
}
