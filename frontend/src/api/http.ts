import axios, { isCancel } from 'axios';
import { API_BASE_URL } from './config';
import { toApiError } from './errors';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(isCancel(error) ? error : toApiError(error)),
);
