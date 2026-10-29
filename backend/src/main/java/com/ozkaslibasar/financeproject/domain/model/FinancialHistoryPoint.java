package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** One fiscal year of raw values and derived ratios. Null means missing or not meaningful. */
public record FinancialHistoryPoint(
        int fiscalYear,
        LocalDate fiscalYearEnd,
        BigDecimal revenue,
        BigDecimal netIncome,
        BigDecimal operatingCashFlow,
        BigDecimal capitalExpenditure,
        BigDecimal freeCashFlow,
        BigDecimal totalAssets,
        BigDecimal totalLiabilities,
        BigDecimal totalEquity,
        BigDecimal totalDebt,
        BigDecimal cash,
        BigDecimal netDebt,
        BigDecimal debtToEquity,
        BigDecimal currentRatio,
        BigDecimal roe,
        BigDecimal roa,
        BigDecimal netMargin,
        BigDecimal fcfMargin,
        BigDecimal revenueGrowth,
        BigDecimal netIncomeGrowth,
        List<String> notMeaningful) {
}
