import { useState, useEffect } from 'react';
import { Search, Terminal, Clock, BookOpen } from 'lucide-react';
import type { Stock } from '../types';

interface TopBarProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
  onOpenTradingJournal: () => void;
}

export default function TopBar({
  stocks,
  onSelectStock,
  onOpenTradingJournal,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [utcTime, setUtcTime] = useState('');

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        hour12: false,
      };
      setUtcTime(now.toLocaleString('en-US', options).replace(',', ' -') + ' UTC');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Search Input
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.sector.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, stocks]);

  return (
    <header className="h-16 border-b border-outline-variant bg-bg-base flex items-center justify-between px-6 shrink-0 z-40 relative">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center border border-primary/20 shadow-md">
          <Terminal className="w-5 h-5 text-bg-base stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight text-text-primary leading-none">
            Nexus Terminal
          </h1>
          <span className="font-data-mono text-[9px] text-primary tracking-wider uppercase">
            Quant Intelligence
          </span>
        </div>
      </div>

      {/* Global Stock Search */}
      <div className="flex-1 max-w-md mx-8 relative">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search symbols, names, or sectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-11 left-0 w-full bg-bg-primary border border-outline-variant rounded-lg shadow-2xl p-2 z-50 max-h-64 overflow-y-auto">
            <div className="text-[10px] text-text-muted font-label-caps uppercase px-3 py-1 border-b border-outline-variant/30 mb-1">
              Matching Instruments
            </div>
            {searchResults.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => {
                  onSelectStock(stock);
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-bg-card text-left transition-colors group"
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-data-mono text-sm font-bold text-primary group-hover:text-text-primary">
                      {stock.symbol}
                    </span>
                    <span className="text-xs text-text-secondary truncate max-w-[200px]">
                      {stock.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">{stock.sector}</span>
                </div>
                <div className="text-right font-data-mono text-xs">
                  <div className="text-text-primary font-bold">${stock.price.toFixed(2)}</div>
                  <div
                    className={
                      stock.change >= 0 ? 'text-bull-green font-bold' : 'text-bear-red font-bold'
                    }
                  >
                    {stock.change >= 0 ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-5">
        {/* Trading Journal PopUp Trigger */}
        <button
          onClick={onOpenTradingJournal}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded-lg text-primary hover:text-text-primary text-xs font-sans font-bold transition-all shadow-sm shrink-0"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>Trading Journal</span>
        </button>

        {/* Market Status Indicators */}
        <div className="hidden lg:flex items-center gap-3 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning-amber pulse-live"></span>
            <span className="font-label-caps text-[10px] text-text-secondary uppercase">
              MARKET CLOSED
            </span>
          </div>
          <div className="h-3 w-[1px] bg-outline-variant"></div>
          <div className="flex items-center gap-2 text-text-muted">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-data-mono text-[11px] font-medium tracking-tight text-text-secondary">
              {utcTime}
            </span>
          </div>
        </div>

        {/* Live Feed Status */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-bull-green pulse-live"></span>
          <span className="font-label-caps text-[10px] text-bull-green uppercase tracking-wider">
            FEED ACTIVE
          </span>
        </div>
      </div>
    </header>
  );
}
