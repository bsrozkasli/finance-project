import type {FinancialRatios} from '../../../api/research';

type Props = {
    ratios: FinancialRatios | null;
    dividendYield: number | null | undefined;
};

const NOTE = 'Güncel değer · geçmiş seri yok';

export default function ValuationSnapshot({ratios, dividendYield}: Props) {
    const ratio = (value: number | null | undefined) => (value == null ? '—' : value.toFixed(2));
    const tiles: {label: string; value: string}[] = [
        {label: 'Fiyat / kazanç (F/K)', value: ratio(ratios?.pe)},
        {label: 'PD/DD', value: ratio(ratios?.pb)},
        {label: 'Fiyat / satış', value: ratio(ratios?.ps)},
        {label: 'FD/FAVÖK', value: ratio(ratios?.evEbitda)},
        {label: 'Temettü verimi', value: dividendYield == null ? '—' : `${dividendYield.toFixed(2)}%`},
    ];
    return (
        <section className="desk-panel desk-trend" aria-label="Güncel değerleme">
            <h3 className="desk-trend-title">Güncel değerleme</h3>
            <div className="desk-trend-valuation">
                {tiles.map((tile) => (
                    <div key={tile.label} className="desk-trend-tile">
                        <span className="desk-help">{tile.label}</span>
                        <strong>{tile.value}</strong>
                        <span className="desk-help">{NOTE}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
