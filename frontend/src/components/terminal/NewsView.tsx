import { useState, useEffect } from 'react';
import { fetchNews } from '../../api/client';
import type { NewsItem } from '../../api/client';

export const NewsView = ({ symbol }: { symbol: string | null }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNews(symbol);
        setNews(data || []);
        setError(null);
      } catch {
        setError('Failed to fetch news');
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [symbol]);

  if (!symbol) {
    return (
      <div className="terminal-main flex items-center justify-center text-white/50">
        Haberleri görmek için bir hisse seçin.
      </div>
    );
  }

  return (
    <div className="terminal-main overflow-y-auto p-6" style={{ background: 'var(--color-bg-primary)' }}>
      <h2 className="text-xl font-bold mb-4 text-white">Haber Merkezi - {symbol}</h2>
      
      {loading && <div className="text-white/50">Yükleniyor...</div>}
      {error && <div className="text-red-400">{error}</div>}
      
      {!loading && !error && news.length === 0 && (
        <div className="text-white/50">Son günlerde önemli bir haber bulunamadı.</div>
      )}
      
      <div className="space-y-4">
        {news.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl border border-white/10 hover:border-white/30 transition-colors"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <div className="flex gap-4">
              {item.image && (
                <img src={item.image} alt="News" className="w-24 h-24 object-cover rounded-lg" />
              )}
              <div>
                <div className="text-xs text-emerald-400 mb-1">{item.source} &bull; {new Date(item.datetime * 1000).toLocaleDateString()}</div>
                <h3 className="font-bold text-white mb-2">{item.headline}</h3>
                <p className="text-sm text-white/70 line-clamp-2">{item.summary}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
