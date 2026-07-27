import type { EarningsResult } from './research';
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

export interface MarketCalendarResponse {
  earnings: EarningsResult[];
  economicEvents: EconomicEvent[];
  cachedAt?: string;
}

export const fetchEconomicEvents = async (): Promise<EconomicEvent[]> => {
  const response = await apiClient.get<EconomicEvent[]>('/calendar/economic-events');
  return response.data;
};
