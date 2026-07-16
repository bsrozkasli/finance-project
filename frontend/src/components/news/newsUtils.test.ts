import { describe, expect, it } from 'vitest';
import type { CategorizedNewsItem } from '../../api/client';
import { getNewsTimestampMs, relatedSymbolsOf, sentimentIcon, timeThreshold } from './newsUtils';

const newsItem = (overrides: Partial<CategorizedNewsItem>): CategorizedNewsItem => ({
  id: 1,
  datetime: 1_783_600_000,
  headline: 'Market update',
  image: '',
  related: '',
  source: 'Unit Test Wire',
  summary: '',
  url: 'https://example.test/news',
  ...overrides,
});

describe('newsUtils', () => {
  describe('getNewsTimestampMs', () => {
    it('converts second-based provider timestamps to milliseconds', () => {
      expect(getNewsTimestampMs(newsItem({ datetime: 1_783_600_000 }))).toBe(1_783_600_000_000);
    });

    it('keeps millisecond timestamps unchanged', () => {
      expect(getNewsTimestampMs(newsItem({ datetime: 1_783_600_000_123 }))).toBe(1_783_600_000_123);
    });
  });

  describe('relatedSymbolsOf', () => {
    it('normalizes, trims, and deduplicates explicit and related symbols', () => {
      const item = newsItem({ relatedSymbols: ['aapl', 'MSFT'], related: ' AAPL, nvda, ,msft ' });

      expect(relatedSymbolsOf(item)).toEqual(['AAPL', 'MSFT', 'NVDA']);
    });

    it('returns an empty array when no symbols are present', () => {
      expect(relatedSymbolsOf(newsItem({ relatedSymbols: undefined, related: '' }))).toEqual([]);
    });
  });

  describe('sentimentIcon', () => {
    it('maps bullish, bearish, and neutral/unknown sentiments', () => {
      expect(sentimentIcon('BULLISH')).toBe('+');
      expect(sentimentIcon('BEARISH')).toBe('-');
      expect(sentimentIcon('NEUTRAL')).toBe('->');
      expect(sentimentIcon(undefined)).toBe('->');
    });
  });

  describe('timeThreshold', () => {
    it('returns null for the all-time filter', () => {
      expect(timeThreshold('ALL')).toBeNull();
    });

    it('calculates one-hour, weekly, and monthly thresholds from the fixed test clock', () => {
      const now = new Date('2026-07-09T09:00:00.000Z').getTime();

      expect(timeThreshold('1H')).toBe(now - 60 * 60 * 1000);
      expect(timeThreshold('WEEK')).toBe(now - 7 * 24 * 60 * 60 * 1000);
      expect(timeThreshold('MONTH')).toBe(now - 30 * 24 * 60 * 60 * 1000);
    });

    it('uses the local start of day for the today filter', () => {
      const expected = new Date('2026-07-09T09:00:00.000Z');
      expected.setHours(0, 0, 0, 0);

      expect(timeThreshold('TODAY')).toBe(expected.getTime());
    });
  });
});
