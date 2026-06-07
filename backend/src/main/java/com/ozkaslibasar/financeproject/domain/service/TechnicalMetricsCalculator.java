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
 * Technical indicators computed in the domain layer from OHLCV history.
 */
public final class TechnicalMetricsCalculator {

    private static final MathContext MC = new MathContext(12, RoundingMode.HALF_UP);
    private static final int RSI_PERIOD = 14;
    private static final int SMA_PERIOD = 20;

    private TechnicalMetricsCalculator() {
    }

    public static Map<String, BigDecimal> compute(List<PriceHistory> prices) {
        Map<String, BigDecimal> out = new HashMap<>();
        if (prices == null || prices.size() < 30) {
            return out;
        }

        List<PriceHistory> sorted = prices.stream()
                .sorted(Comparator.comparing(PriceHistory::timestampAsInstant))
                .toList();

        double[] closes = sorted.stream()
                .map(p -> p.close().doubleValue())
                .mapToDouble(Double::doubleValue)
                .toArray();

        out.put("rsi", bd(rsi(closes, RSI_PERIOD)));
        double[] macdLine = emaSeries(closes, 12);
        double[] macdSignal = emaOfSeries(macdLine, 9);
        double macd = macdLine[macdLine.length - 1] - ema(closes, 26);
        double signal = macdSignal[macdSignal.length - 1];
        out.put("macd", bd(macd));
        out.put("macd_signal", bd(signal));
        out.put("macd_histogram", bd(macd - signal));
        out.put("sma_20", bd(sma(closes, SMA_PERIOD)));
        out.put("atr", bd(atr(sorted)));

        BigDecimal last = sorted.get(sorted.size() - 1).close();
        BigDecimal sma = out.get("sma_20");
        if (sma != null && sma.signum() > 0) {
            out.put("price_vs_sma_pct", last.subtract(sma, MC)
                    .divide(sma, MC)
                    .multiply(BigDecimal.valueOf(100), MC));
        }

        return out;
    }

    private static double rsi(double[] closes, int period) {
        if (closes.length <= period) {
            return 50.0;
        }
        double gain = 0;
        double loss = 0;
        for (int i = closes.length - period; i < closes.length; i++) {
            double diff = closes[i] - closes[i - 1];
            if (diff >= 0) {
                gain += diff;
            } else {
                loss -= diff;
            }
        }
        if (loss == 0) {
            return 100.0;
        }
        double rs = gain / loss;
        return 100.0 - (100.0 / (1.0 + rs));
    }

    private static double sma(double[] values, int period) {
        int start = Math.max(0, values.length - period);
        double sum = 0;
        int count = 0;
        for (int i = start; i < values.length; i++) {
            sum += values[i];
            count++;
        }
        return count == 0 ? 0 : sum / count;
    }

    private static double ema(double[] values, int period) {
        double k = 2.0 / (period + 1);
        double ema = values[0];
        for (int i = 1; i < values.length; i++) {
            ema = values[i] * k + ema * (1 - k);
        }
        return ema;
    }

    private static double[] emaSeries(double[] values, int period) {
        double[] out = new double[values.length];
        double k = 2.0 / (period + 1);
        out[0] = values[0];
        for (int i = 1; i < values.length; i++) {
            out[i] = values[i] * k + out[i - 1] * (1 - k);
        }
        return out;
    }

    private static double[] emaOfSeries(double[] values, int period) {
        return emaSeries(values, period);
    }

    private static double atr(List<PriceHistory> bars) {
        double sum = 0;
        int count = 0;
        for (int i = 1; i < bars.size(); i++) {
            PriceHistory cur = bars.get(i);
            PriceHistory prev = bars.get(i - 1);
            double tr = Math.max(
                    cur.high().subtract(cur.low(), MC).doubleValue(),
                    Math.max(
                            Math.abs(cur.high().subtract(prev.close(), MC).doubleValue()),
                            Math.abs(cur.low().subtract(prev.close(), MC).doubleValue())
                    )
            );
            sum += tr;
            count++;
        }
        int window = Math.min(14, count);
        return count == 0 ? 0 : sum / window;
    }

    private static BigDecimal bd(double value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }
}
