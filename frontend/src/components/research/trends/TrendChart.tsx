import type {FinancialHistory, FinancialHistoryPoint} from '../../../api/client';
import {cellState, chartRows, formatCell, formatTick, leftMargin, M, type MetricKey, sortedPoints, type Unit} from './trendModel';

export type TrendSeries = {key: MetricKey; label: string};

type Props = {
    title: string;
    basis: string;
    history: FinancialHistory;
    series: TrendSeries[];
    unit: Unit;
    kind: 'line' | 'bar';
};

const COLORS = ['#7fa6ff', '#61bdb8', '#e8a54b', '#c792ea'];
export const VIEWBOX_WIDTH = 320;
const W = VIEWBOX_WIDTH;
const H = 240;
export const FONT = 14;
const PLOT_H = H - M.top - M.bottom;

const niceStep = (range: number, count: number): number => {
    const raw = range / count;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const f = raw / pow;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
};

const niceTicks = (min: number, max: number): number[] => {
    if (min === max) {
        const pad = Math.abs(min) || 1;
        min -= pad;
        max += pad;
    }
    const step = niceStep(max - min, 4);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
    return ticks;
};

export function TrendChart({title, basis, history, series, unit, kind}: Props) {
    const points = sortedPoints(history);
    const hasContent = series.some((s) => points.some((p) => cellState(p, s.key) !== 'missing'));
    const cell = (p: FinancialHistoryPoint, key: MetricKey) => formatCell(p, key, unit, history.currency);

    if (!hasContent) {
        return (
            <figure className="desk-panel desk-trend">
                <h3 className="desk-trend-title">{title}</h3>
                <p className="desk-empty">Bu gösterge için raporlanan veri yok</p>
                <figcaption className="desk-help desk-trend-basis">{basis}</figcaption>
            </figure>
        );
    }

    const keys = series.map((s) => s.key);
    const rows = chartRows(history, keys);
    const values = rows.flatMap((r) => keys.map((k) => r[k]).filter((v): v is number => typeof v === 'number'));
    const hasNegative = values.some((v) => v < 0);
    const ariaLabel = `${title}. ` + points
        .map((p) => `${p.fiscalYear} (${p.fiscalYearEnd}): ` + series.map((s) => `${s.label} ${formatCell(p, s.key, unit, history.currency)}`).join(', '))
        .join('; ');
    const colorOf = (key: MetricKey) => COLORS[series.findIndex((s) => s.key === key) % COLORS.length];

    const extra = kind === 'bar' ? [0] : [];
    const ticks = values.length ? niceTicks(Math.min(...values, ...extra), Math.max(...values, ...extra)) : [0, 1];
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    // Axis ticks omit the currency code and use compact precision; the currency is stated once under the chart.
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    const tickText = (t: number) => formatTick(t, unit, step);
    const left = leftMargin(ticks.map(tickText));
    const plotW = W - left - M.right;
    const y = (v: number) => M.top + PLOT_H - ((v - lo) / (hi - lo || 1)) * PLOT_H;
    const band = plotW / rows.length;
    const cx = (i: number) => left + band * (i + 0.5);
    const hover = (i: number, s: TrendSeries) =>
        `FY${rows[i].year} (${rows[i].end}) ${s.label}: ${cell(points[i], s.key)}`;

    const lineParts = (s: TrendSeries): string[] => {
        const parts: string[] = [];
        let current = '';
        rows.forEach((r, i) => {
            const v = r[s.key];
            if (typeof v === 'number') {
                current += `${current ? 'L' : 'M'}${cx(i).toFixed(1)} ${y(v).toFixed(1)}`;
            } else if (current) {
                parts.push(current);
                current = '';
            }
        });
        if (current) parts.push(current);
        return parts;
    };

    const barGroup = Math.min(band * 0.7, 48);
    const barW = barGroup / series.length;

    const plot = values.length === 0 ? null : (
        <svg className="desk-trend-svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{display: 'block', width: '100%', height: 'auto'}}
             fontSize={FONT} aria-hidden="true" focusable="false">
            {ticks.map((t) => (
                <g key={t}>
                    <line x1={left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#303e50" strokeDasharray="3 3"/>
                    <text x={left - 6} y={y(t)} fill="#a7b4c5" textAnchor="end" dominantBaseline="middle">{tickText(t)}</text>
                </g>
            ))}
            {rows.map((r, i) => (
                <text key={r.end} x={cx(i)} y={H - 8} fill="#a7b4c5" textAnchor="middle">{r.year}</text>
            ))}
            {hasNegative && <line className="desk-trend-zero" x1={left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="#a7b4c5"/>}
            {kind === 'line' ? series.map((s) => (
                <g key={s.key} data-series={s.key}>
                    {lineParts(s).map((d) => <path key={d} d={d} fill="none" stroke={colorOf(s.key)} strokeWidth={2}/>)}
                    {rows.map((r, i) => typeof r[s.key] === 'number' && (
                        <circle key={r.end} cx={cx(i)} cy={y(r[s.key] as number)} r={rows.length === 1 ? 5 : 3.5} fill={colorOf(s.key)}>
                            <title>{hover(i, s)}</title>
                        </circle>
                    ))}
                </g>
            )) : series.map((s, si) => (
                <g key={s.key} data-series={s.key}>
                    {rows.map((r, i) => {
                        const v = r[s.key];
                        if (typeof v !== 'number') return null;
                        return (
                            <rect key={r.end} x={cx(i) - barGroup / 2 + si * barW} y={Math.min(y(v), y(0))} width={Math.max(barW - 2, 2)}
                                  height={Math.max(Math.abs(y(v) - y(0)), 1)} rx={2} fill={colorOf(s.key)}>
                                <title>{hover(i, s)}</title>
                            </rect>
                        );
                    })}
                </g>
            ))}
        </svg>
    );

    return (
        <figure className="desk-panel desk-trend" aria-label={ariaLabel}>
            <h3 className="desk-trend-title">{title}</h3>
            <ul className="desk-chart-legend desk-trend-legend">
                {series.map((s) => (
                    <li key={s.key}><span className="desk-trend-swatch" style={{background: colorOf(s.key)}}/>{s.label}</li>
                ))}
            </ul>
            {plot === null
                ? <p className="desk-empty desk-trend-nomeaning">Hiçbir yılda anlamlı değer yok</p>
                : <div className="desk-trend-plot" aria-hidden="true">{plot}</div>}
            <figcaption className="desk-help desk-trend-basis">{basis}</figcaption>
            {unit === 'money' && (
                <p className="desk-help desk-trend-currency">
                    {history.currency ? `Para birimi: ${history.currency}` : 'Para birimi bildirilmedi.'}
                </p>
            )}
            <details className="desk-trend-details">
                <summary>Veri tablosu</summary>
                <div className="desk-trend-table-wrap">
                    <table className="desk-trend-table">
                        <thead>
                        <tr>
                            <th scope="col">Gösterge</th>
                            {points.map((p) => <th scope="col" key={p.fiscalYearEnd} title={p.fiscalYearEnd}>{`FY${p.fiscalYear}`}</th>)}
                        </tr>
                        </thead>
                        <tbody>
                        {series.map((s) => (
                            <tr key={s.key}>
                                <th scope="row">{s.label}</th>
                                {points.map((p) => (
                                    <td key={p.fiscalYearEnd} data-state={cellState(p, s.key)}>{cell(p, s.key)}</td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </figure>
    );
}
