import { z } from 'zod';
import { AlertSeveritySchema, FractionSchema, RiskLevelSchema, StopStatusSchema, nullableNumber, nullableString, withMeta } from './common';

export const StopLevelSchema = z.object({
  portfolioId: z.number(),
  portfolioName: z.string().optional(),
  symbol: z.string(),
  type: z.enum(['STOP_LOSS', 'TAKE_PROFIT']).optional(),
  price: nullableNumber,
  level: nullableNumber,
  distance: FractionSchema,
  status: StopStatusSchema.optional(),
});
export type StopLevel = z.infer<typeof StopLevelSchema>;

export const StopLevelsSchema = withMeta({
  thresholds: z.object({ atRisk: z.number().optional(), near: z.number().optional() }).optional(),
  items: z.array(StopLevelSchema),
});
export type StopLevels = z.infer<typeof StopLevelsSchema>;

export const StopLevelsWriteSchema = z.object({
  stopLoss: z.number().positive().nullable().optional(),
  takeProfit: z.number().positive().nullable().optional(),
});
export type StopLevelsWrite = z.infer<typeof StopLevelsWriteSchema>;

export const RiskAlertCodeSchema = z.enum([
  'STOP_BREACHED', 'STOP_AT_RISK', 'HOLDING_CONCENTRATION', 'SECTOR_CONCENTRATION', 'DEEP_LOSS',
  'HIGH_BETA', 'LOW_CASH', 'IDLE_CASH', 'UPCOMING_EARNINGS',
]);
export type RiskAlertCode = z.infer<typeof RiskAlertCodeSchema>;

export const RiskAlertSchema = z.object({
  code: RiskAlertCodeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  message: z.string(),
  symbol: nullableString,
  observed: nullableNumber,
  limit: nullableNumber,
  action: z.enum(['REVIEW', 'VIEW_STOP', 'ADD_NOTE', 'VIEW_CALENDAR', 'NONE']).optional(),
});
export type RiskAlert = z.infer<typeof RiskAlertSchema>;

export const RiskAlertsSchema = withMeta({
  riskScore: z.number().min(0).max(100).nullable().optional(),
  riskLevel: RiskLevelSchema.nullable().optional(),
  policyVersion: nullableString,
  counts: z.object({
    critical: z.number().optional(),
    warning: z.number().optional(),
    info: z.number().optional(),
  }),
  items: z.array(RiskAlertSchema),
  skipped: z.array(z.object({
    symbol: nullableString,
    rule: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
});
export type RiskAlerts = z.infer<typeof RiskAlertsSchema>;

export const TargetWeightsWriteSchema = z.object({
  targets: z.array(z.object({ key: z.string(), weight: z.number().min(0).max(1) })),
});
export type TargetWeightsWrite = z.infer<typeof TargetWeightsWriteSchema>;

export const TargetWeightsSchema = withMeta({
  targets: TargetWeightsWriteSchema.shape.targets,
  isDefault: z.boolean().optional(),
});
export type TargetWeights = z.infer<typeof TargetWeightsSchema>;

export const RebalanceSuggestionsSchema = withMeta({
  thresholdPp: z.number().optional(),
  items: z.array(z.object({
    key: z.string(),
    target: FractionSchema,
    current: FractionSchema,
    gapPp: nullableNumber,
    direction: z.enum(['INCREASE', 'REDUCE', 'NONE']).nullable().optional(),
    notionalToClose: nullableNumber,
  })),
});
export type RebalanceSuggestions = z.infer<typeof RebalanceSuggestionsSchema>;
