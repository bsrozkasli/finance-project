package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Raw annual statement values for one fiscal year. Every BigDecimal may be null (missing evidence). */
public record FinancialYearRaw(
        int fiscalYear,
        LocalDate fiscalYearEnd,
        BigDecimal revenue,
        BigDecimal netIncome,
        BigDecimal operatingCashFlow,
        BigDecimal capitalExpenditure,
        BigDecimal totalAssets,
        BigDecimal totalLiabilities,
        BigDecimal totalEquity,
        BigDecimal totalDebt,
        BigDecimal cash,
        BigDecimal currentAssets,
        BigDecimal currentLiabilities) {
}
