import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBatchAssetProfiles,
  fetchBatchLatestPrices,
  type AssetResearchSection,
  type CompanyProfile,
  type MarketQuote,
} from '../api/client';

const REFRESH_INTERVAL_MS = 30_000;

export interface DisplayQuote {
  price: number;
  change: number | null;
  changePercent: number | null;
  timestamp: string | null;
  marketState: MarketQuote['marketState'];
  delayed: boolean | null;
}

const timestampValue = (value: string | null) => value ? Date.parse(value) || 0 : 0;

export const selectDisplayQuote = (quote: MarketQuote): DisplayQuote | null => {
  const regular = quote.regularPrice == null ? null : {
    price: quote.regularPrice,
    change: quote.regularChange,
    changePercent: quote.regularChangePercent,
    timestamp: quote.regularTimestamp,
  };
  const pre = quote.preMarketPrice == null ? null : {
    price: quote.preMarketPrice,
    change: quote.preMarketChange,
    changePercent: quote.preMarketChangePercent,
    timestamp: quote.preMarketTimestamp,
  };
  const post = quote.postMarketPrice == null ? null : {
    price: quote.postMarketPrice,
    change: quote.postMarketChange,
    changePercent: quote.postMarketChangePercent,
    timestamp: quote.postMarketTimestamp,
  };

  let selected = regular;
  if (quote.marketState === 'PRE_MARKET') selected = pre ?? regular;
  else if (quote.marketState === 'POST_MARKET') selected = post ?? regular;
  else if (quote.marketState === 'CLOSED' || quote.marketState === 'UNKNOWN' || quote.marketState == null) {
    selected = [regular, pre, post]
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
      .sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp))[0] ?? null;
  }

  return selected ? { ...selected, marketState: quote.marketState, delayed: quote.delayed } : null;
};

export function useMarketOverviewData(priceSymbols: string[], profileSymbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, AssetResearchSection<MarketQuote>>>({});
  const [profiles, setProfiles] = useState<Record<string, AssetResearchSection<CompanyProfile>>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const quoteRequestId = useRef(0);
  const activeLoadQuotes = useRef<(() => Promise<void>) | null>(null);
  const priceKey = useMemo(() => [...new Set(priceSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].sort().join(','), [priceSymbols]);
  const profileKey = useMemo(() => [...new Set(profileSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].sort().join(','), [profileSymbols]);

  useEffect(() => {
    setProfileError(null);
    if (!profileKey) {
      setProfiles({});
      return;
    }
    let cancelled = false;
    void fetchBatchAssetProfiles(profileKey.split(','))
      .then((response) => { if (!cancelled) setProfiles(response.profiles); })
      .catch(() => { if (!cancelled) setProfileError('Şirket profilleri yüklenemedi'); });
    return () => { cancelled = true; };
  }, [profileKey]);

  const loadQuotes = useCallback(async function loadCurrentQuotes(): Promise<void> {
    if (activeLoadQuotes.current !== loadCurrentQuotes || !priceKey || document.visibilityState !== 'visible') return;
    const id = ++quoteRequestId.current;
    const isCurrent = () => activeLoadQuotes.current === loadCurrentQuotes && id === quoteRequestId.current;
    try {
      const response = await fetchBatchLatestPrices(priceKey.split(','));
      if (!isCurrent()) return;
      setQuotes((current) => ({ ...current, ...response.quotes }));
      setLastUpdated(response.generatedAt);
      setQuoteError(null);
    } catch {
      if (isCurrent()) setQuoteError('Canlı fiyatlar yüklenemedi');
    }
  }, [priceKey]);

  useEffect(() => {
    activeLoadQuotes.current = loadQuotes;
    setQuotes({});
    setLastUpdated(null);
    setQuoteError(null);
    if (!priceKey) {
      return () => { activeLoadQuotes.current = null; };
    }

    let disposed = false;
    let running = false;
    let timeoutId: number | undefined;

    const schedule = () => {
      if (!disposed && document.visibilityState === 'visible') {
        timeoutId = window.setTimeout(run, REFRESH_INTERVAL_MS);
      }
    };
    const run = async () => {
      if (disposed || running || document.visibilityState !== 'visible') return;
      running = true;
      await loadQuotes();
      running = false;
      schedule();
    };
    const onVisibilityChange = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (document.visibilityState === 'visible') void run();
    };

    void run();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      activeLoadQuotes.current = null;
      if (timeoutId) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadQuotes, priceKey]);

  return { quotes, profiles, lastUpdated, error: quoteError ?? profileError, reload: loadQuotes };
}
