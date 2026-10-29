import { apiClient } from '../http';
import type {
  DividendReport,
  PerformanceReport,
  RealizedPnlReport,
  ReportFormat,
  ReportRun,
  ReportRunRequest,
  ReportRuns,
  ReportSchedule,
  ReportSchedules,
  ReportScheduleWrite,
  ReportTemplates,
} from './schemas';

/** `ALL` or `PORTFOLIO:<id>`. */
export type ReportScope = 'ALL' | `PORTFOLIO:${number}`;

export const fetchReportTemplates = async (): Promise<ReportTemplates> => {
  const response = await apiClient.get<ReportTemplates>('/report-templates');
  return response.data;
};

/** `period` is a month `2026-10`, a quarter `2026-Q3` or a year `2026`. */
export const fetchPerformanceReport = async (period: string, scope: ReportScope = 'ALL'): Promise<PerformanceReport> => {
  const response = await apiClient.get<PerformanceReport>('/report-runs/performance', { params: { scope, period } });
  return response.data;
};

export const fetchRealizedPnlReport = async (year: number, scope: ReportScope = 'ALL'): Promise<RealizedPnlReport> => {
  const response = await apiClient.get<RealizedPnlReport>('/report-runs/realized-pnl', { params: { scope, year } });
  return response.data;
};

export const fetchDividendReport = async (year: number, scope: ReportScope = 'ALL'): Promise<DividendReport> => {
  const response = await apiClient.get<DividendReport>('/report-runs/dividends', { params: { scope, year } });
  return response.data;
};

export const listReportRuns = async (params: { limit?: number; offset?: number } = {}): Promise<ReportRuns> => {
  const response = await apiClient.get<ReportRuns>('/report-runs', { params });
  return response.data;
};

export const createReportRun = async (body: ReportRunRequest): Promise<ReportRun> => {
  const response = await apiClient.post<ReportRun>('/report-runs', body);
  return response.data;
};

export const fetchReportRun = async (runId: string): Promise<ReportRun> => {
  const response = await apiClient.get<ReportRun>(`/report-runs/${encodeURIComponent(runId)}`);
  return response.data;
};

export const downloadReportRun = async (runId: string, format: ReportFormat): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`/report-runs/${encodeURIComponent(runId)}/download`, {
    params: { format },
    responseType: 'blob',
  });
  return response.data;
};

/** Answers 501 `DELIVERY_NOT_CONFIGURED` until a mail provider is approved. */
export const emailReportRun = async (runId: string, format: ReportFormat): Promise<void> => {
  await apiClient.post(`/report-runs/${encodeURIComponent(runId)}/email`, { format });
};

export const listReportSchedules = async (): Promise<ReportSchedules> => {
  const response = await apiClient.get<ReportSchedules>('/report-schedules');
  return response.data;
};

/** Answers 501 `DELIVERY_NOT_CONFIGURED` until a mail provider is approved. */
export const createReportSchedule = async (body: ReportScheduleWrite): Promise<ReportSchedule> => {
  const response = await apiClient.post<ReportSchedule>('/report-schedules', body);
  return response.data;
};

export const deleteReportSchedule = async (scheduleId: number): Promise<void> => {
  await apiClient.delete(`/report-schedules/${scheduleId}`);
};
