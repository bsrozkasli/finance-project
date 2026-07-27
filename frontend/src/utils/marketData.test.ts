import { describe, expect, it } from 'vitest';
import type { PriceHistory } from '../api/types';
import type { StockHistoryItem } from '../types';
import { canonicalizePriceHistory } from './marketData';

const price = (timestamp: string, close: number): PriceHistory => ({
  assetId: 'AAPL',
  open: close - 1,
  high: close + 1,
  low: close - 2,
  close,
  volume: 1000,
  timestamp,
});

const historyItem = (date: string, priceValue: number): StockHistoryItem => ({
  date,
  price: priceValue,
  open: priceValue - 1,
  high: priceValue + 1,
  low: priceValue - 2,
  close: priceValue,
  volume: 1000,
});

describe('canonicalizePriceHistory', () => {
  it('sorts valid backend price rows and keeps the latest row per session', () => {
    const olderSession = price('2026-07-08T20:00:00Z', 100);
    const staleDuplicate = price('2026-07-09T13:30:00Z', 101);
    const latestDuplicate = price('2026-07-09T20:00:00Z', 110);
    const invalid = price('not-a-date', 999);

    const result = canonicalizePriceHistory([
      latestDuplicate,
      invalid,
      olderSession,
      staleDuplicate,
    ]);

    expect(result).toEqual([olderSession, latestDuplicate]);
  });

  it('supports stock history rows that use date instead of timestamp', () => {
    const first = historyItem('2026-07-08', 100);
    const earlierDuplicate = historyItem('2026-07-09T09:30:00Z', 101);
    const laterDuplicate = historyItem('2026-07-09T20:00:00Z', 108);

    const result = canonicalizePriceHistory<StockHistoryItem>([
      laterDuplicate,
      first,
      earlierDuplicate,
    ]);

    expect(result).toEqual([first, laterDuplicate]);
  });
});
