import { z } from 'zod';
import { nullableNumber, nullableString, withMeta } from './common';

export const ImportanceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type Importance = z.infer<typeof ImportanceSchema>;

export const CalendarCategorySchema = z.enum(['CENTRAL_BANK', 'EARNINGS', 'MACRO']);
export type CalendarCategory = z.infer<typeof CalendarCategorySchema>;

export const CalendarEventsSchema = withMeta({
  items: z.array(z.object({
    date: z.string(),
    /** HH:mm Europe/Istanbul. */
    time: nullableString,
    title: z.string(),
    description: nullableString,
    category: CalendarCategorySchema,
    importance: ImportanceSchema.nullable().optional(),
    symbol: nullableString,
    portfolioIds: z.array(z.number()).optional(),
    daysUntil: z.number().optional(),
    source: z.string().optional(),
  })),
});
export type CalendarEvents = z.infer<typeof CalendarEventsSchema>;

export const NewsCategorySchema = z.enum(['GEOPOLITICS', 'MACRO', 'SECTOR', 'COMPANY']);
export type NewsCategory = z.infer<typeof NewsCategorySchema>;

export const NewsImpactSchema = z.object({
  level: ImportanceSchema.nullable().optional(),
  source: z.enum(['PROVIDER', 'RULE', 'MODEL']).nullable().optional(),
  classifierVersion: nullableString,
});
export type NewsImpact = z.infer<typeof NewsImpactSchema>;

export const NewsItemsSchema = withMeta({
  total: z.number(),
  counts: z.record(z.string(), z.number()).optional(),
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    summary: nullableString,
    url: nullableString,
    source: z.string().optional(),
    publishedAt: z.string(),
    category: NewsCategorySchema,
    scopeLabel: nullableString,
    impact: NewsImpactSchema.optional(),
    affected: z.array(z.object({
      symbol: z.string(),
      direction: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
      inPortfolio: z.boolean().optional(),
    })).optional(),
    topics: z.array(z.string()).optional(),
  })),
});
export type NewsItems = z.infer<typeof NewsItemsSchema>;

const net = z.number().min(-1).max(1).nullable().optional();

export const PortfolioNewsImpactSchema = withMeta({
  newsCount: z.number().optional(),
  affectedHoldings: z.number().optional(),
  items: z.array(z.object({ symbol: z.string(), newsCount: z.number(), net })),
});
export type PortfolioNewsImpact = z.infer<typeof PortfolioNewsImpactSchema>;

export const SectorImpactSchema = withMeta({
  items: z.array(z.object({ sector: z.string(), net, newsCount: nullableNumber })),
});
export type SectorImpact = z.infer<typeof SectorImpactSchema>;

export const TopicsSchema = withMeta({
  items: z.array(z.object({ label: z.string(), count: z.number() })),
});
export type Topics = z.infer<typeof TopicsSchema>;
