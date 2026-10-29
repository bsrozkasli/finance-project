// Hand-written zod schemas for docs/spec/proposed/ui-redesign-v2.openapi.yaml (proposed contract).
// Production code imports ONLY the inferred types (`import type`), so zod stays out of the
// runtime bundle; the schemas themselves are exercised by tests against fixtures.
import { z } from 'zod';

export const DataStatusSchema = z.enum(['AVAILABLE', 'PARTIAL', 'EMPTY', 'UNAVAILABLE']);
export type DataStatus = z.infer<typeof DataStatusSchema>;

export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AlertSeveritySchema = z.enum(['CRITICAL', 'WARNING', 'INFO']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const StopStatusSchema = z.enum(['BREACHED', 'AT_RISK', 'NEAR', 'SAFE', 'NA']);
export type StopStatus = z.infer<typeof StopStatusSchema>;

export const WindowSchema = z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD']);
export type ReturnWindow = z.infer<typeof WindowSchema>;

export const MarketSchema = z.enum(['ALL', 'BIST', 'US']);
export type MarketScope = z.infer<typeof MarketSchema>;

/** A number that may be absent or null when the value is unavailable (never 0). */
export const nullableNumber = z.number().nullable().optional();
/** Ratio, 0.25 = 25 percent; null when unavailable. */
export const FractionSchema = nullableNumber;
export const nullableString = z.string().nullable().optional();

/** `Meta` base of every analytic response: status, asOf, optional currency and notes. */
export const metaShape = {
  status: DataStatusSchema,
  asOf: z.string(),
  currency: z.string().length(3).nullable().optional(),
  notes: z.array(z.string()).optional(),
};
export const MetaSchema = z.object(metaShape);
export type Meta = z.infer<typeof MetaSchema>;

/** Build a response schema that extends the `Meta` base. */
export const withMeta = <T extends z.ZodRawShape>(shape: T) => z.object({ ...metaShape, ...shape });

export const ProblemSchema = z.object({
  timestamp: z.string(),
  status: z.number(),
  error: z.string(),
  message: z.string(),
  path: z.string(),
  code: z.string().optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;

export const BenchmarkSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.enum(['INDEX', 'COMMODITY', 'FX']),
  currency: z.string().optional(),
  source: z.string().optional(),
});
export type Benchmark = z.infer<typeof BenchmarkSchema>;

export const BenchmarkListSchema = z.object({
  status: DataStatusSchema,
  asOf: z.string(),
  items: z.array(BenchmarkSchema),
});
export type BenchmarkList = z.infer<typeof BenchmarkListSchema>;
