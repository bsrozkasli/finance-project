import { createContext, useContext } from 'react';
import type { MarketScope } from '../api/redesign/schemas/common';

/** Internal market filter value; matches the `market` query parameter of the v2 contract (X-5). */
export type { MarketScope };

export const MARKET_SCOPE_STORAGE_KEY = 'finance.marketScope';

export interface MarketScopeValue {
  market: MarketScope;
  /** Selects a market; pressing the active market again returns to `ALL`. */
  toggleMarket: (market: Exclude<MarketScope, 'ALL'>) => void;
}

export const isMarketScope = (value: unknown): value is MarketScope => (
  value === 'ALL' || value === 'BIST' || value === 'US'
);

export const readStoredMarketScope = (): MarketScope => {
  try {
    const stored = window.localStorage.getItem(MARKET_SCOPE_STORAGE_KEY);
    return isMarketScope(stored) ? stored : 'ALL';
  } catch {
    return 'ALL';
  }
};

export const writeStoredMarketScope = (market: MarketScope): void => {
  try {
    window.localStorage.setItem(MARKET_SCOPE_STORAGE_KEY, market);
  } catch {
    // Storage can be blocked (private window); the in-memory value still applies.
  }
};

/** Without a provider the scope stays `ALL` and toggling is a no-op, so isolated components still render. */
export const MarketScopeContext = createContext<MarketScopeValue>({
  market: 'ALL',
  toggleMarket: () => undefined,
});

export const useMarketScope = (): MarketScopeValue => useContext(MarketScopeContext);
