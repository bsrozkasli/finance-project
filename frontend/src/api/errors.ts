import { isAxiosError } from 'axios';

/** Spring global error body: see docs/spec/current-system/contracts.md "Backend errors". */
export interface BackendErrorBody {
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

const isBackendErrorBody = (value: unknown): value is BackendErrorBody => {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.status === 'number' && typeof body.message === 'string';
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new ApiError('Sunucuya ulaşılamadı. Backend çalışıyor mu?', {
        status: null,
        path: null,
        isNetworkError: true,
        cause: error,
      });
    }

    const body: unknown = response.data;
    if (isBackendErrorBody(body) && body.message.trim()) {
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
