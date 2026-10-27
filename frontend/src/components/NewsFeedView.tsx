import { useState, useMemo } from 'react';
import { Search, ExternalLink, Globe, Landmark, Cpu, BarChart3, Star } from 'lucide-react';
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

  // Only sources that actually delivered headlines are listed; no publisher is implied as a feed source.
  const feedSources = useMemo(() => {
    const counts = new Map<string, number>();
    news.forEach((newsItem) => counts.set(newsItem.source, (counts.get(newsItem.source) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [news]);

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
        return 'Makroekonomi';
      case 'stock':
        return 'Varlık haberi';
      case 'tech':
        return 'Teknoloji / sektör';
      default:
        return 'Genel piyasa';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
            Piyasa ve makro haberler
          </h2>
          <p className="text-sm text-text-secondary">
            Aktif portföyünüzle ilişkili piyasa ve makro gelişmeleri izleyin (
            <span className="font-bold text-primary">
              {activePortfolio?.holdings.map((h) => h.symbol).join(', ') || 'Varlık yok'}
            </span>
            ). Kaynak bağlantıları ve filtreler haberlerin yanında yer alır.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-bg-card border border-outline-variant rounded-md p-4 shadow-lg text-xs">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tüm haberler' },
            { id: 'macro', label: 'Makroekonomi' },
            { id: 'stock', label: 'Varlık haberleri' },
            { id: 'tech', label: 'Teknoloji ve sektör' },
          ].map((tab) => (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'macro' | 'stock' | 'tech')}
              className={`px-3 py-1.5 rounded-lg font-sans font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-bg-base '
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
            placeholder="Başlık, sembol veya kaynakta ara…"
            aria-label="Haberlerde ara"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-base border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all font-sans"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sortedAndFilteredNews.length === 0 ? (
            <div className="bg-bg-card border border-outline-variant rounded-md p-10 text-center text-xs text-text-muted">
              Veri yok: aramayla eşleşen haber bulunamadı.
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
                  className={`block bg-bg-card border rounded-md p-5 hover:border-primary/40 transition-all  group relative overflow-hidden ${
                    isPortfolioRelated ? 'border-primary/40 bg-primary-container/5' : 'border-outline-variant'
                  }`}
                >
                  {isPortfolioRelated && (
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 text-xs font-bold font-sans flex items-center gap-1.5 rounded-bl-xl border-l border-b border-primary/20">
                      <Star className="w-3 h-3 fill-primary stroke-none" />
                      <span>Portföyle ilgili</span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-bg-base border border-outline-variant/40 flex items-center justify-center shrink-0">
                      {getCategoryIcon(newsItem.category)}
                    </div>

                    <div className="flex-1 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted font-data-mono uppercase">
                        <span className="font-bold text-text-secondary">{newsItem.source}</span>
                        <span>-</span>
                        <span>{newsItem.time}</span>
                        <span>-</span>
                        <span className="text-primary font-bold">{formatCategory(newsItem.category)}</span>
                        {newsItem.symbol && (
                          <>
                            <span>-</span>
                            <span className="px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary/25 rounded font-extrabold text-xs">
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

                      <div className="flex items-center gap-1 text-xs text-primary group-hover:underline font-bold pt-1 font-sans">
                        Kaynağı aç
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>

        <section aria-labelledby="news-feed-sources" className="bg-bg-card border border-outline-variant rounded-md p-5 space-y-4 self-start">
          <h3 id="news-feed-sources" className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" aria-hidden="true" />
            Akıştaki kaynaklar
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            Başlıklar backend haber sağlayıcısından gelir ve özgün yayıncı sayfasına açılır. Yalnız bu akışta başlığı bulunan kaynaklar listelenir.
          </p>
          {feedSources.length === 0 ? (
            <p className="text-xs text-text-muted">Veri yok: haber akışı boş.</p>
          ) : (
            <ul className="space-y-2 text-xs font-sans">
              {feedSources.map(([source, count]) => (
                <li key={source} className="flex items-center justify-between p-2.5 bg-bg-base/50 border border-outline-variant/20 rounded-lg">
                  <span className="font-bold text-text-primary">{source}</span>
                  <span className="text-text-muted font-data-mono">{count} başlık</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
