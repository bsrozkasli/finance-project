import { useState, useEffect } from 'react';
import { Search, Terminal, Clock, BookOpen } from 'lucide-react';
import type { Stock } from '../types';
import type { Asset } from '../api/types';

type SearchInstrument = { symbol: string; name: string; sector: string; stock: Stock | null };
const NO_TRACKED_ASSETS: Asset[] = [];

interface TopBarProps {
  stocks: Stock[];
  trackedAssets?: Asset[];
  onSelectStock: (stock: Stock) => void;
  onSelectAsset?: (symbol: string, name: string) => void;
  onOpenTradingJournal: () => void;
}

export default function TopBar({
  stocks,
  trackedAssets = NO_TRACKED_ASSETS,
  onSelectStock,
  onSelectAsset,
  onOpenTradingJournal,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchInstrument[]>([]);
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
    const bySymbol = new Map<string, SearchInstrument>();
    trackedAssets.forEach((asset) => bySymbol.set(asset.symbol, {
      symbol: asset.symbol, name: asset.name || asset.symbol, sector: asset.type, stock: null,
    }));
    stocks.forEach((stock) => bySymbol.set(stock.symbol, {
      symbol: stock.symbol, name: stock.name, sector: stock.sector, stock,
    }));
    const filtered = Array.from(bySymbol.values()).filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.sector.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, stocks, trackedAssets]);

  return (
    <header className="min-h-16 border-b border-outline-variant bg-bg-base flex flex-wrap items-center justify-between gap-3 px-4 py-3 shrink-0 z-40 relative sm:flex-nowrap sm:px-6">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center border border-primary/20 shadow-md">
          <Terminal className="w-5 h-5 text-bg-base stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight text-text-primary leading-none">
            Nexus Terminal
          </h1>
          <span className="font-data-mono text-[11px] text-primary tracking-wider uppercase">
            Quant Intelligence
          </span>
        </div>
      </div>

      {/* Global Stock Search */}
      <div className="order-3 w-full relative sm:order-none sm:mx-4 sm:max-w-md sm:flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search symbols, names, or sectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary transition-all font-sans"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-11 left-0 w-full bg-bg-primary border border-outline-variant rounded-lg shadow-2xl p-2 z-50 max-h-64 overflow-y-auto">
            <div className="text-[10px] text-text-muted font-label-caps uppercase px-3 py-1 border-b border-outline-variant/30 mb-1">
              Matching Instruments
            </div>
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => {
                  if (result.stock) onSelectStock(result.stock);
                  else onSelectAsset?.(result.symbol, result.name);
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-bg-card text-left transition-colors group"
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-data-mono text-sm font-bold text-primary group-hover:text-text-primary">
                      {result.symbol}
                    </span>
                    <span className="text-xs text-text-secondary truncate max-w-[200px]">
                      {result.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">{result.sector}</span>
                </div>
                <div className="text-right font-data-mono text-xs">
                  {result.stock ? <>
                  <div className="text-text-primary font-bold">${result.stock.price.toFixed(2)}</div>
                  <div
                    className={
                      result.stock.change >= 0 ? 'text-bull-green font-bold' : 'text-bear-red font-bold'
                    }
                  >
                    {result.stock.change >= 0 ? '+' : ''}
                    {result.stock.changePercent.toFixed(2)}%
                  </div>
                  </> : <span className="text-warning-amber">Price unavailable</span>}
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

        <div className="hidden lg:flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-text-secondary">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-data-mono text-xs">{utcTime}</span>
        </div>
      </div>
    </header>
  );
}
