import type { JournalTrade } from '../../api/client';
import type { LedgerEntry } from '../../hooks/useJournalLedger';
import type { TradeEvaluation } from './journalUtils';

export interface JournalRecord {
  id: string;
  source: 'journal' | 'ledger';
  trade?: JournalTrade;
  ledger?: LedgerEntry;
  symbol: string;
  portfolioId?: number;
  portfolioName?: string;
  action: string;
  date: string;
  quantity: number;
  price: number;
  fee: number;
  strategy?: string;
  notes?: string;
  tags: string[];
  status?: string;
  pnl?: number;
  returnPct?: number;
  evaluation?: TradeEvaluation;
}