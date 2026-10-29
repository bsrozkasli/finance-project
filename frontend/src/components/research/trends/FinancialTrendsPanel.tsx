import type {FinancialHistory} from '../../../api/client';
import type {FinancialRatios, FundamentalsData} from '../../../api/research';
import {TrendChart, type TrendSeries} from './TrendChart';
import type {Unit} from './trendModel';
import {viewState} from './trendModel';
import ValuationSnapshot from './ValuationSnapshot';

type Props = {
    history: FinancialHistory | null;
    ratios: FinancialRatios | null;
    fundamentals: FundamentalsData | null;
    loading: boolean;
    isFund: boolean;
};

type ChartSpec = {
    title: string;
    basis: string;
    kind: 'line' | 'bar';
    unit: Unit;
    series: TrendSeries[];
};

const ANNUAL = 'Yıllık, raporlanan değerler.';

const GROUPS: {heading: string; charts: ChartSpec[]}[] = [
    {
        heading: 'Büyüme ve kârlılık',
        charts: [
            {title: 'Gelir ve net kâr', basis: ANNUAL, kind: 'bar', unit: 'money', series: [
                {key: 'revenue', label: 'Gelir'}, {key: 'netIncome', label: 'Net kâr'}]},
            {title: 'Büyüme, yıllık', basis: 'Bir önceki yıla göre değişim.', kind: 'line', unit: 'percent', series: [
                {key: 'revenueGrowth', label: 'Gelir büyümesi'}, {key: 'netIncomeGrowth', label: 'Net kâr büyümesi'}]},
            {title: 'Kârlılık', basis: ANNUAL, kind: 'line', unit: 'percent', series: [
                {key: 'roe', label: 'ROE'}, {key: 'roa', label: 'ROA'}, {key: 'netMargin', label: 'Net marj'}]},
        ],
    },
    {
        heading: 'Borçluluk ve likidite',
        charts: [
            {title: 'Borç / özsermaye', basis: 'Toplam borç ÷ özkaynak, yıl sonu. Özkaynak ≤ 0 ise anlamlı değil.', kind: 'line', unit: 'ratio', series: [
                {key: 'debtToEquity', label: 'Borç / özsermaye'}]},
            {title: 'Borç ve nakit', basis: 'Yıl sonu bakiyeleri.', kind: 'bar', unit: 'money', series: [
                {key: 'totalDebt', label: 'Toplam borç'}, {key: 'cash', label: 'Nakit'}]},
            {title: 'Cari oran', basis: 'Dönen varlıklar ÷ kısa vadeli yükümlülükler, yıl sonu.', kind: 'line', unit: 'ratio', series: [
                {key: 'currentRatio', label: 'Cari oran'}]},
        ],
    },
    {
        heading: 'Nakit akışı',
        charts: [
            {title: 'Faaliyet nakit akışı, yatırım harcaması ve serbest nakit akışı', basis: 'Serbest nakit akışı = faaliyet nakit akışı − yatırım harcaması', kind: 'bar', unit: 'money', series: [
                {key: 'operatingCashFlow', label: 'Faaliyet nakit akışı'},
                {key: 'capitalExpenditure', label: 'Yatırım harcaması'},
                {key: 'freeCashFlow', label: 'Serbest nakit akışı'}]},
        ],
    },
];

export default function FinancialTrendsPanel({history, ratios, fundamentals, loading, isFund}: Props) {
    if (isFund) {
        return <p className="desk-empty">Fonlar için şirket gelir tablosu uygulanmaz.</p>;
    }
    const state = viewState(history, loading);
    if (state === 'loading') {
        return <p className="desk-empty" role="status">Finansal geçmiş yükleniyor…</p>;
    }
    if (state === 'unavailable') {
        return <p className="desk-empty">Finansal geçmiş şu an alınamıyor. Lütfen daha sonra yeniden deneyin.</p>;
    }
    if (state === 'empty' || history === null) {
        return <p className="desk-empty">Raporlanan dönem verisi bulunamadı</p>;
    }
    return (
        <div className="desk-trend-groups">
            <p className="desk-help">
                {history.currency ? `Para birimi: ${history.currency}` : 'Para birimi bildirilmedi. Değerler dönüştürülmedi.'}
            </p>
            <ValuationSnapshot ratios={ratios} dividendYield={fundamentals?.dividendYield}/>
            {GROUPS.map((group) => (
                <section key={group.heading} aria-label={group.heading}>
                    <h3 className="desk-eyebrow">{group.heading}</h3>
                    {group.charts.map((chart) => (
                        <TrendChart key={chart.title} history={history} {...chart}/>
                    ))}
                </section>
            ))}
        </div>
    );
}
