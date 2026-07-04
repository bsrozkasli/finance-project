import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Globe, Landmark, Cpu, BarChart3, Star, AlertCircle } from 'lucide-react';
import { News, Stock, Portfolio, Holding } from '../types';
import { MOCK_NEWS } from '../mockData';

interface NewsFeedViewProps {
  activePortfolio: Portfolio;
  stocks: Stock[];
}

export default function NewsFeedView({ activePortfolio, stocks }: NewsFeedViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'macro' | 'stock' | 'tech'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get list of active portfolio holding symbols
  const activeSymbols = useMemo(() => {
    return new Set(activePortfolio.holdings.map((h) => h.symbol));
  }, [activePortfolio]);

  // Filter and sort news: portfolio-related news comes FIRST, then categorized and searched
  const sortedAndFilteredNews = useMemo(() => {
    let filtered = MOCK_NEWS.filter((news) => {
      // Category filter
      const matchesCategory = activeTab === 'all' || news.category === activeTab;
      
      // Search query filter
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        news.title.toLowerCase().includes(query) ||
        (news.summary && news.summary.toLowerCase().includes(query)) ||
        (news.symbol && news.symbol.toLowerCase().includes(query)) ||
        news.source.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    // Separate portfolio-related and non-portfolio-related news
    const portfolioNews: News[] = [];
    const otherNews: News[] = [];

    filtered.forEach((news) => {
      if (news.symbol && activeSymbols.has(news.symbol)) {
        portfolioNews.push(news);
      } else {
        otherNews.push(news);
      }
    });

    // Return portfolio news first, then other news
    return [...portfolioNews, ...otherNews];
  }, [activeTab, searchQuery, activeSymbols]);

  // Helper to get category icons
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

  // Helper to translate category names
  const translateCategory = (category?: string) => {
    switch (category) {
      case 'macro':
        return 'Makro Ekonomi';
      case 'stock':
        return 'Hisse Özel';
      case 'tech':
        return 'Teknoloji / Sektör';
      default:
        return 'Genel Gündem';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-text-primary tracking-tight">
            Küresel Borsa & Makro Haber Akışı
          </h2>
          <p className="text-sm text-text-secondary">
            Aktif portföyünüzdeki varlıklar (
            <span className="font-bold text-primary">
              {activePortfolio.holdings.map((h) => h.symbol).join(', ') || 'Varlık Yok'}
            </span>
            ) ile ilgili gelişmeleri ve makro ekonomik haberleri filtreleyip anında takip edin.
          </p>
        </div>
      </div>

      {/* Tabs & Search controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-bg-card border border-outline-variant rounded-xl p-4 shadow-lg text-xs">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tüm Haberler' },
            { id: 'macro', label: 'Makro Ekonomi' },
            { id: 'stock', label: 'Hisse Özel' },
            { id: 'tech', label: 'Teknoloji & Sektör' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

        {/* Real-time search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Haber başlığı, sembol veya kaynak ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-base border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all font-sans"
          />
        </div>
      </div>

      {/* News Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: News list */}
        <div className="lg:col-span-2 space-y-4">
          {sortedAndFilteredNews.length === 0 ? (
            <div className="bg-bg-card border border-outline-variant rounded-xl p-10 text-center text-xs text-text-muted">
              Kriterlerinize uygun bir haber akışı bulunamadı. Lütfen filtre veya arama kelimenizi güncelleyin.
            </div>
          ) : (
            sortedAndFilteredNews.map((news) => {
              const isPortfolioRelated = news.symbol && activeSymbols.has(news.symbol);
              return (
                <a
                  key={news.id}
                  href={news.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block bg-bg-card border rounded-xl p-5 hover:border-primary/40 transition-all shadow-md group relative overflow-hidden ${
                    isPortfolioRelated ? 'border-primary/40 bg-primary-container/5' : 'border-outline-variant'
                  }`}
                >
                  {isPortfolioRelated && (
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 text-[9px] font-bold font-sans flex items-center gap-1.5 rounded-bl-xl border-l border-b border-primary/20">
                      <Star className="w-3 h-3 fill-primary stroke-none" />
                      <span>PORTFÖYÜNÜZLE İLGİLİ</span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon container */}
                    <div className="w-10 h-10 rounded-lg bg-bg-base border border-outline-variant/40 flex items-center justify-center shrink-0">
                      {getCategoryIcon(news.category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted font-data-mono uppercase">
                        <span className="font-bold text-text-secondary">{news.source}</span>
                        <span>•</span>
                        <span>{news.time}</span>
                        <span>•</span>
                        <span className="text-primary font-bold">{translateCategory(news.category)}</span>
                        {news.symbol && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary/25 rounded font-extrabold text-[9px]">
                              {news.symbol}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-headline text-sm font-bold text-text-primary group-hover:text-primary transition-colors pr-28">
                        {news.title}
                      </h3>

                      {news.summary && (
                        <p className="text-text-secondary leading-relaxed text-xs">
                          {news.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-primary group-hover:underline font-bold pt-1 font-sans">
                        <span>Haberi Kaynağından Oku</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Right 1 Column: Macro Market Indicators / Calendar quick widget */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-outline-variant rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-headline text-xs font-bold text-text-primary uppercase tracking-wide border-b border-outline-variant/30 pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span>Piyasa Kaynak Kanalları</span>
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Nexus Terminal doğrudan global ve yerel en prestijli finans kanalları ile entegredir. Haber başlıklarına tıklayarak doğrudan orijinal kaynak sitelere erişebilirsiniz.
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
              <span className="font-bold text-text-primary block">Bilgilendirme Notu</span>
              <p className="text-text-secondary mt-1 text-[11px] leading-relaxed">
                Yapay zeka analizleri ve portföy risk raporları hazırlanırken bu haber kanallarından derlenen küresel makro duyarlılık analizleri de girdi verisi olarak hesaba katılır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
