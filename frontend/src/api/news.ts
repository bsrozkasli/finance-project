import { apiClient } from './http';

export interface NewsItem {
  id: number;
  category?: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export const fetchNews = async (symbol: string): Promise<NewsItem[]> => {
  const response = await apiClient.get<NewsItem[]>(`/news/${symbol}`);
  return response.data;
};

export type NewsCategory =
  | 'BREAKING'
  | 'PORTFOLIO'
  | 'WATCHLIST'
  | 'ECONOMY'
  | 'INFLATION'
  | 'INTEREST_RATES'
  | 'CENTRAL_BANKS'
  | 'AI'
  | 'TECHNOLOGY'
  | 'DEFENSE'
  | 'ENERGY'
  | 'HEALTHCARE';

export type NewsPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CategorizedNewsItem extends NewsItem {
  category?: NewsCategory;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  priority?: NewsPriority;
  relatedSymbols?: string[];
}

export interface AllNewsResponse {
  content: CategorizedNewsItem[];
  totalElements: number;
}

export const fetchAllNews = async (
  category?: NewsCategory,
  page = 0,
  size = 20,
  symbols?: string[]
): Promise<AllNewsResponse> => {
  const response = await apiClient.get<AllNewsResponse>('/news', {
    params: {
      ...(category ? { category } : {}),
      page,
      size,
      ...(symbols?.length ? { symbols: symbols.join(',') } : {}),
    },
  });
  return response.data;
};

export const fetchPortfolioNews = async (): Promise<CategorizedNewsItem[]> => {
  const response = await apiClient.get<CategorizedNewsItem[]>('/news/portfolio');
  return response.data;
};

export const fetchMacroNews = async (): Promise<CategorizedNewsItem[]> => {
  const response = await apiClient.get<CategorizedNewsItem[]>('/news/macro');
  return response.data;
};