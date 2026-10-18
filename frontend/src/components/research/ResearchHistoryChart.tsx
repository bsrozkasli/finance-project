import type {FundamentalsData} from '../../api/client';
import {metric} from './formatResearchMetric';

export default function ResearchHistoryChart({data}: { data: FundamentalsData | null }) {
    const revenue = data?.revenue ?? [];
    const income = data?.netIncome ?? [];
    const years = [...new Set([...revenue, ...income].filter(point => point.value != null && Number.isFinite(point.value)).map(point => point.year))].sort((a, b) => a - b).slice(-5);
    if (!years.length) return <p className="desk-empty">Grafik için raporlanan finansal dönem bulunamadı.</p>;
    const values = [...revenue, ...income].filter(point => years.includes(point.year) && point.value != null && Number.isFinite(point.value)).map(point => point.value);
    const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
    const y = (value: number) => 215 - (value - minimum) / (maximum - minimum || 1) * 170;
    const step = 550 / years.length;
    const width = Math.min(40, step * .28);
    const title = years.map(year => `FY${year}: gelir ${metric(revenue.find(point => point.year === year)?.value, 0)}, net kâr ${metric(income.find(point => point.year === year)?.value, 0)}`).join('; ');
    return <figure className="desk-history-chart">
        <div className="desk-chart-heading">
            <div><h3>Gelir ve net kâr</h3><p className="desk-help">Raporlanan ham değerler · fiyat grafiği değildir</p>
            </div>
            <div className="desk-chart-legend"><span><i/>Gelir</span><span><i/>Net kâr</span></div>
        </div>
        <svg viewBox="0 0 640 260" role="img"
             aria-label={`Yıllık finansal karşılaştırma. ${title}. Birim bildirilmedi.`}>
            <line x1="42" x2="620" y1={y(0)} y2={y(0)} stroke="#53637a"/>
            {[.25, .5, .75, 1].map(fraction => <line key={fraction} x1="42" x2="620" y1={45 + 170 * fraction}
                                                     y2={45 + 170 * fraction} stroke="#303e50"
                                                     strokeDasharray="3 4"/>)}{years.map((year, index) => {
            const center = 58 + step * (index + .5);
            return <g key={year}>{[revenue, income].map((points, series) => {
                const value = points.find(point => point.year === year)?.value;
                if (value == null || !Number.isFinite(value)) return null;
                return <rect key={series} x={center + (series === 0 ? -width - 3 : 3)} y={Math.min(y(value), y(0))}
                             width={width} height={Math.max(Math.abs(y(value) - y(0)), value === 0 ? 1 : 0)} rx="2"
                             fill={series === 0 ? '#7fa6ff' : '#61bdb8'}/>;
            })}
                <text x={center} y="245" fill="#b7c4d6" textAnchor="middle" fontSize="16">FY{year}</text>
            </g>;
        })}</svg>
        <figcaption className="desk-help">Kesin değerler Finansallar tablosunda. Eksik dönem veya net kâr değeri çubukla
            tamamlanmaz.
        </figcaption>
    </figure>;
}
