package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Merges income-statement and balance-sheet rows by fiscal year and period.
 */
public final class FinancialStatementMerger {

    private FinancialStatementMerger() {
    }

    public static List<FinancialStatement> merge(
            List<FinancialStatement> income,
            List<FinancialStatement> balance) {
        Map<String, FinancialStatement> merged = new LinkedHashMap<>();

        for (FinancialStatement stmt : income) {
            merged.put(key(stmt), stmt);
        }
        for (FinancialStatement stmt : balance) {
            String k = key(stmt);
            FinancialStatement existing = merged.get(k);
            if (existing == null) {
                merged.put(k, stmt);
            } else {
                merged.put(k, new FinancialStatement(
                        existing.symbol(),
                        existing.fiscalYear(),
                        existing.period(),
                        existing.revenue(),
                        existing.netIncome(),
                        stmt.totalAssets(),
                        stmt.totalLiabilities(),
                        existing.operatingCashFlow(),
                        existing.grossProfit(),
                        existing.operatingIncome()
                ));
            }
        }

        return new ArrayList<>(merged.values()).stream()
                .sorted(Comparator.comparing(FinancialStatement::fiscalYear).reversed())
                .toList();
    }

    private static String key(FinancialStatement s) {
        return s.fiscalYear() + "|" + s.period();
    }
}
