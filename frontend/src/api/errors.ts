/** Spring global error body: see docs/spec/current-system/contracts.md "Backend errors". */
export interface BackendErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

interface ApiErrorDetails {
  status: number | null;
  path: string | null;
  isNetworkError: boolean;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly path: string | null;
  readonly isNetworkError: boolean;

  constructor(message: string, details: ApiErrorDetails) {
    super(message, { cause: details.cause });
    this.name = 'ApiError';
    this.status = details.status;
    this.path = details.path;
    this.isNetworkError = details.isNetworkError;
  }
}

interface HttpClientFailure {
  response: {
    status?: number;
    data?: unknown;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const hasHttpResponse = (value: unknown): value is HttpClientFailure => (
  isRecord(value) && isRecord(value.response)
);

// Structural check so this module stays free of a direct Axios import (check:api-boundaries).
const isHttpClientError = (value: unknown): value is Record<string, unknown> & Partial<HttpClientFailure> => (
  isRecord(value) && value.isAxiosError === true
);

export const isBackendErrorResponse = (value: unknown): value is BackendErrorResponse => (
  isRecord(value)
  && typeof value.timestamp === 'string'
  && typeof value.status === 'number'
  && typeof value.error === 'string'
  && typeof value.message === 'string'
  && typeof value.path === 'string'
);

const hasBackendMessage = (value: unknown): value is { status: number; message: string; path?: unknown } => (
  isRecord(value) && typeof value.status === 'number' && typeof value.message === 'string'
);

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (isHttpClientError(error)) {
    const response = error.response;
    if (!isRecord(response) || typeof response.status !== 'number') {
      return new ApiError('Sunucuya ulaşılamadı. Backend çalışıyor mu?', {
        status: null,
        path: null,
        isNetworkError: true,
        cause: error,
      });
    }

    const body: unknown = response.data;
    if (hasBackendMessage(body) && body.message.trim()) {
      return new ApiError(body.message, {
        status: response.status,
        path: typeof body.path === 'string' ? body.path : null,
        isNetworkError: false,
        cause: error,
      });
    }

    return new ApiError(`İstek başarısız oldu (HTTP ${response.status}).`, {
      status: response.status,
      path: null,
      isNetworkError: false,
      cause: error,
    });
  }

  const message = error instanceof Error ? error.message : 'Beklenmeyen hata.';
  return new ApiError(message, { status: null, path: null, isNetworkError: false, cause: error });
};

// An ApiError keeps the original HTTP client failure as its cause.
const httpFailureOf = (error: unknown): unknown => (error instanceof ApiError ? error.cause : error);

export const getApiErrorResponse = (error: unknown): BackendErrorResponse | null => {
  const failure = httpFailureOf(error);
  if (!hasHttpResponse(failure)) return null;
  return isBackendErrorResponse(failure.response.data) ? failure.response.data : null;
};

export const getApiErrorStatus = (error: unknown): number | null => {
  if (error instanceof ApiError) return error.status;

  const response = getApiErrorResponse(error);
  if (response) return response.status;

  if (hasHttpResponse(error) && typeof error.response.status === 'number') {
    return error.response.status;
  }

  return null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'API request failed',
): string => {
  const response = getApiErrorResponse(error);
  if (response?.message.trim()) return response.message;

  // apiClient rejects with ApiError; a message-only provider body lives on its cause.
  const failure = httpFailureOf(error);
  if (hasHttpResponse(failure)) {
    const { data } = failure.response;
    if (isRecord(data) && typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
