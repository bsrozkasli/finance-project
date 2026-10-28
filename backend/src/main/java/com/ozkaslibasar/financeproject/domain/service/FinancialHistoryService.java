package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistory;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryPoint;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistorySnapshot;
import com.ozkaslibasar.financeproject.domain.model.FinancialYearRaw;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialHistoryPort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Derives multi-year ratios from raw annual values. A null input yields a null result;
 * a non-positive denominator yields null and the key is listed in notMeaningful.
 */
public class FinancialHistoryService {

    private static final int SCALE = 6;

    private final FinancialHistoryPort port;

    public FinancialHistoryService(FinancialHistoryPort port) {
        this.port = port;
    }

    public FinancialHistory getHistory(String symbol) {
        return derive(port.fetchHistory(symbol));
    }

    public static FinancialHistory derive(FinancialHistorySnapshot snapshot) {
        List<FinancialHistoryPoint> points = new ArrayList<>();
        FinancialYearRaw previous = null;
        for (FinancialYearRaw year : snapshot.years()) {
            points.add(toPoint(year, previous));
            previous = year;
        }
        return new FinancialHistory(snapshot.symbol(), snapshot.status(), snapshot.currency(),
                snapshot.retrievedAt(), List.copyOf(points));
    }

    private static FinancialHistoryPoint toPoint(FinancialYearRaw y, FinancialYearRaw prev) {
        List<String> nm = new ArrayList<>();
        BigDecimal fcf = (y.operatingCashFlow() == null || y.capitalExpenditure() == null)
                ? null : y.operatingCashFlow().subtract(y.capitalExpenditure());
        BigDecimal netDebt = (y.totalDebt() == null || y.cash() == null)
                ? null : y.totalDebt().subtract(y.cash());
        boolean consecutive = prev != null && prev.fiscalYear() == y.fiscalYear() - 1;
        BigDecimal debtToEquity = ratio("debtToEquity", y.totalDebt(), y.totalEquity(), nm);
        BigDecimal currentRatio = ratio("currentRatio", y.currentAssets(), y.currentLiabilities(), nm);
        BigDecimal roe = ratio("roe", y.netIncome(), y.totalEquity(), nm);
        BigDecimal roa = ratio("roa", y.netIncome(), y.totalAssets(), nm);
        BigDecimal netMargin = ratio("netMargin", y.netIncome(), y.revenue(), nm);
        BigDecimal fcfMargin = ratio("fcfMargin", fcf, y.revenue(), nm);
        BigDecimal revGrowth = consecutive ? growth("revenueGrowth", y.revenue(), prev.revenue(), nm) : null;
        BigDecimal niGrowth = consecutive ? growth("netIncomeGrowth", y.netIncome(), prev.netIncome(), nm) : null;
        return new FinancialHistoryPoint(
                y.fiscalYear(), y.fiscalYearEnd(),
                y.revenue(), y.netIncome(), y.operatingCashFlow(), y.capitalExpenditure(), fcf,
                y.totalAssets(), y.totalLiabilities(), y.totalEquity(), y.totalDebt(), y.cash(), netDebt,
                debtToEquity, currentRatio, roe, roa, netMargin, fcfMargin,
                revGrowth, niGrowth, List.copyOf(nm));
    }

    private static BigDecimal ratio(String key, BigDecimal numerator, BigDecimal denominator, List<String> nm) {
        if (numerator == null || denominator == null) {
            return null;
        }
        if (denominator.signum() <= 0) {
            nm.add(key);
            return null;
        }
        return numerator.divide(denominator, SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal growth(String key, BigDecimal current, BigDecimal previous, List<String> nm) {
        if (current == null || previous == null) {
            return null;
        }
        if (previous.signum() <= 0) {
            nm.add(key);
            return null;
        }
        return current.subtract(previous).divide(previous, SCALE, RoundingMode.HALF_UP);
    }
}
