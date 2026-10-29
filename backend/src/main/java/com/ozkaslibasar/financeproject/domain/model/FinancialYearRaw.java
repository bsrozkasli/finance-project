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

    /**
     * Fiscal-year label for a fiscal-year-end date. 52/53-week companies end their year in the first days
     * of January (standard convention: Jan 1-7 belongs to the previous fiscal year); every other date uses
     * its calendar year.
     */
    public static int fiscalYearOf(LocalDate fiscalYearEnd) {
        return fiscalYearEnd.getMonthValue() == 1 && fiscalYearEnd.getDayOfMonth() <= 7
                ? fiscalYearEnd.getYear() - 1
                : fiscalYearEnd.getYear();
    }
}
