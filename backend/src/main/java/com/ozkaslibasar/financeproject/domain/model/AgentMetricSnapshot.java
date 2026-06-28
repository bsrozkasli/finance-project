package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

/**
 * Compressed pre-calculated metrics passed to the AI service (no raw statements).
 */
public record AgentMetricSnapshot(
        BigDecimal price,
        Map<String, BigDecimal> fundamentals,
        Map<String, BigDecimal> valuation,
        Map<String, BigDecimal> risk,
        Map<String, BigDecimal> technical
) {
    public AgentMetricSnapshot {
        Objects.requireNonNull(price, "price");
        Objects.requireNonNull(fundamentals, "fundamentals");
        Objects.requireNonNull(valuation, "valuation");
        Objects.requireNonNull(risk, "risk");
        Objects.requireNonNull(technical, "technical");
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("price must not be negative");
        }
    }
}
