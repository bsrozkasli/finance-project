package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Computes compressed fundamental and valuation metrics from merged FMP statements.
 * See FINANCIAL_ANALYSIS_FORMULAS.md for formula references.
 */
public final class FinancialMetricsCalculator {

    private static final MathContext MC = new MathContext(12, RoundingMode.HALF_UP);

    private FinancialMetricsCalculator() {
    }

    public static Map<String, BigDecimal> compute(List<FinancialStatement> mergedAnnual, BigDecimal currentPrice) {
        Map<String, BigDecimal> out = new HashMap<>();
        if (mergedAnnual == null || mergedAnnual.isEmpty()) {
            return out;
        }

        List<FinancialStatement> sorted = mergedAnnual.stream()
                .filter(s -> "annual".equalsIgnoreCase(s.period()))
                .sorted(Comparator.comparing(FinancialStatement::fiscalYear).reversed())
                .toList();

        if (sorted.isEmpty()) {
            sorted = mergedAnnual.stream()
                    .sorted(Comparator.comparing(FinancialStatement::fiscalYear).reversed())
                    .toList();
        }

        FinancialStatement latest = sorted.getFirst();
        BigDecimal revenue = latest.revenue();
        BigDecimal netIncome = latest.netIncome();
        BigDecimal assets = latest.totalAssets();
        BigDecimal liabilities = latest.totalLiabilities();
        BigDecimal equity = assets.subtract(liabilities, MC);
        BigDecimal ocf = latest.operatingCashFlow();
        BigDecimal grossProfit = latest.grossProfit();
        BigDecimal operatingIncome = latest.operatingIncome();

        if (assets.signum() > 0) {
            out.put("roa", pct(netIncome, assets));
        }
        if (equity.signum() > 0) {
            out.put("roe", pct(netIncome, equity));
            out.put("debt_to_equity", safeDivide(liabilities, equity));
        }
        if (revenue.signum() > 0) {
            out.put("net_margin", pct(netIncome, revenue));
            out.put("operating_margin", pct(operatingIncome, revenue));
            out.put("gross_margin", pct(grossProfit, revenue));
        }
        if (liabilities.signum() > 0) {
            out.put("interest_coverage", safeDivide(netIncome, liabilities));
        }
        if (assets.signum() > 0 && netIncome.signum() > 0) {
            out.put("roic", pct(netIncome, assets));
        }

        out.put("piotroski_score", BigDecimal.valueOf(estimatePiotroski(sorted)));
        out.put("altman_z_score", estimateAltman(assets, liabilities, revenue, netIncome));

        if (sorted.size() >= 2) {
            FinancialStatement prior = sorted.get(1);
            out.put("revenue_growth", growth(latest.revenue(), prior.revenue()));
            out.put("eps_growth", growth(latest.netIncome(), prior.netIncome()));
            out.put("fcf_growth", growth(latest.operatingCashFlow(), prior.operatingCashFlow()));
        }

        BigDecimal dcf = estimateDcfFairValue(ocf, currentPrice);
        out.put("dcf_fair_value", dcf);
        out.put("intrinsic_value", dcf);

        return out;
    }

    /** Placeholder hook when price is injected externally. */
    private static BigDecimal estimateDcfFairValue(BigDecimal ocf, BigDecimal priceHint) {
        if (ocf.signum() <= 0) {
            return priceHint != null ? priceHint : BigDecimal.ZERO;
        }
        return ocf.multiply(BigDecimal.valueOf(15), MC);
    }

    private static int estimatePiotroski(List<FinancialStatement> sorted) {
        int score = 0;
        if (sorted.isEmpty()) {
            return 0;
        }
        FinancialStatement cur = sorted.getFirst();
        if (cur.netIncome().signum() > 0) {
            score++;
        }
        if (cur.operatingCashFlow().signum() > 0) {
            score++;
        }
        if (cur.totalAssets().compareTo(cur.totalLiabilities()) > 0) {
            score++;
        }
        if (sorted.size() >= 2) {
            FinancialStatement prev = sorted.get(1);
            if (cur.revenue().compareTo(prev.revenue()) > 0) {
                score++;
            }
            if (cur.netIncome().compareTo(prev.netIncome()) > 0) {
                score++;
            }
        }
        return Math.min(9, score);
    }

    private static BigDecimal estimateAltman(
            BigDecimal assets, BigDecimal liabilities, BigDecimal revenue, BigDecimal netIncome) {
        if (assets.signum() == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal workingCapital = assets.subtract(liabilities, MC);
        BigDecimal x1 = safeDivide(workingCapital, assets);
        BigDecimal x2 = safeDivide(netIncome, assets);
        BigDecimal x3 = safeDivide(netIncome, assets);
        BigDecimal x4 = safeDivide(revenue, liabilities.max(BigDecimal.ONE, MC));
        return x1.multiply(BigDecimal.valueOf(1.2), MC)
                .add(x2.multiply(BigDecimal.valueOf(1.4), MC), MC)
                .add(x3.multiply(BigDecimal.valueOf(3.3), MC), MC)
                .add(x4.multiply(BigDecimal.valueOf(0.6), MC), MC);
    }

    private static BigDecimal pct(BigDecimal num, BigDecimal den) {
        return safeDivide(num, den).multiply(BigDecimal.valueOf(100), MC);
    }

    private static BigDecimal growth(BigDecimal current, BigDecimal prior) {
        if (prior == null || prior.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return current.subtract(prior, MC)
                .divide(prior, MC)
                .multiply(BigDecimal.valueOf(100), MC);
    }

    private static BigDecimal safeDivide(BigDecimal num, BigDecimal den) {
        if (den == null || den.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return num.divide(den, MC);
    }
}
