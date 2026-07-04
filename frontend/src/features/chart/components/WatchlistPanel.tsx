import { useEffect, useState } from 'react';
import type { Asset } from '../../../api/types';
import type { ChartSymbolInfo } from '../types/chart.types';
import { marketDataService } from '../services/marketDataService';

interface WatchlistPanelProps {
  activeSymbol: string;
  assets: Asset[];
  onSelectSymbol: (symbol: string) => void;
}

type WatchlistRow = {
  symbol: string;
  name: string;
  info: ChartSymbolInfo | null;
  error: string | null;
};

export const WatchlistPanel = ({ activeSymbol, assets, onSelectSymbol }: WatchlistPanelProps) => {
  const [symbolsData, setSymbolsData] = useState<WatchlistRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      if (assets.length === 0) {
        setSymbolsData([]);
        return;
      }

      setLoading(true);
      const results = await Promise.all(
        assets.map(async (asset) => {
          try {
            const info = await marketDataService.getSymbolInfo(asset.symbol);
            return { symbol: asset.symbol, name: asset.name, info, error: null };
          } catch (error) {
            return {
              symbol: asset.symbol,
              name: asset.name,
              info: null,
              error: error instanceof Error ? error.message : 'Price unavailable',
            };
          }
        })
      );

      if (!cancelled) {
        setSymbolsData(results);
        setLoading(false);
      }
    };

    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [assets]);

  return (
    <div
      className="w-64 border-l flex flex-col shrink-0"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Watchlist</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && symbolsData.length === 0 && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton h-10 rounded" />)}
          </div>
        )}

        {!loading && symbolsData.length === 0 && (
          <div className="p-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Add assets to build the watchlist.
          </div>
        )}

        {symbolsData.map((item) => {
          const change = item.info?.change ?? null;
          const changePercent = item.info?.changePercent ?? null;
          return (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className="w-full flex items-center justify-between p-3 border-b transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                background: activeSymbol === item.symbol ? 'var(--color-accent-dim)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (activeSymbol !== item.symbol) {
                  e.currentTarget.style.background = 'var(--color-bg-card)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSymbol !== item.symbol) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div className="min-w-0 text-left">
                <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {item.symbol}
                </div>
                <div className="truncate text-xs max-w-28" style={{ color: 'var(--color-text-muted)' }}>
                  {item.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
                  {item.info ? item.info.price.toFixed(2) : '--'}
                </div>
                <div
                  className="text-xs font-medium"
                  title={item.error ?? undefined}
                  style={{ color: change == null || change >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                >
                  {changePercent == null ? 'No data' : `${changePercent.toFixed(2)}%`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
