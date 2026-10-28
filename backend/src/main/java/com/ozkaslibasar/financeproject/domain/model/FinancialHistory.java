package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.List;

/** Derived multi-year financial history; points ascend by fiscal year. */
public record FinancialHistory(
        String symbol,
        FinancialHistoryStatus status,
        String currency,
        Instant retrievedAt,
        List<FinancialHistoryPoint> points) {
}
