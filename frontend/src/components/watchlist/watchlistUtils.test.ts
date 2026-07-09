import { describe, expect, it } from 'vitest';
import type { FundamentalsData } from '../../api/client';
import type { PriceHistory } from '../../api/types';
import {
  fmtCurrency,
  fmtNum,
  fmtPct,
  normalizePerformance,
  positiveColor,
  readWatchlistSettings,
  revenueGrowth,
  sparklinePath,
  watchlistSettingsKey,
  writeWatchlistSettings,
  yearRange,
} from './watchlistUtils';

const bar = (timestamp: string, close: number, high = close, low = close): PriceHistory => ({
  assetId: 'AAPL',
  open: close,
  high,
  low,
  close,
  volume: 1000,
  timestamp,
});

describe('watchlistUtils', () => {
  describe('number formatting', () => {
    it('formats currency, percentage, and plain numbers with expected signs and decimals', () => {
      expect(fmtCurrency(1234.5)).toBe('$1,234.50');
      expect(fmtPct(2.345)).toBe('+2.35%');
      expect(fmtPct(-2.345)).toBe('-2.35%');
      expect(fmtNum(1.23456, 3)).toBe('1.235');
    });

    it('returns dashes for missing or non-finite values', () => {
      expect(fmtCurrency(null)).toBe('-');
      expect(fmtCurrency(Number.NaN)).toBe('-');
      expect(fmtPct(undefined)).toBe('-');
      expect(fmtPct(Number.POSITIVE_INFINITY)).toBe('-');
      expect(fmtNum(Number.NEGATIVE_INFINITY)).toBe('-');
    });

    it('selects positive color for zero/missing values and negative color for losses', () => {
      expect(positiveColor(0)).toBe('var(--color-bull)');
      expect(positiveColor(undefined)).toBe('var(--color-bull)');
      expect(positiveColor(-0.01)).toBe('var(--color-bear)');
    });
  });

  describe('watchlist settings persistence', () => {
    it('returns defaults when localStorage has no settings', () => {
      expect(readWatchlistSettings()).toEqual({ colors: {}, order: {}, alerts: [] });
    });

    it('round-trips settings through localStorage', () => {
      const settings = {
        colors: { 1: '#fff' },
        order: { 1: ['AAPL', 'MSFT'] },
        alerts: [{ id: 'a1', symbol: 'AAPL', type: 'PRICE_ABOVE' as const, threshold: 200, createdAt: '2026-07-09' }],
      };

      writeWatchlistSettings(settings);

      expect(JSON.parse(localStorage.getItem(watchlistSettingsKey) ?? '{}')).toEqual(settings);
      expect(readWatchlistSettings()).toEqual(settings);
    });

    it('falls back to defaults for invalid JSON', () => {
      localStorage.setItem(watchlistSettingsKey, '{invalid-json');

      expect(readWatchlistSettings()).toEqual({ colors: {}, order: {}, alerts: [] });
    });

    it('fills missing partial settings with defaults', () => {
      localStorage.setItem(watchlistSettingsKey, JSON.stringify({ colors: { 2: '#000' } }));

      expect(readWatchlistSettings()).toEqual({ colors: { 2: '#000' }, order: {}, alerts: [] });
    });
  });

  describe('chart helpers', () => {
    it('returns an empty sparkline path for empty data', () => {
      expect(sparklinePath([])).toBe('');
    });

    it('builds a deterministic sparkline path for multiple values', () => {
      expect(sparklinePath([10, 15, 20], 100, 50)).toBe('M 0.0 50.0 L 50.0 25.0 L 100.0 0.0');
    });

    it('handles a single sparkline value without dividing by zero', () => {
      expect(sparklinePath([10], 100, 50)).toBe('M 0.0 50.0');
    });
  });

  describe('financial calculations', () => {
    it('returns null 52-week range for empty bars and min/max for populated bars', () => {
      expect(yearRange([])).toEqual({ high52w: null, low52w: null });
      expect(yearRange([bar('2026-01-01T00:00:00Z', 10, 12, 8), bar('2026-01-02T00:00:00Z', 20, 25, 18)]))
        .toEqual({ high52w: 25, low52w: 8 });
    });

    it('calculates revenue growth from chronological revenue values', () => {
      const fundamentals: FundamentalsData = {
        symbol: 'AAPL',
        revenue: [{ year: 2025, value: 100 }, { year: 2024, value: 80 }],
        netIncome: [],
        eps: [],
        freeCashFlow: [],
      };

      expect(revenueGrowth(fundamentals)).toBe(25);
    });

    it('returns null revenue growth for missing, short, or zero previous revenue', () => {
      expect(revenueGrowth(null)).toBeNull();
      expect(revenueGrowth({ symbol: 'AAPL', revenue: [{ year: 2025, value: 100 }], netIncome: [], eps: [], freeCashFlow: [] })).toBeNull();
      expect(revenueGrowth({ symbol: 'AAPL', revenue: [{ year: 2024, value: 0 }, { year: 2025, value: 100 }], netIncome: [], eps: [], freeCashFlow: [] })).toBeNull();
    });

    it('normalizes performance relative to the first close', () => {
      expect(normalizePerformance([
        bar('2026-07-01T20:00:00Z', 100),
        bar('2026-07-02T20:00:00Z', 110),
        bar('2026-07-03T20:00:00Z', 90),
      ])).toEqual([
        { date: '2026-07-01', value: 0 },
        { date: '2026-07-02', value: 10 },
        { date: '2026-07-03', value: -10 },
      ]);
    });

    it('returns empty normalized performance for empty bars or zero first close', () => {
      expect(normalizePerformance([])).toEqual([]);
      expect(normalizePerformance([bar('2026-07-01T20:00:00Z', 0), bar('2026-07-02T20:00:00Z', 10)])).toEqual([]);
    });
  });
});
