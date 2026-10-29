import { z } from 'zod';
import { FractionSchema, RiskLevelSchema, nullableNumber, nullableString, withMeta } from './common';

export const PortfolioCardSchema = z.object({
  portfolioId: z.number(),
  name: z.string(),
  pinned: z.boolean(),
  positionCount: z.number(),
  market: z.enum(['BIST', 'US', 'MIXED']).optional(),
  value: nullableNumber,
  dayChange: nullableNumber,
  dayChangePct: FractionSchema,
  returnPct: FractionSchema,
  riskScore: z.number().min(0).max(100).nullable().optional(),
  riskLevel: RiskLevelSchema.nullable().optional(),
  pricingComplete: z.boolean().optional(),
});
export type PortfolioCard = z.infer<typeof PortfolioCardSchema>;

export const PortfolioOverviewSchema = withMeta({
  total: z.number(),
  items: z.array(PortfolioCardSchema),
  aggregate: z.object({
    portfolioCount: z.number().optional(),
    value: nullableNumber,
    dayChange: nullableNumber,
    dayChangePct: FractionSchema,
    criticalRiskCount: z.number().optional(),
  }),
});
export type PortfolioOverview = z.infer<typeof PortfolioOverviewSchema>;

export const PinStateSchema = z.object({ portfolioId: z.number(), pinned: z.boolean() });
export type PinState = z.infer<typeof PinStateSchema>;

export const PortfolioSummarySchema = withMeta({
  portfolioId: z.number().optional(),
  value: nullableNumber,
  cash: nullableNumber,
  dayChange: nullableNumber,
  dayChangePct: FractionSchema,
  unrealizedPnl: nullableNumber,
  unrealizedPnlPct: FractionSchema,
  realizedPnlYtd: nullableNumber,
  pricingComplete: z.boolean().optional(),
  unpricedSymbols: z.array(z.string()).optional(),
});
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

export const AllocationSliceSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: nullableNumber,
  weight: FractionSchema,
});
export type AllocationSlice = z.infer<typeof AllocationSliceSchema>;

export const AllocationSchema = withMeta({
  total: nullableNumber,
  limitWeight: FractionSchema,
  slices: z.array(AllocationSliceSchema),
});
export type Allocation = z.infer<typeof AllocationSchema>;

export const GainItemSchema = z.object({
  symbol: z.string(),
  pnl: nullableNumber,
  pnlPct: FractionSchema,
});
export type GainItem = z.infer<typeof GainItemSchema>;

export const GainsSchema = withMeta({
  winners: z.number().optional(),
  losers: z.number().optional(),
  net: nullableNumber,
  items: z.array(GainItemSchema),
});
export type Gains = z.infer<typeof GainsSchema>;

const monthValue = z.object({ month: z.string(), value: z.number() }).nullable().optional();

export const MonthlyReturnsSchema = withMeta({
  positiveMonths: z.number().optional(),
  best: monthValue,
  worst: monthValue,
  items: z.array(z.object({ month: z.string(), returnPct: FractionSchema })),
});
export type MonthlyReturns = z.infer<typeof MonthlyReturnsSchema>;

export const HoldingRowSchema = z.object({
  symbol: z.string(),
  name: nullableString,
  sector: nullableString,
  quantity: z.number().optional(),
  avgCost: nullableNumber,
  price: nullableNumber,
  value: nullableNumber,
  weight: FractionSchema,
  /** Percentage points. */
  weightDelta1M: nullableNumber,
  return1D: FractionSchema,
  return1W: FractionSchema,
  return1M: FractionSchema,
  pnl: nullableNumber,
  pnlPct: FractionSchema,
});
export type HoldingRow = z.infer<typeof HoldingRowSchema>;

export const HoldingsAnalysisSchema = withMeta({
  cashWeight: FractionSchema,
  items: z.array(HoldingRowSchema),
});
export type HoldingsAnalysis = z.infer<typeof HoldingsAnalysisSchema>;

export const CompositionHistorySchema = withMeta({
  dates: z.array(z.string()),
  series: z.array(z.object({ key: z.string(), values: z.array(z.number().nullable()) })),
});
export type CompositionHistory = z.infer<typeof CompositionHistorySchema>;
