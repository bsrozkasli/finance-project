package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Immutable snapshot of calculated fundamental metrics for a given asset at a specific time.
 *
 * <p>Unlike the raw {@link FinancialStatement}, this model represents the derived ratios
 * and scores (ROA, ROE, ROIC, Piotroski F-Score) computed by the data-service's
 * {@code FundamentalCalculationEngine}.</p>
 */
public record FundamentalSnapshot(
        String symbol,
        Instant calculatedAt,
        String fiscalYear,
        BigDecimal roa,
        BigDecimal roe,
        BigDecimal roic,
        BigDecimal currentRatio,
        BigDecimal debtToEquity,
        BigDecimal evFcf,
        Integer piotroskiScore,
        String piotroskiSignalsJson
) {
    public FundamentalSnapshot {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("Symbol cannot be null or blank");
        }
        if (calculatedAt == null) {
            calculatedAt = Instant.now();
        }
    }
}
