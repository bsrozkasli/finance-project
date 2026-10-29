import { z } from 'zod';
import { FractionSchema, WindowSchema, nullableNumber, nullableString, withMeta } from './common';

export const EntityMetricsSchema = z.object({
  ref: z.string(),
  label: z.string(),
  periodReturn: FractionSchema,
  volatility: FractionSchema,
  sharpe: nullableNumber,
  maxDrawdown: FractionSchema,
  beta: nullableNumber,
  bestDay: FractionSchema,
  worstDay: FractionSchema,
  positiveDayRatio: FractionSchema,
});
export type EntityMetrics = z.infer<typeof EntityMetricsSchema>;

export const ComparisonMetricsSchema = withMeta({
  riskFreeRate: nullableNumber,
  riskFreeSource: nullableString,
  correlation: z.number().min(-1).max(1).nullable().optional(),
  a: EntityMetricsSchema,
  b: EntityMetricsSchema,
  better: z.record(z.string(), z.enum(['A', 'B', 'NONE'])).optional(),
});
export type ComparisonMetrics = z.infer<typeof ComparisonMetricsSchema>;

export const CorrelationMatrixSchema = withMeta({
  labels: z.array(z.string()),
  matrix: z.array(z.array(z.number().min(-1).max(1).nullable())),
});
export type CorrelationMatrix = z.infer<typeof CorrelationMatrixSchema>;

export const RiskReturnSchema = withMeta({
  points: z.array(z.object({
    ref: z.string(),
    label: z.string(),
    volatility: FractionSchema,
    periodReturn: FractionSchema,
  })),
});
export type RiskReturn = z.infer<typeof RiskReturnSchema>;

export const ReturnsHeatmapSchema = withMeta({
  windows: z.array(WindowSchema),
  rows: z.array(z.object({
    ref: z.string(),
    label: z.string(),
    values: z.array(FractionSchema),
  })),
});
export type ReturnsHeatmap = z.infer<typeof ReturnsHeatmapSchema>;
