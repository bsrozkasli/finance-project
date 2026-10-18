import { http, HttpResponse } from 'msw';
import { isCancel } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiClient } from './client';
import { API_BASE_URL, resolveApiBaseUrl } from './config';
import {
  ApiError,
  getApiErrorMessage,
  getApiErrorResponse,
  getApiErrorStatus,
  isBackendErrorResponse,
} from './errors';
import { server } from '../test/server';

const url = (path: string) => `${API_BASE_URL}${path}`;

const captureRejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to reject');
};

describe('resolveApiBaseUrl', () => {
  it('defaults to the Spring API base when no override is configured', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:8080/api/v1');
    expect(resolveApiBaseUrl('   ')).toBe('http://localhost:8080/api/v1');
  });

  it('strips trailing slashes from an override', () => {
    expect(resolveApiBaseUrl('/api/v1/')).toBe('/api/v1');
    expect(resolveApiBaseUrl('https://api.example.test/api/v1//')).toBe('https://api.example.test/api/v1');
  });
});

describe('apiClient error normalization', () => {
  it('uses the backend error contract message and status', async () => {
    server.use(
      http.delete(url('/portfolios/2'), () => HttpResponse.json({
        timestamp: '2026-10-17T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'Portfolio cannot be deleted while it has active holdings',
        path: '/api/v1/portfolios/2',
      }, { status: 409 })),
    );

    const error = await captureRejection(apiClient.delete('/portfolios/2'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'Portfolio cannot be deleted while it has active holdings',
      status: 409,
      path: '/api/v1/portfolios/2',
      isNetworkError: false,
    });
  });

  it('falls back to the HTTP status when the body is not the backend contract', async () => {
    server.use(
      http.get(url('/macro/snapshot'), () => new HttpResponse('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })),
    );

    const error = await captureRejection(apiClient.get('/macro/snapshot'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'İstek başarısız oldu (HTTP 502).', status: 502, path: null, isNetworkError: false });
  });

  it('falls back to the HTTP status when the backend message is blank', async () => {
    server.use(
      http.get(url('/macro/snapshot'), () => HttpResponse.json({
        timestamp: '2026-10-17T10:00:00Z',
        status: 503,
        error: 'Service Unavailable',
        message: '   ',
        path: '/api/v1/macro/snapshot',
      }, { status: 503 })),
    );

    const error = await captureRejection(apiClient.get('/macro/snapshot'));

    expect(error).toMatchObject({ message: 'İstek başarısız oldu (HTTP 503).', status: 503 });
  });

  it('marks transport failures as network errors', async () => {
    server.use(http.get(url('/assets'), () => HttpResponse.error()));

    const error = await captureRejection(apiClient.get('/assets'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'Sunucuya ulaşılamadı. Backend çalışıyor mu?',
      status: null,
      isNetworkError: true,
    });
  });

  it('passes cancellations through unchanged', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await captureRejection(apiClient.get('/assets', { signal: controller.signal }));

    expect(isCancel(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});

const backendError = {
  timestamp: '2026-07-17T10:15:00Z',
  status: 422,
  error: 'Unprocessable Entity',
  message: 'Technical analysis requires at least 30 candles',
  path: '/api/v1/technical/AAPL',
};

describe('API error contract helpers', () => {
  it('recognizes the stable Spring error response shape', () => {
    const error = { response: { status: 422, data: backendError } };

    expect(isBackendErrorResponse(backendError)).toBe(true);
    expect(getApiErrorResponse(error)).toEqual(backendError);
    expect(getApiErrorStatus(error)).toBe(422);
    expect(getApiErrorMessage(error)).toBe('Technical analysis requires at least 30 candles');
  });

  it('uses message-only provider failures without treating them as the stable contract', () => {
    const error = {
      response: {
        status: 503,
        data: { message: 'provider unavailable' },
      },
    };

    expect(getApiErrorResponse(error)).toBeNull();
    expect(getApiErrorStatus(error)).toBe(503);
    expect(getApiErrorMessage(error)).toBe('provider unavailable');
  });

  it('falls back to Error.message when no response body is available', () => {
    const error = new Error('network unavailable');

    expect(getApiErrorResponse(error)).toBeNull();
    expect(getApiErrorStatus(error)).toBeNull();
    expect(getApiErrorMessage(error)).toBe('network unavailable');
  });

  it('reads status, body and message from errors rejected by apiClient', async () => {
    server.use(
      http.get(url('/technical/AAPL'), () => HttpResponse.json(backendError, { status: 422 })),
    );

    const error = await captureRejection(apiClient.get('/technical/AAPL'));

    expect(error).toBeInstanceOf(ApiError);
    expect(getApiErrorStatus(error)).toBe(422);
    expect(getApiErrorResponse(error)).toEqual(backendError);
    expect(getApiErrorMessage(error, 'fallback')).toBe('Technical analysis requires at least 30 candles');
  });

  it('keeps the normalized network message for transport failures from apiClient', async () => {
    server.use(http.get(url('/assets'), () => HttpResponse.error()));

    const error = await captureRejection(apiClient.get('/assets'));

    expect(getApiErrorStatus(error)).toBeNull();
    expect(getApiErrorResponse(error)).toBeNull();
    expect(getApiErrorMessage(error, 'fallback')).toBe('Sunucuya ulaşılamadı. Backend çalışıyor mu?');
  });
});
