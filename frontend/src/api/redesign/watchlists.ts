import { apiClient } from '../http';
import type { WatchlistPerformance, WatchlistUpdate } from './schemas';

/** Rename and/or reorder a watchlist (`symbols` is the full ordered list). */
export const updateWatchlist = async (watchlistId: number, body: WatchlistUpdate): Promise<void> => {
  await apiClient.put(`/watchlists/${watchlistId}`, body);
};

export const fetchWatchlistPerformance = async (
  watchlistId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<WatchlistPerformance> => {
  const response = await apiClient.get<WatchlistPerformance>(`/watchlists/${watchlistId}/performance`, { params });
  return response.data;
};
