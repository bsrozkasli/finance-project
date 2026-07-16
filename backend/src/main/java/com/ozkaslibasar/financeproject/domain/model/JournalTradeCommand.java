package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record JournalTradeCommand(
        String userId,
        String symbol,
        String company,
        JournalTradeType type,
        BigDecimal quantity,
        BigDecimal purchasePrice,
        BigDecimal currentPrice,
        LocalDate openedAt,
        LocalDate closedAt,
        JournalTradeStatus status,
        BigDecimal commission,
        Long portfolioId,
        Long transactionId,
        String strategy,
        String notes,
        List<String> tags) {
}
