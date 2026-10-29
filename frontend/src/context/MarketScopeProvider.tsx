import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  MarketScopeContext,
  readStoredMarketScope,
  writeStoredMarketScope,
  type MarketScope,
  type MarketScopeValue,
} from './marketScope';

export default function MarketScopeProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<MarketScope>(readStoredMarketScope);

  const toggleMarket = useCallback((next: Exclude<MarketScope, 'ALL'>) => {
    setMarket((current) => {
      const value = current === next ? 'ALL' : next;
      writeStoredMarketScope(value);
      return value;
    });
  }, []);

  const value = useMemo<MarketScopeValue>(() => ({ market, toggleMarket }), [market, toggleMarket]);
  return <MarketScopeContext.Provider value={value}>{children}</MarketScopeContext.Provider>;
}
