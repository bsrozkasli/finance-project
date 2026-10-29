import { apiClient } from '../http';
import type {
  BulkResult,
  ImportPreview,
  JournalDecisions,
  ParsedTransactions,
  RecentTransactions,
  TransactionDraft,
  UndoResult,
} from './schemas';

export const parseTransactions = async (text: string, defaultPortfolioId: number): Promise<ParsedTransactions> => {
  const response = await apiClient.post<ParsedTransactions>('/transactions/parse', { text, defaultPortfolioId });
  return response.data;
};

export const bulkCreateTransactions = async (rows: TransactionDraft[]): Promise<BulkResult> => {
  const response = await apiClient.post<BulkResult>('/transactions/bulk', { rows });
  return response.data;
};

export interface StageImportInput {
  file: File | Blob;
  portfolioId: number;
  /** Optional override of the detected column mapping (serialised as a JSON object). */
  mapping?: Record<string, string>;
}

export const stageImport = async ({ file, portfolioId, mapping }: StageImportInput): Promise<ImportPreview> => {
  const form = new FormData();
  form.append('file', file);
  form.append('portfolioId', String(portfolioId));
  if (mapping) form.append('mapping', JSON.stringify(mapping));
  const response = await apiClient.post<ImportPreview>('/transactions/imports', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const commitImport = async (importId: string): Promise<BulkResult> => {
  const response = await apiClient.post<BulkResult>(`/transactions/imports/${encodeURIComponent(importId)}/commit`);
  return response.data;
};

export const undoImport = async (importId: string): Promise<UndoResult> => {
  const response = await apiClient.post<UndoResult>(`/transactions/imports/${encodeURIComponent(importId)}/undo`);
  return response.data;
};

export const fetchImportTemplate = async (): Promise<string> => {
  const response = await apiClient.get<string>('/transactions/import-template', { responseType: 'text' });
  return response.data;
};

export const fetchRecentTransactions = async (
  params: { limit?: number; portfolioId?: number } = {},
): Promise<RecentTransactions> => {
  const response = await apiClient.get<RecentTransactions>('/transactions/recent', { params });
  return response.data;
};

export const fetchJournalDecisions = async (
  params: { result?: 'GAIN' | 'LOSS' | 'OPEN'; limit?: number; offset?: number } = {},
): Promise<JournalDecisions> => {
  const response = await apiClient.get<JournalDecisions>('/journal/decisions', { params });
  return response.data;
};
