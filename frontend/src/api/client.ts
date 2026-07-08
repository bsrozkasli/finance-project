import axios from 'axios';
import type { Asset, PriceHistory } from './types';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchAssets = async (): Promise<Asset[]> => {
  const response = await apiClient.get<Asset[]>('/assets');
  return response.data;
};

export const addAssetBatch = async (symbols: string[]): Promise<Asset[]> => {
  const response = await apiClient.post<Asset[]>('/assets/batch', { symbols });
  return response.data;
};

export const fetchAssetPrice = async (symbol: string): Promise<PriceHistory> => {
  const response = await apiClient.get<PriceHistory>(`/prices/${symbol}/latest`);
  return response.data;
};

export const fetchPriceHistory = async (
  symbol: string,
  interval: string = '1d',
  range: string = '1mo'
): Promise<PriceHistory[]> => {
  const response = await apiClient.get<PriceHistory[]>(
    `/prices/${symbol}/history`,
    { params: { interval, range } }
  );
  return response.data;
};

export interface BatchPriceHistoryRequest {
  symbols: string[];
  interval?: string;
  range?: string;
}

export const fetchBatchPriceHistory = async (
  symbols: string[],
  interval: string = '1d',
  range: string = '1mo'
): Promise<Record<string, PriceHistory[]>> => {
  const response = await apiClient.post<Record<string, PriceHistory[]>>('/prices/batch-history', {
    symbols,
    interval,
    range,
  } satisfies BatchPriceHistoryRequest);
  return response.data;
};
export const deleteAsset = async (symbol: string): Promise<void> => {
  await apiClient.delete(`/assets/${symbol}`);
};

// Replace 'any' with a proper type if FinnhubNewsDto structure is known in the frontend,
// but for now an array of any or a basic interface is fine.
export interface NewsItem {
  id: number;
  category?: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export const fetchNews = async (symbol: string): Promise<NewsItem[]> => {
  const response = await apiClient.get<NewsItem[]>(`/news/${symbol}`);
  return response.data;
};

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

export interface AnalystRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface PriceTarget {
  symbol?: string;
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
  numberOfAnalysts?: number;
  lastUpdated?: string;
}

export interface TechnicalResult {
  symbol?: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  atr?: number;
  sma?: number;
  ema?: number;
  signalAction?: string;
  signalConfidence?: number;
}

export interface CompanyReport {
  symbol: string;
  technical?: TechnicalResult;
  recommendations?: AnalystRecommendation[];
  priceTarget?: PriceTarget | null;
  recentNews?: NewsItem[];
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

export const fetchAnalystRecommendations = async (symbol: string): Promise<AnalystRecommendation[]> => {
  const response = await apiClient.get<AnalystRecommendation[]>(`/analyst/${symbol}/recommendations`);
  return response.data;
};

export const fetchPriceTarget = async (symbol: string): Promise<PriceTarget> => {
  const response = await apiClient.get<PriceTarget>(`/analyst/${symbol}/price-target`);
  return response.data;
};

export const fetchTechnicalAnalysis = async (
  symbol: string,
  interval = '1d',
  range = '3mo'
): Promise<TechnicalResult> => {
  const response = await apiClient.get<TechnicalResult>(`/technical/${symbol}`, { params: { interval, range } });
  return response.data;
};

export const fetchCompanyReport = async (symbol: string): Promise<CompanyReport> => {
  const response = await apiClient.get<CompanyReport>(`/reports/company/${symbol}`);
  return response.data;
};

// Portfolio Summary

export interface PortfolioSummary {
  totalValue: number;
  cashBalance: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalPnL: number;
  totalReturn: number;
}

export interface PortfolioPerformancePoint {
  date: string;
  portfolioValue: number;
  benchmarkValue?: number;
}

export interface PortfolioPerformanceResponse {
  period: string;
  series: PortfolioPerformancePoint[];
  metrics?: { sharpe?: number; maxDrawdown?: number; volatility?: number };
}

export interface AllocationSlice {
  name: string;
  value: number;
  amount: number;
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
  currentPrice: number;
  costBasis: number;
  marketValue: number;
  allocation: number;
  dailyReturn: number;
  totalReturn: number;
  unrealizedPnL: number;
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
  symbol?: string;
  assetType: PortfolioAssetType;
  action: PortfolioTransactionAction;
  quantity: number;
  price: number;
  currency: string;
  fee: number;
  fxRateToBase: number;
  tradeDate: string;
  source: PortfolioTransactionSource;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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
  source?: PortfolioTransactionSource;
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
export type JournalTradeType = 'BUY' | 'SELL';
export type JournalTradeStatus = 'OPEN' | 'CLOSED';

export interface JournalTrade {
  id: number;
  symbol: string;
  company?: string;
  type: JournalTradeType;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  marketValue?: number;
  commission?: number;
  strategy?: string;
  notes?: string;
  tags?: string[];
  openedAt: string;
  closedAt?: string;
  status: JournalTradeStatus;
  pnl?: number;
  returnPct?: number;
  holdingDays?: number;
  portfolioId?: number;
  transactionId?: number;
}

export interface AddJournalTradeRequest {
  symbol: string;
  type: JournalTradeType;
  quantity: number;
  purchasePrice: number;
  openedAt: string;
  closedAt?: string;
  status?: JournalTradeStatus;
  currentPrice?: number;
  commission?: number;
  strategy?: string;
  notes?: string;
  portfolioId?: number;
  transactionId?: number;
  tags?: string[];
}

export interface JournalStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  avgReturn: number;
  bestTrade?: string;
  worstTrade?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const fetchJournalTrades = async (
  page = 0,
  size = 50
): Promise<PagedResponse<JournalTrade>> => {
  const response = await apiClient.get<PagedResponse<JournalTrade>>('/journal/trades', {
    params: { page, size, sort: 'openedAt,desc' },
  });
  return response.data;
};

export const addJournalTrade = async (
  req: AddJournalTradeRequest
): Promise<JournalTrade> => {
  const response = await apiClient.post<JournalTrade>('/journal/trades', req);
  return response.data;
};

export const updateJournalTrade = async (
  id: number,
  req: AddJournalTradeRequest
): Promise<JournalTrade> => {
  const response = await apiClient.put<JournalTrade>(`/journal/trades/${id}`, req);
  return response.data;
};

export const deleteJournalTrade = async (id: number): Promise<void> => {
  await apiClient.delete(`/journal/trades/${id}`);
};

export const fetchJournalStats = async (): Promise<JournalStats> => {
  const response = await apiClient.get<JournalStats>('/journal/trades/stats');
  return response.data;
};

// Watchlists

export interface Watchlist {
  id: number;
  name: string;
  symbols: string[];
  createdAt: string;
}

export const fetchWatchlists = async (): Promise<Watchlist[]> => {
  const response = await apiClient.get<Watchlist[]>('/watchlists');
  return response.data;
};

export const createWatchlist = async (name: string): Promise<Watchlist> => {
  const response = await apiClient.post<Watchlist>('/watchlists', { name });
  return response.data;
};

export const addSymbolToWatchlist = async (
  id: number,
  symbol: string
): Promise<Watchlist> => {
  const response = await apiClient.post<Watchlist>(`/watchlists/${id}/symbols`, { symbol });
  return response.data;
};

export const removeSymbolFromWatchlist = async (
  id: number,
  symbol: string
): Promise<void> => {
  await apiClient.delete(`/watchlists/${id}/symbols/${symbol}`);
};

export const deleteWatchlist = async (id: number): Promise<void> => {
  await apiClient.delete(`/watchlists/${id}`);
};

// Fundamentals

export interface AnnualMetric {
  year: number;
  value: number;
}

export interface QuarterlyMetric {
  quarter: string;
  value: number;
}

export interface FundamentalsData {
  symbol: string;
  revenue: AnnualMetric[];
  netIncome: AnnualMetric[];
  eps: AnnualMetric[];
  freeCashFlow: AnnualMetric[];
  grossMargin?: number;
  netMargin?: number;
  roic?: number;
  roe?: number;
  dividendYield?: number;
}

export interface FinancialRatios {
  pe?: number;
  pb?: number;
  ps?: number;
  evEbitda?: number;
  debtEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  roe?: number;
  roa?: number;
}

export interface EarningsResult {
  quarter: string;
  epsEstimate?: number;
  epsActual?: number;
  surprise?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  surprisePct?: number;
}

export interface InsiderActivity {
  name: string;
  title?: string;
  transactionType: 'BUY' | 'SELL';
  shares: number;
  price: number;
  value: number;
  date: string;
  filingDate?: string;
}

export interface InstitutionalHolder {
  institution: string;
  shares: number;
  percentHeld: number;
  changeShares?: number;
  changePercent?: number;
  reportDate?: string;
}

export const fetchFundamentals = async (symbol: string): Promise<FundamentalsData> => {
  const response = await apiClient.get<FundamentalsData>(`/fundamentals/${symbol}`);
  return response.data;
};

export const fetchFinancialRatios = async (symbol: string): Promise<FinancialRatios> => {
  const response = await apiClient.get<FinancialRatios>(`/fundamentals/${symbol}/ratios`);
  return response.data;
};

export const fetchEarnings = async (symbol: string, periods = 8): Promise<EarningsResult[]> => {
  const response = await apiClient.get<EarningsResult[]>(`/fundamentals/${symbol}/earnings`, {
    params: { periods },
  });
  return response.data;
};

export const fetchInsiderActivity = async (symbol: string): Promise<InsiderActivity[]> => {
  const response = await apiClient.get<InsiderActivity[]>(`/fundamentals/${symbol}/insider`);
  return response.data;
};

export const fetchInstitutionalOwnership = async (symbol: string): Promise<InstitutionalHolder[]> => {
  const response = await apiClient.get<InstitutionalHolder[]>(`/fundamentals/${symbol}/institutional`);
  return response.data;
};

// News (categorized)



export interface MacroSnapshot {
  fedFundsRate?: number | null;
  cpi?: number | null;
  cpiYoy?: number | null;
  gdpGrowth?: number | null;
  unemploymentRate?: number | null;
  treasury10y?: number | null;
  treasury2y?: number | null;
  yieldCurveSpread?: number | null;
  observedAt?: string | null;
  cachedAt?: string | null;
}

export const fetchMacroSnapshot = async (): Promise<MacroSnapshot> => {
  const response = await apiClient.get<MacroSnapshot>('/macro/snapshot');
  return response.data;
};
export interface EconomicEvent {
  event: string;
  date: string;
  country?: string;
  impact?: string;
  actual?: unknown;
  estimate?: unknown;
  previous?: unknown;
}

export interface MarketCalendarResponse {
  earnings: EarningsResult[];
  economicEvents: EconomicEvent[];
  cachedAt?: string;
}

export const fetchEconomicEvents = async (): Promise<EconomicEvent[]> => {
  const response = await apiClient.get<EconomicEvent[]>('/calendar/economic-events');
  return response.data;
};
export type NewsCategory =
  | 'BREAKING'
  | 'PORTFOLIO'
  | 'WATCHLIST'
  | 'ECONOMY'
  | 'INFLATION'
  | 'INTEREST_RATES'
  | 'CENTRAL_BANKS'
  | 'AI'
  | 'TECHNOLOGY'
  | 'DEFENSE'
  | 'ENERGY'
  | 'HEALTHCARE';

export type NewsPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CategorizedNewsItem extends NewsItem {
  category?: NewsCategory;
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  priority?: NewsPriority;
  relatedSymbols?: string[];
}

export interface AllNewsResponse {
  content: CategorizedNewsItem[];
  totalElements: number;
}

export const fetchAllNews = async (
  category?: NewsCategory,
  page = 0,
  size = 20,
  symbols?: string[]
): Promise<AllNewsResponse> => {
  const response = await apiClient.get<AllNewsResponse>('/news', {
    params: {
      ...(category ? { category } : {}),
      page,
      size,
      ...(symbols?.length ? { symbols: symbols.join(',') } : {}),
    },
  });
  return response.data;
};

export const fetchPortfolioNews = async (): Promise<CategorizedNewsItem[]> => {
  const response = await apiClient.get<CategorizedNewsItem[]>('/news/portfolio');
  return response.data;
};
