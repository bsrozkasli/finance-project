import type { Holding, Stock } from '../types';

export interface ValuedPosition extends Holding {
  currentPrice: number | null;
  value: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
}

export interface PortfolioValuation {
  positions: ValuedPosition[];
  holdingsCount: number;
  pricedCount: number;
  unpricedSymbols: string[];
  pricedSubtotal: number;
  totalValue: number | null;
  totalProfitLoss: number | null;
  totalReturnPercent: number | null;
}

export function valuePortfolio(holdings: Holding[], stocks: Stock[]): PortfolioValuation {
  const priceBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock.price]));
  let pricedSubtotal = 0;
  let pricedCost = 0;
  const unpricedSymbols: string[] = [];

  const positions = holdings.map((holding): ValuedPosition => {
    const price = priceBySymbol.get(holding.symbol);
    const currentPrice = price != null && Number.isFinite(price) && price > 0 ? price : null;
    const cost = holding.quantity * holding.costPrice;
    const value = currentPrice == null ? null : holding.quantity * currentPrice;
    const profitLoss = value == null ? null : value - cost;
    if (value == null) {
      unpricedSymbols.push(holding.symbol);
    } else {
      pricedSubtotal += value;
      pricedCost += cost;
    }
    return {
      ...holding,
      currentPrice,
      value,
      profitLoss,
      profitLossPercent: profitLoss == null || cost <= 0 ? null : (profitLoss / cost) * 100,
    };
  });

  const complete = unpricedSymbols.length === 0;
  const totalProfitLoss = complete ? pricedSubtotal - pricedCost : null;
  return {
    positions,
    holdingsCount: holdings.length,
    pricedCount: holdings.length - unpricedSymbols.length,
    unpricedSymbols,
    pricedSubtotal,
    totalValue: complete ? pricedSubtotal : null,
    totalProfitLoss,
    totalReturnPercent: totalProfitLoss != null && pricedCost > 0
      ? (totalProfitLoss / pricedCost) * 100
      : complete && holdings.length === 0 ? 0 : null,
  };
}
