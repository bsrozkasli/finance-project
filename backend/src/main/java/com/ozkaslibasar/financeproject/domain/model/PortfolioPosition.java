package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Domain model representing a single portfolio position (a holding in an asset).
 *
 * @param id           surrogate primary key
 * @param userId       owner identifier (defaults to "default" until auth is added)
 * @param symbol       ticker symbol (e.g. "AAPL")
 * @param quantity     number of shares/units held
 * @param avgCostPrice average cost per share/unit
 * @param openedAt     date the position was opened (user-supplied)
 * @param notes        optional free-text notes
 * @param createdAt    record creation timestamp (server-side)
 * @param updatedAt    record last-update timestamp (server-side)
 */
public record PortfolioPosition(
        Long id,
        String userId,
        String symbol,
        BigDecimal quantity,
        BigDecimal avgCostPrice,
        LocalDate openedAt,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public PortfolioPosition {
        if (symbol == null || symbol.isBlank()) throw new IllegalArgumentException("symbol must not be blank");
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("quantity must be positive");
        if (avgCostPrice == null || avgCostPrice.compareTo(BigDecimal.ZERO) < 0)
            throw new IllegalArgumentException("avgCostPrice must not be negative");
    }
}
