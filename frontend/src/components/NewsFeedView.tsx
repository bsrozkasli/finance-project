import { useState, useMemo } from 'react';
import { Search, ExternalLink, Globe, Landmark, Cpu, BarChart3, Star, AlertCircle } from 'lucide-react';
import type { News, Portfolio } from '../types';

interface NewsFeedViewProps {
  activePortfolio: Portfolio | null;
  news: News[];
}

export default function NewsFeedView({ activePortfolio, news }: NewsFeedViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'macro' | 'stock' | 'tech'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeSymbols = useMemo(() => {
    return new Set(activePortfolio?.holdings.map((h) => h.symbol) ?? []);
  }, [activePortfolio]);

  const sortedAndFilteredNews = useMemo(() => {
    const filtered = news.filter((newsItem) => {
      const matchesCategory = activeTab === 'all' || newsItem.category === activeTab;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        newsItem.title.toLowerCase().includes(query) ||
        (newsItem.summary && newsItem.summary.toLowerCase().includes(query)) ||
        (newsItem.symbol && newsItem.symbol.toLowerCase().includes(query)) ||
        newsItem.source.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    const portfolioNews: News[] = [];
    const otherNews: News[] = [];

    filtered.forEach((newsItem) => {
      if (newsItem.symbol && activeSymbols.has(newsItem.symbol)) {
        portfolioNews.push(newsItem);
      } else {
        otherNews.push(newsItem);
      }
    });

    return [...portfolioNews, ...otherNews];
  }, [activeTab, searchQuery, activeSymbols, news]);

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'macro':
        return <Landmark className="w-4 h-4 text-primary" />;
      case 'stock':
        return <BarChart3 className="w-4 h-4 text-bull-green" />;
      case 'tech':
        return <Cpu className="w-4 h-4 text-warning-amber" />;
      default:
        return <Globe className="w-4 h-4 text-text-muted" />;
    }
  };

  const formatCategory = (category?: string) => {
    switch (category) {
      case 'macro':
        return 'Macro Economy';
      case 'stock':
        return 'Stock Specific';
      case 'tech':
        return 'Technology / Sector';
      default:
        return 'General Market';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
            Global Markets & Macro News Feed
          </h2>
          <p className="text-sm text-text-secondary">
            Track market and macro developments related to your active portfolio (
            <span className="font-bold text-primary">
              {activePortfolio?.holdings.map((h) => h.symbol).join(', ') || 'No Assets'}
            </span>
            ) with fast filtering and source links.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-bg-card border border-outline-variant rounded-xl p-4 shadow-lg text-xs">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All News' },
            { id: 'macro', label: 'Macro Economy' },
            { id: 'stock', label: 'Stock Specific' },
            { id: 'tech', label: 'Technology & Sector' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'macro' | 'stock' | 'tech')}
              className={`px-3 py-1.5 rounded-lg font-sans font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-bg-base shadow-sm'
                  : 'bg-bg-base/60 text-text-secondary hover:text-text-primary border border-outline-variant/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search headline, symbol, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-base border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all font-sans"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sortedAndFilteredNews.length === 0 ? (
            <div className="bg-bg-card border border-outline-variant rounded-xl p-10 text-center text-xs text-text-muted">
              No matching market news found.
            </div>
          ) : (
            sortedAndFilteredNews.map((newsItem) => {
              const isPortfolioRelated = newsItem.symbol && activeSymbols.has(newsItem.symbol);
              return (
                <a
                  key={newsItem.id}
                  href={newsItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block bg-bg-card border rounded-xl p-5 hover:border-primary/40 transition-all shadow-md group relative overflow-hidden ${
                    isPortfolioRelated ? 'border-primary/40 bg-primary-container/5' : 'border-outline-variant'
                  }`}
                >
                  {isPortfolioRelated && (
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 text-[9px] font-bold font-sans flex items-center gap-1.5 rounded-bl-xl border-l border-b border-primary/20">
                      <Star className="w-3 h-3 fill-primary stroke-none" />
                      <span>PORTFOLIO RELATED</span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-bg-base border border-outline-variant/40 flex items-center justify-center shrink-0">
                      {getCategoryIcon(newsItem.category)}
                    </div>

                    <div className="flex-1 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted font-data-mono uppercase">
                        <span className="font-bold text-text-secondary">{newsItem.source}</span>
                        <span>-</span>
                        <span>{newsItem.time}</span>
                        <span>-</span>
                        <span className="text-primary font-bold">{formatCategory(newsItem.category)}</span>
                        {newsItem.symbol && (
                          <>
                            <span>-</span>
                            <span className="px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary/25 rounded font-extrabold text-[9px]">
                              {newsItem.symbol}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-headline text-sm font-bold text-text-primary group-hover:text-primary transition-colors pr-28">
                        {newsItem.title}
                      </h3>

                      {newsItem.summary && (
                        <p className="text-text-secondary leading-relaxed text-xs">
                          {newsItem.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-primary group-hover:underline font-bold pt-1 font-sans">
                        Open Source
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Market Sources
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Nexus Terminal links to global and local finance sources. Open headlines to inspect the original publisher page.
            </p>
            <div className="space-y-2 text-xs font-sans">
              <a href="https://www.bloomberght.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 bg-bg-base/50 hover:bg-bg-base border border-outline-variant/20 rounded-lg group">
                <span className="font-bold text-text-primary group-hover:text-primary transition-colors">Bloomberg HT</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-primary" />
              </a>
              <a href="https://www.reuters.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 bg-bg-base/50 hover:bg-bg-base border border-outline-variant/20 rounded-lg group">
                <span className="font-bold text-text-primary group-hover:text-primary transition-colors">Reuters News</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-primary" />
              </a>
              <a href="https://tr.investing.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 bg-bg-base/50 hover:bg-bg-base border border-outline-variant/20 rounded-lg group">
                <span className="font-bold text-text-primary group-hover:text-primary transition-colors">Investing TR</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-primary" />
              </a>
            </div>
          </div>

          <div className="bg-bg-card border border-outline-variant/40 rounded-xl p-4 flex gap-3 text-xs font-sans">
            <AlertCircle className="w-5 h-5 text-warning-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-text-primary block">Information Note</span>
              <p className="text-text-secondary mt-1 text-[11px] leading-relaxed">
                AI analysis and portfolio risk reports use real provider data when it is available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
