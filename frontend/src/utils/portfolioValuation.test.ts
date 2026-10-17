import { describe, expect, it } from 'vitest';
import type { Holding, Stock } from '../types';
import { valuePortfolio } from './portfolioValuation';

const priced = (symbol: string, price: number) => ({ symbol, price }) as Stock;

describe('valuePortfolio', () => {
  it('does not turn cost basis into a current market price', () => {
    const holdings: Holding[] = [
      { symbol: 'AAA', quantity: 2, costPrice: 100 },
      { symbol: 'BBB', quantity: 3, costPrice: 50 },
    ];
    const result = valuePortfolio(holdings, [priced('AAA', 120)]);

    expect(result.totalValue).toBeNull();
    expect(result.totalProfitLoss).toBeNull();
    expect(result.pricedSubtotal).toBe(240);
    expect(result.pricedCount).toBe(1);
    expect(result.unpricedSymbols).toEqual(['BBB']);
    expect(result.positions.find((position) => position.symbol === 'BBB')).toMatchObject({
      currentPrice: null,
      value: null,
      profitLoss: null,
    });
  });

  it('calculates totals when every holding has a real price', () => {
    const holdings: Holding[] = [{ symbol: 'AAA', quantity: 2, costPrice: 100 }];
    const result = valuePortfolio(holdings, [priced('AAA', 120)]);
    expect(result.totalValue).toBe(240);
    expect(result.totalProfitLoss).toBe(40);
    expect(result.totalReturnPercent).toBe(20);
  });
});
