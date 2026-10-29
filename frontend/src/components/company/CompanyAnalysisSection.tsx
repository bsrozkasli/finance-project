import { fetchCompanyAnalysis } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import { HealthScorePanel, PeersPanel, QuarterlyTrendPanel, RatioHistoryPanel, StatementsPanel, ValuationPanel } from './CompanyPanels';
import './company.css';

/** Şirket Analizi panels backed by /companies/{symbol}/* (UNAVAILABLE today by design). */
export default function CompanyAnalysisSection({ symbol }: { symbol: string }) {
  const analysis = usePanelQuery(() => fetchCompanyAnalysis(symbol), [symbol]);
  return (
    <div className="company-analysis" data-testid="company-analysis">
      <div className="company-grid">
        <ValuationPanel query={analysis} />
        <HealthScorePanel query={analysis} />
      </div>
      <RatioHistoryPanel symbol={symbol} />
      <QuarterlyTrendPanel symbol={symbol} />
      <StatementsPanel symbol={symbol} />
      <PeersPanel symbol={symbol} />
    </div>
  );
}
