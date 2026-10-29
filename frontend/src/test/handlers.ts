import { http, HttpResponse, type HttpHandler } from 'msw';
import { API_BASE_URL } from '../api/config';
import { redesignDefaultHandlers } from './redesignHandlers';

export const handlers: HttpHandler[] = [
  // Shell notification bell: no notifications unless a test overrides the list.
  http.get(`${API_BASE_URL}/notifications`, () => HttpResponse.json([])),
  http.post(`${API_BASE_URL}/notifications/read-all`, () => new HttpResponse(null, { status: 204 })),
  // UI redesign v2 endpoints: UNAVAILABLE by default (see redesignHandlers.ts for fixtures).
  ...redesignDefaultHandlers(),
];
