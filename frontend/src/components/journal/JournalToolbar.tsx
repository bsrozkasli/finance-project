import type { InvestmentPortfolio } from '../../api/client';
import { STRATEGIES, THEMES } from './journalUtils';
import type { JournalFilters, JournalViewMode } from './journalUtils';

interface JournalToolbarProps {
  filters: JournalFilters;
  viewMode: JournalViewMode;
  portfolios: InvestmentPortfolio[];
  resultCount: number;
  onFiltersChange: (filters: JournalFilters) => void;
  onViewModeChange: (mode: JournalViewMode) => void;
  onExportCsv: () => void;
  onAddTrade: () => void;
}

const filterButtonStyle = (active: boolean) => ({
  background: active ? 'var(--color-accent-dim)' : 'var(--color-bg-card)',
  color: active ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
});

export const JournalToolbar = ({
  filters,
  viewMode,
  portfolios,
  resultCount,
  onFiltersChange,
  onViewModeChange,
  onExportCsv,
  onAddTrade,
}: JournalToolbarProps) => {
  const set = (key: keyof JournalFilters, value: string) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="border-b px-6 py-3" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 min-w-[180px] items-center gap-2 rounded-lg px-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <svg width="12" height="12" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
          <input value={filters.symbol} onChange={event => set('symbol', event.target.value.toUpperCase())} placeholder="Search ticker..." className="flex-1 bg-transparent text-xs outline-none" style={{ color: 'var(--color-text-primary)' }} />
        </div>

        <select value={filters.portfolioId} onChange={event => set('portfolioId', event.target.value)} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          <option value="ALL">All portfolios</option>
          {portfolios.map(portfolio => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
        </select>

        <select value={filters.action} onChange={event => set('action', event.target.value)} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          {['ALL', 'BUY', 'SELL', 'ADD', 'REDUCE', 'DIVIDEND', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL'].map(action => <option key={action} value={action}>{action}</option>)}
        </select>

        <select value={filters.strategy} onChange={event => set('strategy', event.target.value)} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          <option value="ALL">All strategies</option>
          {STRATEGIES.map(strategy => <option key={strategy} value={strategy}>{strategy}</option>)}
        </select>

        <select value={filters.theme} onChange={event => set('theme', event.target.value)} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          <option value="ALL">All themes</option>
          {THEMES.map(theme => <option key={theme} value={theme}>{theme}</option>)}
        </select>

        <input type="date" value={filters.dateFrom} onChange={event => set('dateFrom', event.target.value)} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        <input type="date" value={filters.dateTo} onChange={event => set('dateTo', event.target.value)} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />

        <div className="flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
          {(['ALL', 'OPEN', 'CLOSED'] as const).map(status => (
            <button key={status} type="button" onClick={() => set('status', status)} className="h-8 px-3 text-xs font-semibold" style={filterButtonStyle(filters.status === status)}>{status}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
          {(['table', 'grouped', 'timeline'] as JournalViewMode[]).map(mode => (
            <button key={mode} type="button" onClick={() => onViewModeChange(mode)} className="h-8 px-3 text-xs font-semibold capitalize" style={filterButtonStyle(viewMode === mode)}>{mode}</button>
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{resultCount} kayit</span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onExportCsv} className="rounded-lg px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-bg-card)', color: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}>CSV Export</button>
          <button type="button" onClick={onAddTrade} className="rounded-lg px-3 py-2 text-xs font-bold" style={{ background: 'var(--color-accent)', color: '#fff' }}>Islem Ekle</button>
        </div>
      </div>
    </div>
  );
};