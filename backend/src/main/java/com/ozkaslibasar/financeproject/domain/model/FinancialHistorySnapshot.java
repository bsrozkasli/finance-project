package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.List;

/** Provider snapshot of raw annual values; years are ascending and never null. */
public record FinancialHistorySnapshot(
        String symbol,
        FinancialHistoryStatus status,
        String currency,
        Instant retrievedAt,
        List<FinancialYearRaw> years) {

    public FinancialHistorySnapshot {
        years = years == null ? List.of() : List.copyOf(years);
    }
}
