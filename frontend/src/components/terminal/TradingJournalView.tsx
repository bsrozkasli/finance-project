import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { JournalTrade } from '../../api/client';
import { createPortfolioTransaction } from '../../api/client';
import { useJournalTrades } from '../../hooks/useJournalTrades';
import { useJournalLedger } from '../../hooks/useJournalLedger';
import { DeleteConfirm } from '../journal/DeleteConfirm';
import { EvaluationModal } from '../journal/EvaluationModal';
import { JournalAnalysisPanel } from '../journal/JournalAnalysisPanel';
import { JournalHistory } from '../journal/JournalHistory';
import type { JournalRecord } from '../journal/journalModels';
import { JournalToolbar } from '../journal/JournalToolbar';
import { TradeModal } from '../journal/TradeModal';
import type { TradeModalPayload } from '../journal/TradeModal';
import { fmtCurrency, positiveColor, readEvaluations, THEMES, toNumber, writeEvaluations } from '../journal/journalUtils';
import type { JournalFilters, JournalViewMode, TradeEvaluation } from '../journal/journalUtils';

type TradingJournalMode = 'journal' | 'transactions';

interface TradingJournalViewProps {
  mode?: TradingJournalMode;
}

const initialFilters = (portfolioId: string | null): JournalFilters => ({
  portfolioId: portfolioId ?? 'ALL',
  symbol: '',
  action: 'ALL',
  strategy: 'ALL',
  theme: 'ALL',
  dateFrom: '',
  dateTo: '',
  status: 'ALL',
});

const actionFromTrade = (trade: JournalTrade): string => trade.tags?.find(tag => tag.startsWith('action:'))?.replace('action:', '') ?? trade.type;

const escapeCsv = (value: string | number | undefined | null) => {
  const text = String(value ?? '');
  return text.includes(',') || text.includes('"') || text.includes('\n') ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildCsv = (records: JournalRecord[]) => {
  const headers = ['source', 'date', 'portfolio', 'symbol', 'action', 'quantity', 'price', 'fee', 'strategy', 'themes', 'pnl', 'returnPct', 'notes'];
  const rows = records.map(record => [
    record.source,
    record.date,
    record.portfolioName ?? '',
    record.symbol,
    record.action,
    record.quantity,
    record.price,
    record.fee,
    record.strategy ?? '',
    record.tags.filter(tag => THEMES.includes(tag)).join('|'),
    record.pnl ?? '',
    record.returnPct ?? '',
    record.notes ?? '',
  ]);
  return [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
};

const sortValue = (record: JournalRecord, key: string): string | number => {
  if (key === 'symbol') return record.symbol;
  if (key === 'date') return record.date;
  if (key === 'pnl') return record.pnl ?? 0;
  if (key === 'returnPct') return record.returnPct ?? 0;
  return record.date;
};

const matchesFilters = (record: JournalRecord, filters: JournalFilters): boolean => {
  if (filters.portfolioId !== 'ALL' && String(record.portfolioId ?? '') !== filters.portfolioId) return false;
  if (filters.symbol && !record.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
  if (filters.action !== 'ALL' && record.action !== filters.action) return false;
  if (filters.strategy !== 'ALL' && record.strategy !== filters.strategy) return false;
  if (filters.theme !== 'ALL' && !record.tags.includes(filters.theme)) return false;
  if (filters.status !== 'ALL' && record.status !== filters.status) return false;
  if (filters.dateFrom && record.date < filters.dateFrom) return false;
  if (filters.dateTo && record.date > filters.dateTo) return false;
  return true;
};

export const TradingJournalView = ({ mode = 'journal' }: TradingJournalViewProps) => {
  const [searchParams] = useSearchParams();
  const routePortfolioId = searchParams.get('portfolioId');
  const { trades, stats, loading, error, addTrade, editTrade, removeTrade, reload } = useJournalTrades();
  const { portfolios, transactions, portfolioById, loading: ledgerLoading, error: ledgerError, reload: reloadLedger } = useJournalLedger();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<JournalTrade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalTrade | null>(null);
  const [evaluationTarget, setEvaluationTarget] = useState<JournalTrade | null>(null);
  const [evaluations, setEvaluations] = useState<Record<number, TradeEvaluation>>(() => readEvaluations());
  const [filters, setFilters] = useState<JournalFilters>(() => initialFilters(searchParams.get('portfolioId')));
  const [viewMode, setViewMode] = useState<JournalViewMode>(mode === 'transactions' ? 'timeline' : 'table');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (routePortfolioId) {
      setFilters(prev => ({ ...prev, portfolioId: routePortfolioId }));
    }
  }, [routePortfolioId]);

  useEffect(() => {
    setViewMode(mode === 'transactions' ? 'timeline' : 'table');
  }, [mode]);

  const records = useMemo<JournalRecord[]>(() => {
    const journalRecords = trades.map(trade => {
      const portfolio = trade.portfolioId ? portfolioById.get(trade.portfolioId) : undefined;
      return {
        id: `journal-${trade.id}`,
        source: 'journal' as const,
        trade,
        symbol: trade.symbol,
        portfolioId: trade.portfolioId,
        portfolioName: portfolio?.name,
        action: actionFromTrade(trade),
        date: trade.closedAt ?? trade.openedAt,
        quantity: toNumber(trade.quantity),
        price: toNumber(trade.purchasePrice),
        fee: toNumber(trade.commission),
        strategy: trade.strategy,
        notes: trade.notes,
        tags: trade.tags ?? [],
        status: trade.status,
        pnl: trade.pnl,
        returnPct: trade.returnPct,
        evaluation: evaluations[trade.id],
      };
    });

    const ledgerRecords = transactions.map(transaction => ({
      id: `ledger-${transaction.portfolioId}-${transaction.id}`,
      source: 'ledger' as const,
      ledger: transaction,
      symbol: transaction.symbol ?? transaction.action,
      portfolioId: transaction.portfolioId,
      portfolioName: transaction.portfolioName,
      action: transaction.action,
      date: transaction.tradeDate,
      quantity: toNumber(transaction.quantity),
      price: toNumber(transaction.price),
      fee: toNumber(transaction.fee),
      strategy: transaction.source,
      notes: transaction.notes,
      tags: [],
      status: 'LEDGER',
      pnl: undefined,
      returnPct: undefined,
    }));

    return [...journalRecords, ...ledgerRecords];
  }, [evaluations, portfolioById, trades, transactions]);

  const pageRecords = useMemo(
    () => records.filter(record => mode === 'transactions' ? record.source === 'ledger' : record.source === 'journal'),
    [mode, records]
  );

  const filtered = useMemo(() => {
    return pageRecords
      .filter(record => matchesFilters(record, filters))
      .sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        const diff = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
        return sortDir === 'desc' ? -diff : diff;
      });
  }, [filters, pageRecords, sortDir, sortKey]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(direction => direction === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleSaveTrade = async (payload: TradeModalPayload) => {
    let saved: JournalTrade;
    if (editTarget) {
      saved = await editTrade(editTarget.id, payload.journal);
    } else {
      saved = await addTrade(payload.journal);
      if (payload.portfolioId) {
        await createPortfolioTransaction(payload.portfolioId, {
          symbol: payload.journal.symbol,
          assetType: payload.assetType,
          action: payload.portfolioAction,
          quantity: payload.journal.quantity,
          price: payload.journal.purchasePrice,
          currency: payload.currency,
          fee: payload.journal.commission ?? 0,
          fxRateToBase: 1,
          tradeDate: payload.journal.openedAt,
          source: 'MANUAL',
          notes: payload.journal.notes,
        });
      }
    }
    await reload();
    await reloadLedger();
    if (payload.journal.type === 'SELL') {
      setEvaluationTarget(saved);
    }
  };

  const saveEvaluation = (tradeId: number, evaluation: TradeEvaluation) => {
    const next = { ...evaluations, [tradeId]: evaluation };
    setEvaluations(next);
    writeEvaluations(next);
  };

  const exportCsv = () => {
    const blob = new Blob([buildCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const isTransactions = mode === 'transactions';
  const pageError = isTransactions ? ledgerError : error;
  const pageLoading = isTransactions ? ledgerLoading : loading;

  return (
    <div className="terminal-main overflow-y-auto animate-fade-in" style={{ background: 'linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)' }}>
      {(showModal || editTarget) && (
        <TradeModal
          portfolios={portfolios}
          defaultPortfolioId={filters.portfolioId !== 'ALL' ? Number(filters.portfolioId) : portfolios.find(portfolio => portfolio.defaultPortfolio)?.id ?? portfolios[0]?.id ?? null}
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSubmit={handleSaveTrade}
        />
      )}
      {deleteTarget && <DeleteConfirm trade={deleteTarget} onConfirm={async () => { await removeTrade(deleteTarget.id); setDeleteTarget(null); await reload(); }} onCancel={() => setDeleteTarget(null)} />}
      {evaluationTarget && <EvaluationModal trade={evaluationTarget} initial={evaluations[evaluationTarget.id]} onClose={() => setEvaluationTarget(null)} onSave={saveEvaluation} />}

      <div className="border-b px-6 pb-5 pt-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--color-accent-light)' }}>{isTransactions ? 'Portfolio ledger' : 'Decision journal'}</div>
            <div className="mt-1 text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{isTransactions ? 'Transactions / Log' : 'Trading Journal'}</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{isTransactions ? 'Cash, buy/sell, dividend and fee ledger records from portfolios.' : 'Thesis, strategy, result review and mistake analysis for journal trades.'}</div>
          </div>
          <div className="flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
            <Link to="/transactions" className="px-4 py-2 text-xs font-bold" style={{ background: isTransactions ? 'var(--color-accent-dim)' : 'transparent', color: isTransactions ? 'var(--color-accent-light)' : 'var(--color-text-secondary)' }}>Transactions</Link>
            <Link to="/journal" className="px-4 py-2 text-xs font-bold" style={{ background: !isTransactions ? 'var(--color-accent-dim)' : 'transparent', color: !isTransactions ? 'var(--color-accent-light)' : 'var(--color-text-secondary)' }}>Journal</Link>
          </div>
        </div>
        {pageError && <div className="mt-4 rounded px-3 py-2 text-xs" style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)' }}>{isTransactions ? 'Ledger' : 'Journal'}: {pageError}</div>}
      </div>

      {isTransactions ? <LedgerSummary records={pageRecords} portfoliosCount={portfolios.length} loading={ledgerLoading} /> : <JournalAnalysisPanel stats={stats} records={pageRecords} evaluations={evaluations} />}

      <JournalToolbar filters={filters} viewMode={viewMode} portfolios={portfolios} resultCount={filtered.length} onFiltersChange={setFilters} onViewModeChange={setViewMode} onExportCsv={exportCsv} onAddTrade={() => { setEditTarget(null); setShowModal(true); }} />

      {isTransactions && portfolios.length === 0 && !ledgerLoading && (
        <div className="mx-6 mt-4 rounded-lg border p-4 text-xs" style={{ borderColor: 'var(--color-warning)', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-text-secondary)' }}>
          No portfolio records exist in /portfolios yet. Enriched legacy positions can still show in Portfolio/Watchlist, but transaction ledger needs a persisted portfolio and portfolio transactions.
        </div>
      )}

      <JournalHistory records={filtered} viewMode={viewMode} loading={pageLoading} error={pageError} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onEditTrade={setEditTarget} onDeleteTrade={setDeleteTarget} onEvaluateTrade={setEvaluationTarget} />
    </div>
  );
};

const LedgerSummary = ({ records, portfoliosCount, loading }: { records: JournalRecord[]; portfoliosCount: number; loading: boolean }) => {
  const totals = records.reduce((acc, record) => {
    const amount = record.quantity * record.price;
    if (record.action === 'BUY') acc.buys += amount + record.fee;
    if (record.action === 'SELL') acc.sells += amount - record.fee;
    if (record.action === 'DIVIDEND') acc.dividends += amount;
    if (record.action === 'FEE') acc.fees += record.fee || amount;
    if (record.action === 'CASH_DEPOSIT' || record.action === 'TRANSFER_IN') acc.cashIn += amount;
    if (record.action === 'CASH_WITHDRAWAL' || record.action === 'TRANSFER_OUT') acc.cashOut += amount;
    acc.fees += record.action !== 'FEE' ? record.fee : 0;
    return acc;
  }, { buys: 0, sells: 0, dividends: 0, fees: 0, cashIn: 0, cashOut: 0 });

  const netCash = totals.cashIn + totals.sells + totals.dividends - totals.cashOut - totals.buys - totals.fees;
  const actionCounts = records.reduce((map, record) => map.set(record.action, (map.get(record.action) ?? 0) + 1), new Map<string, number>());

  return (
    <section className="border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        <LedgerCard label="Portfolios" value={String(portfoliosCount)} />
        <LedgerCard label="Ledger Rows" value={loading ? '...' : String(records.length)} />
        <LedgerCard label="Gross Buy" value={fmtCurrency(totals.buys)} color="var(--color-bear)" />
        <LedgerCard label="Gross Sell" value={fmtCurrency(totals.sells)} color="var(--color-bull)" />
        <LedgerCard label="Dividends" value={fmtCurrency(totals.dividends)} color="var(--color-warning)" />
        <LedgerCard label="Net Cash Flow" value={`${netCash >= 0 ? '+' : '-'}${fmtCurrency(netCash)}`} color={positiveColor(netCash)} />
      </div>
      <div className="mt-4 rounded-lg border p-3" style={{ background: 'rgba(12, 16, 28, 0.72)', borderColor: 'var(--color-border)' }}>
        <div className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Action mix</div>
        <div className="flex flex-wrap gap-2">
          {actionCounts.size > 0 ? Array.from(actionCounts.entries()).map(([action, count]) => (
            <span key={action} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>{action}: {count}</span>
          )) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No ledger action data yet.</span>}
        </div>
      </div>
    </section>
  );
};

const LedgerCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="rounded-lg border p-3" style={{ background: 'rgba(18, 24, 38, 0.88)', borderColor: 'var(--color-border)' }}>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    <div className="mt-1 font-mono text-base font-bold" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
  </div>
);