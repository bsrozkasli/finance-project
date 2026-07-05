import { useMemo, useState } from 'react';
import type { Asset } from '../../../api/types';
import type { DetectedPattern } from '../../../api/client';
import { useAgentAnalysis } from '../../../hooks/useAgentAnalysis';
import { useChartData } from '../hooks/useChartData';
import { useIndicators } from '../hooks/useIndicators';
import { useChartDrawings } from '../hooks/useChartDrawings';
import { usePatternDetection } from '../hooks/usePatternDetection';
import { useTechnicalSignals } from '../hooks/useTechnicalSignals';
import { calculatePivotLevels } from '../utils/pivotLevels';
import { ChartTopBar } from './ChartTopBar';
import { DrawingToolbar } from './DrawingToolbar';
import { WatchlistPanel } from './WatchlistPanel';
import { ChartCanvas } from './ChartCanvas';
import { WorkspaceAnalysisPanel } from './WorkspaceAnalysisPanel';
import { MultiTimeframeStrip } from './MultiTimeframeStrip';
import { AskAIModal } from './AskAIModal';

interface ChartWorkspaceProps {
  assets: Asset[];
  initialSymbol?: string | null;
  onSymbolChange?: (symbol: string) => void;
}

export const ChartWorkspace = ({ assets, initialSymbol, onSymbolChange }: ChartWorkspaceProps) => {
  const [showPatternOverlay, setShowPatternOverlay] = useState(true);
  const [showSupportResistance, setShowSupportResistance] = useState(false);
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

  const technicalSignals = useTechnicalSignals(symbol, range);
  const patternDetection = usePatternDetection(symbol, range);
  const agentAnalysis = useAgentAnalysis(symbol);

  const handleSelectSymbol = (nextSymbol: string) => {
    setSymbol(nextSymbol);
    onSymbolChange?.(nextSymbol);
  };

  const patternMarkers = useMemo(() => {
    if (!showPatternOverlay || !patternDetection.data) return [];
    return patternDetection.data.patterns.map((pattern: DetectedPattern) => {
      const index = Math.min(Math.max(pattern.endIndex, 0), Math.max(data.length - 1, 0));
      const bar = data[index];
      return {
        time: bar?.time ?? data[data.length - 1]?.time ?? new Date().toISOString().slice(0, 10),
        label: pattern.patternType.replaceAll('_', ' '),
        direction: pattern.direction,
        confidence: pattern.confidence,
        price: pattern.priceTarget,
      };
    });
  }, [data, patternDetection.data, showPatternOverlay]);

  const supportResistanceLevels = useMemo(
    () => showSupportResistance ? calculatePivotLevels(data) : [],
    [data, showSupportResistance]
  );

  return (
    <div className="terminal-main flex h-full flex-col bg-[#0a0a0c] text-white">
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

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowPatternOverlay((current) => !current)} className="rounded px-2 py-1 text-xs font-bold" style={{ color: showPatternOverlay ? 'var(--color-accent-light)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
                Patterns
              </button>
              <button type="button" onClick={() => setShowSupportResistance((current) => !current)} className="rounded px-2 py-1 text-xs font-bold" style={{ color: showSupportResistance ? 'var(--color-accent-light)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
                S/R Levels
              </button>
            </div>

            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
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
              patternMarkers={patternMarkers}
              supportResistanceLevels={supportResistanceLevels}
            />
            <AskAIModal symbol={symbol} />
          </div>

          <MultiTimeframeStrip symbol={symbol} activeRange={range} onSelectRange={setRange} />
        </div>

        <WorkspaceAnalysisPanel
          technical={technicalSignals.technical}
          signals={technicalSignals.signals}
          technicalLoading={technicalSignals.loading}
          technicalError={technicalSignals.error}
          onRefreshTechnical={technicalSignals.reload}
          agentData={agentAnalysis.data}
          agentLoading={agentAnalysis.loading}
          agentError={agentAnalysis.error}
          onRefreshAgent={agentAnalysis.invalidateAndRefetch}
          patterns={patternDetection.data}
          patternsLoading={patternDetection.loading}
          patternsError={patternDetection.error}
          onRefreshPatterns={patternDetection.reload}
        />

        <WatchlistPanel
          activeSymbol={symbol}
          assets={assets}
          onSelectSymbol={handleSelectSymbol}
        />
      </div>
    </div>
  );
};
