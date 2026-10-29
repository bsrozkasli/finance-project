import type { EarningsMonthly } from '../../api/redesign';
import { DASH, formatMoney } from './format';

type MonthlyItem = EarningsMonthly['items'][number];

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 12 };

const monthLabel = (month: string): string => {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

/**
 * Monthly gain bars plus cumulative line as small hand-written SVG (no chart library in the bundle).
 * Months whose value is unavailable (null) are drawn as gaps, never as zero. A table lists the same data.
 */
export default function EarningsChart({ items, currency }: { items: MonthlyItem[]; currency?: string | null }) {
  const values = items.flatMap((item) => [item.gain, item.cumulative]).filter((v): v is number => v != null && Number.isFinite(v));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const y = (value: number) => PAD.top + ((max - value) / span) * innerH;
  const slot = items.length > 0 ? innerW / items.length : innerW;
  const x = (index: number) => PAD.left + slot * index + slot / 2;
  const barW = Math.max(4, Math.min(28, slot * 0.6));

  // Break the cumulative line at unavailable months.
  const segments: string[] = [];
  let current: string[] = [];
  items.forEach((item, index) => {
    if (item.cumulative == null || !Number.isFinite(item.cumulative)) {
      if (current.length > 0) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${current.length === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(item.cumulative).toFixed(1)}`);
  });
  if (current.length > 0) segments.push(current.join(' '));

  const known = items.filter((item) => item.gain != null);
  const label = `Aylık kazanç çubukları ve kümülatif çizgi, ${items.length} ay, ${known.length} ayda veri var`;

  return (
    <div>
      <svg role="img" aria-label={label} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" data-testid="earnings-chart">
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--color-outline-variant)" />
        {items.map((item, index) => {
          if (item.gain == null || !Number.isFinite(item.gain)) return null;
          const top = Math.min(y(item.gain), y(0));
          const height = Math.max(1, Math.abs(y(item.gain) - y(0)));
          return (
            <rect
              key={item.month}
              x={x(index) - barW / 2}
              y={top}
              width={barW}
              height={height}
              rx={2}
              fill={item.gain >= 0 ? 'var(--color-bull-green)' : 'var(--color-bear-red)'}
            >
              <title>{`${monthLabel(item.month)}: ${formatMoney(item.gain, currency)}`}</title>
            </rect>
          );
        })}
        {segments.map((d) => <path key={d} d={d} fill="none" stroke="var(--color-primary)" strokeWidth={2} />)}
        {items.map((item, index) => (
          <text key={item.month} x={x(index)} y={HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)">
            {monthLabel(item.month)}
          </text>
        ))}
      </svg>
      <details className="mt-2 text-xs text-text-muted">
        <summary className="min-h-11 cursor-pointer py-3">Aylık veriyi tablo olarak göster</summary>
        <table className="w-full text-left">
          <caption className="sr-only">Aylık kazanç ve kümülatif kazanç</caption>
          <thead>
            <tr><th scope="col" className="py-1">Ay</th><th scope="col" className="py-1">Kazanç</th><th scope="col" className="py-1">Kümülatif</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.month} className="border-t border-outline-variant/25">
                <th scope="row" className="py-1 font-normal">{monthLabel(item.month)}</th>
                <td className="py-1 font-data-mono">{item.gain == null ? DASH : formatMoney(item.gain, currency)}</td>
                <td className="py-1 font-data-mono">{item.cumulative == null ? DASH : formatMoney(item.cumulative, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
