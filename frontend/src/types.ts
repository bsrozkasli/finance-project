export interface News {
  id: string;
  title: string;
  source: string;
  time: string;
  summary?: string;
  category?: 'macro' | 'stock' | 'market' | 'tech';
  symbol?: string;
  url?: string;
}

export interface TechnicalIndicators {
  rsi: number;
  rsiStatus: string;
  macd: string;
  macdStatus: string;
  sma50: number;
  sma50Status: string;
}

export interface StockHistoryItem {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: string;
  high52W: number;
  low52W: number;
  marketCap: string | null;
  pe: number | null;
  pb: number | null;
  debtEquity: number | null;
  roe: number | null;
  revenueGrowth: number | null;
  divYield: number | null;
  history: StockHistoryItem[];
  sparkline: number[];
  news: News[];
  technicals: TechnicalIndicators | null;
  analystRating: {
    consensus: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
    targetPrice: number;
    buyPercent: number;
    holdPercent: number;
    sellPercent: number;
  } | null;
  alerts: string[];
}

export interface Holding {
  symbol: string;
  quantity: number;
  costPrice: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  notes: string;
  date: string;
  portfolioId?: string; // Links trade to a specific portfolio
  transactionId?: string;
  source?: 'MANUAL' | 'CSV';
}

export interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  importance?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}
