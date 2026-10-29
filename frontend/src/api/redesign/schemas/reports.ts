import { z } from 'zod';
import { FractionSchema, metaShape, nullableNumber, nullableString, withMeta } from './common';

export const ReportTemplateIdSchema = z.enum(['PERFORMANCE', 'REALIZED_PNL', 'DIVIDENDS', 'STOCK_ANALYSIS']);
export type ReportTemplateId = z.infer<typeof ReportTemplateIdSchema>;

export const ReportTemplatesSchema = z.object({
  delivery: z.object({ email: z.boolean(), pdf: z.boolean(), xlsx: z.boolean() }),
  items: z.array(z.object({
    id: ReportTemplateIdSchema,
    name: z.string(),
    description: z.string().optional(),
    requiresSymbol: z.boolean().optional(),
    /** Open gate that blocks external release, e.g. OQ-1. */
    externalUseGate: nullableString,
  })),
});
export type ReportTemplates = z.infer<typeof ReportTemplatesSchema>;

export const ReportRunRequestSchema = z.object({
  templateId: ReportTemplateIdSchema,
  /** ALL or PORTFOLIO:<id>. */
  scope: z.string(),
  period: z.string().optional(),
  year: z.number().optional(),
  symbol: z.string().nullable().optional(),
});
export type ReportRunRequest = z.infer<typeof ReportRunRequestSchema>;

export const ReportRunSchema = z.object({
  ...metaShape,
  runId: z.string(),
  templateId: z.string(),
  title: z.string().optional(),
  scope: z.string().optional(),
  period: nullableString,
  createdAt: z.string(),
});
export type ReportRun = z.infer<typeof ReportRunSchema>;

export const ReportRunsSchema = z.object({
  total: z.number(),
  items: z.array(ReportRunSchema),
});
export type ReportRuns = z.infer<typeof ReportRunsSchema>;

export const PerformanceReportSchema = withMeta({
  kpis: z.array(z.object({ key: z.string(), value: nullableNumber })).optional(),
  /** start + sum(steps) + netFlow + rounding = end, exactly. */
  valueBridge: z.object({
    start: nullableNumber,
    end: nullableNumber,
    netFlow: nullableNumber,
    rounding: nullableNumber,
    steps: z.array(z.object({ symbol: z.string(), contribution: nullableNumber })).optional(),
  }).optional(),
  sectorContribution: z.array(z.object({
    sector: z.string(),
    averageWeight: FractionSchema,
    sectorReturn: FractionSchema,
    contribution: nullableNumber,
  })).optional(),
  riskSummary: z.object({
    volatility: FractionSchema,
    maxDrawdown: FractionSchema,
    beta: nullableNumber,
    tradeCount: z.number().optional(),
    turnover: FractionSchema,
  }).nullable().optional(),
});
export type PerformanceReport = z.infer<typeof PerformanceReportSchema>;

export const RealizedPnlReportSchema = withMeta({
  year: z.number().optional(),
  costMethod: z.literal('AVERAGE_COST'),
  disclaimer: z.string(),
  totals: z.object({
    proceeds: nullableNumber,
    cost: nullableNumber,
    realizedPnl: nullableNumber,
    fees: nullableNumber,
  }).optional(),
  rows: z.array(z.object({
    saleDate: z.string(),
    symbol: z.string(),
    quantity: z.number().optional(),
    cost: nullableNumber,
    proceeds: nullableNumber,
    realizedPnl: nullableNumber,
    holdingDays: nullableNumber,
  })),
});
export type RealizedPnlReport = z.infer<typeof RealizedPnlReportSchema>;

export const DividendReportSchema = withMeta({
  year: z.number().optional(),
  disclaimer: z.string(),
  totals: z.object({ gross: nullableNumber, withholding: nullableNumber, net: nullableNumber }).optional(),
  byYear: z.array(z.object({ year: z.number().optional(), net: nullableNumber })).optional(),
  rows: z.array(z.object({
    paymentDate: z.string(),
    symbol: z.string(),
    quantity: nullableNumber,
    gross: nullableNumber,
    /** Only when recorded on the ledger transaction; never assumed. */
    withholding: nullableNumber,
    net: nullableNumber,
  })),
});
export type DividendReport = z.infer<typeof DividendReportSchema>;

export const ReportFormatSchema = z.enum(['pdf', 'xlsx']);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export const ReportScheduleWriteSchema = z.object({
  templateId: z.string(),
  scope: z.string().optional(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']),
  format: ReportFormatSchema,
});
export type ReportScheduleWrite = z.infer<typeof ReportScheduleWriteSchema>;

export const ReportScheduleSchema = z.object({
  ...ReportScheduleWriteSchema.shape,
  scheduleId: z.number(),
  nextRunAt: nullableString,
});
export type ReportSchedule = z.infer<typeof ReportScheduleSchema>;

export const ReportSchedulesSchema = z.object({ items: z.array(ReportScheduleSchema) });
export type ReportSchedules = z.infer<typeof ReportSchedulesSchema>;
