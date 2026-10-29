import { compactNum, isNum, num } from './companyFormat';

export interface LineSeries {
  name: string;
  values: (number | null | undefined)[];
  dashed?: boolean;
  className: string;
}

const W = 640;
const H = 220;
const PAD = { l: 44, r: 12, t: 14, b: 30 };

const scale = (values: number[]) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return { min, max, y: (value: number) => PAD.t + (1 - (value - min) / span) * (H - PAD.t - PAD.b) };
};

/** Line chart; gaps (null) break the line instead of being interpolated. */
export function MiniLineChart({ labels, series, label }: { labels: string[]; series: LineSeries[]; label: string }) {
  const all = series.flatMap((s) => s.values).filter(isNum);
  if (all.length === 0 || labels.length === 0) return null;
  const { min, max, y } = scale(all);
  const x = (index: number) => PAD.l + (labels.length === 1 ? (W - PAD.l - PAD.r) / 2 : (index / (labels.length - 1)) * (W - PAD.l - PAD.r));
  return (
    <svg className="company-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={PAD.l} x2={W - PAD.r} y1={y(min)} y2={y(min)} className="company-chart-axis" />
      <text x={PAD.l - 6} y={y(max) + 4} textAnchor="end" className="company-chart-text">{num(max)}</text>
      <text x={PAD.l - 6} y={y(min) + 4} textAnchor="end" className="company-chart-text">{num(min)}</text>
      {series.map((s) => {
        const segments: string[][] = [[]];
        s.values.forEach((value, index) => {
          if (isNum(value)) segments[segments.length - 1].push(`${x(index)},${y(value)}`);
          else if (segments[segments.length - 1].length) segments.push([]);
        });
        return segments.filter((seg) => seg.length).map((seg, i) => (
          seg.length === 1
            ? <circle key={`${s.name}-${i}`} cx={seg[0].split(',')[0]} cy={seg[0].split(',')[1]} r="3" className={s.className} />
            : <polyline key={`${s.name}-${i}`} points={seg.join(' ')} fill="none" strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} className={s.className} />
        ));
      })}
      {labels.map((text, index) => (
        (labels.length <= 9 || index % 2 === 0) && <text key={text + index} x={x(index)} y={H - 8} textAnchor="middle" className="company-chart-text">{text}</text>
      ))}
    </svg>
  );
}

export interface BarSeries { name: string; values: (number | null | undefined)[]; className: string }

/** Grouped bars from a zero baseline; missing values draw no bar. */
export function MiniBarChart({ labels, series, label }: { labels: string[]; series: BarSeries[]; label: string }) {
  const all = series.flatMap((s) => s.values).filter(isNum);
  if (all.length === 0 || labels.length === 0) return null;
  const { y, min, max } = scale([0, ...all]);
  const step = (W - PAD.l - PAD.r) / labels.length;
  const width = Math.min(26, (step * 0.8) / series.length);
  return (
    <svg className="company-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="company-chart-axis" />
      <text x={PAD.l - 6} y={y(max) + 4} textAnchor="end" className="company-chart-text">{compactNum(max)}</text>
      {min < 0 && <text x={PAD.l - 6} y={y(min) + 4} textAnchor="end" className="company-chart-text">{compactNum(min)}</text>}
      {labels.map((text, index) => {
        const center = PAD.l + step * (index + 0.5);
        return (
          <g key={text + index}>
            {series.map((s, si) => {
              const value = s.values[index];
              if (!isNum(value)) return null;
              const offset = (si - (series.length - 1) / 2) * (width + 2) - width / 2;
              return <rect key={s.name} x={center + offset} y={Math.min(y(value), y(0))} width={width} height={Math.max(Math.abs(y(value) - y(0)), 1)} rx="2" className={s.className} />;
            })}
            {(labels.length <= 8 || index % 2 === 0) && <text x={center} y={H - 8} textAnchor="middle" className="company-chart-text">{text}</text>}
          </g>
        );
      })}
    </svg>
  );
}
