package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;

public record JournalTradeStats(
        int totalTrades,
        int openTrades,
        int closedTrades,
        BigDecimal winRate,
        BigDecimal avgReturn,
        String bestTrade,
        String worstTrade) {
}
