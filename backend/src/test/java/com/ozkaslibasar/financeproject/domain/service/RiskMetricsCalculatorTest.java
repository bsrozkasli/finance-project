package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RiskMetricsCalculatorTest {

    private static final MathContext MC = new MathContext(20, RoundingMode.HALF_UP);
    private static final BigDecimal RF_DAILY = new BigDecimal("0.0002");
    private static final BigDecimal SQRT_252 = new BigDecimal(Math.sqrt(252), MC);

    @Test
    void shouldReturnEmptyMetricsForNullInput() {
        assertThat(RiskMetricsCalculator.compute(null)).isEmpty();
    }

    @Test
    void shouldReturnEmptyMetricsForEmptyInput() {
        assertThat(RiskMetricsCalculator.compute(List.of())).isEmpty();
    }

    @Test
    void shouldReturnEmptyMetricsForOneCandle() {
        assertThat(RiskMetricsCalculator.compute(priceSeriesFromCloses(List.of(100.0)))).isEmpty();
    }

    @Test
    void shouldReturnEmptyMetricsForTwentyEightCandles() {
        assertThat(RiskMetricsCalculator.compute(priceSeriesFromLinearCloses(100.0, 1.0, 28))).isEmpty();
    }

    @Test
    void shouldReturnEmptyMetricsForTwentyNineCandles() {
        assertThat(RiskMetricsCalculator.compute(priceSeriesFromLinearCloses(100.0, 1.0, 29))).isEmpty();
    }

    @Test
    void shouldReturnRiskMetricsForExactlyThirtyCandles() {
        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromLinearCloses(100.0, 1.0, 30));
        assertThat(result).containsKeys("beta", "max_drawdown", "var_95", "cvar_95");
    }

    @Test
    void shouldReturnRiskMetricsForThirtyOneCandles() {
        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromLinearCloses(100.0, 1.0, 31));
        assertThat(result).containsKeys("beta", "max_drawdown", "var_95", "cvar_95");
    }

    @Test
    void shouldProduceZeroRiskLossMetricsForConstantPriceSeries() {
        List<PriceHistory> prices = priceSeriesFromCloses(constantCloses(100.0, 30));

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(prices);

        assertThat(result.get("max_drawdown")).isEqualByComparingTo(new BigDecimal("0.0000"));
        assertThat(result.get("var_95")).isEqualByComparingTo(new BigDecimal("0.0000"));
        assertThat(result.get("cvar_95")).isEqualByComparingTo(new BigDecimal("0.0000"));
        assertThat(result.get("beta")).isEqualByComparingTo(new BigDecimal("1.0000"));
        assertThat(result).doesNotContainKeys("sharpe_ratio", "sortino_ratio");
        assertAllValuesFinite(result);
    }

    @Test
    void shouldHandleZeroPreviousCloseDeterministicallyWithoutNonFiniteMetrics() {
        List<Double> closes = new ArrayList<>(constantCloses(100.0, 30));
        closes.set(14, 0.0);
        closes.set(15, 100.0);

        List<PriceHistory> prices = priceSeriesFromCloses(closes);

        Map<String, BigDecimal> first = RiskMetricsCalculator.compute(prices);
        Map<String, BigDecimal> second = RiskMetricsCalculator.compute(prices);

        assertThat(first).isEqualTo(second);
        assertAllValuesFinite(first);
        assertThat(first.get("max_drawdown")).isEqualByComparingTo(new BigDecimal("100.0000"));
        assertThat(first.get("var_95")).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        assertThat(first.get("cvar_95")).isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    @Test
    void shouldCalculateExactTwentyFivePercentMaximumDrawdown() {
        List<Double> closes = new ArrayList<>(constantCloses(100.0, 30));
        closes.set(10, 100.0);
        closes.set(11, 120.0);
        closes.set(12, 90.0);
        closes.set(13, 96.0);

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertThat(result.get("max_drawdown")).isEqualByComparingTo(new BigDecimal("25.0000"));
    }

    @Test
    void shouldCalculateZeroMaximumDrawdownForMonotonicIncrease() {
        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromLinearCloses(100.0, 1.0, 30));
        assertThat(result.get("max_drawdown")).isEqualByComparingTo(new BigDecimal("0.0000"));
    }

    @Test
    void shouldCalculateTwentyNinePercentMaximumDrawdownForMonotonicDecrease() {
        List<Double> closes = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            closes.add(100.0 - i);
        }

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertThat(result.get("max_drawdown")).isEqualByComparingTo(new BigDecimal("29.0000"));
    }

    @Test
    void shouldKeepDeepestDrawdownAfterRecoveryAndRepeatedPeaks() {
        List<Double> closes = new ArrayList<>(constantCloses(100.0, 30));
        closes.set(2, 120.0);
        closes.set(3, 90.0);
        closes.set(4, 120.0);
        closes.set(5, 110.0);
        closes.set(6, 120.0);

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertThat(result.get("max_drawdown")).isEqualByComparingTo(new BigDecimal("25.0000"));
    }

    @Test
    void shouldCalculateExactSharpeAndSortinoFromHandCalculatedReturns() {
        /*
         * Manual derivation from closes [100, 110, 99, 108.9, ... repeated] gives returns:
         * r = [0.1, -0.1, 0.1, -0.1, ...] (29 returns for 30 closes)
         * mean = (15*0.1 + 14*(-0.1)) / 29 = 0.003448275862...
         * sample std = sqrt(sum((ri-mean)^2)/(n-1)) = 0.101673650672...
         * downside std = sqrt(sum((ri-mean)^2)/(count-1)) for ri<mean = 0.1034...
         * sharpe = ((mean - 0.0002)/std) * sqrt(252) = 0.507053095... => 0.5071 (4 dp)
         * sortino = ((mean - 0.0002)/downsideStd) * sqrt(252) = 0.480290026... => 0.4803 (4 dp).
         */
        List<Double> closes = alternatingCloses(100.0, 30, 0.1);

        double[] returns = toReturns(closes);
        BigDecimal expectedMean = bd(mean(returns));
        BigDecimal expectedStd = bd(sampleStd(returns));
        BigDecimal expectedSharpe = bd(((mean(returns) - RF_DAILY.doubleValue()) / sampleStd(returns)) * Math.sqrt(252));        BigDecimal expectedSortino = bd(((mean(returns) - RF_DAILY.doubleValue()) / downsideStdAgainstMean(returns)) * Math.sqrt(252));

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertThat(expectedMean).isEqualByComparingTo(new BigDecimal("0.0034"));
        assertThat(expectedStd).isEqualByComparingTo(new BigDecimal("0.1017"));        assertThat(result.get("sharpe_ratio")).isEqualByComparingTo(expectedSharpe);
        assertThat(result.get("sortino_ratio").doubleValue()).isCloseTo(expectedSortino.doubleValue(), org.assertj.core.data.Offset.offset(0.05));
    }

    @Test
    void shouldCalculateExactVarAndCvarForDeterministicLossTail() {
        /*
         * Returns are explicitly constructed (29 total) with tail losses:
         * [-0.20, -0.05, -0.03, -0.02, -0.01, and the rest +0.01]
         * For n=29 and 95% VaR, tail proportion 5% gives floor(29*0.05)=1.
         * Sorted tail starts [-0.20, -0.05, ...]
         * VaR uses element at index 1 -> |-0.05| = 5.0000 (%)
         * CVaR uses average of indices [0..1] -> |(-0.20 + -0.05)/2| = 12.5000 (%).
         */
        List<Double> returns = new ArrayList<>();
        returns.add(-0.20);
        returns.add(-0.05);
        returns.add(-0.03);
        returns.add(-0.02);
        returns.add(-0.01);
        while (returns.size() < 29) {
            returns.add(0.01);
        }

        List<Double> closes = closesFromReturns(100.0, returns);

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertThat(result.get("var_95")).isEqualByComparingTo(new BigDecimal("5.0000"));
        assertThat(result.get("cvar_95")).isEqualByComparingTo(new BigDecimal("12.5000"));
        assertThat(result.get("cvar_95")).isGreaterThanOrEqualTo(result.get("var_95"));
    }

    @Test
    void shouldReturnZeroVarAndCvarWhenAllReturnsAreGainsOnly() {
        List<Double> closes = priceSeriesFromLinearCloses(100.0, 1.0, 30).stream().map(p -> p.close().doubleValue()).toList();

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertThat(result.get("var_95")).isEqualByComparingTo(new BigDecimal("0.0000"));
        assertThat(result.get("cvar_95")).isEqualByComparingTo(new BigDecimal("0.0000"));
    }

    @Test
    void shouldProduceSameMetricsForChronologicalReverseAndMixedOrderInputs() {
        List<PriceHistory> chronological = priceSeriesFromLinearCloses(100.0, 1.0, 30);

        List<PriceHistory> reverse = new ArrayList<>(chronological);
        reverse.sort(Comparator.comparing(PriceHistory::timestampAsInstant).reversed());

        List<PriceHistory> mixed = new ArrayList<>(chronological);
        Collections.swap(mixed, 0, 7);
        Collections.swap(mixed, 5, 17);
        Collections.swap(mixed, 13, 29);

        Map<String, BigDecimal> expected = RiskMetricsCalculator.compute(chronological);
        Map<String, BigDecimal> reverseResult = RiskMetricsCalculator.compute(reverse);
        Map<String, BigDecimal> mixedResult = RiskMetricsCalculator.compute(mixed);

        assertThat(reverseResult).isEqualTo(expected);
        assertThat(mixedResult).isEqualTo(expected);
    }

    @Test
    void shouldHandleDuplicateTimestampsWithDifferentCloseValuesDeterministically() {
        List<PriceHistory> prices = new ArrayList<>(priceSeriesFromLinearCloses(100.0, 1.0, 30));
        LocalDateTime duplicateTs = prices.get(10).timestamp();
        prices.set(11, new PriceHistory("AAPL", bd(50), bd(51), bd(49), bd(50), bd(1000), duplicateTs));

        Map<String, BigDecimal> first = RiskMetricsCalculator.compute(prices);
        Map<String, BigDecimal> second = RiskMetricsCalculator.compute(prices);

        assertThat(first).isEqualTo(second);
    }

    @Test
    void shouldThrowWhenInputContainsNullCandleEntry() {
        List<PriceHistory> prices = new ArrayList<>(priceSeriesFromLinearCloses(100.0, 1.0, 30));
        prices.set(5, null);

        assertThatThrownBy(() -> RiskMetricsCalculator.compute(prices))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void shouldRejectInvalidPriceHistoryValuesAtDomainModelBoundary() {
        LocalDateTime ts = LocalDateTime.of(2026, 1, 1, 12, 0);

        assertThatThrownBy(() -> new PriceHistory("AAPL", bd(1), bd(2), bd(0), null, bd(1), ts))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new PriceHistory("AAPL", bd(1), bd(2), bd(0), bd(1), bd(1), (LocalDateTime) null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new PriceHistory("AAPL", bd(-1), bd(2), bd(0), bd(1), bd(1), ts))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldHandleExtremeDecimalScaleWithoutNonFiniteOutputs() {
        List<Double> closes = new ArrayList<>(constantCloses(1.0, 30));
        closes.set(14, 1e-200);
        closes.set(15, 1e-150);

        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromCloses(closes));

        assertAllValuesFinite(result);
    }

    @Test
    void shouldNotMutateCallerOwnedPriceList() {
        List<PriceHistory> prices = new ArrayList<>(priceSeriesFromLinearCloses(100.0, 1.0, 30));
        List<PriceHistory> snapshot = new ArrayList<>(prices);

        RiskMetricsCalculator.compute(prices);

        assertThat(prices).hasSize(snapshot.size());
        assertThat(prices).containsExactlyElementsOf(snapshot);
    }

    @Test
    void shouldBeDeterministicAcrossRunsAndListImplementations() {
        List<PriceHistory> base = priceSeriesFromLinearCloses(100.0, 1.0, 30);
        List<PriceHistory> arrayListInput = new ArrayList<>(base);
        List<PriceHistory> immutableInput = List.copyOf(base);

        Map<String, BigDecimal> run1 = RiskMetricsCalculator.compute(arrayListInput);
        Map<String, BigDecimal> run2 = RiskMetricsCalculator.compute(arrayListInput);
        Map<String, BigDecimal> immutableRun = RiskMetricsCalculator.compute(immutableInput);

        assertThat(run1).isEqualTo(run2);
        assertThat(immutableRun).isEqualTo(run1);

        for (String key : run1.keySet()) {
            assertThat(run1.get(key).scale()).isEqualTo(run2.get(key).scale());
            assertThat(run1.get(key).scale()).isEqualTo(immutableRun.get(key).scale());
        }
    }

    @Test
    void shouldRespectLogicalOutputBoundsForNonNegativePrices() {
        Map<String, BigDecimal> result = RiskMetricsCalculator.compute(priceSeriesFromLinearCloses(100.0, 1.0, 30));

        assertThat(result.values()).doesNotContainNull();
        assertAllValuesFinite(result);
        assertThat(result.get("max_drawdown")).isBetween(new BigDecimal("0.0000"), new BigDecimal("100.0000"));
        assertThat(result.get("var_95")).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        assertThat(result.get("cvar_95")).isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    private static void assertAllValuesFinite(Map<String, BigDecimal> result) {
        for (Map.Entry<String, BigDecimal> e : result.entrySet()) {
            assertThat(Double.isFinite(e.getValue().doubleValue()))
                    .as("metric %s should be finite", e.getKey())
                    .isTrue();
        }
    }

    private static List<PriceHistory> priceSeriesFromLinearCloses(double start, double increment, int count) {
        List<Double> closes = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            closes.add(start + i * increment);
        }
        return priceSeriesFromCloses(closes);
    }

    private static List<Double> alternatingCloses(double start, int count, double r) {
        List<Double> closes = new ArrayList<>();
        closes.add(start);
        for (int i = 1; i < count; i++) {
            double prev = closes.get(i - 1);
            double next = (i % 2 == 1) ? prev * (1 + r) : prev * (1 - r);
            closes.add(next);
        }
        return closes;
    }

    private static List<Double> closesFromReturns(double start, List<Double> returns) {
        List<Double> closes = new ArrayList<>();
        closes.add(start);
        for (double r : returns) {
            closes.add(closes.get(closes.size() - 1) * (1 + r));
        }
        return closes;
    }

    private static List<Double> constantCloses(double close, int count) {
        List<Double> closes = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            closes.add(close);
        }
        return closes;
    }

    private static List<PriceHistory> priceSeriesFromCloses(List<Double> closes) {
        List<PriceHistory> prices = new ArrayList<>();
        LocalDateTime base = LocalDateTime.of(2026, 1, 1, 12, 0);
        for (int i = 0; i < closes.size(); i++) {
            BigDecimal close = bd(closes.get(i));
            BigDecimal high = close.max(BigDecimal.ONE);
            BigDecimal low = close.signum() == 0 ? BigDecimal.ZERO : close.min(BigDecimal.ONE);
            prices.add(new PriceHistory(
                    "AAPL",
                    close,
                    high,
                    low,
                    close,
                    bd(1000),
                    base.plusDays(i)
            ));
        }
        return prices;
    }

    private static double[] toReturns(List<Double> closes) {
        double[] returns = new double[closes.size() - 1];
        for (int i = 1; i < closes.size(); i++) {
            returns[i - 1] = (closes.get(i) - closes.get(i - 1)) / closes.get(i - 1);
        }
        return returns;
    }

    private static double mean(double[] values) {
        double sum = 0.0;
        for (double v : values) {
            sum += v;
        }
        return values.length == 0 ? 0.0 : sum / values.length;
    }

    private static double downsideStdAgainstMean(double[] values) {
        double mean = mean(values);
        double sum = 0.0;
        int count = 0;
        for (double v : values) {
            if (v < mean) {
                double d = v - mean;
                sum += d * d;
                count++;
            }
        }
        return count < 2 ? 0.0 : Math.sqrt(sum / (count - 1));
    }

    private static double sampleStd(double[] values) {
        if (values.length < 2) {
            return 0.0;
        }
        double mean = mean(values);
        double sumSq = 0.0;
        for (double v : values) {
            double d = v - mean;
            sumSq += d * d;
        }
        return Math.sqrt(sumSq / (values.length - 1));
    }

    private static BigDecimal bd(double value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }
}
