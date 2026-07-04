import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAllNews,
  fetchEconomicEvents,
  fetchInvestmentPortfolios,
  fetchNews,
  fetchPortfolioHoldings,
} from '../../api/client';
import type { CategorizedNewsItem, EconomicEvent, InvestmentPortfolio, NewsCategory } from '../../api/client';
import { useNewsFilters } from '../../hooks/useNewsFilters';
import { useWatchlists } from '../../hooks/useWatchlists';
import { MacroNewsBanner } from '../news/MacroNewsBanner';
import { NewsCard } from '../news/NewsCard';
import { NewsDetailPanel } from '../news/NewsDetailPanel';
import { NewsFiltersBar } from '../news/NewsFiltersBar';
import { NewsSummaryDashboard } from '../news/NewsSummaryDashboard';
import { getNewsTimestampMs, relatedSymbolsOf, timeThreshold } from '../news/newsUtils';

const PAGE_SIZE = 30;

interface PortfolioScope {
  portfolio: InvestmentPortfolio;
  symbols: string[];
}

const unique = (values: string[]) => Array.from(new Set(values.map(value => value.trim().toUpperCase()).filter(Boolean)));

const newsMatchesClientFilters = (item: CategorizedNewsItem, filters: ReturnType<typeof useNewsFilters>['filters']) => {
  if (filters.sentiment !== 'ALL' && item.sentiment !== filters.sentiment) return false;
  if (filters.priority === 'HIGH' && item.priority !== 'HIGH') return false;
  const threshold = timeThreshold(filters.time);
  if (threshold != null && getNewsTimestampMs(item) < threshold) return false;
  return true;
};

const portfolioImpactsFor = (item: CategorizedNewsItem, scopes: PortfolioScope[]) => {
  const related = relatedSymbolsOf(item);
  if (related.length === 0) return [];
  return scopes
    .filter(scope => scope.symbols.some(symbol => related.includes(symbol)))
    .map(scope => scope.portfolio.name);
};

const similarNews = (selected: CategorizedNewsItem | null, items: CategorizedNewsItem[]) => {
  if (!selected) return [];
  const selectedSymbols = relatedSymbolsOf(selected);
  return items
    .filter(item => item.id !== selected.id)
    .filter(item => item.category === selected.category || relatedSymbolsOf(item).some(symbol => selectedSymbols.includes(symbol)))
    .slice(0, 5);
};

export const NewsView = ({ symbol }: { symbol: string | null }) => {
  const { filters, setFilters } = useNewsFilters(symbol);
  const { watchlists } = useWatchlists();
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [portfolioScopes, setPortfolioScopes] = useState<PortfolioScope[]>([]);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);
  const [news, setNews] = useState<CategorizedNewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<CategorizedNewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadContext = async () => {
      const [portfolioResult, eventsResult] = await Promise.allSettled([
        fetchInvestmentPortfolios(),
        fetchEconomicEvents(),
      ]);
      if (cancelled) return;
      if (portfolioResult.status === 'fulfilled') {
        setPortfolios(portfolioResult.value);
        const holdings = await Promise.allSettled(portfolioResult.value.map(async portfolio => ({
          portfolio,
          symbols: unique((await fetchPortfolioHoldings(portfolio.id)).map(holding => holding.symbol)),
        })));
        if (!cancelled) setPortfolioScopes(holdings.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
      }
      if (eventsResult.status === 'fulfilled') setEconomicEvents(eventsResult.value);
    };
    void loadContext();
    return () => { cancelled = true; };
  }, []);

  const scopedSymbols = useMemo(() => {
    if (filters.symbol.trim()) return unique([filters.symbol]);
    if (filters.portfolioId !== 'ALL') {
      return portfolioScopes.find(scope => String(scope.portfolio.id) === filters.portfolioId)?.symbols ?? [];
    }
    if (filters.watchlistId !== 'ALL') {
      return unique(watchlists.find(watchlist => String(watchlist.id) === filters.watchlistId)?.symbols ?? []);
    }
    return symbol ? unique([symbol]) : undefined;
  }, [filters.portfolioId, filters.symbol, filters.watchlistId, portfolioScopes, symbol, watchlists]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const response = await fetchAllNews(
          filters.category !== 'ALL' ? filters.category as NewsCategory : undefined,
          filters.page,
          PAGE_SIZE,
          scopedSymbols && scopedSymbols.length > 0 ? scopedSymbols : undefined
        );
        setNews(response.content ?? []);
        setTotal(response.totalElements ?? 0);
      } catch {
        if (scopedSymbols && scopedSymbols.length > 0) {
          const settled = await Promise.allSettled(scopedSymbols.slice(0, 8).map(item => fetchNews(item)));
          const fallback = settled.flatMap(result => result.status === 'fulfilled' ? result.value as CategorizedNewsItem[] : []);
          setNews(fallback);
          setTotal(fallback.length);
        } else {
          setNews([]);
          setTotal(0);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.page, scopedSymbols]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => news.filter(item => newsMatchesClientFilters(item, filters)), [filters, news]);
  const selectedImpacts = selectedNews ? portfolioImpactsFor(selectedNews, portfolioScopes) : [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="terminal-main flex flex-col animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="flex items-center justify-between border-b px-5 pb-3 pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>News Center</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{total > 0 ? `${total} stories` : 'Market intelligence feed'}{scopedSymbols?.length ? ` · ${scopedSymbols.join(', ')}` : ''}</div>
        </div>
        <button type="button" onClick={load} className="rounded-lg p-1.5" style={{ color: 'var(--color-text-secondary)' }} title="Refresh">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <MacroNewsBanner news={filtered} events={economicEvents} />
      <NewsSummaryDashboard news={filtered} />
      <NewsFiltersBar filters={filters} portfolios={portfolios} watchlists={watchlists} onChange={setFilters} />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">{[0, 1, 2, 3, 4, 5, 6, 7].map(item => <div key={item} className="flex gap-3 px-1 py-2"><div className="skeleton h-14 w-20 shrink-0 rounded-lg" /><div className="flex-1 space-y-2"><div className="skeleton h-2.5 w-1/3 rounded" /><div className="skeleton h-4 rounded" /><div className="skeleton h-3 w-3/4 rounded" /></div></div>)}</div>
        ) : error ? (
          <div className="p-8 text-center"><div className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-bear)' }}>Failed to load news</div><div className="mb-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div><button type="button" onClick={load} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Retry</button></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><div className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>No stories found</div><div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Adjust filters or select a different symbol scope.</div></div>
        ) : (
          <div>{filtered.map((item, index) => <NewsCard key={`${item.id}-${index}`} item={item} portfolioImpacts={portfolioImpactsFor(item, portfolioScopes)} onSelect={setSelectedNews} />)}</div>
        )}
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <button type="button" disabled={filters.page <= 0} onClick={() => setFilters({ page: Math.max(0, filters.page - 1) })} className="rounded px-3 py-1.5 text-xs disabled:opacity-40" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Prev</button>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Page {filters.page + 1} / {totalPages}</span>
        <button type="button" disabled={filters.page + 1 >= totalPages} onClick={() => setFilters({ page: filters.page + 1 })} className="rounded px-3 py-1.5 text-xs disabled:opacity-40" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Next</button>
      </div>

      <NewsDetailPanel item={selectedNews} similar={similarNews(selectedNews, filtered)} portfolioImpacts={selectedImpacts} onClose={() => setSelectedNews(null)} onSelectSimilar={setSelectedNews} />
    </div>
  );
};