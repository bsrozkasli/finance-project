import type { OHLCVData, SupportResistanceLevel } from '../types/chart.types';

const round = (value: number) => Number(value.toFixed(2));

export const calculatePivotLevels = (data: OHLCVData[]): SupportResistanceLevel[] => {
  const last = data[data.length - 1];
  if (!last) return [];

  const high = last.high;
  const low = last.low;
  const close = last.close;
  const range = high - low;
  const classicPivot = (high + low + close) / 3;
  const woodiePivot = (high + low + (2 * close)) / 4;

  const levels: SupportResistanceLevel[] = [
    { id: 'classic-p', label: 'P', price: round(classicPivot), type: 'pivot', method: 'Classic' },
    { id: 'classic-r1', label: 'R1', price: round((2 * classicPivot) - low), type: 'resistance', method: 'Classic' },
    { id: 'classic-r2', label: 'R2', price: round(classicPivot + range), type: 'resistance', method: 'Classic' },
    { id: 'classic-s1', label: 'S1', price: round((2 * classicPivot) - high), type: 'support', method: 'Classic' },
    { id: 'classic-s2', label: 'S2', price: round(classicPivot - range), type: 'support', method: 'Classic' },
    { id: 'fib-r1', label: 'Fib R1', price: round(classicPivot + (0.382 * range)), type: 'resistance', method: 'Fibonacci' },
    { id: 'fib-r2', label: 'Fib R2', price: round(classicPivot + (0.618 * range)), type: 'resistance', method: 'Fibonacci' },
    { id: 'fib-s1', label: 'Fib S1', price: round(classicPivot - (0.382 * range)), type: 'support', method: 'Fibonacci' },
    { id: 'fib-s2', label: 'Fib S2', price: round(classicPivot - (0.618 * range)), type: 'support', method: 'Fibonacci' },
    { id: 'woodie-p', label: 'Woodie P', price: round(woodiePivot), type: 'pivot', method: 'Woodie' },
    { id: 'woodie-r1', label: 'Woodie R1', price: round((2 * woodiePivot) - low), type: 'resistance', method: 'Woodie' },
    { id: 'woodie-s1', label: 'Woodie S1', price: round((2 * woodiePivot) - high), type: 'support', method: 'Woodie' },
  ];

  return levels.filter((level) => Number.isFinite(level.price));
};
