import { MonthlyReturnsPanel, PortfolioAllocationPanel, SectorAllocationPanel } from './AllocationPanels';
import { CalendarPanel, UpcomingStopsPanel } from './CalendarStopsPanels';
import CompositionPanel from './CompositionPanel';
import HoldingsPanels from './HoldingsPanels';
import ReturnsHeatmapPanel from './ReturnsHeatmapPanel';

interface DashboardPanelsProps {
  portfolioId: number | undefined;
  portfolioIds: number[];
  onSelectSymbol: (symbol: string) => void;
}

/** All v2 analytic panels below the performance chart. Loaded lazily to keep the entry bundle small. */
export default function DashboardPanels({ portfolioId, portfolioIds, onSelectSymbol }: DashboardPanelsProps) {
  return (
    <div className="space-y-6">
      <ReturnsHeatmapPanel portfolioIds={portfolioIds} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CalendarPanel portfolioId={portfolioId} />
        <UpcomingStopsPanel />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PortfolioAllocationPanel />
        <SectorAllocationPanel portfolioId={portfolioId} />
        <MonthlyReturnsPanel portfolioId={portfolioId} />
      </div>
      <HoldingsPanels portfolioId={portfolioId} onSelectSymbol={onSelectSymbol} />
      <CompositionPanel portfolioId={portfolioId} />
    </div>
  );
}
