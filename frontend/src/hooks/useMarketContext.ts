import { useEffect, useState } from 'react';
import type { CategorizedNewsItem, EconomicEvent } from '../api/client';
import { fetchEconomicEvents, fetchPortfolioNews } from '../api/client';
import type { CalendarEvent, News } from '../types';

const mapNews = (item: CategorizedNewsItem): News => ({
  id: String(item.id),
  title: item.headline,
  source: item.source,
  time: new Date(item.datetime > 10_000_000_000 ? item.datetime : item.datetime * 1000).toLocaleString('en-US'),
  summary: item.summary || undefined,
  category: item.category === 'TECHNOLOGY' || item.category === 'AI' ? 'tech' : item.category ? 'macro' : 'market',
  symbol: item.relatedSymbols?.[0] || item.related?.split(',')[0]?.trim() || undefined,
  url: item.url,
});

const mapEvent = (item: EconomicEvent, index: number): CalendarEvent => ({
  id: String(index),
  title: item.event,
  date: item.date?.slice(0, 10) || '',
  time: item.date?.slice(11, 16) || '',
  importance: item.impact === 'CRITICAL' || item.impact === 'HIGH' || item.impact === 'MEDIUM'
    ? item.impact
    : undefined,
});

export function useMarketContext() {
  const [news, setNews] = useState<News[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const [newsResult, eventsResult] = await Promise.allSettled([
        fetchPortfolioNews(),
        fetchEconomicEvents(),
      ]);

      if (cancelled) return;

      setNews(newsResult.status === 'fulfilled' ? newsResult.value.map(mapNews) : []);
      setCalendarEvents(eventsResult.status === 'fulfilled' ? eventsResult.value.map(mapEvent) : []);

      const unavailable: string[] = [];
      if (newsResult.status === 'rejected') unavailable.push('portfolio news');
      if (eventsResult.status === 'rejected') unavailable.push('economic events');
      setError(unavailable.length ? `Failed to load ${unavailable.join(' and ')}` : null);
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return { news, calendarEvents, loading, error };
}
