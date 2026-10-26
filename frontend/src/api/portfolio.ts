import { apiClient } from './http';
import type { PriceStatus } from './types';

export interface PortfolioPosition {
  id: number;
  symbol: string;
  quantity: number;
  avgCostPrice: number;
  openedAt: string;
  notes?: string;
}

export interface AddPositionRequest {
  symbol: string;
  quantity: number;
  avgCostPrice: number;
  openedAt: string;
  notes?: string;
}

export const fetchPortfolioPositions = async (): Promise<PortfolioPosition[]> => {
  const response = await apiClient.get<PortfolioPosition[]>('/portfolio/positions');
  return response.data;
};

export const addPortfolioPosition = async (request: AddPositionRequest): Promise<PortfolioPosition> => {
  const response = await apiClient.post<PortfolioPosition>('/portfolio/positions', request);
  return response.data;
};

export const updatePortfolioPosition = async (id: number, request: AddPositionRequest): Promise<PortfolioPosition> => {
  const response = await apiClient.put<PortfolioPosition>(`/portfolio/positions/${id}`, request);
  return response.data;
};

export const deletePortfolioPosition = async (id: number): Promise<void> => {
  await apiClient.delete(`/portfolio/positions/${id}`);
};


// Portfolio Summary

export interface PortfolioSummary {
  totalValue: number | null;
  cashBalance: number;
  dailyPnL: number | null;
  dailyPnLPercent: number | null;
  totalPnL: number | null;
  totalReturn: number | null;
  pricingComplete: boolean;
  /** Worst status of the priced positions; null/absent when unknown. */
  pricingStatus?: PriceStatus | null;
}

export interface PortfolioPerformancePoint {
  date: string;
  portfolioValue: number;
  benchmarkValue?: number | null;
}

export interface PortfolioPerformanceResponse {
  period: string;
  series: PortfolioPerformancePoint[];
  metrics?: { sharpe: number | null; maxDrawdown: number | null };
}


export interface PortfolioComparisonPoint {
  date: string;
  value: number;
  returnPct: number;
}

export interface PortfolioComparisonSeries {
  id: string;
  label: string;
  type: 'PORTFOLIO' | 'BENCHMARK';
  currency?: string | null;
  points: PortfolioComparisonPoint[];
}

export interface PortfolioPerformanceComparisonResponse {
  period: string;
  series: PortfolioComparisonSeries[];
}

export interface PortfolioPositionPerformance {
  symbol: string;
  company: string;
  addedDate?: string | null;
  costPrice: number;
  currentPrice: number | null;
  marketValue: number | null;
  weight: number | null;
  dailyReturn?: number | null;
  weeklyReturn?: number | null;
  oneMonthReturn?: number | null;
  threeMonthReturn?: number | null;
  sixMonthReturn?: number | null;
  oneYearReturn?: number | null;
  totalReturn: number | null;
  priceAsOf?: string | null;
  priceStatus?: PriceStatus | null;
}
export interface AllocationSlice {
  name: string;
  value: number | null;
  amount: number | null;
  color?: string;
}

export interface PortfolioAllocation {
  bySector: AllocationSlice[];
  byAsset: AllocationSlice[];
  byCountry: AllocationSlice[];
}

export interface EnrichedPosition {
  symbol: string;
  company: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  costBasis: number;
  marketValue: number | null;
  allocation: number | null;
  dailyReturn: number | null;
  totalReturn: number | null;
  unrealizedPnL: number | null;
  priceAsOf?: string | null;
  priceStatus?: PriceStatus | null;
}


export type OptimizationObjective =
  | 'MAX_SHARPE'
  | 'MIN_VOLATILITY'
  | 'TARGET_RISK'
  | 'MAX_RETURN'
  | 'RISK_PARITY';

export interface PortfolioOptimizationRequest {
  symbols: string[];
  objective: OptimizationObjective;
  risk_free_rate: number;
  lookback_period: number;
  max_weight: number;
  min_weight: number;
}

export interface PortfolioOptimizationMetrics {
  returns?: number;
  volatility?: number;
  sharpe?: number;
  drawdown?: number;
  weights?: Record<string, number>;
}

export interface EfficientFrontierPoint {
  expectedReturn?: number;
  expected_return?: number;
  volatility: number;
  sharpe?: number;
  sharpeRatio?: number;
  sharpe_ratio?: number;
  targetReturn?: number;
  target_return?: number;
  weights?: Record<string, number>;
}

export interface PortfolioOptimizationResponse {
  portfolioMetrics?: PortfolioOptimizationMetrics;
  portfolio_metrics?: PortfolioOptimizationMetrics;
  weights: Record<string, number>;
  efficientFrontier?: EfficientFrontierPoint[];
  efficient_frontier?: EfficientFrontierPoint[];
  optimizedAt?: string;
  optimized_at?: string;
}

export interface RebalanceCheckRequest {
  target_weights: Record<string, number>;
  current_weights: Record<string, number>;
  threshold: number;
}

export interface RebalanceAction {
  symbol: string;
  targetWeight?: number;
  target_weight?: number;
  currentWeight?: number;
  current_weight?: number;
  deviation: number;
  requiresRebalance?: boolean;
  requires_rebalance?: boolean;
  action: string;
}

export interface RebalanceCheckResponse {
  actions: RebalanceAction[];
}
export const fetchPortfolioSummary = async (): Promise<PortfolioSummary> => {
  const response = await apiClient.get<PortfolioSummary>('/portfolio/summary');
  return response.data;
};

export const fetchPortfolioPerformance = async (
  period = '1M',
  benchmark?: string
): Promise<PortfolioPerformanceResponse> => {
  const response = await apiClient.get<PortfolioPerformanceResponse>('/portfolio/performance', {
    params: { period, ...(benchmark ? { benchmark } : {}) },
  });
  return response.data;
};


export const fetchPortfolioPerformanceComparison = async (
  period = '6M',
  portfolioIds: number[] = [],
  benchmarks: string[] = []
): Promise<PortfolioPerformanceComparisonResponse> => {
  const response = await apiClient.get<PortfolioPerformanceComparisonResponse>('/portfolio/performance/comparison', {
    params: {
      period,
      ...(portfolioIds.length ? { portfolioIds: portfolioIds.join(',') } : {}),
      ...(benchmarks.length ? { benchmarks: benchmarks.join(',') } : {}),
    },
  });
  return response.data;
};
export const fetchPortfolioPositionsPerformance = async (
  portfolioId?: number
): Promise<PortfolioPositionPerformance[]> => {
  const response = await apiClient.get<PortfolioPositionPerformance[]>('/portfolio/positions/performance', {
    params: Number.isFinite(portfolioId) ? { portfolioId } : {},
  });
  return response.data;
};
export const fetchPortfolioAllocation = async (): Promise<PortfolioAllocation> => {
  const response = await apiClient.get<PortfolioAllocation>('/portfolio/allocation');
  return response.data;
};

export type PortfolioAssetType = 'US_STOCK' | 'US_ETF' | 'BIST_STOCK' | 'FUND' | 'GOLD' | 'CASH' | 'OTHER';
export type PortfolioTransactionAction = 'BUY' | 'SELL' | 'DIVIDEND' | 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'FEE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'MANUAL_VALUATION';
export type PortfolioTransactionSource = 'MANUAL' | 'CSV';

export interface InvestmentPortfolio {
  id: number;
  userId: string;
  name: string;
  baseCurrency: string;
  description?: string;
  defaultPortfolio: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvestmentPortfolioRequest {
  name: string;
  baseCurrency: string;
  description?: string;
  defaultPortfolio?: boolean;
}

export interface PortfolioTransaction {
  id: number;
  portfolioId: number;
  userId: string;
  symbol?: string | null;
  assetType: PortfolioAssetType;
  action: PortfolioTransactionAction;
  quantity: number;
  price: number;
  currency: string;
  fee: number;
  fxRateToBase: number;
  tradeDate: string;
  source: PortfolioTransactionSource;
  originLocator: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreatePortfolioTransactionRequest {
  symbol?: string;
  assetType?: PortfolioAssetType;
  action: PortfolioTransactionAction;
  quantity?: number;
  price?: number;
  currency?: string;
  fee?: number;
  fxRateToBase?: number;
  tradeDate?: string;
  /** Only MANUAL is accepted; CSV events are created through imports (R-20). */
  source?: 'MANUAL';
  notes?: string;
  journalNotes?: string;
}

export interface PortfolioHolding {
  portfolioId: number;
  symbol: string;
  assetType: PortfolioAssetType;
  quantity: number;
  averageCost: number;
  costBasis: number;
  realizedPnl: number;
  currency: string;
}

export const fetchInvestmentPortfolios = async (): Promise<InvestmentPortfolio[]> => {
  const response = await apiClient.get<InvestmentPortfolio[]>('/portfolios');
  return response.data;
};

export const createInvestmentPortfolio = async (
  request: CreateInvestmentPortfolioRequest
): Promise<InvestmentPortfolio> => {
  const response = await apiClient.post<InvestmentPortfolio>('/portfolios', request);
  return response.data;
};

export const updateInvestmentPortfolio = async (
  id: number,
  request: CreateInvestmentPortfolioRequest
): Promise<InvestmentPortfolio> => {
  const response = await apiClient.put<InvestmentPortfolio>(`/portfolios/${id}`, request);
  return response.data;
};

export const deleteInvestmentPortfolio = async (id: number): Promise<void> => {
  await apiClient.delete(`/portfolios/${id}`);
};

export const fetchPortfolioTransactions = async (portfolioId: number): Promise<PortfolioTransaction[]> => {
  const response = await apiClient.get<PortfolioTransaction[]>(`/portfolios/${portfolioId}/transactions`);
  return response.data;
};

export const createPortfolioTransaction = async (
  portfolioId: number,
  request: CreatePortfolioTransactionRequest
): Promise<PortfolioTransaction> => {
  const response = await apiClient.post<PortfolioTransaction>(`/portfolios/${portfolioId}/transactions`, request);
  return response.data;
};

export const deletePortfolioTransaction = async (portfolioId: number, transactionId: number): Promise<void> => {
  await apiClient.delete(`/portfolios/${portfolioId}/transactions/${transactionId}`);
};

export const fetchPortfolioHoldings = async (portfolioId: number): Promise<PortfolioHolding[]> => {
  const response = await apiClient.get<PortfolioHolding[]>(`/portfolios/${portfolioId}/holdings`);
  return response.data;
};
export const fetchEnrichedPositions = async (): Promise<EnrichedPosition[]> => {
  const response = await apiClient.get<EnrichedPosition[]>('/portfolio/positions/enriched');
  return response.data;
};

// Trading Journal


export const optimizePortfolio = async (
  request: PortfolioOptimizationRequest
): Promise<PortfolioOptimizationResponse> => {
  const response = await apiClient.post<PortfolioOptimizationResponse>('/portfolio/optimize', request);
  return response.data;
};

export const checkPortfolioRebalance = async (
  request: RebalanceCheckRequest
): Promise<RebalanceCheckResponse> => {
  const response = await apiClient.post<RebalanceCheckResponse>('/portfolio/rebalance-check', request);
  return response.data;
};

// CSV import batches (EPIC-002 D-4) and Portfolio State (EPIC-002 D-3)

export type PortfolioImportBatchStatus = 'STAGED' | 'ACCEPTED';
export type PortfolioImportRowStatus = 'VALID' | 'INVALID' | 'DUPLICATE' | 'ACCEPTED' | 'REJECTED';

export interface PortfolioImportCounts {
  valid: number;
  invalid: number;
  duplicate: number;
  accepted: number;
  rejected: number;
}

export interface PortfolioImportRow {
  rowNumber: number;
  status: PortfolioImportRowStatus;
  message: string | null;
  originLocator: string | null;
  transactionId: number | null;
}

export interface PortfolioImportBatch {
  batchId: number;
  portfolioId: number;
  status: PortfolioImportBatchStatus;
  fileSha256: string;
  createdAt: string;
  acceptedAt: string | null;
  counts: PortfolioImportCounts;
  rows: PortfolioImportRow[];
}

export type PortfolioStateExposureStatus = 'COMPLETE' | 'PARTIAL' | 'EMPTY';
export type PortfolioStateValuationStatus =
  | 'PRICED'
  | 'STALE_PRICE'
  | 'NO_PRICE'
  | 'CURRENCY_UNKNOWN'
  | 'CURRENCY_MISMATCH'
  | 'CLOSED';

export interface PortfolioStatePosition {
  symbol: string;
  assetType: PortfolioAssetType;
  quantity: number;
  averageCost: number | null;
  costBasis: number | null;
  realizedPnl: number | null;
  currency: string | null;
  valuationStatus: PortfolioStateValuationStatus;
  price: number | null;
  priceDate: string | null;
  marketValue: number | null;
  weight: number | null;
}

export interface PortfolioState {
  version: string;
  portfolioId: number;
  asOf: string;
  exposureStatus: PortfolioStateExposureStatus;
  sourceEventIds: number[];
  positions: PortfolioStatePosition[];
  assetTypeWeights: Partial<Record<PortfolioAssetType, number>>;
}

/** Uploads the CSV file bytes unchanged (no text decoding) so the backend file hash matches the file. */
export const uploadPortfolioImport = async (portfolioId: number, file: Blob): Promise<PortfolioImportBatch> => {
  const bytes = await file.arrayBuffer();
  const response = await apiClient.post<PortfolioImportBatch>(`/portfolios/${portfolioId}/imports`, bytes, {
    headers: { 'Content-Type': 'text/csv' },
  });
  return response.data;
};

export const fetchPortfolioImport = async (portfolioId: number, batchId: number): Promise<PortfolioImportBatch> => {
  const response = await apiClient.get<PortfolioImportBatch>(`/portfolios/${portfolioId}/imports/${batchId}`);
  return response.data;
};

export const acceptPortfolioImport = async (portfolioId: number, batchId: number): Promise<PortfolioImportBatch> => {
  const response = await apiClient.post<PortfolioImportBatch>(`/portfolios/${portfolioId}/imports/${batchId}/accept`);
  return response.data;
};

export const createPortfolioState = async (portfolioId: number, asOf: string): Promise<PortfolioState> => {
  const response = await apiClient.post<PortfolioState>(`/portfolios/${portfolioId}/states`, { asOf });
  return response.data;
};

export const fetchPortfolioState = async (portfolioId: number, version: string): Promise<PortfolioState> => {
  const response = await apiClient.get<PortfolioState>(
    `/portfolios/${portfolioId}/states/${encodeURIComponent(version)}`,
  );
  return response.data;
};
