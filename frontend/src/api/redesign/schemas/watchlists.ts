import { z } from 'zod';
import { DataStatusSchema, FractionSchema, nullableNumber, nullableString, withMeta } from './common';

export const WatchlistUpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  /** Full ordered list; unknown symbols are rejected. */
  symbols: z.array(z.string()).optional(),
});
export type WatchlistUpdate = z.infer<typeof WatchlistUpdateSchema>;

export const WatchlistPerformanceSchema = withMeta({
  total: z.number().optional(),
  /** Equal-weighted mean per window over symbols with data. */
  averages: z.record(z.string(), FractionSchema).optional(),
  breadth: z.object({
    up: z.number().optional(),
    down: z.number().optional(),
    bestSymbol1M: nullableString,
    worstSymbol1M: nullableString,
  }).optional(),
  items: z.array(z.object({
    symbol: z.string(),
    name: nullableString,
    sector: nullableString,
    price: nullableNumber,
    /** Keys 1D, 1W, 1M, 3M, 6M, 1Y. */
    returns: z.record(z.string(), FractionSchema).optional(),
    sparkline3M: z.array(z.number()).optional(),
    peRatio: nullableNumber,
    volume: nullableNumber,
    dataStatus: DataStatusSchema.optional(),
  })),
});
export type WatchlistPerformance = z.infer<typeof WatchlistPerformanceSchema>;
