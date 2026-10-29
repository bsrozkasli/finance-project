import { z } from 'zod';
import { FractionSchema, nullableNumber, nullableString, withMeta } from './common';

export const TransactionDraftSchema = z.object({
  portfolioId: z.number(),
  side: z.enum(['BUY', 'SELL']),
  symbol: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  date: z.string().optional(),
  fee: z.number().min(0).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});
export type TransactionDraft = z.infer<typeof TransactionDraftSchema>;

export const ParsedRowCodeSchema = z.enum([
  'SIDE_INVALID', 'TICKER_NOT_FOUND', 'QUANTITY_INVALID', 'PRICE_INVALID',
  'PORTFOLIO_NOT_FOUND', 'SELL_EXCEEDS_HOLDING', 'DATE_INVALID',
]);
export type ParsedRowCode = z.infer<typeof ParsedRowCodeSchema>;

export const ParsedRowSchema = z.object({
  line: z.number(),
  status: z.enum(['VALID', 'DUPLICATE', 'INVALID']),
  code: ParsedRowCodeSchema.nullable().optional(),
  draft: TransactionDraftSchema.nullable().optional(),
  amount: nullableNumber,
});
export type ParsedRow = z.infer<typeof ParsedRowSchema>;

const parsedShape = {
  validCount: z.number().optional(),
  invalidCount: z.number().optional(),
  duplicateCount: z.number().optional(),
  totalAmount: nullableNumber,
  rows: z.array(ParsedRowSchema),
};

export const ParsedTransactionsSchema = withMeta(parsedShape);
export type ParsedTransactions = z.infer<typeof ParsedTransactionsSchema>;

export const BulkResultSchema = z.object({
  batchId: z.string(),
  created: z.number(),
  skipped: z.number().optional(),
  transactionIds: z.array(z.number()).optional(),
});
export type BulkResult = z.infer<typeof BulkResultSchema>;

export const ImportMappingFieldSchema = z.enum(['DATE', 'SIDE', 'SYMBOL', 'QUANTITY', 'PRICE', 'FEE', 'NOTE', 'IGNORED']);
export type ImportMappingField = z.infer<typeof ImportMappingFieldSchema>;

export const ImportPreviewSchema = withMeta({
  ...parsedShape,
  importId: z.string(),
  fileName: z.string().optional(),
  detectedMapping: z.array(z.object({
    column: z.string(),
    field: ImportMappingFieldSchema.nullable().optional(),
  })),
});
export type ImportPreview = z.infer<typeof ImportPreviewSchema>;

export const UndoResultSchema = z.object({ removed: z.number() });
export type UndoResult = z.infer<typeof UndoResultSchema>;

export const RecentTransactionsSchema = withMeta({
  items: z.array(z.object({
    transactionId: z.number(),
    date: z.string(),
    side: z.enum(['BUY', 'SELL', 'DIVIDEND', 'FEE']),
    symbol: nullableString,
    portfolioId: z.number(),
    portfolioName: z.string().optional(),
    quantity: nullableNumber,
    price: nullableNumber,
    amount: nullableNumber,
    /** Only on SELL; average cost. */
    realizedPnl: nullableNumber,
    note: nullableString,
    importBatchId: nullableString,
  })),
});
export type RecentTransactions = z.infer<typeof RecentTransactionsSchema>;

export const JournalDecisionsSchema = withMeta({
  total: z.number(),
  items: z.array(z.object({
    transactionId: z.number(),
    symbol: z.string(),
    side: z.enum(['BUY', 'SELL']),
    date: z.string(),
    note: z.string(),
    result: z.enum(['GAIN', 'LOSS', 'OPEN']).optional(),
    resultPct: FractionSchema,
  })),
});
export type JournalDecisions = z.infer<typeof JournalDecisionsSchema>;
