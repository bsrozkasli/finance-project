export interface BackendErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
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

export const isBackendErrorResponse = (value: unknown): value is BackendErrorResponse => (
  isRecord(value)
  && typeof value.timestamp === 'string'
  && typeof value.status === 'number'
  && typeof value.error === 'string'
  && typeof value.message === 'string'
  && typeof value.path === 'string'
);

export const getApiErrorResponse = (error: unknown): BackendErrorResponse | null => {
  if (!hasHttpResponse(error)) return null;
  return isBackendErrorResponse(error.response.data) ? error.response.data : null;
};

export const getApiErrorStatus = (error: unknown): number | null => {
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
  if (response?.message) return response.message;

  if (hasHttpResponse(error)) {
    const { data } = error.response;
    if (isRecord(data) && typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
