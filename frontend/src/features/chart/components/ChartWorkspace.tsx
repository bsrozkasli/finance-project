import type { Asset } from '../../../api/types';
import { useChartData } from '../hooks/useChartData';
import { useIndicators } from '../hooks/useIndicators';
import { useChartDrawings } from '../hooks/useChartDrawings';
import { ChartTopBar } from './ChartTopBar';
import { DrawingToolbar } from './DrawingToolbar';
import { WatchlistPanel } from './WatchlistPanel';
import { ChartCanvas } from './ChartCanvas';

interface ChartWorkspaceProps {
  assets: Asset[];
  initialSymbol?: string | null;
  onSymbolChange?: (symbol: string) => void;
}

export const ChartWorkspace = ({ assets, initialSymbol, onSymbolChange }: ChartWorkspaceProps) => {
  const {
    symbol,
    setSymbol,
    range,
    setRange,
    data,
    symbolInfo,
    loading,
    error,
  } = useChartData(initialSymbol ?? 'NVDA');

  const {
    showSMA20,
    setShowSMA20,
    sma20Data,
    showSMA50,
    setShowSMA50,
    sma50Data,
  } = useIndicators(data);

  const handleSelectSymbol = (nextSymbol: string) => {
    setSymbol(nextSymbol);
    onSymbolChange?.(nextSymbol);
  };

  const {
    activeTool,
    setActiveTool,
    drawings,
    currentDrawing,
    startDrawing,
    updateCurrentDrawing,
    completeDrawing,
    clearAllDrawings,
  } = useChartDrawings();

  return (
    <div className="terminal-main flex flex-col h-full bg-[#0a0a0c] text-white">
      <ChartTopBar
        symbolInfo={symbolInfo}
        activeRange={range}
        onRangeChange={setRange}
        showSMA20={showSMA20}
        onToggleSMA20={() => setShowSMA20(!showSMA20)}
        showSMA50={showSMA50}
        onToggleSMA50={() => setShowSMA50(!showSMA50)}
      />

      <div className="flex flex-1 overflow-hidden">
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearAll={clearAllDrawings}
        />

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-red-500">
              {error}
            </div>
          )}

          <ChartCanvas
            data={data}
            symbol={symbol}
            range={range}
            showSMA20={showSMA20}
            sma20Data={sma20Data}
            showSMA50={showSMA50}
            sma50Data={sma50Data}
            activeTool={activeTool}
            drawings={drawings}
            currentDrawing={currentDrawing}
            onStartDrawing={startDrawing}
            onUpdateDrawing={updateCurrentDrawing}
            onCompleteDrawing={completeDrawing}
          />
        </div>

        <WatchlistPanel
          activeSymbol={symbol}
          assets={assets}
          onSelectSymbol={handleSelectSymbol}
        />
      </div>
    </div>
  );
};

