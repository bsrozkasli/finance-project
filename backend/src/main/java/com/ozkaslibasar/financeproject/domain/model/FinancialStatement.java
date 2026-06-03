package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Immutable domain model representing one period of a company's financial statement.
 *
 * <p>Encapsulates income statement and balance sheet data for a given fiscal year
 * and period. All monetary values use {@link BigDecimal} — {@code double} or
 * {@code float} is strictly forbidden per the project's financial data integrity rules.</p>
 *
 * @param symbol             the unique ticker symbol (e.g. {@code "AAPL"})
 * @param fiscalYear         the reporting fiscal year (e.g. {@code 2024})
 * @param period             the reporting period (e.g. {@code "Q1"}, {@code "annual"})
 * @param revenue            total revenue / net sales for the period
 * @param netIncome          net income (profit) after all expenses and taxes
 * @param totalAssets        total assets on the balance sheet
 * @param totalLiabilities   total liabilities on the balance sheet
 * @param operatingCashFlow  cash generated from operating activities
 */
public record FinancialStatement(
        String     symbol,
        Integer    fiscalYear,
        String     period,
        BigDecimal revenue,
        BigDecimal netIncome,
        BigDecimal totalAssets,
        BigDecimal totalLiabilities,
        BigDecimal operatingCashFlow,
        BigDecimal grossProfit,
        BigDecimal operatingIncome
) {

    /**
     * Compact constructor validating all required fields.
     *
     * @throws NullPointerException     if any argument is {@code null}
     * @throws IllegalArgumentException if {@code symbol} or {@code period} is blank,
     *                                  or {@code fiscalYear} is non-positive,
     *                                  or {@code totalAssets} is negative
     */
    public FinancialStatement {
        Objects.requireNonNull(symbol,           "symbol must not be null");
        Objects.requireNonNull(fiscalYear,        "fiscalYear must not be null");
        Objects.requireNonNull(period,            "period must not be null");
        Objects.requireNonNull(revenue,           "revenue must not be null");
        Objects.requireNonNull(netIncome,         "netIncome must not be null");
        Objects.requireNonNull(totalAssets,       "totalAssets must not be null");
        Objects.requireNonNull(totalLiabilities,  "totalLiabilities must not be null");
        Objects.requireNonNull(operatingCashFlow, "operatingCashFlow must not be null");
        Objects.requireNonNull(grossProfit,       "grossProfit must not be null");
        Objects.requireNonNull(operatingIncome,   "operatingIncome must not be null");

        if (symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        if (period.isBlank()) {
            throw new IllegalArgumentException("period must not be blank");
        }
        if (fiscalYear <= 0) {
            throw new IllegalArgumentException(
                    "fiscalYear must be a positive integer, got: " + fiscalYear);
        }
        if (totalAssets.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("totalAssets must not be negative");
        }
    }
}
