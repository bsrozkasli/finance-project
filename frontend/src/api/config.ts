const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export const resolveApiBaseUrl = (raw: string | undefined): string => {
  const trimmed = raw?.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : DEFAULT_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
