import { z } from 'zod';
import { FractionSchema, nullableNumber, withMeta } from './common';

export const EarningsPeriodSchema = z.enum(['M1', 'M3', 'YTD', 'Y1', 'ALL']);
export type EarningsPeriod = z.infer<typeof EarningsPeriodSchema>;

export const EarningsSummarySchema = withMeta({
  items: z.array(z.object({
    period: EarningsPeriodSchema,
    gain: nullableNumber,
    returnPct: FractionSchema,
    benchmarkReturnPct: FractionSchema,
    realized: nullableNumber,
    unrealized: nullableNumber,
    dividends: nullableNumber,
    fees: nullableNumber,
  })),
});
export type EarningsSummary = z.infer<typeof EarningsSummarySchema>;

export const EarningsMonthlySchema = withMeta({
  positiveMonths: z.number().optional(),
  items: z.array(z.object({ month: z.string(), gain: nullableNumber, cumulative: nullableNumber })),
});
export type EarningsMonthly = z.infer<typeof EarningsMonthlySchema>;

export const EarningsSourcesSchema = withMeta({
  gain: nullableNumber,
  realized: nullableNumber,
  unrealized: nullableNumber,
  dividends: nullableNumber,
  fees: nullableNumber,
  /** Non-zero residual forces status PARTIAL. */
  residual: nullableNumber,
});
export type EarningsSources = z.infer<typeof EarningsSourcesSchema>;

export const EarningsYearlySchema = withMeta({
  items: z.array(z.object({
    year: z.number(),
    startValue: nullableNumber,
    netFlow: nullableNumber,
    gain: nullableNumber,
    returnPct: FractionSchema,
    benchmarkReturnPct: FractionSchema,
    differencePp: nullableNumber,
  })),
});
export type EarningsYearly = z.infer<typeof EarningsYearlySchema>;

export const ContributorsSchema = withMeta({
  items: z.array(z.object({ symbol: z.string(), contribution: nullableNumber })),
});
export type Contributors = z.infer<typeof ContributorsSchema>;

export const EarningsByPortfolioSchema = withMeta({
  total: z.number(),
  items: z.array(z.object({
    rank: z.number(),
    portfolioId: z.number(),
    name: z.string(),
    value: nullableNumber,
    gain: nullableNumber,
    returnPct: FractionSchema,
    benchmarkDifferencePp: nullableNumber,
  })),
});
export type EarningsByPortfolio = z.infer<typeof EarningsByPortfolioSchema>;
