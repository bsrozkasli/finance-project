package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PortfolioTransaction(
        Long id,
        Long portfolioId,
        String userId,
        String symbol,
        PortfolioAssetType assetType,
        PortfolioTransactionAction action,
        BigDecimal quantity,
        BigDecimal price,
        String currency,
        BigDecimal fee,
        BigDecimal fxRateToBase,
        LocalDate tradeDate,
        PortfolioTransactionSource source,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public PortfolioTransaction {
        if (portfolioId == null) {
            throw new IllegalArgumentException("portfolioId must not be null");
        }
        if (userId == null || userId.isBlank()) {
            userId = "default";
        }
        if (action == null) {
            throw new IllegalArgumentException("action must not be null");
        }
        if (requiresSymbol(action)) {
            if (symbol == null || symbol.isBlank()) {
                throw new IllegalArgumentException("symbol must not be blank");
            }
            symbol = symbol.trim().toUpperCase();
        } else if (symbol != null && !symbol.isBlank()) {
            symbol = symbol.trim().toUpperCase();
        }
        if (assetType == null) {
            assetType = PortfolioAssetType.OTHER;
        }
        if (requiresQuantity(action) && (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0)) {
            throw new IllegalArgumentException("quantity must be positive");
        }
        if (quantity == null) {
            quantity = BigDecimal.ZERO;
        }
        if (requiresPrice(action) && (price == null || price.compareTo(BigDecimal.ZERO) < 0)) {
            throw new IllegalArgumentException("price must not be negative");
        }
        if (price == null) {
            price = BigDecimal.ZERO;
        }
        if (currency == null || currency.isBlank()) {
            currency = "USD";
        }
        currency = currency.trim().toUpperCase();
        if (currency.length() != 3) {
            throw new IllegalArgumentException("currency must be an ISO currency code");
        }
        if (fee == null) {
            fee = BigDecimal.ZERO;
        }
        if (fee.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("fee must not be negative");
        }
        if (fxRateToBase == null) {
            fxRateToBase = BigDecimal.ONE;
        }
        if (fxRateToBase.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("fxRateToBase must be positive");
        }
        if (tradeDate == null) {
            tradeDate = LocalDate.now();
        }
        if (source == null) {
            source = PortfolioTransactionSource.MANUAL;
        }
    }

    private static boolean requiresSymbol(PortfolioTransactionAction action) {
        return switch (action) {
            case BUY, SELL, DIVIDEND, MANUAL_VALUATION -> true;
            case CASH_DEPOSIT, CASH_WITHDRAWAL, FEE, TRANSFER_IN, TRANSFER_OUT -> false;
        };
    }

    private static boolean requiresQuantity(PortfolioTransactionAction action) {
        return switch (action) {
            case BUY, SELL, MANUAL_VALUATION -> true;
            case DIVIDEND, CASH_DEPOSIT, CASH_WITHDRAWAL, FEE, TRANSFER_IN, TRANSFER_OUT -> false;
        };
    }

    private static boolean requiresPrice(PortfolioTransactionAction action) {
        return switch (action) {
            case BUY, SELL, MANUAL_VALUATION -> true;
            case DIVIDEND, CASH_DEPOSIT, CASH_WITHDRAWAL, FEE, TRANSFER_IN, TRANSFER_OUT -> false;
        };
    }
}
