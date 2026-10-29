// Test-only fixtures for the proposed UI redesign v2 contract. Values are synthetic stub data
// (placeholder tickers HS1..HS3); they must never be rendered by production code.
import type {
  Allocation, BenchmarkList, BulkResult, CalendarEvents, CompanyAnalysis, CompanyStatements,
  CompositionHistory, ComparisonMetrics, Contributors, CorrelationMatrix, DividendReport,
  EarningsByPortfolio, EarningsMonthly, EarningsSources, EarningsSummary, EarningsYearly, Gains,
  HoldingsAnalysis, ImportPreview, JournalDecisions, MonthlyReturns, NewsItems, ParsedTransactions,
  Peers, PerformanceReport, PinState, PortfolioNewsImpact, PortfolioOverview, PortfolioSummary,
  QuarterlyTrend, RatioHistory, RealizedPnlReport, RebalanceSuggestions, RecentTransactions,
  ReportRun, ReportRuns, ReportSchedule, ReportSchedules, ReportTemplates, ReturnsHeatmap, RiskAlerts,
  RiskReturn, SectorImpact, StopLevel, StopLevels, TargetWeights, Topics, UndoResult,
  WatchlistPerformance,
} from '../api/redesign';

export const FIXTURE_AS_OF = '2026-07-09T09:00:00Z';
const meta = { status: 'AVAILABLE', asOf: FIXTURE_AS_OF, currency: 'TRY' } as const;

export const fixtureBenchmarks: BenchmarkList = {
  status: 'AVAILABLE',
  asOf: FIXTURE_AS_OF,
  items: [{ code: 'BIST100', name: 'BIST 100', kind: 'INDEX', currency: 'TRY', source: 'stub' }],
};

export const fixturePortfolioOverview: PortfolioOverview = {
  ...meta,
  total: 1,
  items: [{
    portfolioId: 1, name: 'Test Portföy', pinned: true, positionCount: 2, market: 'BIST',
    value: 1000, dayChange: 10, dayChangePct: 0.01, returnPct: 0.1, riskScore: 20, riskLevel: 'LOW', pricingComplete: true,
  }],
  aggregate: { portfolioCount: 1, value: 1000, dayChange: 10, dayChangePct: 0.01, criticalRiskCount: 0 },
};

export const fixturePinState: PinState = { portfolioId: 1, pinned: true };

export const fixturePortfolioSummary: PortfolioSummary = {
  ...meta, portfolioId: 1, value: 1000, cash: 50, dayChange: 10, dayChangePct: 0.01,
  unrealizedPnl: 100, unrealizedPnlPct: 0.1, realizedPnlYtd: 20, pricingComplete: true, unpricedSymbols: [],
};

export const fixtureAllocation: Allocation = {
  ...meta, total: 1000, limitWeight: 0.45,
  slices: [
    { key: 'HS1', label: 'HS1', value: 600, weight: 0.6 },
    { key: 'CASH', label: 'Nakit', value: 50, weight: 0.05 },
    { key: 'HS2', label: 'HS2', value: null, weight: null },
  ],
};

export const fixtureGains: Gains = {
  ...meta, winners: 1, losers: 1, net: 40,
  items: [{ symbol: 'HS1', pnl: 100, pnlPct: 0.2 }, { symbol: 'HS2', pnl: -60, pnlPct: -0.1 }],
};

export const fixtureMonthlyReturns: MonthlyReturns = {
  ...meta, positiveMonths: 1, best: { month: '2026-06', value: 0.03 }, worst: { month: '2026-05', value: -0.01 },
  items: [{ month: '2026-05', returnPct: -0.01 }, { month: '2026-06', returnPct: 0.03 }, { month: '2026-07', returnPct: null }],
};

export const fixtureHoldingsAnalysis: HoldingsAnalysis = {
  ...meta, cashWeight: 0.05,
  items: [{
    symbol: 'HS1', name: 'Test Şirketi', sector: 'Test Sektör', quantity: 10, avgCost: 50, price: 60, value: 600,
    weight: 0.6, weightDelta1M: 1.5, return1D: 0.01, return1W: 0.02, return1M: 0.03, pnl: 100, pnlPct: 0.2,
  }],
};

export const fixtureCompositionHistory: CompositionHistory = {
  ...meta, dates: ['2026-06-01', '2026-07-01'],
  series: [{ key: 'HS1', values: [500, 600] }, { key: 'OTHERS', values: [null, 100] }],
};

export const fixtureReturnsHeatmap: ReturnsHeatmap = {
  ...meta, windows: ['1D', '1W', '1M', '3M', '1Y'],
  rows: [{ ref: 'PORTFOLIO:1', label: 'Test Portföy', values: [0.01, 0.02, null, 0.05, 0.1] }],
};

export const fixtureStopLevel: StopLevel = {
  portfolioId: 1, portfolioName: 'Test Portföy', symbol: 'HS1', type: 'STOP_LOSS', price: 60, level: 55, distance: 0.083, status: 'SAFE',
};

export const fixtureStopLevels: StopLevels = {
  ...meta, thresholds: { atRisk: 0.03, near: 0.07 }, items: [fixtureStopLevel],
};

export const fixtureRiskAlerts: RiskAlerts = {
  ...meta, riskScore: 18, riskLevel: 'LOW', policyVersion: 'test-1',
  counts: { critical: 0, warning: 1, info: 0 },
  items: [{
    code: 'HOLDING_CONCENTRATION', severity: 'WARNING', title: 'Yoğunlaşma', message: 'HS1 ağırlığı sınırı aştı',
    symbol: 'HS1', observed: 0.3, limit: 0.25, action: 'REVIEW',
  }],
  skipped: [{ symbol: 'HS3', rule: 'DEEP_LOSS', reason: 'Fiyat yok' }],
};

export const fixtureTargetWeights: TargetWeights = {
  ...meta, isDefault: true, targets: [{ key: 'HS1', weight: 0.95 }, { key: 'CASH', weight: 0.05 }],
};

export const fixtureRebalanceSuggestions: RebalanceSuggestions = {
  ...meta, thresholdPp: 5,
  items: [{ key: 'HS1', target: 0.5, current: 0.6, gapPp: 10, direction: 'REDUCE', notionalToClose: 100 }],
};

export const fixtureComparisonMetrics: ComparisonMetrics = {
  ...meta, riskFreeRate: null, riskFreeSource: null, correlation: 0.5,
  a: { ref: 'PORTFOLIO:1', label: 'Test Portföy', periodReturn: 0.1, volatility: 0.2, sharpe: null, maxDrawdown: -0.1, beta: 1, bestDay: 0.03, worstDay: -0.02, positiveDayRatio: 0.55 },
  b: { ref: 'BENCHMARK:BIST100', label: 'BIST 100', periodReturn: 0.08, volatility: 0.25, sharpe: null, maxDrawdown: -0.15, beta: 1, bestDay: 0.04, worstDay: -0.03, positiveDayRatio: 0.5 },
  better: { periodReturn: 'A', volatility: 'A', beta: 'NONE' },
};

export const fixtureCorrelationMatrix: CorrelationMatrix = {
  ...meta, labels: ['Test Portföy', 'BIST 100'], matrix: [[1, 0.5], [0.5, 1]],
};

export const fixtureRiskReturn: RiskReturn = {
  ...meta, points: [{ ref: 'PORTFOLIO:1', label: 'Test Portföy', volatility: 0.2, periodReturn: 0.1 }],
};

export const fixtureEarningsSummary: EarningsSummary = {
  ...meta,
  items: [{ period: 'YTD', gain: 120, returnPct: 0.12, benchmarkReturnPct: 0.1, realized: 50, unrealized: 80, dividends: 5, fees: 15 }],
};

export const fixtureEarningsMonthly: EarningsMonthly = {
  ...meta, positiveMonths: 1,
  items: [{ month: '2026-06', gain: 30, cumulative: 30 }, { month: '2026-07', gain: null, cumulative: null }],
};

export const fixtureEarningsSources: EarningsSources = {
  ...meta, gain: 120, realized: 50, unrealized: 80, dividends: 5, fees: 15, residual: 0,
};

export const fixtureEarningsYearly: EarningsYearly = {
  ...meta,
  items: [{ year: 2026, startValue: 900, netFlow: 0, gain: 120, returnPct: 0.12, benchmarkReturnPct: 0.1, differencePp: 2 }],
};

export const fixtureContributors: Contributors = {
  ...meta, items: [{ symbol: 'HS1', contribution: 80 }],
};

export const fixtureEarningsByPortfolio: EarningsByPortfolio = {
  ...meta, total: 1,
  items: [{ rank: 1, portfolioId: 1, name: 'Test Portföy', value: 1000, gain: 120, returnPct: 0.12, benchmarkDifferencePp: 2 }],
};

export const fixtureParsedTransactions: ParsedTransactions = {
  ...meta, validCount: 1, invalidCount: 1, duplicateCount: 0, totalAmount: 600,
  rows: [
    { line: 1, status: 'VALID', code: null, draft: { portfolioId: 1, side: 'BUY', symbol: 'HS1', quantity: 10, price: 60, date: '2026-07-09' }, amount: 600 },
    { line: 2, status: 'INVALID', code: 'TICKER_NOT_FOUND', draft: null, amount: null },
  ],
};

export const fixtureBulkResult: BulkResult = {
  batchId: '00000000-0000-4000-8000-000000000001', created: 1, skipped: 0, transactionIds: [101],
};

export const fixtureImportPreview: ImportPreview = {
  ...fixtureParsedTransactions,
  importId: '00000000-0000-4000-8000-000000000002',
  fileName: 'test.csv',
  detectedMapping: [{ column: 'Tarih', field: 'DATE' }, { column: 'Not', field: null }],
};

export const fixtureUndoResult: UndoResult = { removed: 1 };

export const fixtureRecentTransactions: RecentTransactions = {
  ...meta,
  items: [{
    transactionId: 101, date: '2026-07-09', side: 'SELL', symbol: 'HS1', portfolioId: 1, portfolioName: 'Test Portföy',
    quantity: 5, price: 60, amount: 300, realizedPnl: 50, note: null, importBatchId: null,
  }],
};

export const fixtureJournalDecisions: JournalDecisions = {
  ...meta, total: 1,
  items: [{ transactionId: 101, symbol: 'HS1', side: 'BUY', date: '2026-07-01', note: 'Test notu', result: 'GAIN', resultPct: 0.1 }],
};

export const fixtureCalendarEvents: CalendarEvents = {
  ...meta,
  items: [{
    date: '2026-07-10', time: '14:00', title: 'Test karar toplantısı', description: null, category: 'CENTRAL_BANK',
    importance: 'HIGH', symbol: null, portfolioIds: [], daysUntil: 1, source: 'stub',
  }],
};

export const fixtureNewsItems: NewsItems = {
  ...meta, total: 1, counts: { MACRO: 1 },
  items: [{
    id: 'n1', title: 'Test haberi', summary: null, url: null, source: 'stub', publishedAt: FIXTURE_AS_OF, category: 'MACRO',
    scopeLabel: null, impact: { level: null, source: null, classifierVersion: null }, affected: [], topics: ['test'],
  }],
};

export const fixturePortfolioNewsImpact: PortfolioNewsImpact = {
  ...meta, newsCount: 1, affectedHoldings: 1, items: [{ symbol: 'HS1', newsCount: 1, net: null }],
};

export const fixtureSectorImpact: SectorImpact = {
  ...meta, items: [{ sector: 'Test Sektör', net: 0.2, newsCount: 2 }],
};

export const fixtureTopics: Topics = { ...meta, items: [{ label: 'faiz', count: 3 }] };

export const fixtureWatchlistPerformance: WatchlistPerformance = {
  ...meta, total: 1, averages: { '1D': 0.01, '1M': null }, breadth: { up: 1, down: 0, bestSymbol1M: 'HS1', worstSymbol1M: 'HS1' },
  items: [{
    symbol: 'HS1', name: 'Test Şirketi', sector: 'Test Sektör', price: 60,
    returns: { '1D': 0.01, '1M': null }, sparkline3M: [1, 2, 3], peRatio: null, volume: 1000, dataStatus: 'PARTIAL',
  }],
};

export const fixtureCompanyAnalysis: CompanyAnalysis = {
  ...meta, symbol: 'HS1', sector: 'Test Sektör',
  ttm: { pe: { value: 10, sectorAverage: null, verdict: null } },
  healthScore: null, policyVersion: null, healthComponents: [{ name: 'PROFITABILITY', score: null }],
};

export const fixtureRatioHistory: RatioHistory = {
  ...meta, metric: 'PE', current: 10, mean: 9, sectorAverage: null,
  points: [{ periodEnd: '2026-03-31', value: 9, sectorValue: null }],
};

export const fixtureQuarterlyTrend: QuarterlyTrend = {
  ...meta, points: [{ periodEnd: '2026-03-31', revenue: 100, netIncome: 10, netMargin: 0.1 }],
};

export const fixtureCompanyStatements: CompanyStatements = {
  ...meta, statementType: 'INCOME', periods: ['2026-03-31'],
  lines: [{ key: 'revenue', label: 'Hasılat', values: [100], yoyChange: null }],
};

export const fixturePeers: Peers = {
  ...meta,
  items: [{ symbol: 'HS1', name: 'Test Şirketi', sector: 'Test Sektör', isSelected: true, pe: 10, pb: null, evEbitda: null, roe: 0.2, netMargin: 0.1, return1Y: null }],
};

export const fixtureReportTemplates: ReportTemplates = {
  delivery: { email: false, pdf: true, xlsx: true },
  items: [{ id: 'PERFORMANCE', name: 'Performans', description: 'Test', requiresSymbol: false, externalUseGate: null }],
};

export const fixtureReportRun: ReportRun = {
  ...meta, runId: '00000000-0000-4000-8000-000000000003', templateId: 'PERFORMANCE', title: 'Test raporu',
  scope: 'ALL', period: '2026-06', createdAt: FIXTURE_AS_OF,
};

export const fixtureReportRuns: ReportRuns = { total: 1, items: [fixtureReportRun] };

export const fixturePerformanceReport: PerformanceReport = {
  ...meta,
  kpis: [{ key: 'return', value: 0.1 }],
  valueBridge: { start: 900, end: 1000, netFlow: 0, rounding: 0, steps: [{ symbol: 'HS1', contribution: 100 }] },
  sectorContribution: [{ sector: 'Test Sektör', averageWeight: 0.6, sectorReturn: 0.1, contribution: 60 }],
  riskSummary: { volatility: 0.2, maxDrawdown: -0.1, beta: null, tradeCount: 2, turnover: 0.1 },
};

export const fixtureRealizedPnlReport: RealizedPnlReport = {
  ...meta, year: 2026, costMethod: 'AVERAGE_COST', disclaimer: 'Vergi danışmanlığı değildir.',
  totals: { proceeds: 300, cost: 250, realizedPnl: 50, fees: 1 },
  rows: [{ saleDate: '2026-07-09', symbol: 'HS1', quantity: 5, cost: 250, proceeds: 300, realizedPnl: 50, holdingDays: 30 }],
};

export const fixtureDividendReport: DividendReport = {
  ...meta, year: 2026, disclaimer: 'Vergi danışmanlığı değildir.',
  totals: { gross: 10, withholding: null, net: null }, byYear: [{ year: 2026, net: null }],
  rows: [{ paymentDate: '2026-06-01', symbol: 'HS1', quantity: 10, gross: 10, withholding: null, net: null }],
};

export const fixtureReportSchedule: ReportSchedule = {
  scheduleId: 1, templateId: 'PERFORMANCE', scope: 'ALL', frequency: 'MONTHLY', format: 'pdf', nextRunAt: null,
};

export const fixtureReportSchedules: ReportSchedules = { items: [fixtureReportSchedule] };
