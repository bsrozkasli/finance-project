package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;

public record PortfolioHolding(
        Long portfolioId,
        String symbol,
        PortfolioAssetType assetType,
        BigDecimal quantity,
        BigDecimal averageCost,
        BigDecimal costBasis,
        BigDecimal realizedPnl,
        String currency
) {
}
