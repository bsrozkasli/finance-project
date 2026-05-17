package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Immutable domain model representing a periodic financial statement.
 */
public record FinancialStatement(
        String symbol,
        Integer year,
        String quarter,
        BigDecimal revenues,
        BigDecimal netIncome,
        BigDecimal totalAssets,
        BigDecimal totalLiabilities
) {

    public FinancialStatement {
        Objects.requireNonNull(symbol, "symbol must not be null");
        Objects.requireNonNull(year, "year must not be null");
        Objects.requireNonNull(quarter, "quarter must not be null");
        Objects.requireNonNull(revenues, "revenues must not be null");
        Objects.requireNonNull(netIncome, "netIncome must not be null");
        Objects.requireNonNull(totalAssets, "totalAssets must not be null");
        Objects.requireNonNull(totalLiabilities, "totalLiabilities must not be null");

        if (symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        if (quarter.isBlank()) {
            throw new IllegalArgumentException("quarter must not be blank");
        }
    }
}
