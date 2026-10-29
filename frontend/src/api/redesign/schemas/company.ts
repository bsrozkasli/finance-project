import { z } from 'zod';
import { FractionSchema, nullableNumber, nullableString, withMeta } from './common';

export const SectorComparableSchema = z.object({
  value: nullableNumber,
  sectorAverage: nullableNumber,
  verdict: z.enum(['CHEAPER', 'SIMILAR', 'MORE_EXPENSIVE', 'STRONGER', 'WEAKER']).nullable().optional(),
});
export type SectorComparable = z.infer<typeof SectorComparableSchema>;

export const CompanyAnalysisSchema = withMeta({
  symbol: z.string().optional(),
  sector: nullableString,
  /** Keys pe, pb, evEbitda, roe, netMargin, debtToEquity ... */
  ttm: z.record(z.string(), SectorComparableSchema).optional(),
  healthScore: z.number().min(0).max(100).nullable().optional(),
  policyVersion: nullableString,
  healthComponents: z.array(z.object({
    name: z.enum(['PROFITABILITY', 'GROWTH', 'LEVERAGE', 'VALUATION', 'DIVIDEND']),
    score: z.number().min(0).max(100).nullable().optional(),
  })).optional(),
});
export type CompanyAnalysis = z.infer<typeof CompanyAnalysisSchema>;

export const RatioMetricSchema = z.enum(['PE', 'PB', 'EV_EBITDA', 'ROE', 'NET_MARGIN']);
export type RatioMetric = z.infer<typeof RatioMetricSchema>;

export const RatioHistorySchema = withMeta({
  metric: z.string().optional(),
  current: nullableNumber,
  mean: nullableNumber,
  sectorAverage: nullableNumber,
  points: z.array(z.object({
    periodEnd: z.string(),
    value: nullableNumber,
    sectorValue: nullableNumber,
  })),
});
export type RatioHistory = z.infer<typeof RatioHistorySchema>;

export const QuarterlyTrendSchema = withMeta({
  points: z.array(z.object({
    periodEnd: z.string(),
    revenue: nullableNumber,
    netIncome: nullableNumber,
    netMargin: FractionSchema,
  })),
});
export type QuarterlyTrend = z.infer<typeof QuarterlyTrendSchema>;

export const StatementTypeSchema = z.enum(['INCOME', 'BALANCE', 'CASH_FLOW']);
export type StatementType = z.infer<typeof StatementTypeSchema>;

export const CompanyStatementsSchema = withMeta({
  statementType: StatementTypeSchema.optional(),
  periods: z.array(z.string()),
  lines: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    values: z.array(z.number().nullable()),
    yoyChange: FractionSchema,
  })),
});
export type CompanyStatements = z.infer<typeof CompanyStatementsSchema>;

export const PeersSchema = withMeta({
  items: z.array(z.object({
    symbol: z.string(),
    name: nullableString,
    sector: nullableString,
    isSelected: z.boolean().optional(),
    pe: nullableNumber,
    pb: nullableNumber,
    evEbitda: nullableNumber,
    roe: FractionSchema,
    netMargin: FractionSchema,
    return1Y: FractionSchema,
  })),
});
export type Peers = z.infer<typeof PeersSchema>;
