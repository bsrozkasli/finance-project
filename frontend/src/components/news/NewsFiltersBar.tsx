import type { InvestmentPortfolio, Watchlist } from '../../api/client';
import { CATEGORIES } from './newsUtils';
import type { NewsFilters, SentimentFilter, TimeFilter } from './newsUtils';

interface NewsFiltersBarProps {
  filters: NewsFilters;
  portfolios: InvestmentPortfolio[];
  watchlists: Watchlist[];
  onChange: (patch: Partial<NewsFilters>) => void;
}

const buttonStyle = (active: boolean) => ({
  background: active ? 'var(--color-accent-dim)' : 'transparent',
  color: active ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
  border: active ? '1px solid rgba(77,142,255,0.25)' : '1px solid transparent',
});

export const NewsFiltersBar = ({ filters, portfolios, watchlists, onChange }: NewsFiltersBarProps) => (
  <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
    <div className="flex items-center gap-1 overflow-x-auto px-4 py-2">
      {CATEGORIES.map(category => <button key={category.id} type="button" onClick={() => onChange({ category: category.id, page: 0 })} className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={buttonStyle(filters.category === category.id)}>{category.label}</button>)}
    </div>
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      <select value={filters.portfolioId} onChange={event => onChange({ portfolioId: event.target.value, watchlistId: 'ALL', page: 0 })} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
        <option value="ALL">All portfolios</option>
        {portfolios.map(portfolio => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
      </select>
      <select value={filters.watchlistId} onChange={event => onChange({ watchlistId: event.target.value, portfolioId: 'ALL', page: 0 })} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
        <option value="ALL">All watchlists</option>
        {watchlists.map(watchlist => <option key={watchlist.id} value={watchlist.id}>{watchlist.name}</option>)}
      </select>
      <div className="flex h-8 min-w-[180px] items-center gap-2 rounded-lg px-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <input value={filters.symbol} onChange={event => onChange({ symbol: event.target.value.toUpperCase(), page: 0 })} placeholder="Symbol search..." className="flex-1 bg-transparent text-xs outline-none" style={{ color: 'var(--color-text-primary)' }} />
      </div>
      <div className="flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
        {(['ALL', '1H', 'TODAY', 'WEEK', 'MONTH'] as TimeFilter[]).map(time => <button key={time} type="button" onClick={() => onChange({ time, page: 0 })} className="h-8 px-2 text-xs font-semibold" style={{ background: filters.time === time ? 'var(--color-accent-dim)' : 'var(--color-bg-card)', color: filters.time === time ? 'var(--color-accent-light)' : 'var(--color-text-secondary)' }}>{time}</button>)}
      </div>
      <select value={filters.sentiment} onChange={event => onChange({ sentiment: event.target.value as SentimentFilter, page: 0 })} className="h-8 rounded-lg px-2 text-xs outline-none" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
        <option value="ALL">All sentiment</option><option value="BULLISH">Bullish only</option><option value="BEARISH">Bearish only</option><option value="NEUTRAL">Neutral only</option>
      </select>
      <button type="button" onClick={() => onChange({ priority: filters.priority === 'HIGH' ? 'ALL' : 'HIGH', page: 0 })} className="h-8 rounded-lg px-3 text-xs font-semibold" style={{ background: filters.priority === 'HIGH' ? 'var(--color-bear-dim)' : 'var(--color-bg-card)', color: filters.priority === 'HIGH' ? 'var(--color-bear)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>HIGH only</button>
    </div>
  </div>
);