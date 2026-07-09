import { describe, expect, it } from 'vitest';
import { FIXED_SYSTEM_TIME } from './setup';

describe('frontend test setup', () => {
  it('uses a deterministic system clock', () => {
    expect(new Date().toISOString()).toBe(FIXED_SYSTEM_TIME.toISOString());
  });

  it('installs browser polyfills needed by chart and responsive components', () => {
    expect(window.matchMedia('(min-width: 768px)').media).toBe('(min-width: 768px)');
    expect(new ResizeObserver(() => undefined)).toBeDefined();
    expect(new IntersectionObserver(() => undefined)).toBeDefined();
    expect(document.createElement('canvas').getContext('2d')).toBeTruthy();
  });
});