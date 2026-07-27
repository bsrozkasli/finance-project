import type { PriceHistory } from '../api/types';
import type { StockHistoryItem } from '../types';

export function canonicalizePriceHistory<T extends PriceHistory | StockHistoryItem>(rows: T[]): T[] {
  const bySession = new Map<string, T>();
  for (const row of rows) {
    const timestamp = 'timestamp' in row ? row.timestamp : row.date;
    const time = new Date(timestamp).getTime();
    if (!Number.isFinite(time)) continue;
    const key = timestamp.slice(0, 10);
    const current = bySession.get(key);
    if (!current || new Date(('timestamp' in current ? current.timestamp : current.date)).getTime() <= time) {
      bySession.set(key, row);
    }
  }
  return [...bySession.values()].sort((a, b) => {
    const left = new Date('timestamp' in a ? a.timestamp : a.date).getTime();
    const right = new Date('timestamp' in b ? b.timestamp : b.date).getTime();
    return left - right;
  });
}