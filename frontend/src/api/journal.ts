import { apiClient } from './http';

export type JournalTradeType = 'BUY' | 'SELL';
export type JournalTradeStatus = 'OPEN' | 'CLOSED';

export interface JournalTrade {
  id: number;
  symbol: string;
  company?: string;
  type: JournalTradeType;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number | null;
  marketValue?: number | null;
  commission?: number;
  strategy?: string;
  notes?: string;
  tags?: string[];
  openedAt: string;
  closedAt?: string;
  status: JournalTradeStatus;
  pnl?: number | null;
  returnPct?: number | null;
  holdingDays?: number;
  portfolioId?: number;
  transactionId?: number;
}

export interface AddJournalTradeRequest {
  symbol: string;
  type: JournalTradeType;
  quantity: number;
  purchasePrice: number;
  openedAt: string;
  closedAt?: string;
  status?: JournalTradeStatus;
  currentPrice?: number | null;
  commission?: number;
  strategy?: string;
  notes?: string;
  portfolioId?: number;
  transactionId?: number;
  tags?: string[];
}

export interface JournalStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number | null;
  avgReturn: number | null;
  bestTrade?: string;
  worstTrade?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const fetchJournalTrades = async (
  page = 0,
  size = 50
): Promise<PagedResponse<JournalTrade>> => {
  const response = await apiClient.get<PagedResponse<JournalTrade>>('/journal/trades', {
    params: { page, size, sort: 'openedAt,desc' },
  });
  return response.data;
};

export const addJournalTrade = async (
  req: AddJournalTradeRequest
): Promise<JournalTrade> => {
  const response = await apiClient.post<JournalTrade>('/journal/trades', req);
  return response.data;
};

export const updateJournalTrade = async (
  id: number,
  req: AddJournalTradeRequest
): Promise<JournalTrade> => {
  const response = await apiClient.put<JournalTrade>(`/journal/trades/${id}`, req);
  return response.data;
};

export const deleteJournalTrade = async (id: number): Promise<void> => {
  await apiClient.delete(`/journal/trades/${id}`);
};

export const fetchJournalStats = async (): Promise<JournalStats> => {
  const response = await apiClient.get<JournalStats>('/journal/trades/stats');
  return response.data;
};

// Watchlists
