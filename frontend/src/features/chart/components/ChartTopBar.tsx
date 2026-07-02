import type { Range, ChartSymbolInfo } from '../types/chart.types';

const RANGES: Range[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

interface ChartTopBarProps {
  symbolInfo: ChartSymbolInfo | null;
  activeRange: Range;
  onRangeChange: (range: Range) => void;
  showSMA20: boolean;
  onToggleSMA20: () => void;
  showSMA50: boolean;
  onToggleSMA50: () => void;
}

export const ChartTopBar = ({
  symbolInfo,
  activeRange,
  onRangeChange,
  showSMA20,
  onToggleSMA20,
  showSMA50,
  onToggleSMA50,
}: ChartTopBarProps) => {
  return (
    <div 
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{ 
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-card)',
      }}
    >
      {/* Left: Symbol Info */}
      <div className="flex items-center gap-4">
        {symbolInfo ? (
          <>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {symbolInfo.symbol}
            </div>
            <div className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
              ${symbolInfo.price.toFixed(2)}
            </div>
            <div 
              className="text-sm font-medium" 
              style={{ color: symbolInfo.change >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {symbolInfo.change > 0 ? '+' : ''}{symbolInfo.change.toFixed(2)} ({symbolInfo.changePercent.toFixed(2)}%)
            </div>
          </>
        ) : (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
        )}
      </div>

      {/* Center: Range Buttons */}
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className="px-2 py-1 text-xs font-medium rounded transition-colors"
            style={{
              color: activeRange === r ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              background: activeRange === r ? 'var(--color-accent-dim)' : 'transparent',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Right: Indicators / Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSMA20}
          className="px-3 py-1 text-xs font-medium rounded transition-colors border"
          style={{
            borderColor: showSMA20 ? 'rgba(59, 130, 246, 0.5)' : 'var(--color-border)',
            color: showSMA20 ? '#3b82f6' : 'var(--color-text-secondary)',
            background: showSMA20 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          }}
        >
          SMA 20
        </button>
        <button
          onClick={onToggleSMA50}
          className="px-3 py-1 text-xs font-medium rounded transition-colors border"
          style={{
            borderColor: showSMA50 ? 'rgba(234, 179, 8, 0.5)' : 'var(--color-border)',
            color: showSMA50 ? '#eab308' : 'var(--color-text-secondary)',
            background: showSMA50 ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
          }}
        >
          SMA 50
        </button>
      </div>
    </div>
  );
};
