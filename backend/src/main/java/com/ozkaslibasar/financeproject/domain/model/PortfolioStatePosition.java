package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/**
 * A position inside a Portfolio State. Price, price date, market value and weight are {@code null} unless the
 * position was valued; a closed position keeps its realized activity and is never valued.
 */
public record PortfolioStatePosition(
        String symbol,
        PortfolioAssetType assetType,
        BigDecimal quantity,
        BigDecimal averageCost,
        BigDecimal costBasis,
        BigDecimal realizedPnl,
        String currency,
        PositionValuationStatus valuationStatus,
        BigDecimal price,
        LocalDate priceDate,
        BigDecimal marketValue,
        BigDecimal weight
) {
    public PortfolioStatePosition {
        Objects.requireNonNull(symbol, "symbol must not be null");
        Objects.requireNonNull(valuationStatus, "valuationStatus must not be null");
    }
}
