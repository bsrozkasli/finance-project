import { describe, expect, it } from 'vitest';
import { assetTypeLabel, formatCurrency, formatDate, formatVolume } from './formatters';

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
    it('formats ISO timestamps as a Turkish calendar date', () => {
      expect(formatDate('2026-07-09T12:00:00.000Z')).toBe('9 Tem 2026');
    });
  });

  describe('assetTypeLabel', () => {
    it('labels backend asset types in Turkish and an unresolved type as unknown', () => {
      expect(assetTypeLabel('STOCK')).toBe('Hisse senedi');
      expect(assetTypeLabel('ETF')).toBe('ETF');
      expect(assetTypeLabel('CRYPTO')).toBe('Kripto para');
      expect(assetTypeLabel('FOREX')).toBe('Döviz');
      expect(assetTypeLabel('INDEX')).toBe('Endeks');
      expect(assetTypeLabel('UNRESOLVED')).toBe('Tür bilinmiyor');
    });

    it('never upgrades a missing or unknown type to a known one', () => {
      expect(assetTypeLabel(null)).toBe('Tür bilinmiyor');
      expect(assetTypeLabel('')).toBe('Tür bilinmiyor');
      expect(assetTypeLabel('BOND')).toBe('BOND');
    });
  });
});
