package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;

import java.util.List;

/**
 * Outbound port — contract for fetching quarterly/annual financial statement data
 * from a fundamental data provider.
 *
 * <p>This port is intentionally separated from {@link PriceChartClientPort} to
 * enforce a strict rate-limiting boundary for statement providers
 * per day. All calls through implementations of this port must be wrapped with
 * {@code @RateLimiter} and {@code @CircuitBreaker}
 * at the adapter layer.</p>
 *
 * <p>This interface is pure Java — no framework annotations are permitted here.</p>
 */
public interface FinancialStatementClientPort {

    /**
     * Fetches historical income statement records for a given symbol.
     *
     * <p>Returns results from most recent to oldest. The number of periods
     * returned depends on the provider's plan (typically 5 years for free tier).</p>
     *
     * @param symbol the ticker symbol (e.g. {@code "AAPL"})
     * @return a list of income statement records; never {@code null},
     *         empty list if the provider has no data or an error occurred
     */
    List<FinancialStatement> fetchIncomeStatements(String symbol);

    /**
     * Fetches historical balance sheet records for a given symbol.
     *
     * <p>Balance sheet fields ({@code totalAssets}, {@code totalLiabilities})
     * are merged into the same {@link FinancialStatement} domain model as
     * income data, keyed on {@code (symbol, fiscalYear, period)}.</p>
     *
     * @param symbol the ticker symbol (e.g. {@code "AAPL"})
     * @return a list of balance sheet records; never {@code null},
     *         empty list if the provider has no data or an error occurred
     */
    List<FinancialStatement> fetchBalanceSheets(String symbol);
}
