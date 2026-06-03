package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RiskMetricsCalculatorTest {

    @Test
    void shouldReturnEmptyMapIfPricesNullOrLessThan30() {
        // Null list
        assertThat(RiskMetricsCalculator.compute(null)).isEmpty();

        // Less than 30 prices
        List<PriceHistory> shortList = new ArrayList<>();
        for (int i = 0; i < 29; i++) {
            shortList.add(new PriceHistory(
                    "AAPL",
                    BigDecimal.valueOf(100),
                    BigDecimal.valueOf(105),
                    BigDecimal.valueOf(95),
                    BigDecimal.valueOf(100),
                    BigDecimal.valueOf(1000),
                    LocalDateTime.now().minusDays(i)
            ));
        }
        assertThat(RiskMetricsCalculator.compute(shortList)).isEmpty();
    }

    @Test
    void shouldComputeRiskMetricsCorrectly() {
        List<PriceHistory> prices = new ArrayList<>();
        LocalDateTime baseTime = LocalDateTime.of(2026, 1, 1, 12, 0);

        // Generate 31 prices with some volatility to get non-zero standard deviation
        double[] closePrices = {
            100.0, 102.0, 101.0, 104.0, 103.0, 106.0, 105.0, 108.0, 107.0, 110.0,
            109.0, 112.0, 111.0, 114.0, 113.0, 116.0, 115.0, 118.0, 117.0, 120.0,
            119.0, 122.0, 121.0, 124.0, 123.0, 126.0, 125.0, 128.0, 127.0, 130.0, 125.0
        };

        for (int i = 0; i < closePrices.length; i++) {
            prices.add(new PriceHistory(
                    "AAPL",
                    BigDecimal.valueOf(closePrices[i] - 1.0),
                    BigDecimal.valueOf(closePrices[i] + 2.0),
                    BigDecimal.valueOf(closePrices[i] - 2.0),
                    BigDecimal.valueOf(closePrices[i]),
                    BigDecimal.valueOf(1000),
                    baseTime.plusDays(i)
            ));
        }

        Map<String, BigDecimal> metrics = RiskMetricsCalculator.compute(prices);

        assertThat(metrics).isNotEmpty();
        assertThat(metrics).containsKeys("sharpe_ratio", "sortino_ratio", "beta", "max_drawdown", "var_95", "cvar_95");
        
        assertThat(metrics.get("max_drawdown")).isGreaterThan(BigDecimal.ZERO);
        assertThat(metrics.get("var_95")).isGreaterThan(BigDecimal.ZERO);
        assertThat(metrics.get("cvar_95")).isGreaterThan(BigDecimal.ZERO);
        assertThat(metrics.get("beta")).isGreaterThan(BigDecimal.ZERO);
    }
}
