package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Risk metrics from price history (Sharpe, Sortino, beta proxy, drawdown, VaR, CVaR).
 */
public final class RiskMetricsCalculator {

    private static final MathContext MC = new MathContext(12, RoundingMode.HALF_UP);
    private static final BigDecimal TRADING_DAYS = BigDecimal.valueOf(252);
    private static final BigDecimal RISK_FREE_DAILY = BigDecimal.valueOf(0.0002);

    private RiskMetricsCalculator() {
    }

    public static Map<String, BigDecimal> compute(List<PriceHistory> prices) {
        Map<String, BigDecimal> out = new HashMap<>();
        if (prices == null || prices.size() < 30) {
            return out;
        }

        List<PriceHistory> sorted = prices.stream()
                .sorted(Comparator.comparing(PriceHistory::timestampAsInstant))
                .toList();

        double[] returns = new double[sorted.size() - 1];
        for (int i = 1; i < sorted.size(); i++) {
            BigDecimal prev = sorted.get(i - 1).close();
            BigDecimal cur = sorted.get(i).close();
            if (prev.signum() == 0) {
                returns[i - 1] = 0.0;
            } else {
                returns[i - 1] = cur.subtract(prev, MC)
                        .divide(prev, MC)
                        .doubleValue();
            }
        }

        double mean = mean(returns);
        double std = std(returns, mean);
        double downsideStd = downsideStd(returns, mean);

        if (std > 0) {
            double sharpe = (mean - RISK_FREE_DAILY.doubleValue()) / std * Math.sqrt(252);
            out.put("sharpe_ratio", bd(sharpe));
        }
        if (downsideStd > 0) {
            double sortino = (mean - RISK_FREE_DAILY.doubleValue()) / downsideStd * Math.sqrt(252);
            out.put("sortino_ratio", bd(sortino));
        }

        out.put("beta", bd(estimateBeta(returns)));
        out.put("max_drawdown", bd(maxDrawdown(sorted)));
        out.put("var_95", bd(valueAtRisk(returns, 0.05)));
        out.put("cvar_95", bd(conditionalVar(returns, 0.05)));

        return out;
    }

    private static double estimateBeta(double[] returns) {
        double vol = std(returns, mean(returns));
        return vol > 0 ? 1.0 + (vol - 0.01) * 10 : 1.0;
    }

    private static double maxDrawdown(List<PriceHistory> sorted) {
        BigDecimal peak = sorted.get(0).close();
        BigDecimal maxDd = BigDecimal.ZERO;
        for (PriceHistory bar : sorted) {
            BigDecimal close = bar.close();
            if (close.compareTo(peak) > 0) {
                peak = close;
            }
            if (peak.signum() > 0) {
                BigDecimal dd = peak.subtract(close, MC).divide(peak, MC);
                if (dd.compareTo(maxDd) > 0) {
                    maxDd = dd;
                }
            }
        }
        return maxDd.multiply(BigDecimal.valueOf(100), MC).doubleValue();
    }

    private static double valueAtRisk(double[] returns, double tail) {
        double[] copy = returns.clone();
        java.util.Arrays.sort(copy);
        int idx = (int) Math.floor(copy.length * tail);
        idx = Math.max(0, Math.min(idx, copy.length - 1));
        return Math.abs(copy[idx]) * 100;
    }

    private static double conditionalVar(double[] returns, double tail) {
        double[] copy = returns.clone();
        java.util.Arrays.sort(copy);
        int idx = (int) Math.floor(copy.length * tail);
        double sum = 0;
        int count = 0;
        for (int i = 0; i <= idx; i++) {
            sum += copy[i];
            count++;
        }
        return count == 0 ? 0 : Math.abs(sum / count) * 100;
    }

    private static double mean(double[] values) {
        double sum = 0;
        for (double v : values) {
            sum += v;
        }
        return values.length == 0 ? 0 : sum / values.length;
    }

    private static double std(double[] values, double mean) {
        double sum = 0;
        for (double v : values) {
            sum += (v - mean) * (v - mean);
        }
        return values.length < 2 ? 0 : Math.sqrt(sum / (values.length - 1));
    }

    private static double downsideStd(double[] values, double mean) {
        double sum = 0;
        int count = 0;
        for (double v : values) {
            if (v < mean) {
                sum += (v - mean) * (v - mean);
                count++;
            }
        }
        return count < 2 ? 0 : Math.sqrt(sum / (count - 1));
    }

    private static BigDecimal bd(double value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }
}
