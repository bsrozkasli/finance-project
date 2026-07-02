package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

public record JournalTrade(
        Long id,
        String userId,
        String symbol,
        String company,
        JournalTradeType type,
        BigDecimal quantity,
        BigDecimal purchasePrice,
        BigDecimal currentPrice,
        BigDecimal marketValue,
        BigDecimal commission,
        String strategy,
        String notes,
        List<String> tags,
        LocalDate openedAt,
        LocalDate closedAt,
        JournalTradeStatus status,
        BigDecimal pnl,
        BigDecimal returnPct,
        Long holdingDays,
        Long portfolioId,
        Long transactionId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public JournalTrade {
        if (userId == null || userId.isBlank()) {
            userId = "default";
        }
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        symbol = symbol.trim().toUpperCase();
        if (company == null || company.isBlank()) {
            company = symbol;
        }
        if (type == null) {
            type = JournalTradeType.BUY;
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("quantity must be positive");
        }
        if (purchasePrice == null || purchasePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("purchasePrice must be positive");
        }
        if (currentPrice == null) {
            currentPrice = purchasePrice;
        }
        if (commission == null) {
            commission = BigDecimal.ZERO;
        }
        if (marketValue == null) {
            marketValue = quantity.multiply(currentPrice);
        }
        if (openedAt == null) {
            openedAt = LocalDate.now();
        }
        if (status == null) {
            status = closedAt == null ? JournalTradeStatus.OPEN : JournalTradeStatus.CLOSED;
        }
        if (pnl == null) {
            pnl = currentPrice.subtract(purchasePrice).multiply(quantity).subtract(commission);
        }
        if (returnPct == null) {
            BigDecimal costBasis = purchasePrice.multiply(quantity).add(commission);
            returnPct = costBasis.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : pnl.multiply(BigDecimal.valueOf(100)).divide(costBasis, 4, java.math.RoundingMode.HALF_UP);
        }
        if (holdingDays == null) {
            LocalDate end = closedAt == null ? LocalDate.now() : closedAt;
            holdingDays = Math.max(0, ChronoUnit.DAYS.between(openedAt, end));
        }
        if (tags == null) {
            tags = List.of();
        }
    }
}
