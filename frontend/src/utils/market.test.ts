import { describe, expect, it, vi } from 'vitest';
import { isMarketOpen } from './market';

describe('isMarketOpen', () => {
  it('returns true during regular NYSE weekday hours', () => {
    vi.setSystemTime(new Date('2026-07-09T14:00:00.000Z'));

    expect(isMarketOpen()).toBe(true);
  });

  it('returns false before the market opens', () => {
    vi.setSystemTime(new Date('2026-07-09T13:00:00.000Z'));

    expect(isMarketOpen()).toBe(false);
  });

  it('returns false at and after the market close', () => {
    vi.setSystemTime(new Date('2026-07-09T20:00:00.000Z'));

    expect(isMarketOpen()).toBe(false);
  });

  it('returns false on weekends', () => {
    vi.setSystemTime(new Date('2026-07-11T15:00:00.000Z'));

    expect(isMarketOpen()).toBe(false);
  });

  it('returns false on configured holidays', () => {
    vi.setSystemTime(new Date('2026-07-04T15:00:00.000Z'));

    expect(isMarketOpen()).toBe(false);
  });
});
