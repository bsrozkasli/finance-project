import { apiClient } from './http';

export interface MacroSnapshot {
  fedFundsRate?: number | null;
  cpi?: number | null;
  cpiYoy?: number | null;
  gdpGrowth?: number | null;
  unemploymentRate?: number | null;
  treasury10y?: number | null;
  treasury2y?: number | null;
  yieldCurveSpread?: number | null;
  observedAt?: string | null;
  cachedAt?: string | null;
}

export const fetchMacroSnapshot = async (): Promise<MacroSnapshot> => {
  const response = await apiClient.get<MacroSnapshot>('/macro/snapshot');
  return response.data;
};
export interface EconomicEvent {
  event: string;
  date: string;
  country?: string;
  impact?: string;
  actual?: unknown;
  estimate?: unknown;
  previous?: unknown;
}

export interface CalendarEarningsEvent {
  symbol: string;
  date?: string | null;
  epsEstimate?: number | null;
  epsActual?: number | null;
  revenueEstimate?: number | null;
  revenueActual?: number | null;
  time?: string | null;
  portfolioRelated?: boolean | null;
  sectorLeader?: boolean | null;
}

export interface MarketCalendarResponse {
  earnings: CalendarEarningsEvent[];
  economicEvents: EconomicEvent[];
  cachedAt?: string;
}

export const fetchMarketCalendar = async (symbols?: string[]): Promise<MarketCalendarResponse> => {
  const response = await apiClient.get<MarketCalendarResponse>('/calendar', { params: symbols?.length ? { symbols: symbols.join(',') } : {} });
  return response.data;
};

export const fetchEconomicEvents = async (): Promise<EconomicEvent[]> => {
  const response = await apiClient.get<EconomicEvent[]>('/calendar/economic-events');
  return response.data;
};

export interface MarketSession {
  exchange: string;
  state: 'PRE_MARKET' | 'REGULAR' | 'POST_MARKET' | 'CLOSED' | 'UNKNOWN';
  timezone: string;
  nextOpen?: string | null;
  nextClose?: string | null;
  source?: string;
}

export const fetchMarketSessions = async (exchanges = ['XNYS', 'XIST']): Promise<MarketSession[]> => {
  const response = await apiClient.get<MarketSession[]>('/market/sessions', { params: { exchanges: exchanges.join(',') } });
  return response.data;
};