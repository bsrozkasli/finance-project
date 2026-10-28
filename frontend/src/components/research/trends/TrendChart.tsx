import {Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {FinancialHistory} from '../../../api/client';
import {cellState, chartRows, formatCell, type MetricKey, type Unit} from './trendModel';

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
const AXIS_TICK = {fill: '#a7b4c5', fontSize: 12};

const sortedPoints = (history: FinancialHistory) =>
    [...history.points].sort((a, b) => a.fiscalYear - b.fiscalYear);

export function TrendChart({title, basis, history, series, unit, kind}: Props) {
    const points = sortedPoints(history);
    const hasContent = series.some((s) => points.some((p) => cellState(p, s.key) !== 'missing'));
    const cell = (year: number, key: MetricKey) => {
        const p = points.find((x) => x.fiscalYear === year);
        return p ? formatCell(p, key, unit, history.currency) : '—';
    };

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
    const hasNegative = rows.some((r) => keys.some((k) => (r[k] ?? 0) < 0));
    const ariaLabel = `${title}. ` + points
        .map((p) => `${p.fiscalYear}: ` + series.map((s) => `${s.label} ${formatCell(p, s.key, unit, history.currency)}`).join(', '))
        .join('; ');
    const format = (value: unknown, key: MetricKey): string => {
        const probe = points[0];
        if (typeof value !== 'number' || !probe) return '—';
        return formatCell({...probe, [key]: value, notMeaningful: []}, key, unit, history.currency);
    };
    const tickFormat = (value: number): string =>
        format(value, series[0].key);
    const colorOf = (key: MetricKey) => COLORS[series.findIndex((s) => s.key === key) % COLORS.length];
    const single = rows.length === 1;

    const common = (
        <>
            <CartesianGrid stroke="#303e50" strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="year" tick={AXIS_TICK} tickFormatter={(y: number) => `FY${y}`} stroke="#48628b"/>
            <YAxis tick={AXIS_TICK} tickFormatter={tickFormat} stroke="#48628b" width={64}/>
            <Tooltip
                contentStyle={{background: '#171e27', border: '1px solid #303e50', fontSize: 12}}
                labelStyle={{color: '#e6edf6'}}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.end ?? ''}
                formatter={(value, name) => {
                    const s = series.find((x) => x.key === name);
                    return [format(value, (s?.key ?? series[0].key)), s?.label ?? String(name)];
                }}
            />
            {hasNegative && <ReferenceLine y={0} stroke="#a7b4c5"/>}
        </>
    );

    return (
        <figure className="desk-panel desk-trend" aria-label={ariaLabel}>
            <h3 className="desk-trend-title">{title}</h3>
            <ul className="desk-chart-legend desk-trend-legend">
                {series.map((s) => (
                    <li key={s.key}><span className="desk-trend-swatch" style={{background: colorOf(s.key)}}/>{s.label}</li>
                ))}
            </ul>
            <div className="desk-trend-plot" aria-hidden="true">
                <ResponsiveContainer width="100%" height={240}>
                    {kind === 'line' ? (
                        <LineChart data={rows} margin={{top: 8, right: 12, bottom: 4, left: 0}}>
                            {common}
                            {series.map((s) => (
                                <Line key={s.key} type="monotone" dataKey={s.key} name={s.key} stroke={colorOf(s.key)}
                                      strokeWidth={2} connectNulls={false} isAnimationActive={false}
                                      dot={single ? {r: 5} : {r: 3}} activeDot={{r: 5}}/>
                            ))}
                        </LineChart>
                    ) : (
                        <BarChart data={rows} margin={{top: 8, right: 12, bottom: 4, left: 0}}>
                            {common}
                            {series.map((s) => (
                                <Bar key={s.key} dataKey={s.key} name={s.key} fill={colorOf(s.key)}
                                     radius={[2, 2, 0, 0]} isAnimationActive={false}/>
                            ))}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
            <figcaption className="desk-help desk-trend-basis">{basis}</figcaption>
            <details className="desk-trend-details">
                <summary>Veri tablosu</summary>
                <div className="desk-trend-table-wrap">
                    <table className="desk-trend-table">
                        <thead>
                        <tr>
                            <th scope="col">Gösterge</th>
                            {points.map((p) => <th scope="col" key={p.fiscalYear}>{`FY${p.fiscalYear}`}</th>)}
                        </tr>
                        </thead>
                        <tbody>
                        {series.map((s) => (
                            <tr key={s.key}>
                                <th scope="row">{s.label}</th>
                                {points.map((p) => (
                                    <td key={p.fiscalYear} data-state={cellState(p, s.key)}>{cell(p.fiscalYear, s.key)}</td>
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
