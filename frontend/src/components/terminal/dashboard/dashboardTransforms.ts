import type { Asset } from '../../../api/types';
import type { AllocationSlice } from '../../../api/client';
import type { DashboardLivePrice } from '../../../hooks/useDashboardLivePrices';
import type { PortfolioScopedHolding } from '../../../hooks/useDashboardPortfolioData';

export interface DashboardPosition {
  symbol: string;
  company: string;
  assetType: string;
  quantity: number;
  avgCost: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  allocation: number;
  dailyReturn: number;
  totalReturn: number;
  unrealizedPnL: number;
  realizedPnl: number;
  currency: string;
  portfolioName: string;
  sparkline: number[];
  lastUpdated?: string;
}

export interface DashboardSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalReturn: number;
  holdingsCount: number;
}

export interface PortfolioHealth {
  score: number;
  diversificationScore: number;
  concentrationWarning: string | null;
  profitabilityLabel: 'Positive' | 'Neutral' | 'Negative';
  topWeight: number;
  distinctAssets: number;
}

const COLORS = ['#4d8eff', '#4edea3', '#f59e0b', '#a78bfa', '#fb7185', '#60a5fa', '#34d399', '#f472b6'];

const pct = (numerator: number, denominator: number) => denominator > 0 ? (numerator / denominator) * 100 : 0;

export const buildDashboardPositions = (
  holdings: PortfolioScopedHolding[],
  prices: Record<string, DashboardLivePrice>,
  assets: Asset[]
): DashboardPosition[] => {
  const nameBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset.name]));
  const totalValue = holdings.reduce((sum, holding) => {
    const price = prices[holding.symbol]?.price ?? holding.averageCost;
    return sum + (price * holding.quantity);
  }, 0);

  return holdings.map((holding) => {
    const live = prices[holding.symbol];
    const currentPrice = live?.price ?? holding.averageCost;
    const marketValue = currentPrice * holding.quantity;
    const unrealizedPnL = marketValue - holding.costBasis;
    return {
      symbol: holding.symbol,
      company: nameBySymbol.get(holding.symbol) ?? holding.symbol,
      assetType: holding.assetType,
      quantity: holding.quantity,
      avgCost: holding.averageCost,
      costBasis: holding.costBasis,
      currentPrice,
      marketValue,
      allocation: pct(marketValue, totalValue),
      dailyReturn: live?.changePct ?? 0,
      totalReturn: pct(unrealizedPnL, holding.costBasis),
      unrealizedPnL,
      realizedPnl: holding.realizedPnl,
      currency: holding.currency,
      portfolioName: holding.portfolioName,
      sparkline: live?.sparkline ?? [],
      lastUpdated: live?.timestamp,
    };
  });
};

export const buildSummary = (positions: DashboardPosition[]): DashboardSummary => {
  const totalValue = positions.reduce((sum, position) => sum + position.marketValue, 0);
  const totalCost = positions.reduce((sum, position) => sum + position.costBasis, 0);
  const totalPnL = totalValue - totalCost;
  return {
    totalValue,
    totalCost,
    totalPnL,
    totalReturn: pct(totalPnL, totalCost),
    holdingsCount: positions.length,
  };
};

const sliceBy = (positions: DashboardPosition[], keyFor: (position: DashboardPosition) => string): AllocationSlice[] => {
  const total = positions.reduce((sum, position) => sum + position.marketValue, 0);
  const values = new Map<string, number>();
  for (const position of positions) {
    const key = keyFor(position);
    values.set(key, (values.get(key) ?? 0) + position.marketValue);
  }

  return Array.from(values.entries())
    .map(([name, amount], index) => ({
      name,
      amount,
      value: pct(amount, total),
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const buildAssetAllocation = (positions: DashboardPosition[]): AllocationSlice[] => (
  positions
    .map((position, index) => ({
      name: position.symbol,
      amount: position.marketValue,
      value: position.allocation,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount)
);

export const buildTypeAllocation = (positions: DashboardPosition[]): AllocationSlice[] => (
  sliceBy(positions, (position) => position.assetType.replaceAll('_', ' '))
);

export const buildCountryAllocation = (positions: DashboardPosition[]): AllocationSlice[] => (
  sliceBy(positions, (position) => {
    if (position.assetType.startsWith('US_')) return 'United States';
    if (position.assetType.startsWith('BIST_')) return 'Turkey';
    if (position.currency === 'TRY') return 'Turkey';
    if (position.currency === 'USD') return 'United States';
    return 'Other';
  })
);

export const buildHealth = (positions: DashboardPosition[], summary: DashboardSummary): PortfolioHealth => {
  const distinctAssets = new Set(positions.map((position) => position.assetType)).size;
  const topWeight = positions.reduce((max, position) => Math.max(max, position.allocation), 0);
  const diversificationScore = Math.min(40, distinctAssets * 10);
  const concentrationScore = topWeight > 30 ? Math.max(0, 30 - (topWeight - 30)) : 30;
  const profitabilityScore = summary.totalReturn > 0 ? 30 : summary.totalReturn === 0 ? 15 : 5;
  const score = Math.round(Math.max(0, Math.min(100, diversificationScore + concentrationScore + profitabilityScore)));

  return {
    score,
    diversificationScore,
    concentrationWarning: topWeight >= 30 ? `Top holding is ${topWeight.toFixed(1)}% of the portfolio` : null,
    profitabilityLabel: summary.totalReturn > 0 ? 'Positive' : summary.totalReturn < 0 ? 'Negative' : 'Neutral',
    topWeight,
    distinctAssets,
  };
};
