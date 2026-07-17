import { describe, expect, it } from 'vitest';
import {
  getApiErrorMessage,
  getApiErrorResponse,
  getApiErrorStatus,
  isBackendErrorResponse,
} from './errors';

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
});
