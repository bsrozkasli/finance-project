import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatVolume } from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats USD values with two decimals by default', () => {
      expect(formatCurrency(1234.5)).toBe('$1,234.50');
    });

    it('formats negative and zero values without losing sign or cents', () => {
      expect(formatCurrency(-42)).toBe('-$42.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('supports a caller-provided currency code', () => {
      expect(formatCurrency(99.9, 'EUR')).toBe('€99.90');
    });
  });

  describe('formatVolume', () => {
    it('uses compact notation for large volumes', () => {
      expect(formatVolume(1_250_000)).toBe('1.3M');
    });

    it('keeps small volumes readable', () => {
      expect(formatVolume(950)).toBe('950');
    });
  });

  describe('formatDate', () => {
    it('formats ISO timestamps as an en-US calendar date', () => {
      expect(formatDate('2026-07-09T12:00:00.000Z')).toBe('Jul 9, 2026');
    });
  });
});
