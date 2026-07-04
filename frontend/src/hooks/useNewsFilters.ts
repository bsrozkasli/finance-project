import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { NewsCategory } from '../api/client';
import type { NewsFilters, PriorityFilter, SentimentFilter, TimeFilter } from '../components/news/newsUtils';

const categoryValues = new Set<string>([
  'ALL',
  'BREAKING',
  'PORTFOLIO',
  'WATCHLIST',
  'ECONOMY',
  'INFLATION',
  'INTEREST_RATES',
  'CENTRAL_BANKS',
  'AI',
  'TECHNOLOGY',
  'DEFENSE',
  'ENERGY',
  'HEALTHCARE',
]);

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value && allowed.includes(value as T) ? value as T : fallback;

export function useNewsFilters(initialSymbol: string | null) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<NewsFilters>(() => {
    const category = searchParams.get('category');
    return {
      category: category && categoryValues.has(category) ? category as NewsCategory | 'ALL' : 'ALL',
      sentiment: oneOf<SentimentFilter>(searchParams.get('sentiment'), ['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'], 'ALL'),
      priority: oneOf<PriorityFilter>(searchParams.get('priority'), ['ALL', 'HIGH'], 'ALL'),
      time: oneOf<TimeFilter>(searchParams.get('time'), ['ALL', '1H', 'TODAY', 'WEEK', 'MONTH'], 'ALL'),
      portfolioId: searchParams.get('portfolioId') ?? 'ALL',
      watchlistId: searchParams.get('watchlistId') ?? 'ALL',
      symbol: (searchParams.get('symbol') ?? initialSymbol ?? '').toUpperCase(),
      page: Number(searchParams.get('page') ?? '0') || 0,
    };
  }, [initialSymbol, searchParams]);

  const setFilters = useCallback((patch: Partial<NewsFilters>) => {
    const next = new URLSearchParams(searchParams);
    const merged = { ...filters, ...patch };
    const setOrDelete = (key: string, value: string | number, emptyValues: string[] = ['ALL', '']) => {
      const text = String(value);
      if (emptyValues.includes(text)) next.delete(key);
      else next.set(key, text);
    };

    setOrDelete('category', merged.category);
    setOrDelete('sentiment', merged.sentiment);
    setOrDelete('priority', merged.priority);
    setOrDelete('time', merged.time);
    setOrDelete('portfolioId', merged.portfolioId);
    setOrDelete('watchlistId', merged.watchlistId);
    setOrDelete('symbol', merged.symbol.trim().toUpperCase());
    setOrDelete('page', merged.page, ['0']);
    setSearchParams(next, { replace: false });
  }, [filters, searchParams, setSearchParams]);

  return { filters, setFilters };
}