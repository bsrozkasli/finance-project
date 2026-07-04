import type { AllocationSlice } from '../../api/client';
import type { EnrichedRow } from './portfolioUtils';

export type PortfolioRiskSeverity = 'warning' | 'danger';
export type PortfolioRiskType = 'asset' | 'sector';

export interface PortfolioRiskAlert {
  id: string;
  type: PortfolioRiskType;
  severity: PortfolioRiskSeverity;
  target: string;
  allocation: number;
  message: string;
  action: string;
}

export const PORTFOLIO_RISK_ALERTS_KEY = 'finance-project:portfolio-risk-alerts';
export const PORTFOLIO_RISK_ALERTS_EVENT = 'portfolio-risk-alerts-updated';

const alertRank = (severity: PortfolioRiskSeverity) => severity === 'danger' ? 2 : 1;

const formatPct = (value: number) => `${value.toFixed(1)}%`;

export const buildPortfolioRiskAlerts = (
  rows: EnrichedRow[],
  sectors: AllocationSlice[] = []
): PortfolioRiskAlert[] => {
  const total = rows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0);
  const assetAlerts = rows
    .map<PortfolioRiskAlert | null>(row => {
      const allocation = total > 0 ? ((row.marketValue ?? 0) / total) * 100 : 0;
      const severity: PortfolioRiskSeverity | null = allocation >= 35 ? 'danger' : allocation >= 25 ? 'warning' : null;
      if (!severity) return null;
      const target = row.position.symbol;
      return {
        id: `asset:${target}`,
        type: 'asset' as const,
        severity,
        target,
        allocation,
        message: `${target} portfoyunuzun ${formatPct(allocation)} oranini olusturuyor`,
        action: severity === 'danger'
          ? `${target} agirligini %25 altina indirecek satis veya yeni varlik ekleme senaryosu calisin.`
          : `${target} icin rebalance esigi belirleyin ve yeni alimlari farkli varliklara yonlendirin.`,
      };
    })
    .filter((alert): alert is PortfolioRiskAlert => alert != null);

  const sectorAlerts = sectors
    .map<PortfolioRiskAlert | null>(sector => {
      const allocation = Number(sector.value ?? 0);
      const severity: PortfolioRiskSeverity | null = allocation >= 55 ? 'danger' : allocation >= 40 ? 'warning' : null;
      if (!severity) return null;
      return {
        id: `sector:${sector.name}`,
        type: 'sector' as const,
        severity,
        target: sector.name,
        allocation,
        message: `${sector.name} sektoru portfoyunuzun ${formatPct(allocation)} oranini olusturuyor`,
        action: severity === 'danger'
          ? `${sector.name} disi sektorlerde hedge veya kademeli pozisyon azaltma planlayin.`
          : `${sector.name} agirligini yeni alimlarda sinirlayin ve sektor dagilimini izleyin.`,
      };
    })
    .filter((alert): alert is PortfolioRiskAlert => alert != null);

  return [...assetAlerts, ...sectorAlerts]
    .sort((a, b) => alertRank(b.severity) - alertRank(a.severity) || b.allocation - a.allocation);
};

export const publishPortfolioRiskAlerts = (alerts: PortfolioRiskAlert[]) => {
  window.localStorage.setItem(PORTFOLIO_RISK_ALERTS_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent(PORTFOLIO_RISK_ALERTS_EVENT, { detail: alerts }));
};

export const readPortfolioRiskAlerts = (): PortfolioRiskAlert[] => {
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_RISK_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as PortfolioRiskAlert[] : [];
  } catch {
    return [];
  }
};
