import { apiClient } from '../http';
import type {
  CalendarCategory,
  CalendarEvents,
  Importance,
  NewsCategory,
  NewsItems,
  PortfolioNewsImpact,
  SectorImpact,
  Topics,
} from './schemas';

export interface CalendarEventsParams {
  category?: CalendarCategory;
  importance?: Importance;
  portfolioId?: number;
  /** ISO date (yyyy-MM-dd). */
  from?: string;
  to?: string;
}

export interface NewsItemsParams {
  category?: NewsCategory;
  scope?: 'ALL' | 'PORTFOLIO';
  impact?: Importance;
  q?: string;
  symbols?: string[];
  limit?: number;
  offset?: number;
}

export const fetchCalendarEvents = async (params: CalendarEventsParams = {}): Promise<CalendarEvents> => {
  const response = await apiClient.get<CalendarEvents>('/calendar/events', { params });
  return response.data;
};

export const fetchNewsItems = async ({ symbols, ...rest }: NewsItemsParams = {}): Promise<NewsItems> => {
  const response = await apiClient.get<NewsItems>('/news/items', {
    params: { ...rest, symbols: symbols?.join(',') },
  });
  return response.data;
};

export const fetchNewsPortfolioImpact = async (portfolioId?: number): Promise<PortfolioNewsImpact> => {
  const response = await apiClient.get<PortfolioNewsImpact>('/news/portfolio-impact', { params: { portfolioId } });
  return response.data;
};

export const fetchNewsSectorImpact = async (): Promise<SectorImpact> => {
  const response = await apiClient.get<SectorImpact>('/news/sector-impact');
  return response.data;
};

export const fetchNewsTopics = async (limit?: number): Promise<Topics> => {
  const response = await apiClient.get<Topics>('/news/topics', { params: { limit } });
  return response.data;
};
